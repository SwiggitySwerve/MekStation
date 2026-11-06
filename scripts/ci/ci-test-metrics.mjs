import {
  measureJestFiles,
  mergeFileDurations,
} from '../jest/test-file-durations.mjs';
// Per-file execution observations. Cached passes are not timing samples.
import { median, quantile } from '../lib/statistics.mjs';
import { collectTests } from '../playwright/ci-e2e-plan.mjs';
import { selectMainObservations, TIMING_GROWTH_RATIO } from './ci-metrics.mjs';
import { validateTestFiles } from './ci-observation.mjs';

export const TEST_GROWTH_RATIO = TIMING_GROWTH_RATIO;
export const MIN_TEST_INCREASE_MS = 3000;
export const MIN_TEST_MAIN_SAMPLES = 5;

export function compareTestFiles(current, baselines) {
  const missing = [];
  if (!current || current.availability !== 'available')
    return {
      complete: false,
      files: [],
      breaches: [],
      missing: ['Test timings unavailable'],
    };
  const { included: usable, excluded } = selectMainObservations(
    baselines,
    current,
    (sample) =>
      sample.availability === 'available' &&
      sample.files &&
      Object.keys(sample.files).length > 0 &&
      Object.values(sample.files).every(
        (value) => Number.isFinite(value) && value > 0,
      ),
  );
  if (!usable.length)
    missing.push('Complete comparable main test census unavailable');
  if (!current.complete) missing.push('Current test census is incomplete');
  const files = Object.entries(current.files).map(([file, durationMs]) => {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      missing.push(`Invalid test duration: ${file}`);
      return { file, durationMs: null, baselineMs: null, status: 'missing' };
    }
    const values = usable
      .filter((sample) => Object.hasOwn(sample.files, file))
      .map((sample) => sample.files[file]);
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
      missing.push(`Invalid baseline test duration: ${file}`);
      return { file, durationMs, baselineMs: null, status: 'missing' };
    }
    const baselineMs = values.length ? median(values) : null;
    const baselineP75Ms = values.length ? quantile(values, 0.75) : null;
    if (baselineP75Ms === null)
      missing.push(`Main test duration unavailable: ${file}`);
    const increaseMs =
      baselineP75Ms === null ? null : durationMs - baselineP75Ms;
    const status =
      baselineP75Ms === null
        ? 'missing'
        : values.length >= MIN_TEST_MAIN_SAMPLES &&
            durationMs > baselineP75Ms * TEST_GROWTH_RATIO &&
            increaseMs >= MIN_TEST_INCREASE_MS
          ? 'growth'
          : 'within noise';
    return {
      file,
      durationMs,
      baselineMs,
      baselineP75Ms,
      baselineSamples: values.length,
      increaseMs,
      growthRatio: baselineP75Ms > 0 ? increaseMs / baselineP75Ms : null,
      status,
    };
  });
  return {
    complete: missing.length === 0,
    files,
    breaches: files.filter(({ status }) => status === 'growth'),
    missing,
    excluded,
    informational: true,
  };
}

export const compareTests = compareTestFiles;

/** A repository-relative duration census produced by a read-only test job. */
export function testObservation({
  observation,
  files,
  complete = false,
  framework,
}) {
  if (!['jest', 'playwright'].includes(framework))
    throw new Error('Unknown test framework');
  validateTestFiles(files, complete);
  return {
    schemaVersion: 1,
    identity: observation.identity,
    comparableKey: `${observation.comparableKey}/${framework}`,
    framework,
    availability: 'available',
    complete,
    files,
  };
}

/** Full census is proven against the read-only job's planned files, not assumed. */
export function extractTestObservation({
  observation,
  reports,
  root,
  expectedFiles,
  framework,
}) {
  validateTestFiles(Object.fromEntries(expectedFiles.map((file) => [file, 0])));
  const files = {};
  if (framework === 'jest') {
    for (const report of reports)
      mergeFileDurations(files, measureJestFiles(report, root).durations);
  } else if (framework === 'playwright') {
    for (const report of reports) {
      for (const test of collectTests(report)) {
        for (const result of test.results) {
          if (!Number.isFinite(result.duration) || result.duration < 0)
            throw new Error('Invalid Playwright duration');
          files[test.file] = (files[test.file] ?? 0) + result.duration;
        }
      }
    }
  } else throw new Error('Unknown test framework');
  const actual = Object.keys(files).sort();
  const expected = [...new Set(expectedFiles)].sort();
  const complete =
    actual.length > 0 && JSON.stringify(actual) === JSON.stringify(expected);
  return testObservation({ observation, files, framework, complete });
}
