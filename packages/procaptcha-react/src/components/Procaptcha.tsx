import type { ProcaptchaEvents } from "@prosopo/types";
import { ProcaptchaPlaceholder } from "@prosopo/web-components";
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
import { type LazyExoticComponent, Suspense, lazy } from "react";
import type { ReactElement } from "react";

//https://github.com/microsoft/TypeScript/issues/42873
const ProcaptchaWidget: LazyExoticComponent<
	// biome-ignore lint/suspicious/noExplicitAny: TODO fix
	(props: any, callbacks: Partial<ProcaptchaEvents>) => ReactElement
> = lazy(async () => import("./ProcaptchaWidget.js"));
type ProcaptchaProps = React.ComponentProps<typeof ProcaptchaWidget>;

const Procaptcha = (props: ProcaptchaProps) => (
	<Suspense fallback={<ProcaptchaPlaceholder darkMode={props.config.theme} />}>
		<ProcaptchaWidget config={props.config} callbacks={props.callbacks} />
	</Suspense>
);

export default Procaptcha;
