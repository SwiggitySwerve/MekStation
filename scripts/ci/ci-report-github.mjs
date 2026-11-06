// GitHub I/O only. Call from trusted default-branch code, never a PR checkout.
import { execFileSync } from 'node:child_process';

import { normalizeRun } from './ci-metrics.mjs';
import {
  REPORT_MARKER,
  REVIEW_LABEL,
  renderReport,
} from './ci-report-evaluate.mjs';

export function githubApi(method, route, body) {
  const args = ['api', '--method', method, route];
  if (body !== undefined) args.push('--input', '-');
  let output;
  try {
    output = execFileSync('gh', args, {
      encoding: 'utf8',
      input: body === undefined ? undefined : JSON.stringify(body),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(
      `GitHub API ${method} ${route} failed (exit ${error.status ?? 'timeout'})`,
    );
  }
  return output.trim() ? JSON.parse(output) : null;
}

export async function paginate(api, route, field) {
  const result = [];
  for (let page = 1; ; page += 1) {
    const response = await api(
      'GET',
      `${route}${route.includes('?') ? '&' : '?'}per_page=100&page=${page}`,
    );
    const rows = field ? response[field] : response;
    if (!Array.isArray(rows))
      throw new Error(`Invalid paginated response: ${field ?? 'array'}`);
    result.push(...rows);
    if (rows.length < 100) return result;
    if (page >= 100)
      throw new Error('Pagination safety limit exceeded; data incomplete');
  }
}

export async function collectRun(
  api,
  { repository, runId, attempt, jobGraph, matrixGroups = {}, graphs },
) {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
    ![runId, attempt].every((n) => Number.isSafeInteger(n) && n > 0)
  )
    throw new Error('Invalid collection target');
  const route = `repos/${repository}/actions/runs/${runId}/attempts/${attempt}`;
  const run = await api('GET', route);
  const jobs = await paginate(api, `${route}/jobs`, 'jobs');
  if (graphs) {
    if (graphs.repository !== repository || !graphs.graphs?.[run.head_sha])
      throw new Error(
        `Source-head workflow graph unavailable: ${run.head_sha}`,
      );
    ({ jobGraph, matrixGroups = {} } = graphs.graphs[run.head_sha]);
  }
  return {
    run,
    jobs,
    observation: normalizeRun({
      repository,
      run,
      jobs,
      jobGraph,
      matrixGroups,
    }),
  };
}

export async function publishReport({
  api,
  repository,
  pullNumber,
  expectedWorkflowId,
  report,
  dryRun = false,
  actor = 'github-actions[bot]',
}) {
  const diagnostics = [];
  const actions = [];
  try {
    const id = report.identity;
    if (
      id.repository !== repository ||
      !Number.isSafeInteger(pullNumber) ||
      pullNumber <= 0 ||
      id.workflowId !== expectedWorkflowId ||
      id.event !== 'pull_request'
    )
      throw new Error('Report is not attributed to the expected PR workflow');
    const root = `repos/${repository}`;
    const pullRoute = `${root}/pulls/${pullNumber}`;
    async function current() {
      const run = await api('GET', `${root}/actions/runs/${id.runId}`);
      const pr = await api('GET', pullRoute);
      return (
        run.run_attempt === id.attempt &&
        run.head_sha === id.headSha &&
        run.workflow_id === expectedWorkflowId &&
        run.status === 'completed' &&
        run.event === 'pull_request' &&
        pr.state === 'open' &&
        pr.base?.repo?.full_name?.toLowerCase() === repository.toLowerCase() &&
        pr.head?.sha === id.headSha &&
        run.pull_requests?.some(
          (entry) =>
            entry.number === pullNumber && entry.head?.sha === id.headSha,
        )
      );
    }
    if (!(await current()))
      return {
        status: 'stale',
        actions,
        diagnostics: ['Run attempt or PR head changed; no writes'],
      };
    const comments = await paginate(
      api,
      `${root}/issues/${pullNumber}/comments`,
    );
    const owned = comments
      .filter(
        (comment) =>
          comment.user?.login === actor &&
          comment.user?.type === 'Bot' &&
          comment.body?.startsWith(`${REPORT_MARKER}\n`),
      )
      .sort((a, b) => a.id - b.id);
    const sources = owned.map((comment) =>
      comment.body.match(/<!-- source:(\d+):(\d+):([a-f\d]{40}) -->/),
    );
    if (
      sources.some(
        (source) =>
          source &&
          source[3] === id.headSha &&
          (Number(source[1]) > id.runId ||
            (Number(source[1]) === id.runId && Number(source[2]) > id.attempt)),
      )
    )
      return {
        status: 'stale',
        actions,
        diagnostics: ['A newer same-head report already exists'],
      };
    async function write(method, route, body) {
      if (!(await current()))
        throw new Error('Run attempt or PR head changed before write');
      actions.push({ method, route });
      if (!dryRun) await api(method, route, body);
    }
    const body = renderReport(report);
    // Serialize publishers in workflow concurrency. Re-read identities before every write.
    if (owned.length) {
      if (owned[0].body !== body)
        await write('PATCH', `${root}/issues/comments/${owned[0].id}`, {
          body,
        });
      for (const duplicate of owned.slice(1))
        await write('DELETE', `${root}/issues/comments/${duplicate.id}`);
    } else
      await write('POST', `${root}/issues/${pullNumber}/comments`, { body });
    const labels = await paginate(api, `${root}/issues/${pullNumber}/labels`);
    const hasLabel = labels.some((label) => label.name === REVIEW_LABEL);
    if (report.breach && !hasLabel)
      await write('POST', `${root}/issues/${pullNumber}/labels`, {
        labels: [REVIEW_LABEL],
      });
    // Unavailable label-defining timings retain a warning; informational files do not.
    else if (
      !report.breach &&
      (report.labelComplete ?? report.complete) &&
      hasLabel
    )
      await write(
        'DELETE',
        `${root}/issues/${pullNumber}/labels/${REVIEW_LABEL}`,
      );
    return { status: dryRun ? 'dry-run' : 'published', actions, diagnostics };
  } catch (error) {
    // Reporting API outages never rewrite a test result or fail the producer job.
    diagnostics.push(
      `CI reporting unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return { status: 'error', actions, diagnostics };
  }
}
