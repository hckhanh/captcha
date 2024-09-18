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

import type { TFunction } from "i18next";
import { z } from "zod";
import { ProsopoError } from "./error.js";
import translationEn from "./locales/en.json" assert { type: "json" };
import translationEs from "./locales/es.json" assert { type: "json" };
import translationPt from "./locales/pt.json" assert { type: "json" };

export function isClientSide(): boolean {
	return !!(
		typeof window !== "undefined" &&
		window.document &&
		window.document.createElement
	);
}

export type TFunctionParams = Parameters<TFunction>;

type Node =
	| {
			[key: string]: Node | string;
	  }
	| string;

function getLeafFieldPath(obj: Node): string[] {
	if (typeof obj === "string") {
		return [];
	}

	return Object.keys(obj).reduce((arr, key) => {
		const value = obj[key];
		if (value === undefined) {
			throw new ProsopoError("DEVELOPER.KEY_ERROR", {
				context: { error: `Undefined value for key ${key}` },
			});
		}
		const children = getLeafFieldPath(value);

		return arr.concat(
			children.map((child) => {
				return `${key}.${child}`;
			}),
		);
	}, [] as string[]);
}

export const TranslationKeysSchema = z.enum(
	getLeafFieldPath(translationEn) as [string, ...string[]],
);

export type TranslationKey = z.infer<typeof TranslationKeysSchema>;

const TranslationFileSchema = z.record(
	TranslationKeysSchema,
	z.record(TranslationKeysSchema, z.string()),
);

// String utils

export function reverseHexString(str: string): `0x${string}` {
	return `0x${
		str
			.match(/.{1,2}/g)
			?.reverse()
			.join("") || ""
	}`;
}
