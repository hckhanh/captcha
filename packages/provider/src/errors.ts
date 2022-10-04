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
import {ProsopoEnvError} from "@prosopo/contract";

export class ApiError extends ProsopoEnvError {
    constructor (err) {
        super(err)
    }

    getCode () {
        if (this instanceof BadRequest) {
            return 500
        }
        if (this instanceof NotFound) {
            return 404
        }
        return 400
    }
}

export class BadRequest extends ApiError {
}

export class NotFound extends ApiError {
}

export const handleErrors = (err, req, res, next) => {
    const code = err instanceof ApiError ? err.getCode() : 500;

    return res.status(code).json({
        message: err.getTranslated(req.i18n) ?? err.message,
        name: err.name
    })
}
