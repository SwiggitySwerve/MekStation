import { createHash } from 'node:crypto';

export const GARDEN_MARKER = '<!-- mekstation-ci-garden:v1 -->';
export const RATCHET_BRANCH_PREFIX = 'automation/ci-ratchet-';

export async function updateGardenIssue({
  github,
  owner,
  repo,
  body,
  dryRun = true,
}) {
  if (!body.startsWith(`${GARDEN_MARKER}\n`))
    throw new Error('Garden issue marker missing');
  const { data: metadata } = await github.rest.repos.get({ owner, repo });
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'all',
    per_page: 100,
  });
  const matches = issues
    .filter(
      (issue) =>
        !issue.pull_request &&
        issue.body?.startsWith(`${GARDEN_MARKER}\n`) &&
        ((issue.user?.type === 'Bot' &&
          issue.user.login === 'github-actions[bot]') ||
          (Number.isSafeInteger(metadata.owner?.id) &&
            issue.user?.id === metadata.owner.id)),
    )
    .sort((a, b) => a.number - b.number);
  if (matches.length > 1)
    throw new Error('Multiple CI garden issues require owner consolidation');
  const existing = matches[0];
  const plan = {
    action: existing ? 'update' : 'create',
    issue: existing?.number ?? null,
    repository: metadata.full_name,
  };
  if (dryRun) return { ...plan, dryRun: true };
  const { data } = existing
    ? await github.rest.issues.update({
        owner,
        repo,
        issue_number: existing.number,
        state: 'open',
        body,
      })
    : await github.rest.issues.create({
        owner,
        repo,
        title: 'CI garden: weekly performance and budget evidence',
        body,
      });
  return { ...plan, issue: data.number, url: data.html_url, dryRun: false };
}

// Git data APIs create a new main-based branch. Existing branches/PRs are never
// rewritten, and the only possible tree change is the G1-owned budget JSON.
export async function proposeRatchet({
  github,
  owner,
  repo,
  budgetPath,
  expectedBaseSha,
  content,
  body,
  dryRun = true,
}) {
  if (!content || !body)
    throw new Error('Validated budget content and evidence are required');
  const { data: metadata } = await github.rest.repos.get({ owner, repo });
  const { data: main } = await github.rest.repos.getBranch({
    owner,
    repo,
    branch: metadata.default_branch,
  });
  if (main.commit.sha !== expectedBaseSha)
    throw new Error('Main moved after collection; recollect before proposing');
  const branch = `${RATCHET_BRANCH_PREFIX}${createHash('sha256').update(content).digest('hex').slice(0, 20)}`;
  const open = await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });
  const existing = open.find(
    (pr) =>
      pr.head.repo?.full_name === metadata.full_name &&
      pr.head.ref.startsWith(RATCHET_BRANCH_PREFIX),
  );
  if (existing)
    return {
      action: 'preserve-open-proposal',
      number: existing.number,
      url: existing.html_url,
      dryRun,
    };
  const prior = await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: 'all',
    head: `${owner}:${branch}`,
    per_page: 100,
  });
  if (prior.length)
    return {
      action: 'preserve-prior-proposal',
      number: prior[0].number,
      url: prior[0].html_url,
      dryRun,
    };
  try {
    await github.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    return { action: 'preserve-existing-branch', branch, dryRun };
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  if (dryRun)
    return {
      action: 'create-draft',
      branch,
      base: expectedBaseSha,
      dryRun: true,
    };
  const { data: baseCommit } = await github.rest.git.getCommit({
    owner,
    repo,
    commit_sha: expectedBaseSha,
  });
  const { data: blob } = await github.rest.git.createBlob({
    owner,
    repo,
    content,
    encoding: 'utf-8',
  });
  const { data: tree } = await github.rest.git.createTree({
    owner,
    repo,
    base_tree: baseCommit.tree.sha,
    tree: [{ path: budgetPath, mode: '100644', type: 'blob', sha: blob.sha }],
  });
  const { data: commit } = await github.rest.git.createCommit({
    owner,
    repo,
    message: 'ci(budgets): lower limits from seven complete days of evidence',
    tree: tree.sha,
    parents: [expectedBaseSha],
  });
  // Ref creation is exclusive. A simultaneous writer gets an error, not a push.
  await github.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: commit.sha,
  });
  const { data: pr } = await github.rest.pulls.create({
    owner,
    repo,
    base: metadata.default_branch,
    head: branch,
    title: 'ci(budgets): lower limits from sustained measured headroom',
    body,
    draft: true,
    maintainer_can_modify: true,
  });
  return {
    action: 'created-draft',
    number: pr.number,
    url: pr.html_url,
    head: commit.sha,
    branch,
    dryRun: false,
  };
}
