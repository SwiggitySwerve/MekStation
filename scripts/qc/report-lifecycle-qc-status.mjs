#!/usr/bin/env node
import { loadJourneyArtifacts, parseArgs } from './journey-qc-core.mjs';

const options = parseArgs(process.argv.slice(2));
const failOnWarning =
  process.argv.includes('--fail-on-warning') ||
  options.parameters['fail-on-warning'] === 'true';
const only = options.parameters.only ?? 'all';
const surfaceFilter = options.surface ?? options.parameters.surface ?? null;
const parentFilter = options.parameters.parent ?? null;

const manualEvidencePattern =
  /accessibility|browser|chromium|deep-?link|electron|headed|keyboard|manual|packaged|playwright|pwa|refresh|screen-?reader|screenshot|visual/i;
const retiredEvidencePattern = /^Archived OpenSpec change /i;

function edgeKey(from, relation) {
  return `${from}\u0000${relation}`;
}

function outgoingEdgesByFromAndRelation(graph) {
  const map = new Map();
  for (const edge of graph.edges ?? []) {
    const key = edgeKey(edge.from, edge.relation);
    const entries = map.get(key) ?? [];
    entries.push(edge);
    map.set(key, entries);
  }
  return map;
}

function needsManualBrowserProof(surface) {
  const lenses = surface.qualityLenses ?? [];
  return (
    (surface.routes ?? []).length > 0 ||
    (surface.desktopSurfaces ?? []).length > 0 ||
    lenses.includes('accessibility') ||
    lenses.includes('usability') ||
    lenses.includes('ux')
  );
}

function lifecycleGraphEdges(surface, outgoingByKey) {
  const stateNodeId = `state:${surface.surfaceId}:lifecycle`;
  return {
    stateNodeId,
    validatedBy: outgoingByKey.get(edgeKey(stateNodeId, 'validated-by')) ?? [],
    produces: outgoingByKey.get(edgeKey(stateNodeId, 'produces')) ?? [],
    logs: outgoingByKey.get(edgeKey(stateNodeId, 'logs')) ?? [],
    documentsGap:
      outgoingByKey.get(edgeKey(stateNodeId, 'documents-gap')) ?? [],
  };
}

function lifecycleBlockers(surface, nodeIds, graphEdges) {
  const blockers = [];
  if (!nodeIds.has(`surface:${surface.surfaceId}`))
    blockers.push('missing-surface-node');
  if (!nodeIds.has(graphEdges.stateNodeId))
    blockers.push('missing-lifecycle-state');
  if (
    (surface.commands ?? []).length > 0 &&
    graphEdges.validatedBy.length === 0
  ) {
    blockers.push('missing-command-edge');
  }
  if (graphEdges.produces.length === 0) blockers.push('missing-evidence-edge');
  if ((surface.gaps ?? []).length > 0 && graphEdges.documentsGap.length === 0) {
    blockers.push('missing-gap-edge');
  }
  return blockers;
}

function lifecycleWarnings(surface, graphEdges, currentEvidence) {
  const warnings = [];
  if (currentEvidence.length === 0) warnings.push('no-current-evidence');
  if (graphEdges.logs.length === 0) warnings.push('no-log-edge');
  if (
    needsManualBrowserProof(surface) &&
    !currentEvidence.some((entry) => manualEvidencePattern.test(entry))
  ) {
    warnings.push('manual-browser-proof-needed');
  }
  return warnings;
}

function lifecycleDiagnosticEvents(status) {
  const eventByStatus = {
    blocker: 'qc.lifecycle_surface_blocked',
    warn: 'qc.lifecycle_surface_warned',
    ok: 'qc.lifecycle_surface_ok',
  };
  return ['qc.lifecycle_surface_checked', eventByStatus[status]];
}

function classifySurface(surface, nodeIds, outgoingByKey) {
  const graphEdges = lifecycleGraphEdges(surface, outgoingByKey);
  const currentEvidence = (surface.evidence ?? []).filter(
    (entry) => !retiredEvidencePattern.test(entry),
  );
  const blockers = lifecycleBlockers(surface, nodeIds, graphEdges);
  const warnings = lifecycleWarnings(surface, graphEdges, currentEvidence);
  const status =
    blockers.length > 0 ? 'blocker' : warnings.length > 0 ? 'warn' : 'ok';

  return {
    surfaceId: surface.surfaceId,
    title: surface.title,
    level: surface.level,
    parentId: surface.parentId,
    coverageStatus: surface.coverageStatus,
    commandCount: (surface.commands ?? []).length,
    manualCheckCount: (surface.manualChecks ?? []).length,
    evidenceCount: (surface.evidence ?? []).length,
    currentEvidenceCount: currentEvidence.length,
    gapCount: (surface.gaps ?? []).length,
    graph: {
      validatedBy: graphEdges.validatedBy.length,
      produces: graphEdges.produces.length,
      logs: graphEdges.logs.length,
      documentsGap: graphEdges.documentsGap.length,
    },
    diagnosticEvents: lifecycleDiagnosticEvents(status),
    blockers,
    warnings,
    status,
  };
}

function matchesFilters(entry) {
  if (surfaceFilter && entry.surfaceId !== surfaceFilter) return false;
  if (parentFilter && entry.parentId !== parentFilter) return false;
  if (only === 'weak') return entry.status !== 'ok';
  if (only === 'blockers') return entry.blockers.length > 0;
  if (only === 'warnings') return entry.warnings.length > 0;
  return true;
}

function printText(report) {
  console.log('# Lifecycle QC status');
  console.log(
    `Surfaces: ${report.surfaceCount}; blockers: ${report.blockerCount}; warnings: ${report.warningCount}`,
  );
  console.log('');
  for (const surface of report.surfaces) {
    const flags = [...surface.blockers, ...surface.warnings];
    const suffix = flags.length > 0 ? ` (${flags.join(', ')})` : '';
    console.log(`- ${surface.surfaceId}: ${surface.status}${suffix}`);
    console.log(
      `  commands=${surface.commandCount} evidence=${surface.currentEvidenceCount}/${surface.evidenceCount} manualChecks=${surface.manualCheckCount} gaps=${surface.gapCount}`,
    );
    console.log(
      `  graph validatedBy=${surface.graph.validatedBy} produces=${surface.graph.produces} logs=${surface.graph.logs} documentsGap=${surface.graph.documentsGap}`,
    );
    console.log(`  events=${surface.diagnosticEvents.join(', ')}`);
  }
}

const { graph, registry } = loadJourneyArtifacts();
const nodeIds = new Set((graph.nodes ?? []).map((node) => node.id));
const outgoingByKey = outgoingEdgesByFromAndRelation(graph);
const surfaceStatuses = (registry.surfaces ?? [])
  .map((surface) => classifySurface(surface, nodeIds, outgoingByKey))
  .filter(matchesFilters);
const report = {
  surfaceCount: surfaceStatuses.length,
  blockerCount: surfaceStatuses.filter((entry) => entry.blockers.length > 0)
    .length,
  warningCount: surfaceStatuses.filter((entry) => entry.warnings.length > 0)
    .length,
  failOnWarning,
  surfaces: surfaceStatuses,
};

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printText(report);
}

process.exit(
  report.blockerCount > 0 || (failOnWarning && report.warningCount > 0) ? 1 : 0,
);
