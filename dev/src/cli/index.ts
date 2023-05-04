import { loadEnv } from '@prosopo/env'
import consola, { LogLevel } from 'consola'
import path from 'path'
import yargs from 'yargs'
import { deployDapp, deployProtocol } from '../deploy/index'
import { setup } from '../setup/index'
import { updateEnvFiles } from '../util/updateEnv'
const rootDir = path.resolve('.')

loadEnv(rootDir)

export async function processArgs(args) {
    const parsed = await yargs.option('logLevel', {
        describe: 'set log level',
        choices: Object.keys(LogLevel),
    }).argv

    const logger = consola.create({ level: LogLevel[parsed.logLevel || 'Info'] })

    yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .command(
            'deploy_protocol',
            'Deploy the prosopo protocol contract',
            (yargs) =>
                yargs.option('update_env', {
                    type: 'boolean',
                    demand: false,
                    desc: 'Update env files with the new contract address',
                    default: false,
                }),
            async (argv) => {
                if (!process.env.PROTOCOL_WASM_PATH || !process.env.PROTOCOL_ABI_PATH) {
                    throw new Error('Missing protocol wasm or json path')
                }
                const protocolContractAddress = await deployProtocol(
                    process.env.PROTOCOL_WASM_PATH,
                    process.env.PROTOCOL_ABI_PATH
                )
                logger.info('contract address', protocolContractAddress)
                if (argv.update_env) {
                    await updateEnvFiles(
                        [
                            'PROTOCOL_CONTRACT_ADDRESS',
                            'REACT_APP_PROSOPO_CONTRACT_ADDRESS',
                            'NEXT_PUBLIC_PROSOPO_CONTRACT_ADDRESS',
                        ],
                        protocolContractAddress.toString(),
                        logger
                    )
                }
            },
            []
        )
        .command(
            'deploy_dapp',
            'Deploy the prosopo dapp example contract',
            (yargs) =>
                yargs.option('update_env', {
                    type: 'boolean',
                    demand: false,
                    desc: 'Update env files with the new contract address',
                    default: false,
                }),
            async (argv) => {
                const dappContractAddress = await deployDapp()
                logger.info('contract address', dappContractAddress)
                if (argv.update_env) {
                    await updateEnvFiles(
                        [
                            'DAPP_CONTRACT_ADDRESS',
                            'REACT_APP_DAPP_CONTRACT_ADDRESS',
                            'NEXT_PUBLIC_DAPP_CONTRACT_ADDRESS',
                        ],
                        dappContractAddress.toString(),
                        logger
                    )
                }
            },
            []
        )
        .command({
            command: 'setup',
            describe:
                'Setup the development environment by registering a provider, staking, loading a data set and then registering a dapp and staking.',
            handler: async () => {
                console.log('Running setup scripts')
                await setup()
            },
        })
    await yargs.parse()
}
processArgs(process.argv.slice(2))
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })