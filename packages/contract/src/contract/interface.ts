// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import type { ContractCallOutcome, ContractOptions, DecodedEvent } from '@polkadot/api-contract/types'
import { AbiMetaDataSpec, AbiMetadata, AbiStorageEntry, ContractAbi } from '@prosopo/types'
import { encodeStringArgs, getOptions, handleContractCallOutcomeErrors } from './helpers'
import { ProsopoContractError } from '../handlers'
import { ApiPromise } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { ContractExecResult } from '@polkadot/types/interfaces/contracts'
import { ApiBase, ApiDecoration } from '@polkadot/api/types'
import { firstValueFrom, map } from 'rxjs'
import { convertWeight } from '@polkadot/api-contract/base/util'
import { BN, BN_ZERO } from '@polkadot/util'
import {
    EventRecord,
    PortableType,
    StorageDeposit,
    StorageEntryMetadataLatest,
    WeightV2,
} from '@polkadot/types/interfaces'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { useWeightImpl } from './useWeight'
import { IKeyringPair, ISubmittableResult } from '@polkadot/types/types'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { applyOnEvent } from '@polkadot/api-contract/util'
import { Bytes } from '@polkadot/types-codec'
import { LogLevel, Logger, logger, reverseHexString, snakeToCamelCase } from '@prosopo/common'

export class ProsopoContractApi extends ContractPromise {
    contractName: string
    pair: IKeyringPair
    options: ContractOptions
    nonce: number
    logger: Logger
    json: AbiMetadata

    constructor(
        api: ApiPromise,
        abi: ContractAbi,
        address: string,
        pair: IKeyringPair,
        contractName: string,
        currentNonce: number,
        logLevel?: LogLevel
    ) {
        super(api, abi, address)
        this.pair = pair
        this.contractName = contractName
        this.nonce = currentNonce
        this.logger = logger(logLevel || LogLevel.Info, `ProsopoContractApi: ${contractName}`)
        this.json = AbiMetaDataSpec.parse(this.abi.json)
        this.createStorageGetters()
    }

    /**
     * Create getter functions for contract storage entries
     */
    private createStorageGetters(): void {
        if (this.json.storage.root.layout.struct) {
            for (const storageField of this.json.storage.root.layout.struct.fields) {
                const functionName = `${snakeToCamelCase(storageField.name)}`
                ProsopoContractApi.prototype[functionName] = () => {
                    return this.getStorage(storageField.name)
                }
            }
        }
    }

    public getContract(): ProsopoContractApi {
        return this
    }

    /**
     * Get the extrinsic for submitting in a transaction
     * @return {SubmittableExtrinsic} extrinsic
     */
    async buildExtrinsic<T>(
        contractMethodName: string,
        args: T[],
        value?: number | BN | undefined
    ): Promise<{ extrinsic: SubmittableExtrinsic; options: ContractOptions; storageDeposit: StorageDeposit }> {
        // Always query first as errors are passed back from a dry run but not from a transaction
        const message = this.abi.findMessage(contractMethodName)
        const encodedArgs: Uint8Array[] = encodeStringArgs(this.abi, message, args)
        const expectedBlockTime = new BN(this.api.consts.babe?.expectedBlockTime)
        const weight = await useWeightImpl(this.api as ApiPromise, expectedBlockTime, new BN(1))
        const gasLimit = weight.isWeightV2 ? weight.weightV2 : weight.isEmpty ? -1 : weight.weight
        this.logger.debug('Sending address: ', this.pair.address)
        const initialOptions = {
            value,
            gasLimit,
            storageDepositLimit: null,
        }
        const extrinsic = this.query[message.method](this.pair.address, initialOptions, ...encodedArgs)

        const response = await extrinsic
        if (response.result.isOk) {
            let options = getOptions(this.api, message.isMutating, value, response.gasRequired, response.storageDeposit)
            const extrinsicTx = this.tx[contractMethodName](options, ...encodedArgs)
            // paymentInfo is larger than gasRequired returned by query so use paymentInfo
            const paymentInfo = await extrinsicTx.paymentInfo(this.pair.address)
            this.logger.debug('Payment info: ', paymentInfo.partialFee.toHuman())
            // increase the gas limit to make sure the tx succeeds
            options = getOptions(this.api, message.isMutating, value, paymentInfo.weight, response.storageDeposit, true)
            handleContractCallOutcomeErrors(response, contractMethodName)
            return {
                extrinsic: this.tx[contractMethodName](options, ...encodedArgs),
                options,
                storageDeposit: response.storageDeposit,
            }
        } else {
            throw new ProsopoContractError(response.result.asErr, this.buildExtrinsic.name)
        }
    }

