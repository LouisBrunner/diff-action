import type { InputOptions } from "@actions/core";
import { type Args, Mode, Tolerance } from "./namespaces/Inputs";

type GetInput = (name: string, options?: InputOptions) => string;

export const parseInputs = (getInput: GetInput): Args => {
	const old = getInput("old", { required: true });
	const newPath = getInput("new", { required: true });
	const mode = getInput("mode", { required: true }) as Mode;
	const tolerance = getInput("tolerance", {
		required: true,
	}) as Tolerance;
	const output = getInput("output");

	if (!Object.values(Mode).includes(mode)) {
		throw new Error(`invalid value for 'mode': '${mode}'`);
	}

	if (!Object.values(Tolerance).includes(tolerance)) {
		throw new Error(`invalid value for 'tolerance': '${tolerance}'`);
	}

	if (mode === Mode.Strict && tolerance !== Tolerance.Same) {
		throw new Error(`'tolerance' must be 'same' when 'mode' is 'strict'`);
	}

	let notifications: Args["notifications"];
	const notify_check = getInput("notify_check");
	const notify_issue = getInput("notify_issue");
	const sticky_comment = getInput("sticky_comment");
	if (notify_check || notify_issue) {
		const label = getInput("title");
		const token = getInput("token", { required: true });
		notifications = {
			token,
			label,
			check: notify_check === "true",
			issue: notify_issue === "true",
			sticky: sticky_comment === "true",
		};
	}

	return {
		old,
		new: newPath,

		mode,
		tolerance,
		output,

		notifications,
	};
};
