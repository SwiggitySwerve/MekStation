import fs from 'node:fs';
import path from 'node:path';

function issue(severity, message) {
  return { severity, message };
}

function pageRouteSegments(filePath, toRepoRelative) {
  const relative = toRepoRelative(filePath);
  if (!relative.startsWith('src/pages/')) return null;
  const withoutPrefix = relative
    .replace(/^src\/pages\//, '')
    .replace(/\.(tsx|ts|jsx|js)$/, '');
  if (
    withoutPrefix.startsWith('api/') ||
    withoutPrefix === '_app' ||
    withoutPrefix === '_document'
  ) {
    return null;
  }
  const segments = withoutPrefix.split('/').filter(Boolean);
  if (segments.at(-1) === 'index') segments.pop();
  return segments;
}

function collectPageRouteSegments(repoRoot, toRepoRelative, directory) {
  const root = directory ?? path.join(repoRoot, 'src', 'pages');
  const routes = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      routes.push(
        ...collectPageRouteSegments(repoRoot, toRepoRelative, entryPath),
      );
      continue;
    }
    if (!/\.(tsx|ts|jsx|js)$/.test(entry.name)) continue;
    const segments = pageRouteSegments(entryPath, toRepoRelative);
    if (segments) routes.push(segments);
  }
  return routes;
}

function routeSegments(route) {
  return route.split(/[?#]/, 1)[0].split('/').filter(Boolean);
}

function segmentMatches(routeSegment, pageSegment) {
  if (/^\[[^\]]+\]$/.test(pageSegment)) return true;
  return routeSegment === pageSegment;
}

function routeMatchesPageSegments(route, pageSegments) {
  const segments = routeSegments(route);
  let routeIndex = 0;
  for (let pageIndex = 0; pageIndex < pageSegments.length; pageIndex += 1) {
    const pageSegment = pageSegments[pageIndex];
    const isLastPageSegment = pageIndex === pageSegments.length - 1;
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(pageSegment)) return isLastPageSegment;
    if (/^\[\.\.\.[^\]]+\]$/.test(pageSegment)) {
      return isLastPageSegment && routeIndex < segments.length;
    }
    if (routeIndex >= segments.length) return false;
    if (!segmentMatches(segments[routeIndex], pageSegment)) return false;
    routeIndex += 1;
  }
  return routeIndex === segments.length;
}

function routeMatchesAnyPage(route, pageRoutes) {
  return pageRoutes.some((pageSegments) =>
    routeMatchesPageSegments(route, pageSegments),
  );
}

function validateFlowRoute(flowId, label, href, issues, pageRoutes) {
  if (typeof href !== 'string' || href.trim() === '') {
    issues.push(issue('error', `UI flow ${flowId}: ${label} href is required.`));
    return;
  }
  if (!href.startsWith('/')) {
    issues.push(
      issue('error', `UI flow ${flowId}: ${label} route ${href} must start with /.`),
    );
    return;
  }
  if (!routeMatchesAnyPage(href, pageRoutes)) {
    issues.push(
      issue(
        'error',
        `UI flow ${flowId}: ${label} route ${href} does not match a page template.`,
      ),
    );
  }
}

function validateRequiredCheckpointOrder(flow, issues, requiredCheckpointIdsByJourney) {
  const requiredCheckpointIds = requiredCheckpointIdsByJourney.get(flow.journeyId);
  if (!requiredCheckpointIds) return;
  const actualCheckpointIds = flow.checkpoints.map((checkpoint) => checkpoint.id);
  let cursor = -1;
  for (const requiredCheckpointId of requiredCheckpointIds) {
    const nextIndex = actualCheckpointIds.indexOf(requiredCheckpointId, cursor + 1);
    if (nextIndex === -1) {
      issues.push(
        issue(
          'error',
          `UI flow ${flow.journeyId}: missing required checkpoint ${requiredCheckpointId} in the expected route order.`,
        ),
      );
      continue;
    }
    cursor = nextIndex;
  }
}

