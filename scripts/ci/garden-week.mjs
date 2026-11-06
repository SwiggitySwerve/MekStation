// Seven-day evidence policy. G1 owns budgets; G2 owns telemetry and statistics.
export const DAY_MS = 86400000;
export const MIN_DAILY_RUNS = 3;
export const HEADROOM_RATIO = 0.15;

const key = (identity) =>
  `${identity.repository}/${identity.runId}/${identity.attempt}`;

export function buildGarden({
  envelopes,
  descriptors,
  budgetConfigHash,
  now,
  api,
  diagnostics = [],
}) {
  const end = Math.floor(Date.parse(now) / DAY_MS) * DAY_MS;
  if (!Number.isFinite(end) || !Array.isArray(envelopes))
    throw new Error('Invalid weekly inputs');
  const start = end - 7 * DAY_MS;
  const previous = start - 7 * DAY_MS;
  const valid = [];
  const rejected = [...diagnostics];
  for (const input of envelopes) {
    try {
      const envelope = api.validateObservation(input);
      valid.push(envelope);
    } catch (error) {
      rejected.push(error.message);
    }
  }
  // A retry of a single run is one observation, never three independent runs.
  const latestAttempts = new Map();
  for (const envelope of valid) {
    const id = envelope.observation.identity;
    const runKey = `${id.repository}/${id.runId}`;
    if (!latestAttempts.has(runKey) || latestAttempts.get(runKey) < id.attempt)
      latestAttempts.set(runKey, id.attempt);
  }
  const samples = valid.filter((envelope) => {
    const identity = envelope.observation.identity;
    const time = Date.parse(envelope.observation.identity.createdAt);
    return (
      latestAttempts.get(`${identity.repository}/${identity.runId}`) ===
        identity.attempt &&
      time >= previous &&
      time < end
    );
  });
  // Select the newest observed comparison regime; never pool runners or DAGs.
  const anchor = samples.toSorted(
    (a, b) =>
      Date.parse(b.observation.identity.createdAt) -
      Date.parse(a.observation.identity.createdAt),
  )[0];
  const selected = anchor
    ? api.selectMainObservations(
        samples.map((e) => e.observation),
        {
          ...anchor.observation,
          identity: {
            ...anchor.observation.identity,
            createdAt: new Date(end).toISOString(),
          },
        },
      )
    : { included: [], excluded: [] };
  for (const excluded of selected.excluded)
    if (excluded.reason === 'duplicate attempt')
      rejected.push(`Duplicate attempt ${key(excluded.identity)}`);
  const byObservation = new Map(
    samples.map((envelope) => [envelope.observation, envelope]),
  );
  const comparable = selected.included.map((observation) =>
    byObservation.get(observation),
  );
  const current = comparable.filter(
    (e) => Date.parse(e.observation.identity.createdAt) >= start,
  );
  const baseline = comparable.filter(
    (e) => Date.parse(e.observation.identity.createdAt) < start,
  );
  const median = (values) => (values.length ? api.median(values) : null);
  const metrics = Object.fromEntries(
    Object.keys(anchor?.observation.metrics ?? {}).map((name) => [
      name,
      {
        median: median(current.map((e) => e.observation.metrics[name])),
        previousMedian: median(
          baseline.map((e) => e.observation.metrics[name]),
        ),
      },
    ]),
  );

  const proposals = [],
    ratchet = [];
  const budgetMedians = {};
  for (const { id, value: limit, ratchet: canRatchet } of descriptors) {
    if (!Number.isSafeInteger(limit) || limit < 0)
      throw new Error(`Invalid G1 limit ${id}`);
    const observations = current.filter(
      (e) =>
        e.budgetConfigHash === budgetConfigHash &&
        Number.isFinite(e.budgetValues?.[id]),
    );
    budgetMedians[id] =
      observations.length > 0 && observations.length === current.length
        ? median(observations.map((e) => e.budgetValues[id]))
        : null;
    // Timeout lowering additionally needs the G1 measured-sample contract.
    if (!canRatchet) {
      ratchet.push({
        id,
        reason: 'Measured replacement timeout samples unavailable',
        eligible: false,
      });
      continue;
    }
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = start + index * DAY_MS;
      const rows = current.filter(
        (e) =>
          Date.parse(e.observation.identity.createdAt) >= day &&
          Date.parse(e.observation.identity.createdAt) < day + DAY_MS,
      );
      const complete = rows.filter(
        (e) =>
          e.budgetConfigHash === budgetConfigHash &&
          /^[a-f\d]{64}$/.test(budgetConfigHash ?? '') &&
          Number.isFinite(e.budgetValues?.[id]) &&
          e.budgetValues[id] >= 0,
      );
      return {
        date: new Date(day).toISOString().slice(0, 10),
        runs: rows.length,
        completeRuns: complete.length,
        median: median(complete.map((e) => e.budgetValues[id])),
        maximum: complete.length
          ? Math.max(...complete.map((e) => e.budgetValues[id]))
          : null,
      };
    });
    const adequate =
      rejected.length === 0 &&
      days.every(
        (day) =>
          day.runs === day.completeRuns && day.completeRuns >= MIN_DAILY_RUNS,
      );
    const sustained =
      adequate &&
      limit > 0 &&
      days.every((day) => day.median < limit * (1 - HEADROOM_RATIO));
    const value = sustained
      ? Math.ceil(
          Math.max(...days.map((day) => day.maximum)) / (1 - HEADROOM_RATIO),
        )
      : null;
    const eligible = sustained && value < limit;
    ratchet.push({
      id,
      limit,
      days,
      eligible,
      value: eligible ? value : null,
      reason: !adequate
        ? 'Need seven complete comparable UTC days, each with at least three distinct runs and current budget digest; malformed input blocks proposals'
        : !sustained
          ? 'Headroom must exceed 15% on every daily median'
          : !eligible
            ? 'Maximum observation and integer rounding leave no safe lowering'
            : 'Seven-day headroom sustained',
    });
    if (eligible) proposals.push({ id, value });
  }

  const tests = current.map((e) => e.tests).filter(Boolean);
  const testAnchor = tests.at(-1);
  const fileValues = new Map();
  for (const t of tests.filter(
    (t) => t.comparableKey === testAnchor?.comparableKey,
  )) {
    for (const [file, ms] of Object.entries(t.files)) {
      if (!fileValues.has(file)) fileValues.set(file, []);
      fileValues.get(file).push(ms);
    }
  }
  const files = Object.fromEntries(
    [...fileValues].map(([file, values]) => [file, median(values)]),
  );
  const comparison = testAnchor
    ? api.compareTestFiles(
        {
          ...testAnchor,
          files,
          identity: {
            ...testAnchor.identity,
            createdAt: new Date(start).toISOString(),
          },
          complete:
            tests.length === current.length &&
            tests.every(
              (t) => t.complete && t.comparableKey === testAnchor.comparableKey,
            ),
        },
        baseline.map((e) => e.tests).filter(Boolean),
      )
    : { files: [], missing: ['Test timings unknown'] };
  const testRows = comparison.files.map((row) => ({
    ...row,
    samples: fileValues.get(row.file).length,
    growth:
      row.baselineMs > 0
        ? (row.durationMs - row.baselineMs) / row.baselineMs
        : null,
  }));
  const cacheSamples = current.filter((e) => e.cache !== null);
  const cacheAttempts = cacheSamples.reduce(
    (sum, e) => sum + e.cache.attempts,
    0,
  );
  const cacheHits = cacheSamples.reduce((sum, e) => sum + e.cache.hits, 0);
  const associations = [
    ...new Map(
      current
        .flatMap((e) => e.attribution?.pullRequests ?? [])
        .map((pr) => [pr.url, pr]),
    ).values(),
  ];
  return {
    schemaVersion: 1,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    comparableKey: anchor?.observation.comparableKey ?? null,
    observations: current.length,
    baselineObservations: baseline.length,
    included: current.map((e) => e.observation.identity),
    excluded: selected.excluded,
    baselineIncluded: baseline.map((e) => e.observation.identity),
    rejected,
    metrics,
    budgetMedians,
    proposals,
    ratchet,
    slowest: testRows
      .toSorted((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10),
    growth: testRows
      .filter((row) => row.growth !== null && row.growth > 0)
      .toSorted((a, b) => b.growth - a.growth)
      .slice(0, 10),
    testMissing: comparison.missing,
    cache: {
      observations: cacheSamples.length,
      totalObservations: current.length,
      attempts: cacheAttempts,
      hits: cacheHits,
      hitRate: cacheAttempts ? cacheHits / cacheAttempts : null,
    },
    associations,
  };
}
