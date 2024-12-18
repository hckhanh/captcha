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

// Copyright 2017-2023 @polkadot/react-hooks authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { convertWeight } from "@polkadot/api-contract/base/util";
import type { ApiPromise } from "@polkadot/api/promise/Api";
import type { Weight, WeightV2 } from "@polkadot/types/interfaces";
import { BN } from "@polkadot/util/bn";
import { BN_MILLION, BN_ONE, BN_TEN, BN_ZERO } from "@polkadot/util/bn";
import type { UseWeight } from "@prosopo/types";
import { calcInterval } from "./useBlockInterval.js";

export function useWeightImpl(
	api: ApiPromise,
	blockTime: BN,
	scalingFactor: BN,
): Promise<UseWeight> {
	const isWeightV2 = !!api.registry.createType<WeightV2>("Weight").proofSize;
	const megaGas = <BN>convertWeight(
		api.consts.system.blockWeights
			? api.consts.system.blockWeights.maxBlock
			: (api.consts.system.maximumBlockWeight as Weight),
	)
		.v1Weight.div(BN_MILLION)
		.div(BN_TEN);
	const megaRefTime = <BN>(api.consts.system.blockWeights
		? api.consts.system.blockWeights.perClass.normal.maxExtrinsic
				.unwrapOrDefault()
				// @ts-ignore
				.refTime.toBn()
				.div(BN_MILLION)
				.div(BN_TEN)
		: BN_ZERO);
	const proofSize = <BN>(api.consts.system.blockWeights
		? // @ts-ignore
			api.consts.system.blockWeights.perClass.normal.maxExtrinsic
				.unwrapOrDefault()
				.proofSize.toBn()
		: BN_ZERO);
	const isEmpty = false;

	return new Promise((resolve, reject) => {
		let executionTime = 0;
		let percentage = 0;
		let weight = BN_ZERO;
		let weightV2 = api.registry.createType("WeightV2", {
			proofSize: BN_ZERO,
			refTime: BN_ZERO,
		});
		let isValid = false;

		if (megaGas) {
			weight = megaGas.mul(BN_MILLION);
			executionTime = weight
				.mul(blockTime)
				.div(
					convertWeight(
						// @ts-ignore
						api.consts.system.blockWeights
							? // @ts-ignore
								api.consts.system.blockWeights.maxBlock
							: // @ts-ignore
								(api.consts.system.maximumBlockWeight as Weight),
					).v1Weight,
				)
				.toNumber();
			percentage = (executionTime / blockTime.toNumber()) * 100;

			// execution is 2s of 6s blocks, i.e. 1/3
			executionTime = executionTime / 3000;
			isValid = !megaGas.isZero() && percentage < 65;
		}

		if (isWeightV2 && megaRefTime && proofSize) {
			weightV2 = api.registry.createType("WeightV2", {
				proofSize: proofSize.div(scalingFactor),
				refTime: megaRefTime.mul(BN_MILLION).div(scalingFactor),
			});

			executionTime = megaRefTime
				.mul(BN_MILLION)
				.mul(blockTime)
				.div(
					// @ts-ignore
					api.consts.system.blockWeights
						? // @ts-ignore
							api.consts.system.blockWeights.perClass.normal.maxExtrinsic
								.unwrapOrDefault()
								.refTime.toBn()
						: BN_ONE,
				)
				.toNumber();
			percentage = (executionTime / blockTime.toNumber()) * 100;

			// execution is 2s of 6s blocks, i.e. 1/3
			executionTime = executionTime / 3000;
			isValid = !megaRefTime.isZero() && percentage < 65;
		}

		resolve({
			executionTime,
			isEmpty,
			isValid: isEmpty || isValid,
			isWeightV2,
			megaGas: megaGas || BN_ZERO,
			megaRefTime: megaRefTime || BN_ZERO,
			percentage,
			proofSize: proofSize || BN_ZERO,
			weight,
			// @ts-ignore
			weightV2,
		});
	});
}

export async function getWeight(api: ApiPromise): Promise<UseWeight> {
	const expectedBlockTime = calcInterval(api);
	return await useWeightImpl(api as ApiPromise, expectedBlockTime, new BN(10));
}
