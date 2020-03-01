import {GitHub} from '@actions/github';
import {Result} from './processing';
import {Context} from '@actions/github/lib/context';

const formatDate = (): string => {
  return new Date().toISOString();
};

const title = 'Smart Diff';

export const createRun = async (octokit: GitHub, context: Context, result: Result): Promise<void> => {
  await octokit.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    head_sha: context.sha,
    status: 'completed',
    conclusion: result.passed ? 'success' : 'failure',
    name: title,
    started_at: formatDate(),
    completed_at: formatDate(),
    output: {
      title,
      summary: result.summary,
      text: result.output,
    },
  });
};

export const createComment = async (octokit: GitHub, context: Context, result: Result): Promise<void> => {
  await octokit.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body: `## ${title}: ${result.passed ? 'Success' : 'Failure'}
${result.summary}

${result.output}
`,
  });
};
