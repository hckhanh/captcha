import { InjectedAccount, InjectedExtension } from '@polkadot/extension-inject/types'
import { GetCaptchaResponse } from '@prosopo/api'
import { ProsopoCaptchaApi } from '../modules'
import { TCaptchaSubmitResult } from './client'
import { ProsopoNetwork } from '@prosopo/api'
import { Optional } from './utils'

/**
 * House the account and associated extension.
 */
export interface Account {
    account: InjectedAccount
    extension: InjectedExtension
}

/**
 * The configuration of Procaptcha. This is passed it to Procaptcha as a prop. Values here are not updated by Procaptcha and are considered immutable from within Procaptcha.
 */
export interface ProcaptchaConfig {
    userAccountAddress: string // address of the user's account, undefined if not set / in web2 mode
    web2: boolean // set to true to use the web2 version of Procaptcha, else web3 version
    dappName: string // the name of the dapp accessing accounts (e.g. Prosopo)
    network: ProsopoNetwork // the network to use, e.g. "moonbeam", "edgeware", etc
    solutionThreshold: number // the threshold of solutions solved by the user to be considered human
}

export type ProcaptchaConfigOptional = Optional<Optional<ProcaptchaConfig, 'userAccountAddress'>, 'web2'>

/**
 * The state of Procaptcha. This is mutated as required to reflect the captcha process.
 */
export interface ProcaptchaState {
    isHuman: boolean // is the user human?
    index: number // the index of the captcha round currently being shown
    solutions: string[][] // the solutions for each captcha round
    captchaApi: ProsopoCaptchaApi | undefined // the captcha api instance for managing captcha challenge. undefined if not set up
    challenge: GetCaptchaResponse | undefined // the captcha challenge from the provider. undefined if not set up
    showModal: boolean // whether to show the modal or not
    loading: boolean // whether the captcha is loading or not
    account: Account | undefined // the account operating the challenge. undefined if not set
    submission: TCaptchaSubmitResult | undefined // the result of the captcha submission. undefined if not submitted
}

export type StateUpdateFn = (state: Partial<ProcaptchaState>) => void

export type ProcaptchaCallbacks = Partial<Events>

export interface Events {
    onError: (error: Error) => void
    onAccountNotFound: (address: string) => void
    onHuman: () => void
    onExtensionNotFound: () => void
}
