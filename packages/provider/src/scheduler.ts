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
// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { CronJob } from 'cron'

import { Environment } from '@prosopo/env'
import { Tasks } from './tasks/tasks'
import { KeyringPair } from '@polkadot/keyring/types'
import { ProsopoConfig } from '@prosopo/types'

export default async function (pair: KeyringPair, config: ProsopoConfig) {
    const env = new Environment(pair, config)

    await env.isReady()

    const tasks = new Tasks(env)
    const job = new CronJob(process.argv[2], () => {
        env.logger.debug('It works....')
        tasks.calculateCaptchaSolutions().catch((err) => {
            env.logger.error(err)
        })
    })

    job.start()
}
