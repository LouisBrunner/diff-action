import {GitHub} from '@actions/github/lib/utils';
import {Result} from './processing';
import {Context} from '@actions/github/lib/context';

const formatDate = (): string => {
  return new Date().toISOString();
};

const getTitle = (label?: string): string => {
  const more = label ? ` (${label})` : '';
  return `Smart Diff${more}`;
};

export const createRun = async (
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  result: Result,
  label?: string,
): Promise<void> => {
  const title = getTitle(label);
  await octokit.rest.checks.create({
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

export const createComment = async (
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  result: Result,
  label?: string,
): Promise<void> => {
  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body: `## ${getTitle(label)}: ${result.passed ? 'Success' : 'Failure'}
${result.summary}

\`\`\`
${result.output}
\`\`\`
`,
  });
};
