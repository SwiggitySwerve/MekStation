// Immutable workflow graphs belong to G1; attempt normalization belongs to G2.
export async function collectSourceHeadRun({
  github, owner, repo, run, workflowPath, collectRun, workflowGraphFromSource,
}) {
  const { data: workflow } = await github.rest.repos.getContent({
    owner, repo, path: workflowPath, ref: run.head_sha,
  });
  if (workflow.encoding !== 'base64' || typeof workflow.content !== 'string')
    throw new Error('Source-head workflow must be an ordinary base64 blob');
  const graph = workflowGraphFromSource(Buffer.from(workflow.content, 'base64').toString('utf8'));
  const fresh = await collectRun(async (method, route) => {
    if (method !== 'GET') throw new Error('Observation verification is read-only');
    const { data } = await github.request(`GET /${route}`);
    return data;
  }, { repository: `${owner}/${repo}`, runId: run.id, attempt: run.run_attempt,
    graphs: { repository: `${owner}/${repo}`, graphs: { [run.head_sha]: graph } } });
  return { ...fresh, workflowBlobSha: workflow.sha };
}
