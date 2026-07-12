const graphKinds = new Set([
  'capability',
  'surface',
  'module',
  'submodule',
  'state',
  'journey',
  'command',
  'evidence',
  'log-event',
  'known-gap',
]);
const graphRelations = new Set([
  'contains',
  'validated-by',
  'produces',
  'logs',
  'blocked-by',
  'documents-gap',
]);
const keyForEdge = (from, to, relation) =>
  `${from}\u0000${to}\u0000${relation}`;
const keyForOutgoing = (from, relation) => `${from}\u0000${relation}`;
const issue = (severity, message) => ({ severity, message });

function indexNodes(nodes, issues) {
  const nodeIds = new Set();
  const nodesById = new Map();
  for (const [index, node] of nodes.entries()) {
    const label = node.id || `nodes[${index}]`;
    if (typeof node.id !== 'string' || node.id.trim() === '')
      issues.push(issue('error', `${label}: id must be a non-empty string.`));
    if (nodeIds.has(node.id))
      issues.push(issue('error', `${label}: duplicate node id.`));
    nodeIds.add(node.id);
    nodesById.set(node.id, node);
    if (!graphKinds.has(node.kind))
      issues.push(issue('error', `${label}: invalid kind ${node.kind}.`));
    if (typeof node.label !== 'string' || node.label.trim() === '')
      issues.push(
        issue('error', `${label}: label must be a non-empty string.`),
      );
  }
  return { nodeIds, nodesById };
}

function validateEdges(edges, nodeIds, issues) {
  for (const [index, edge] of edges.entries()) {
    const label = `edges[${index}]`;
    if (!nodeIds.has(edge.from))
      issues.push(issue('error', `${label}: missing from node ${edge.from}.`));
    if (!nodeIds.has(edge.to))
      issues.push(issue('error', `${label}: missing to node ${edge.to}.`));
    if (!graphRelations.has(edge.relation))
      issues.push(
        issue('error', `${label}: invalid relation ${edge.relation}.`),
      );
  }
}

function validateJourneyNodes(nodes, nodeIds, catalog, issues) {
  const catalogJourneyIds = new Set(
    catalog.journeys.map((journey) => journey.id),
  );
  for (const node of nodes) {
    if (node.kind !== 'journey') continue;
    const journeyId = node.id.replace(/^journey:/, '');
    if (!catalogJourneyIds.has(journeyId))
      issues.push(
        issue('error', `Graph references orphaned journey ${journeyId}.`),
      );
  }
  for (const journeyId of catalogJourneyIds) {
    if (!nodeIds.has(`journey:${journeyId}`))
      issues.push(
        issue('error', `Graph missing journey node journey:${journeyId}.`),
      );
  }
}

function indexOutgoingEdges(edges) {
  const edgeSet = new Set(
    edges.map((edge) => keyForEdge(edge.from, edge.to, edge.relation)),
  );
  const outgoing = new Map();
  for (const edge of edges) {
    const key = keyForOutgoing(edge.from, edge.relation);
    outgoing.set(key, [...(outgoing.get(key) ?? []), edge.to]);
  }
  return { edgeSet, outgoing };
}

function validateSurfaceNodes(surface, nodeIds, nodesById, issues) {
  const surfaceNodeId = `surface:${surface.surfaceId}`;
  const stateNodeId = `state:${surface.surfaceId}:lifecycle`;
  if (!nodeIds.has(surfaceNodeId))
    issues.push(
      issue('error', `Graph missing registry surface node ${surfaceNodeId}.`),
    );
  const surfaceNode = nodesById.get(surfaceNodeId);
  if (surfaceNode && surfaceNode.coverageStatus !== surface.coverageStatus) {
    issues.push(
      issue(
        'error',
        `Graph surface node ${surfaceNodeId} coverageStatus=${surfaceNode.coverageStatus} does not match registry coverageStatus=${surface.coverageStatus}.`,
      ),
    );
  }
  if (!nodeIds.has(stateNodeId))
    issues.push(
      issue('error', `Graph missing lifecycle state node ${stateNodeId}.`),
    );
  return { surfaceNodeId, stateNodeId };
}

function validateLifecycleEdges(surface, ids, edgeSet, outgoing, issues) {
  const { surfaceNodeId, stateNodeId } = ids;
  if (!edgeSet.has(keyForEdge(surfaceNodeId, stateNodeId, 'contains'))) {
    issues.push(
      issue(
        'error',
        `Graph missing lifecycle contains edge ${surfaceNodeId} -> ${stateNodeId}.`,
      ),
    );
  }
  if (
    (surface.commands ?? []).length > 0 &&
    (outgoing.get(keyForOutgoing(stateNodeId, 'validated-by')) ?? []).length ===
      0
  ) {
    issues.push(
      issue(
        'error',
        `Graph lifecycle state ${stateNodeId} must be validated by at least one command.`,
      ),
    );
  }
  if (
    (outgoing.get(keyForOutgoing(stateNodeId, 'produces')) ?? []).length === 0
  ) {
    issues.push(
      issue(
        'error',
        `Graph lifecycle state ${stateNodeId} must produce evidence.`,
      ),
    );
  }
  if (
    (surface.gaps ?? []).length > 0 &&
    (outgoing.get(keyForOutgoing(stateNodeId, 'documents-gap')) ?? [])
      .length === 0
  ) {
    issues.push(
      issue(
        'error',
        `Graph lifecycle state ${stateNodeId} must document known gaps.`,
      ),
    );
  }
}

function validateRegistryCoverage(registry, graph, nodeIndex, issues) {
  if (!registry?.surfaces) return;
  const edgeIndex = indexOutgoingEdges(graph.edges);
  for (const surface of registry.surfaces) {
    const ids = validateSurfaceNodes(
      surface,
      nodeIndex.nodeIds,
      nodeIndex.nodesById,
      issues,
    );
    validateLifecycleEdges(
      surface,
      ids,
      edgeIndex.edgeSet,
      edgeIndex.outgoing,
      issues,
    );
  }
}

export function validateValidationGraph(graph, catalog, registry = null) {
  const issues = [];
  if (graph.version !== 1)
    issues.push(issue('error', 'Validation graph version must be 1.'));
  if (!Array.isArray(graph.nodes))
    issues.push(issue('error', 'Validation graph nodes must be an array.'));
  if (!Array.isArray(graph.edges))
    issues.push(issue('error', 'Validation graph edges must be an array.'));
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return issues;
  const nodeIndex = indexNodes(graph.nodes, issues);
  validateEdges(graph.edges, nodeIndex.nodeIds, issues);
  validateJourneyNodes(graph.nodes, nodeIndex.nodeIds, catalog, issues);
  validateRegistryCoverage(registry, graph, nodeIndex, issues);
  return issues;
}
