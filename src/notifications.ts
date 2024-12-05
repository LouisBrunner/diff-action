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

const commentLocator = (label?: string): string => {
  return `<!-- Diff Action / Pull Request Comment / ${label ?? ''} -->

`;
};

const commentBody = (label: string | undefined, result: Result): string => {
  return `${commentLocator(label)}## ${getTitle(label)}: ${result.passed ? 'Success' : 'Failure'}
${result.summary}

\`\`\`
${result.output}
\`\`\`
`;
};

const createComment = async (
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  result: Result,
  label?: string,
): Promise<void> => {
  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body: commentBody(label, result),
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
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: comment_id,
    body: commentBody(label, result),
  });
};

const findComment = async (
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  label?: string,
): Promise<undefined | number> => {
  const {viewer}: {viewer: {login?: string}} = await octokit.graphql('query { viewer { login } }');
  const locator = commentLocator(label);
  for await (const entry of octokit.paginate.iterator(octokit.rest.issues.listComments, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
  })) {
    for (const comment of entry.data) {
      if (comment.body?.startsWith(locator) && comment.user?.login === viewer.login) {
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
