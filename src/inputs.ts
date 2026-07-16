/** biome-ignore-all lint/style/useNamingConvention: GH Names */
import type { InputOptions } from "@actions/core";

export type Notifications = {
	token: string;
	label?: string;
	comment_on: "always" | "failure" | "success" | false;
	sticky_comment: boolean;
	add_check: boolean;
};

export type Args = {
	old: string;
	new: string;

	tolerance: Tolerance;
	mode: Mode;
	output?: string;

	notifications?: Notifications;
};

export enum Tolerance {
	Better = "better",
	MixedBetter = "mixed-better",
	Same = "same",
	Mixed = "mixed",
	MixedWorse = "mixed-worse",
	Worse = "worse",
}

export enum Mode {
	Strict = "strict",
	Addition = "addition",
	Deletion = "deletion",
}

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

	let notifications: Notifications | undefined;
	const notifyCheck = getInput("notify_check");
	const notifyIssue = getInput("notify_issue");
	if (notifyCheck || notifyIssue) {
		const stickyComment = getInput("sticky_comment");
		const label = getInput("title");
		const token = getInput("token", { required: true });
		let commentOn: Notifications["comment_on"] = false;
		switch (notifyIssue) {
			case "true":
			case "always":
				commentOn = "always";
				break;
			case "failure":
				commentOn = "failure";
				break;
			case "success":
				commentOn = "success";
				break;
		}
		notifications = {
			add_check: notifyCheck === "true",
			comment_on: commentOn,
			label,
			sticky_comment: stickyComment === "true",
			token,
		};
	}

	return {
		mode,
		new: newPath,
		notifications,
		old,
		output,
		tolerance,
	};
};
