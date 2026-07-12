const allowedLogClassifications = new Set([
  'diagnostic',
  'expected-probe',
  'actionable-warning',
  'failure',
]);

const requiredTriageFields = [
  'actor',
  'action',
  'stateBefore',
  'stateAfter',
  'ruleDecision',
  'validationResult',
  'warnings',
  'failureCause',
  'evidenceRefs',
  'nextDebuggingHint',
];

function issue(severity, message) {
  return { severity, message };
}

function validateLoggingMapHeader(loggingMap, issues) {
  if (loggingMap.version !== 1) {
    issues.push(issue('error', 'Logging map version must be 1.'));
  }
  if (!Array.isArray(loggingMap.requiredPathIds)) {
    issues.push(issue('error', 'Logging map requiredPathIds must be an array.'));
  }
  if (!Array.isArray(loggingMap.requiredTriageFields)) {
    issues.push(issue('error', 'Logging map requiredTriageFields must be an array.'));
    return;
  }
  for (const requiredField of requiredTriageFields) {
    if (!loggingMap.requiredTriageFields.includes(requiredField)) {
      issues.push(
        issue('error', `Logging map missing required triage field ${requiredField}.`),
      );
    }
  }
}

function validateLoggingPathEntry(entry, index, pathIds, issues) {
  const label = entry.pathId || `paths[${index}]`;
  if (typeof entry.pathId !== 'string' || entry.pathId.trim() === '') {
    issues.push(issue('error', `${label}: pathId must be a non-empty string.`));
  }
  if (pathIds.has(entry.pathId)) {
    issues.push(issue('error', `${label}: duplicate pathId.`));
  }
  pathIds.add(entry.pathId);
  if (typeof entry.service !== 'string' || entry.service.trim() === '') {
    issues.push(issue('error', `${label}: service must be a non-empty string.`));
  }
  if (!['debug', 'info', 'warn', 'error'].includes(entry.severity)) {
    issues.push(
      issue('error', `${label}: severity must be debug, info, warn, or error.`),
    );
  }
  validatePathClassification(entry, label, issues);
  if (!Array.isArray(entry.events) || entry.events.length === 0) {
    issues.push(issue('error', `${label}: events must contain at least one event.`));
  }
  if (!Array.isArray(entry.testRefs) || entry.testRefs.length === 0) {
    issues.push(
      issue('error', `${label}: testRefs must contain at least one reference.`),
    );
  }
}

function validatePathClassification(entry, label, issues) {
  const requiresClassification =
    entry.severity === 'warn' || entry.severity === 'error';
  if (requiresClassification && typeof entry.classification !== 'string') {
    issues.push(
      issue('error', `${label}: warn/error paths must declare a classification.`),
    );
  }
  if (
    entry.classification !== undefined &&
    !allowedLogClassifications.has(entry.classification)
  ) {
    issues.push(
      issue(
        'error',
        `${label}: classification must be diagnostic, expected-probe, actionable-warning, or failure.`,
      ),
    );
  }
  if (requiresClassification && typeof entry.blocking !== 'boolean') {
    issues.push(issue('error', `${label}: warn/error paths must declare blocking.`));
  }
  if (entry.classification === 'expected-probe' && entry.blocking !== false) {
    issues.push(issue('error', `${label}: expected probes must be non-blocking.`));
  }
  if (entry.classification === 'failure' && entry.severity !== 'error') {
    issues.push(issue('error', `${label}: failure classification must use error.`));
  }
}

function collectMappedEvents(paths) {
  const mappedEvents = new Set();
  for (const entry of paths) {
    for (const event of entry.events ?? []) mappedEvents.add(event);
  }
  return mappedEvents;
}

function collectCatalogLoggingRefs(catalog) {
  const loggingPathIds = new Set();
  const diagnosticEvents = new Set();
  for (const journey of catalog.journeys) {
    for (const step of journey.steps) {
      loggingPathIds.add(step.loggingPathId);
      if (typeof step.diagnosticEvent === 'string') {
        diagnosticEvents.add(step.diagnosticEvent);
      }
    }
  }
  return { loggingPathIds, diagnosticEvents };
}

function validateCatalogAndGraphCoverage(loggingMap, catalog, graph, pathIds, issues) {
  for (const requiredPathId of loggingMap.requiredPathIds ?? []) {
    if (!pathIds.has(requiredPathId)) {
      issues.push(
        issue('error', `Logging map missing required path ${requiredPathId}.`),
      );
    }
  }
  const mappedEvents = collectMappedEvents(loggingMap.paths);
  const { loggingPathIds, diagnosticEvents } = collectCatalogLoggingRefs(catalog);
  for (const loggingPathId of loggingPathIds) {
    if (!pathIds.has(loggingPathId)) {
      issues.push(
        issue(
          'error',
          `Catalog step references unmapped logging path ${loggingPathId}.`,
        ),
      );
    }
  }
  for (const diagnosticEvent of diagnosticEvents) {
    if (!mappedEvents.has(diagnosticEvent)) {
      issues.push(
        issue(
          'error',
          `Catalog diagnostic event ${diagnosticEvent} is missing from logging map events.`,
        ),
      );
    }
  }
  for (const node of graph?.nodes ?? []) {
    if (node.kind !== 'log-event') continue;
    const eventId = node.id.replace(/^log-event:/, '');
    if (!mappedEvents.has(eventId)) {
      issues.push(
        issue(
          'error',
          `Graph log event ${eventId} is missing from logging map events.`,
        ),
      );
    }
  }
}

export function validateLoggingMap(loggingMap, catalog, graph = null) {
  const issues = [];
  validateLoggingMapHeader(loggingMap, issues);
  if (!Array.isArray(loggingMap.paths)) {
    issues.push(issue('error', 'Logging map paths must be an array.'));
    return issues;
  }
  const pathIds = new Set();
  for (const [index, entry] of loggingMap.paths.entries()) {
    validateLoggingPathEntry(entry, index, pathIds, issues);
  }
  validateCatalogAndGraphCoverage(loggingMap, catalog, graph, pathIds, issues);
  return issues;
}
