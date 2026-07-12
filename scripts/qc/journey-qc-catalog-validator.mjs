const allowedTiers = new Set(['smoke', 'standard', 'extended']);
const allowedModes = new Set(['headless', 'browser', 'hybrid']);
const allowedCommandCheckpointRoles = new Set(['player', 'gm', 'both']);

function issue(severity, message) {
  return { severity, message };
}

function validateParameterDefinition(label, name, definition, issues) {
  if (
    !definition ||
    typeof definition !== 'object' ||
    Array.isArray(definition)
  ) {
    issues.push(
      issue('error', `${label}: parameter ${name} must be an object.`),
    );
    return;
  }
  if (
    !['string', 'string-list', 'integer', 'enum', 'boolean'].includes(
      definition.type,
    )
  ) {
    issues.push(
      issue(
        'error',
        `${label}: parameter ${name} has unsupported type ${definition.type}.`,
      ),
    );
  }
  if (!Object.hasOwn(definition, 'default')) {
    issues.push(
      issue('error', `${label}: parameter ${name} must declare default.`),
    );
  }
  if (
    definition.type === 'enum' &&
    (!Array.isArray(definition.values) ||
      !definition.values.includes(definition.default))
  ) {
    issues.push(
      issue(
        'error',
        `${label}: enum parameter ${name} must include its default in values.`,
      ),
    );
  }
}

function validateCommandScreenCheckpoints(label, checkpoints, issues) {
  if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
    issues.push(
      issue(
        'error',
        `${label}: commandScreenCheckpoints must contain at least one checkpoint.`,
      ),
    );
    return;
  }
  const checkpointIds = new Set();
  for (const [index, checkpoint] of checkpoints.entries()) {
    const checkpointLabel = `${label}.commandScreenCheckpoints[${index}]`;
    for (const field of ['id', 'uiCheckpointId', 'label', 'role']) {
      if (
        typeof checkpoint[field] !== 'string' ||
        checkpoint[field].trim() === ''
      ) {
        issues.push(
          issue(
            'error',
            `${checkpointLabel}: ${field} must be a non-empty string.`,
          ),
        );
      }
    }
    if (checkpointIds.has(checkpoint.id)) {
      issues.push(
        issue(
          'error',
          `${checkpointLabel}: duplicate command checkpoint ${checkpoint.id}.`,
        ),
      );
    }
    checkpointIds.add(checkpoint.id);
    if (!allowedCommandCheckpointRoles.has(checkpoint.role)) {
      issues.push(
        issue('error', `${checkpointLabel}: role must be player, gm, or both.`),
      );
    }
    if (
      !Array.isArray(checkpoint.assertions) ||
      checkpoint.assertions.length === 0 ||
      checkpoint.assertions.some(
        (assertion) => typeof assertion !== 'string' || assertion.trim() === '',
      )
    ) {
      issues.push(
        issue(
          'error',
          `${checkpointLabel}: assertions must contain at least one non-empty item.`,
        ),
      );
    }
  }
}

function validateJourneySteps(label, steps, issues) {
  if (!Array.isArray(steps) || steps.length === 0) {
    issues.push(
      issue('error', `${label}: steps must contain at least one step.`),
    );
    return;
  }
  const stepIds = new Set();
  for (const [stepIndex, step] of steps.entries()) {
    const stepLabel = `${label}.steps[${stepIndex}]`;
    for (const field of [
      'id',
      'title',
      'kind',
      'diagnosticEvent',
      'loggingPathId',
    ]) {
      if (typeof step[field] !== 'string' || step[field].trim() === '') {
        issues.push(
          issue('error', `${stepLabel}: ${field} must be a non-empty string.`),
        );
      }
    }
    if (stepIds.has(step.id))
      issues.push(
        issue('error', `${stepLabel}: duplicate step id ${step.id}.`),
      );
    stepIds.add(step.id);
    if (!Array.isArray(step.produces) || step.produces.length === 0) {
      issues.push(
        issue(
          'error',
          `${stepLabel}: produces must contain at least one artifact.`,
        ),
      );
    }
    validateNonSyntheticStep(step, stepLabel, issues);
  }
}

