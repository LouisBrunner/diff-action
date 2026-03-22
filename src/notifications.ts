import type { context } from "@actions/github";
import type { GitHub } from "@actions/github/lib/utils";
import type { Notifications } from "./inputs";
import type { Result } from "./processing";

type Context = typeof context;

const formatDate = (): string => {
	return new Date().toISOString();
};

const getTitle = (label?: string): string => {
	const more = label ? ` (${label})` : "";
	return `Smart Diff${more}`;
};

export const shouldComment = (
	comment_on: Notifications["comment_on"],
	passed: boolean,
): boolean => {
	return (
		comment_on === "always" ||
		(comment_on === "success" && passed) ||
		(comment_on === "failure" && !passed)
	);
};

export const createRun = async (
	octokit: InstanceType<typeof GitHub>,
	context: Context,
	result: Result,
	label?: string,
): Promise<void> => {
	const title = getTitle(label);
	const now = formatDate();
	await octokit.rest.checks.create({
		completed_at: now,
		conclusion: result.passed ? "success" : "failure",
		head_sha: context.sha,
		name: title,
		output: {
			summary: result.summary,
			text: result.output,
			title,
		},
		owner: context.repo.owner,
		repo: context.repo.repo,
		started_at: now,
		status: "completed",
	});
};

const commentLocator = (label?: string): string => {
	return `<!-- Diff Action / Pull Request Comment / ${label ?? ""} -->`;
};

const commentBody = (label: string | undefined, result: Result): string => {
	return `## ${getTitle(label)}: ${result.passed ? "Success" : "Failure"}
${result.summary}

\`\`\`
${result.output}
\`\`\`

${commentLocator(label)}`;
};

export const createComment = async (
	octokit: InstanceType<typeof GitHub>,
	context: Context,
	result: Result,
	label?: string,
): Promise<void> => {
	await octokit.rest.issues.createComment({
		body: commentBody(label, result),
		issue_number: context.issue.number,
		owner: context.repo.owner,
		repo: context.repo.repo,
	});
};

const updateComment = async (
	octokit: InstanceType<typeof GitHub>,
	context: Context,
	comment_id: number,
	result: Result,
	label?: string,
): Promise<void> => {
	await octokit.rest.issues.updateComment({
		body: commentBody(label, result),
		comment_id: comment_id,
		owner: context.repo.owner,
		repo: context.repo.repo,
	});
};

const findComment = async (
	octokit: InstanceType<typeof GitHub>,
	context: Context,
	label?: string,
): Promise<undefined | number> => {
	const { viewer }: { viewer: { login?: string } } = await octokit.graphql(
		"query { viewer { login } }",
	);
	const locator = commentLocator(label);
	for await (const entry of octokit.paginate.iterator(
		octokit.rest.issues.listComments,
		{
			issue_number: context.issue.number,
			owner: context.repo.owner,
			repo: context.repo.repo,
		},
	)) {
		for (const comment of entry.data) {
			if (
				comment.body?.endsWith(locator) &&
				comment.user?.login === viewer.login
			) {
				return comment.id;
			}
		}
	}
};

export const upsertComment = async (
	octokit: InstanceType<typeof GitHub>,
	context: Context,
	result: Result,
	label?: string,
): Promise<void> => {
	const comment_id = await findComment(octokit, context, label);
	if (comment_id !== undefined) {
		await updateComment(octokit, context, comment_id, result, label);
	} else {
		await createComment(octokit, context, result, label);
	}
};
