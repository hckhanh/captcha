// Copyright 2021-2022 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { ProsopoServerConfigSchema } from '@prosopo/types'

export const getServerConfig = () =>
    ProsopoServerConfigSchema.parse({
        defaultEnvironment: process.env.DEFAULT_ENVIRONMENT, // enviromental variables
        defaultNetwork: process.env.DEFAULT_NETWORK,
        serverUrl:
            // https://github.com/prosopo/captcha/issues/701
            process.env.REACT_APP_SERVER_URL && process.env.REACT_APP_SERVER_PORT
                ? `${process.env.REACT_APP_SERVER_URL}:${process.env.REACT_APP_SERVER_PORT}`
                : 'http://localhost:9228',
        dappName: process.env.REACT_APP_DAPP_NAME || 'client-example-server',
        account: {
            password: '',
            address: process.env.REACT_APP_SERVER_ACCOUNT_ADDRESS || '',
        },
    })