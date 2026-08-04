import { H_TEST_IDS } from './camp01-authority-receipt.schemas.mjs';
import { prepareCamp01HReport } from './camp01-h-report-normalizer.mjs';

const PRODUCER_ID = 'scripts/qc/run-ux-walkthrough.mjs';
const INVOCATION_ID = '01-ux-audit-deep';
const JOURNEY_TITLES = Object.freeze({
  '08-sp-campaign-deep-loop': 'journey: sp campaign deep loop',
  '09-coop-multiplayer-two-client': 'journey: coop multiplayer two-client',
  '10-gm-surfaces': 'journey: gm surfaces',
});

export class Camp01UxReportNormalizerError extends Error {
  constructor(message, options) {
    super(`CAMP01_UX_REPORT_INVALID: ${message}`, options);
    this.name = 'Camp01UxReportNormalizerError';
  }
}

export function prepareCamp01UxReport(
  environment,
  isolation,
  dependencies = {},
) {
  const report = prepareCamp01HReport({
    environment: { ...environment, ...isolation?.environment },
    isolation,
    producerId: PRODUCER_ID,
    dependencies,
  });
  if (!report.active) return inactive();
  return Object.freeze({
    active: true,
    normalize: (manifest) => report.normalize(readObservations(manifest)),
  });
}

function readObservations(manifest) {
  const inventory = H_TEST_IDS[INVOCATION_ID];
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    !Array.isArray(manifest.journeys)
  )
    fail('walkthrough manifest malformed');
  const observed = [];
  const labels = new Set();
  for (const journey of manifest.journeys) {
    const title = JOURNEY_TITLES[journey?.journey];
    const id = inventory.find((candidate) => candidate.endsWith(`::${title}`));
    if (
      !title ||
      !id ||
      labels.has(journey.journey) ||
      !['ok', 'failed'].includes(journey.status)
    )
      fail('walkthrough journey inventory drift');
    labels.add(journey.journey);
    observed.push({
      id,
      status: journey.status === 'ok' ? 'passed' : 'failed',
    });
  }
  return observed;
}

function inactive() {
  return Object.freeze({ active: false, normalize: async () => undefined });
}

function fail(message, cause) {
  throw new Camp01UxReportNormalizerError(message, { cause });
}
