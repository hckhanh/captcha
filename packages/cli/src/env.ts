// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function getEnv() {
    if (process.env.NODE_ENV) {
        return process.env.NODE_ENV.replace(/[^0-9a-z_]/gi, '')
    }
    return 'development'
}

export function loadEnv(rootDir?: string, filename?: string, filePath?: string) {
    const envPath = getEnvFile(path.resolve(rootDir || '.'), filename, filePath)
    const args = { path: envPath }
    dotenv.config(args)
}

export function getEnvFile(rootDir?: string, filename = '.env', filepath = path.join(__dirname, '../..')) {
    const env = getEnv()
    return path.join(rootDir || filepath, `${filename}.${env}`)
}
