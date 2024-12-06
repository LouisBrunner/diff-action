import fs from "node:fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { parseInputs } from "./inputs";
import {
	createComment,
	createRun,
	shouldComment,
	upsertComment,
} from "./notifications";
import { processDiff } from "./processing";

const work = async (): Promise<void> => {
	core.debug("Parsing inputs");
	const inputs = parseInputs(core.getInput);

	core.debug("Calculate result");
	const result = processDiff(
		inputs.old,
		inputs.new,
		inputs.mode,
		inputs.tolerance,
	);

	if (inputs.notifications !== undefined) {
		core.debug("Setting up OctoKit");
		const octokit = github.getOctokit(inputs.notifications.token);

		if (inputs.notifications.add_check) {
			core.debug("Notification: Check Run");
			await createRun(
				octokit,
				github.context,
				result,
				inputs.notifications.label,
			);
		}
		if (shouldComment(inputs.notifications.comment_on, result.passed)) {
			core.debug("Notification: Issue");
			const issueId = github.context.issue.number;
			if (issueId || issueId === 0) {
				if (inputs.notifications.sticky_comment) {
					await upsertComment(
						octokit,
						github.context,
						result,
						inputs.notifications.label,
					);
				} else {
					await createComment(
						octokit,
						github.context,
						result,
						inputs.notifications.label,
					);
				}
			} else {
				core.debug("Notification: no issue id");
			}
		}
	}

	core.debug("Checking tolerance");
	if (!result.passed) {
		core.setFailed(result.summary);
	}
	core.info(result.summary);
	core.info("===");
	core.info(result.output);

	core.debug("Setting outputs");
	core.setOutput("passed", result.passed ? "true" : "false");
	core.setOutput("output", result.output);

	if (inputs.output) {
		core.debug("Setting outputs");
		fs.writeFileSync(inputs.output, result.output);
	}

	core.debug("Done");
};

const run = async (): Promise<void> => {
	try {
		await work();
	} catch (e) {
		const error = e as Error;
		core.debug(error.toString());
		core.setFailed(error.message);
	}
};

void run();
