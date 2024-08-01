// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { type UserCommitmentRecord, UserCommitmentRecordSchema } from '@prosopo/types-database'
import { getLoggerDefault } from '@prosopo/common'
import mongoose from 'mongoose'
const logger = getLoggerDefault()

const StoredCaptcha = mongoose.model('StoredCaptcha', UserCommitmentRecordSchema)

export const saveCaptchas = async (events: UserCommitmentRecord[], atlasUri: string) => {
    const connection = mongoose.createConnection(atlasUri, {
        authSource: 'admin',
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    await new Promise((resolve) => {
        connection
            .once('open', () => {
                logger.info('Connected to MongoDB Atlas')
                resolve()
            })
            .on('error', reject)
    })
    await StoredCaptcha.insertMany(events)
    logger.info('Mongo Saved Events')
    await connection.close()
}