function validateFlowHeader(flow, catalogById, catalogJourneyIds, graphNodeIds, issues) {
  const catalogJourney = catalogById.get(flow.journeyId);
  if (!catalogJourneyIds.has(flow.journeyId)) {
    issues.push(
      issue('error', `UI flow shell references unknown journey ${flow.journeyId}.`),
    );
  }
  if (!graphNodeIds.has(`journey:${flow.journeyId}`)) {
    issues.push(
      issue(
        'error',
        `UI flow shell journey ${flow.journeyId} is missing from validation graph.`,
      ),
    );
  }
  if (catalogJourney && flow.module !== catalogJourney.module) {
    issues.push(
      issue(
        'error',
        `UI flow ${flow.journeyId}: module ${flow.module} does not match catalog module ${catalogJourney.module}.`,
      ),
    );
  }
  for (const field of ['displayName', 'module', 'qcCommand']) {
    if (typeof flow[field] !== 'string' || flow[field].trim() === '') {
      issues.push(issue('error', `UI flow ${flow.journeyId}: ${field} is required.`));
    }
  }
  if (
    typeof flow.qcCommand === 'string' &&
    !flow.qcCommand.includes(`--journey=${flow.journeyId}`)
  ) {
    issues.push(
      issue(
        'error',
        `UI flow ${flow.journeyId}: qcCommand must include --journey=${flow.journeyId}.`,
      ),
    );
  }
}

function validateFlowRolesAndNotes(flow, allowedRoles, issues) {
  if (!Array.isArray(flow.roleIntent) || flow.roleIntent.length === 0) {
    issues.push(issue('error', `UI flow ${flow.journeyId}: roleIntent is required.`));
  } else {
    for (const role of flow.roleIntent) {
      if (!allowedRoles.has(role)) {
        issues.push(
          issue('error', `UI flow ${flow.journeyId}: invalid role ${role}.`),
        );
      }
    }
  }
  if (!Array.isArray(flow.inspectionNotes) || flow.inspectionNotes.length === 0) {
    issues.push(
      issue('error', `UI flow ${flow.journeyId}: inspectionNotes are required.`),
    );
  }
}

function validateFlowPrimaryAction(flow, issues, pageRoutes) {
  if (!flow.primaryAction || typeof flow.primaryAction !== 'object') {
    issues.push(
      issue('error', `UI flow ${flow.journeyId}: primaryAction is required.`),
    );
    return;
  }
  if (
    typeof flow.primaryAction.label !== 'string' ||
    flow.primaryAction.label.trim() === ''
  ) {
    issues.push(
      issue('error', `UI flow ${flow.journeyId}: primaryAction label is required.`),
    );
  }
  validateFlowRoute(
    flow.journeyId,
    'primary action',
    flow.primaryAction.href,
    issues,
    pageRoutes,
  );
}

function validateFlowCheckpoints(flow, allowedVisibility, issues, pageRoutes) {
  if (!Array.isArray(flow.checkpoints) || flow.checkpoints.length === 0) {
    issues.push(
      issue('error', `UI flow ${flow.journeyId}: checkpoints are required.`),
    );
    return false;
  }
  const checkpointIds = new Set();
  for (const checkpoint of flow.checkpoints) {
    const checkpointLabel = checkpoint.id || 'checkpoint';
    if (typeof checkpoint.id !== 'string' || checkpoint.id.trim() === '') {
      issues.push(
        issue('error', `UI flow ${flow.journeyId}: checkpoint id is required.`),
      );
    }
    if (checkpointIds.has(checkpoint.id)) {
      issues.push(
        issue(
          'error',
          `UI flow ${flow.journeyId}: duplicate checkpoint ${checkpoint.id}.`,
        ),
      );
    }
    checkpointIds.add(checkpoint.id);
    if (typeof checkpoint.label !== 'string' || checkpoint.label.trim() === '') {
      issues.push(
        issue(
          'error',
          `UI flow ${flow.journeyId}: checkpoint ${checkpointLabel} label is required.`,
        ),
      );
    }
    if (!allowedVisibility.has(checkpoint.visibility)) {
      issues.push(
        issue(
          'error',
          `UI flow ${flow.journeyId}: checkpoint ${checkpointLabel} has invalid visibility ${checkpoint.visibility}.`,
        ),
      );
    }
    validateFlowRoute(
      flow.journeyId,
      `checkpoint ${checkpointLabel}`,
      checkpoint.href,
      issues,
      pageRoutes,
    );
  }
  return true;
}

