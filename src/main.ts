import fs from "node:fs";
import { debug, getInput, info, setFailed, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { parseInputs } from "./inputs.ts";
import {
	createComment,
	createRun,
	shouldComment,
	upsertComment,
} from "./notifications.ts";
import { processDiff } from "./processing.ts";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: eh
const work = async (): Promise<void> => {
	debug("Parsing inputs");
	const inputs = parseInputs(getInput);

	debug("Calculate result");
	const result = processDiff(
		inputs.old,
		inputs.new,
		inputs.mode,
		inputs.tolerance,
	);

	if (inputs.notifications !== undefined) {
		debug("Setting up OctoKit");
		const octokit = getOctokit(inputs.notifications.token);

		if (inputs.notifications.add_check) {
			debug("Notification: Check Run");
			await createRun(octokit, context, result, inputs.notifications.label);
		}
		if (shouldComment(inputs.notifications.comment_on, result.passed)) {
			debug("Notification: Issue");
			const issueId = context.issue.number;
			if (issueId || issueId === 0) {
				if (inputs.notifications.sticky_comment) {
					await upsertComment(
						octokit,
						context,
						result,
						inputs.notifications.label,
					);
				} else {
					await createComment(
						octokit,
						context,
						result,
						inputs.notifications.label,
					);
				}
			} else {
				debug("Notification: no issue id");
			}
		}
	}

	debug("Checking tolerance");
	if (!result.passed) {
		setFailed(result.summary);
	}
	info(result.summary);
	info("===");
	info(result.output);

	debug("Setting outputs");
	setOutput("passed", result.passed ? "true" : "false");
	setOutput("output", result.output);

	if (inputs.output) {
		debug("Setting outputs");
		fs.writeFileSync(inputs.output, result.output);
	}

	debug("Done");
};

const run = async (): Promise<void> => {
	try {
		await work();
	} catch (e) {
		const error = e as Error;
		debug(error.toString());
		setFailed(error.message);
	}
};

run();