    /**
     * Perform a contract tx (mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param {number | undefined} value   The value of token that is sent with the transaction
     * @return JSON result containing the contract event
     */
    async contractTx<T>(
        contractMethodName: string,
        args: T[],
        value?: number | BN | undefined
    ): Promise<ContractSubmittableResult> {
        const { extrinsic } = await this.buildExtrinsic(contractMethodName, args, value)
        const nextNonce = await this.api.rpc.system.accountNextIndex(this.pair.address)
        this.nonce = nextNonce ? nextNonce.toNumber() : this.nonce
        this.logger.debug(`Sending ${contractMethodName} tx`)
        const paymentInfo = await extrinsic.paymentInfo(this.pair)
        this.logger.debug(`${contractMethodName} paymentInfo:`, paymentInfo.toHuman())
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const unsub = await extrinsic.signAndSend(
                this.pair,
                { nonce: this.nonce },
                (result: ISubmittableResult) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        // ContractEmitted is the current generation, ContractExecution is the previous generation
                        const contractResult = new ContractSubmittableResult(
                            result,
                            applyOnEvent(result, ['ContractEmitted', 'ContractExecution'], (records: EventRecord[]) =>
                                records
                                    .map(
                                        ({
                                            event: {
                                                data: [, data],
                                            },
                                        }): DecodedEvent | null => {
                                            try {
                                                return this.abi.decodeEvent(data as Bytes)
                                            } catch (error) {
                                                this.logger.error(
                                                    `Unable to decode contract event: ${(error as Error).message}`
                                                )

                                                return null
                                            }
                                        }
                                    )
                                    .filter((decoded): decoded is DecodedEvent => !!decoded)
                            )
                        )
                        unsub()
                        resolve(contractResult)
                    } else if (result.isError) {
                        unsub()
                        reject(new ProsopoContractError(result.status.type))
                    }
                }
            )
        })
    }

    /**
     * Perform a contract query (non-mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param value
     * @param atBlock?
     * @return JSON result containing the contract event
     */
    async contractQuery(
        contractMethodName: string,
        args: any[],
        value?: number | BN | undefined,
        atBlock?: string | Uint8Array
    ): Promise<ContractCallOutcome> {
        const message = this.abi.findMessage(contractMethodName)
        const origin = this.pair.address

        const params: Uint8Array[] = encodeStringArgs(this.abi, message, args)
        let api: ApiBase<'promise'> | ApiDecoration<'promise'> = this.api
        if (atBlock) {
            api = atBlock ? await this.api.at(atBlock) : this.api
        }
        const { gasRequired, result } = await this.query[message.method](
            this.address,
            { gasLimit: -1, storageDepositLimit: null, value: message.isPayable ? value : 0 },
            ...params
        )
        const weight = result.isOk ? (api.registry.createType('WeightV2', gasRequired) as WeightV2) : undefined
        const options = getOptions(this.api, message.isMutating, value, weight)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const responseObservable = api.rx.call.contractsApi
            .call<ContractExecResult>(
                origin,
                this.address,
                options.value ? options.value : BN_ZERO,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore jiggle v1 weights, metadata points to latest
                weight ? weight.weightV2 : options.gasLimit,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                options.storageDepositLimit,
                message.toU8a(params)
            )
            .pipe(
                map(
                    ({ debugMessage, gasConsumed, gasRequired, result, storageDeposit }): ContractCallOutcome => ({
                        debugMessage,
                        gasConsumed,
                        gasRequired:
                            gasRequired && !convertWeight(gasRequired).v1Weight.isZero() ? gasRequired : gasConsumed,
                        output:
                            result.isOk && message.returnType
                                ? this.abi.registry.createTypeUnsafe(
                                      message.returnType.lookupName || message.returnType.type,
                                      [result.asOk.data.toU8a(true)],
                                      { isPedantic: true }
                                  )
                                : null,
                        result,
                        storageDeposit,
                    })
                )
            )
        const response = await firstValueFrom(responseObservable)
        handleContractCallOutcomeErrors(response, contractMethodName)
        if (response.result.isOk) {
            return response
        }
        throw new ProsopoContractError(response.result.asErr, 'contractQuery', undefined, {
            contractMethodName,
            gasLimit: options.gasLimit?.toString(),
            ...(value && { value: value.toString() }),
        })
    }

    /** Get the storage entry from the ABI given a storage name
     * @return the storage entry object
     */
    getStorageKeyAndType(storageName: string): { storageKey: `0x${string}`; storageType: PortableType } {
        const { storageEntry } = this.getStorageEntry(storageName)
        if (storageEntry) {
            let storage = storageEntry
            //const storageType = definitions.types[storageNameCamelCase]
            while ('root' in storage.layout) {
                storage = storage.layout.root
            }
            const rootKey = storage.root_key
            const rootKeyReversed = reverseHexString(rootKey.slice(2))
            return {
                storageKey: `0x${rootKeyReversed}`,
                storageType: this.abi.registry.lookup.types[storage.layout.leaf.ty],
            }
        }
        throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_NAME', this.getStorageKeyAndType.name)
    }

    /** Get the storage entry from the ABI given a storage name
     * @return the storage entry object
     * @param storageName
     */
    getStorageEntry(storageName: string): {
        storageEntry?: StorageEntryMetadataLatest & AbiStorageEntry
        index?: number
    } {
        const index = this.json.storage.root.layout.struct?.fields.findIndex(
            (obj: { name: string }) => obj.name === storageName
        )
        if (index) {
            return { storageEntry: this.json.storage.root.layout.struct?.fields[index], index }
        }

        return { storageEntry: undefined, index: undefined }
    }

    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    async getStorage<T>(name: string): Promise<T> {
        const { storageKey, storageType } = this.getStorageKeyAndType(name)
        if (storageType) {
            const typeDef = this.abi.registry.lookup.getTypeDef(`Lookup${storageType.id.toNumber()}`)
            const promiseResult = this.api.rx.call.contractsApi.getStorage(this.address, storageKey)
            const result = await firstValueFrom(promiseResult)
            const optionBytes = this.abi.registry.createType('Option<Bytes>', result)
            return this.abi.registry.createType(typeDef.type, [optionBytes.unwrap().toU8a(true)]) as T
        }
        throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_TYPE', this.getStorage.name)
    }
}