function validateSingleFlow(flow, context, issues) {
  const {
    catalogById,
    catalogJourneyIds,
    graphNodeIds,
    allowedRoles,
    allowedVisibility,
    pageRoutes,
    requiredCheckpointIdsByJourney,
  } = context;
  validateFlowHeader(flow, catalogById, catalogJourneyIds, graphNodeIds, issues);
  validateFlowRolesAndNotes(flow, allowedRoles, issues);
  validateFlowPrimaryAction(flow, issues, pageRoutes);
  const hasCheckpoints = validateFlowCheckpoints(
    flow,
    allowedVisibility,
    issues,
    pageRoutes,
  );
  if (hasCheckpoints) {
    validateRequiredCheckpointOrder(flow, issues, requiredCheckpointIdsByJourney);
  }
}

function validateRequiredFlows(flowIds, catalog, uiFlowShell, requiredJourneyIds, issues) {
  const requiredIds = catalog.requiredJourneyIds ?? requiredJourneyIds;
  for (const requiredId of requiredIds) {
    if (!flowIds.has(requiredId)) {
      issues.push(
        issue('error', `UI flow shell missing required journey ${requiredId}.`),
      );
    }
  }
  for (const requiredId of uiFlowShell.requiredJourneyIds ?? []) {
    if (!flowIds.has(requiredId)) {
      issues.push(
        issue(
          'error',
          `UI flow shell requiredJourneyIds references unmapped journey ${requiredId}.`,
        ),
      );
    }
  }
}

export function validateUiFlowShell(uiFlowShell, catalog, graph, deps) {
  const {
    repoRoot,
    toRepoRelative,
    requiredJourneyIds,
    requiredCheckpointIdsByJourney,
  } = deps;
  const issues = [];
  const allowedVisibility = new Set(['player', 'gm', 'both']);
  const allowedRoles = new Set(['player', 'gm']);
  const pageRoutes = collectPageRouteSegments(repoRoot, toRepoRelative);

  if (uiFlowShell.version !== 1) {
    issues.push(issue('error', 'UI flow shell version must be 1.'));
  }
  if (!Array.isArray(uiFlowShell.requiredJourneyIds)) {
    issues.push(
      issue('error', 'UI flow shell must declare requiredJourneyIds array.'),
    );
  }
  if (!Array.isArray(uiFlowShell.flows)) {
    issues.push(issue('error', 'UI flow shell must declare flows array.'));
    return issues;
  }

  const catalogJourneyIds = new Set(catalog.journeys.map((journey) => journey.id));
  const catalogById = new Map(catalog.journeys.map((journey) => [journey.id, journey]));
  const graphNodeIds = new Set(graph.nodes.map((node) => node.id));
  const flowIds = new Set();
  const context = {
    catalogById,
    catalogJourneyIds,
    graphNodeIds,
    allowedRoles,
    allowedVisibility,
    pageRoutes,
    requiredCheckpointIdsByJourney,
  };

  for (const [index, flow] of uiFlowShell.flows.entries()) {
    const label = flow.journeyId || `flows[${index}]`;
    if (typeof flow.journeyId !== 'string' || flow.journeyId.trim() === '') {
      issues.push(issue('error', `${label}: journeyId must be a non-empty string.`));
      continue;
    }
    if (flowIds.has(flow.journeyId)) {
      issues.push(
        issue('error', `UI flow shell duplicates journey ${flow.journeyId}.`),
      );
    }
    flowIds.add(flow.journeyId);
    validateSingleFlow(flow, context, issues);
  }

  validateRequiredFlows(flowIds, catalog, uiFlowShell, requiredJourneyIds, issues);
  return issues;
}
