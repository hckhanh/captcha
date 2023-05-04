export const definitions = {
    types: {
        Providers: 'Map<AccountId,ProsopoProvider>',
        ProviderAccounts: 'Map<ProsopoGovernanceStatus<BTreeSet,AccountId>>',
        ServiceOrigins: 'Map<Hash,()>',
        CaptchaData: 'Map<Hash,ProsopoCaptchaData>',
        CaptchaSolutionCommitments: 'Map<Hash,ProsopoCaptchaSolutionCommitment>',
        ProviderStakeDefault: 'u128',
        DappStakeDefault: 'u128',
        Dapps: 'Map<AccountId,ProsopoDapp>',
        DappAccounts: 'Vec<AccountId>',
        Operators: 'Map<AccountId,ProsopoOperator>',
        OperatorAccounts: 'Vec<AccountId>',
        OperatorStakeDefault: 'u64',
        OperatorFeeCurrency: 'Hash',
        DappUsers: 'Map<AccountId,ProsopoUser>',
        DappUserAccounts: 'Vec<AccountId>',
        ProsopoProvider: {
            status: 'ProsopoGovernanceStatus',
            balance: 'u128',
            fee: 'u32',
            payee: 'ProsopoPayee',
            serviceOrigin: 'Hash',
            datasetId: 'Hash',
            datasetIdContent: 'Hash',
        },
        ProsopoGovernanceStatus: {
            _enum: ['Active', 'Suspended', 'Deactivated'],
        },
        ProsopoPayee: {
            _enum: ['Provider', 'Dapp', 'None'],
        },
        ProsopoCaptchaData: {
            provider: 'AccountId',
            datasetId: 'Hash',
            captchaType: 'u16',
        },
        ProsopoCaptchaSolutionCommitment: {
            account: 'AccountId',
            datasetId: 'Hash',
            status: 'ProsopoCaptchaStatus',
            contract: 'AccountId',
            provider: 'AccountId',
            completedAt: 'u64',
        },
        ProsopoCaptchaStatus: {
            _enum: ['Pending', 'Approved', 'Disapproved'],
        },
        ProsopoDapp: {
            status: 'ProsopoGovernanceStatus',
            balance: 'u128',
            owner: 'AccountId',
            minDifficulty: 'u16',
            clientOrigin: 'Hash',
        },
        ProsopoOperator: {
            status: 'ProsopoGovernanceStatus',
        },
        ProsopoUser: {
            correctCaptchas: 'u64',
            incorrectCaptchas: 'u64',
            lastCorrectCaptcha: 'u64',
            lastCorrectCaptchaDappId: 'AccountId',
        },
        ProsopoError: {
            _enum: [
                'NotAuthorised',
                'ContractInsufficientFunds',
                'ContractTransferFailed',
                'ProviderExists',
                'ProviderDoesNotExist',
                'ProviderInsufficientFunds',
                'ProviderInactive',
                'ProviderServiceOriginUsed',
                'DuplicateCaptchaDataId',
                'DappExists',
                'DappDoesNotExist',
                'DappInactive',
                'DappInsufficientFunds',
                'CaptchaDataDoesNotExist',
                'CaptchaSolutionCommitmentDoesNotExist',
                'CaptchaSolutionCommitmentExists',
                'DappUserDoesNotExist',
                'NoActiveProviders',
                'DatasetIdSolutionsSame',
            ],
        },
        ProsopoLastCorrectCaptcha: {
            beforeMs: 'u32',
            dappId: 'AccountId',
        },
        ProsopoRandomProvider: {
            providerId: 'AccountId',
            provider: 'ProsopoProvider',
            blockNumber: 'u32',
        },
    },
}

export type DefinitionKeys = keyof typeof definitions.types | 'bool'