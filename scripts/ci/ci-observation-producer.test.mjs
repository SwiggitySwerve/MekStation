import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeRun } from './ci-metrics.mjs';
import {
  OBSERVATION_PRODUCER_SCHEMA,
  observationEnvelope,
  validateObservation,
  validateObservationProducer,
} from './ci-observation.mjs';

function observation() {
  const run = {
    id: 10,
    run_attempt: 2,
    workflow_id: 1,
    head_sha: 'a'.repeat(40),
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    head_branch: 'main',
    created_at: '2026-11-06T00:00:00Z',
    run_started_at: '2026-11-06T00:00:00Z',
  };
  const jobs = [
    {
      id: 1,
      name: 'tests',
      run_id: run.id,
      run_attempt: run.run_attempt,
      head_sha: run.head_sha,
      status: 'completed',
      conclusion: 'success',
      runner_id: 1,
      labels: ['ubuntu-latest'],
      started_at: run.created_at,
      completed_at: '2026-11-06T00:01:00Z',
    },
  ];
  return normalizeRun({
    repository: 'owner/repo',
    run,
    jobs,
    jobGraph: { tests: [] },
  });
}
function stamp(source) {
  return {
    schema: OBSERVATION_PRODUCER_SCHEMA,
    repository: source.repository,
    runId: 20,
    attempt: 3,
    headSha: 'b'.repeat(40),
    sourceRunId: source.runId,
    sourceAttempt: source.attempt,
  };
}

test('new artifacts default to null; older unstamped artifacts retain their identity', () => {
  const envelope = observationEnvelope(observation());
  assert.equal(envelope.producer, null);
  delete envelope.producer;
  assert.equal(validateObservation(envelope), envelope);
  assert.equal(Object.hasOwn(envelope, 'producer'), false);
});

test('Guard producer can have a distinct run/head while source identity stays unchanged', () => {
  const source = observation();
  const producer = stamp(source.identity);
  const envelope = observationEnvelope(source, { producer });
  assert.equal(
    validateObservationProducer(producer, source.identity),
    producer,
  );
  assert.equal(validateObservation(envelope), envelope);
  assert.equal(envelope.observation, source);
  assert.equal(envelope.observation.identity.runId, 10);
  assert.equal(envelope.observation.identity.attempt, 2);
  assert.equal(envelope.observation.identity.headSha, 'a'.repeat(40));
  assert.equal(envelope.producer.runId, 20);
});

test('canonical validator rejects malformed stamps and mismatched source tuples', () => {
  const source = observation();
  for (const change of [
    (p) => (p.schema = 'unknown'),
    (p) => (p.repository = 'other/repo'),
    (p) => (p.runId = 0),
    (p) => (p.attempt = -1),
    (p) => (p.runId = 1.5),
    (p) => (p.attempt = '3'),
    (p) => p.sourceRunId++,
    (p) => p.sourceAttempt++,
    (p) => (p.sourceRunId = NaN),
    (p) => (p.sourceAttempt = Infinity),
    (p) => (p.headSha = null),
    (p) => (p.headSha = 'short'),
    (p) => (p.headSha = 'B'.repeat(40)),
    (p) => (p.extra = true),
    (p) => delete p.sourceAttempt,
  ]) {
    const producer = stamp(source.identity);
    change(producer);
    assert.throws(
      () => validateObservationProducer(producer, source.identity),
      /Invalid CI observation/,
    );
    assert.throws(
      () => observationEnvelope(source, { producer }),
      /Invalid CI observation/,
    );
  }
  for (const producer of [null, [], 'invalid'])
    assert.throws(
      () => validateObservationProducer(producer, source.identity),
      /producer/,
    );
});
