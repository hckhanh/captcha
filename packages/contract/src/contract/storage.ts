import { Abi } from '@polkadot/api-contract'
import { AbiMetadata, AbiStorageField } from '@prosopo/types'
import { AccountId, PortableType, StorageEntryMetadataLatest } from '@polkadot/types/interfaces'
import { ApiPromise } from '@polkadot/api'
import { ProsopoContractError } from '../handlers'
import { firstValueFrom } from 'rxjs'
import { hexToNumber } from '@polkadot/util'
import { reverseHexString } from '@prosopo/common'

const primitivesSizeInBytes = {
    u8: 1, // 2**0
    u16: 2, // 2**1
    u32: 4, // 2**2
    u64: 8, // 2**3
    u128: 16, // 2**4
    '[u8; 32]': 32,
}

export type PrimitiveTypes = { [key: number]: string }

export type PrimitiveStorageFields = {
    [key: string]: { storageType: string; index: number; startBytes: number; lengthBytes: number }
}

/** Get the primitive types from the abi.types section
 * @return an object containing the primitive types, keyed on their IDs in the contract JSON
 * @param abiJson
 */
export const getPrimitiveTypes = function (abiJson: AbiMetadata): PrimitiveTypes {
    const primitiveTypes: { [key: number]: string } = {}
    const types = abiJson.types.filter((type) => {
        if (type.type.def.primitive) {
            return true
        } else if (type.type.path && type.type.path.length > 0) {
            const path = Array.from(type.type.path) as string[]
            return path[0].indexOf('primitive') > -1 && path[1] === 'types'
        }
        return false
    })

    types.forEach((type) => {
        primitiveTypes[type.id] = type.type.def.primitive || type.type.def.composite?.fields[0].typeName || ''
    })
    return primitiveTypes
}

/** Get the primitive storage fields from the abi.storage section of the contract JSON
 * @return an object containing the primitive storage fields only, keyed on their names
 * @param storageFields
 * @param primitiveStorageTypes
 */
export const getPrimitiveStorageFields = (
    storageFields: AbiStorageField[],
    primitiveStorageTypes: PrimitiveTypes
): PrimitiveStorageFields => {
    const filteredStorageFields = {}
    let primitiveStorageIndex = 0
    let startBytes = 0
    for (const storageField of storageFields) {
        const storageName = storageField.name
        if (storageField.layout && storageField.layout.leaf && storageField.layout.leaf.ty !== undefined) {
            const type = storageField.layout.leaf.ty
            if (primitiveStorageTypes[type]) {
                const typeName = primitiveStorageTypes[type]
                filteredStorageFields[storageName] = {
                    storageType: typeName,
                    index: primitiveStorageIndex,
                    startBytes: startBytes,
                    lengthBytes: primitivesSizeInBytes[typeName],
                }
                // Add the length of the primitive type to the startBytes
                startBytes += primitivesSizeInBytes[typeName]
                // Primitive values are stored in the contract under a single key in order of declaration
                primitiveStorageIndex++
            }
        }
    }
    return filteredStorageFields
}

/** Get the storage entry from the ABI given a storage name
 * @return the storage entry object
 * @param api
 * @param abi
 * @param json
 * @param storageName
 */
export function getStorageKeyAndType(
    api: ApiPromise,
    abi: Abi,
    json: AbiMetadata,
    storageName: string
): { storageKey: `0x${string}`; storageType: PortableType } {
    const { storageEntry } = getStorageEntry(json, storageName)
    if (storageEntry) {
        let storage = storageEntry
        while ('root' in storage.layout) {
            storage = storage.layout.root
        }
        const rootKey = storage.root_key || storage.layout.leaf.key || ''

        // This is a primitive storage field (e.g. u16, u32, etc.)
        if (hexToNumber(rootKey) === 0) {
            const primitiveStorageTypes = getPrimitiveTypes(json)
            if (storage.layout && storage.layout.leaf && storage.layout.leaf.ty) {
                const type = storage.layout.leaf.ty
                if (primitiveStorageTypes[type]) {
                    return {
                        storageType: api.createType('PortableType', {
                            id: type,
                            type: primitiveStorageTypes[type],
                        }),
                        storageKey: rootKey,
                    }
                }
            }
        }

        const rootKeyReversed = reverseHexString(rootKey.slice(2))
        return {
            storageType: abi.registry.lookup.types[storage.layout.leaf.ty],
            storageKey: rootKeyReversed,
        }
    }
    throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_NAME', getStorageKeyAndType.name)
}

/** Get the storage entry from the ABI given a storage name
 * @return the storage entry object
 * @param json
 * @param storageName
 */
export function getStorageEntry(
    json: AbiMetadata,
    storageName: string
): {
    storageEntry?: StorageEntryMetadataLatest & AbiStorageField
    index?: number
} {
    const index = json.storage.root.layout.struct?.fields.findIndex((obj: { name: string }) => obj.name === storageName)
    if (index) {
        return { storageEntry: json.storage.root.layout.struct?.fields[index], index }
    }

    return { storageEntry: undefined, index: undefined }
}

/**
 * Get the primitive storage value from the contract storage
 * @param api
 * @param abi
 * @param name
 * @param primitiveStorage
 * @param address
 */
export async function getPrimitiveStorageValue<T>(
    api: ApiPromise,
    abi: Abi,
    name: string,
    primitiveStorage: PrimitiveStorageFields,
    address: AccountId
): Promise<T> {
    // Primitive storage is packed together in the contract storage at key 0x00000000
    const promiseResult = api.rx.call.contractsApi.getStorage(address, '0x00000000')
    const result = await firstValueFrom(promiseResult)
    const optionStorageBytes = abi.registry.createType('Option<Bytes>', result)
    const storageBytes = optionStorageBytes.unwrap().toU8a(true)
    // Remove first 4 bytes (0x00016101) - not sure what it is
    const trimmedStorageBytes = storageBytes.slice(4, storageBytes.length)
    // Extract the relevant bytes from the storageBytes
    const startBytes = primitiveStorage[name].startBytes
    const endBytes = startBytes + primitiveStorage[name].lengthBytes
    const primitiveBytes = trimmedStorageBytes.slice(startBytes, endBytes)
    // Construct the type from the bytes
    return abi.registry.createType(primitiveStorage[name].storageType, primitiveBytes) as T
}