function validateNonSyntheticStep(step, stepLabel, issues) {
  if (step.syntheticBacking !== false) return;
  if (
    typeof step.executionBacking !== 'string' ||
    step.executionBacking.trim() === '' ||
    step.executionBacking === 'synthetic-projection'
  ) {
    issues.push(
      issue(
        'error',
        `${stepLabel}: non-synthetic steps must declare executionBacking other than synthetic-projection.`,
      ),
    );
  }
  if (
    typeof step.executionEvidenceSource !== 'string' ||
    step.executionEvidenceSource.trim() === '' ||
    step.executionEvidenceSource === 'journey-catalog-projection'
  ) {
    issues.push(
      issue(
        'error',
        `${stepLabel}: non-synthetic steps must declare a real executionEvidenceSource.`,
      ),
    );
  }
  if (
    !Array.isArray(step.executionProofCommands) ||
    step.executionProofCommands.length === 0 ||
    step.executionProofCommands.some(
      (command) => typeof command !== 'string' || command.trim() === '',
    )
  ) {
    issues.push(
      issue(
        'error',
        `${stepLabel}: non-synthetic steps must declare executionProofCommands.`,
      ),
    );
  }
}

function validateJourney(journey, index, ids, issues) {
  const label = journey.id || `journeys[${index}]`;
  if (typeof journey.id !== 'string' || journey.id.trim() === '')
    issues.push(issue('error', `${label}: id must be a non-empty string.`));
  if (ids.has(journey.id))
    issues.push(issue('error', `${label}: duplicate journey id.`));
  ids.add(journey.id);
  for (const field of [
    'displayName',
    'module',
    'defaultMode',
    'expectedTerminalState',
  ]) {
    if (typeof journey[field] !== 'string' || journey[field].trim() === '') {
      issues.push(
        issue('error', `${label}: ${field} must be a non-empty string.`),
      );
    }
  }
  if (!allowedModes.has(journey.defaultMode)) {
    issues.push(
      issue(
        'error',
        `${label}: defaultMode must be headless, browser, or hybrid.`,
      ),
    );
  }
  if (!Array.isArray(journey.tiers) || journey.tiers.length === 0) {
    issues.push(
      issue('error', `${label}: tiers must contain at least one tier.`),
    );
  } else {
    for (const tier of journey.tiers) {
      if (!allowedTiers.has(tier))
        issues.push(issue('error', `${label}: invalid tier ${tier}.`));
    }
  }
  if (!journey.parameters || typeof journey.parameters !== 'object') {
    issues.push(issue('error', `${label}: parameters must be an object.`));
  } else {
    for (const [name, definition] of Object.entries(journey.parameters)) {
      validateParameterDefinition(label, name, definition, issues);
    }
  }
  validateCommandScreenCheckpoints(
    label,
    journey.commandScreenCheckpoints,
    issues,
  );
  validateJourneySteps(label, journey.steps, issues);
  if (
    !Array.isArray(journey.evidenceAssertions) ||
    journey.evidenceAssertions.length === 0
  ) {
    issues.push(
      issue(
        'error',
        `${label}: evidenceAssertions must contain at least one item.`,
      ),
    );
  }
}

function validateRequiredJourneyIds(ids, issues, requiredJourneyIds) {
  for (const requiredId of requiredJourneyIds) {
    if (!ids.has(requiredId))
      issues.push(issue('error', `Missing required journey ${requiredId}.`));
  }
  for (const id of ids) {
    if (!requiredJourneyIds.includes(id))
      issues.push(issue('warning', `Unexpected journey ${id}.`));
  }
}

export function validateJourneyCatalog(catalog, requiredJourneyIds) {
  const issues = [];
  if (catalog.version !== 1)
    issues.push(issue('error', 'Journey catalog version must be 1.'));
  if (!Array.isArray(catalog.journeys)) {
    issues.push(issue('error', 'Journey catalog must declare journeys array.'));
    return issues;
  }
  if (!Array.isArray(catalog.requiredJourneyIds)) {
    issues.push(
      issue('error', 'Journey catalog must declare requiredJourneyIds array.'),
    );
  }
  if (!allowedTiers.has(catalog.defaultTier)) {
    issues.push(
      issue(
        'error',
        'Journey catalog defaultTier must be smoke, standard, or extended.',
      ),
    );
  }
  const ids = new Set();
  for (const [index, journey] of catalog.journeys.entries())
    validateJourney(journey, index, ids, issues);
  validateRequiredJourneyIds(ids, issues, requiredJourneyIds);
  return issues;
}
