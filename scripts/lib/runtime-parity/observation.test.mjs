// The record-sheet read point's failure checks, with stubs, in plain Node (the observers load the app under Jest).
//   node --test scripts/lib/runtime-parity/observation.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ObservationError,
  checkSheetCalculation,
  previewFailure,
} from './observation.cjs';

const header = (battleValue, cost = 1234) => ({ battleValue, cost });
const succeeded = (bv) => ({ result: { bv }, error: null });

/** The call throws an ObservationError at stage 'preview', infrastructure; returns it for further checks. */
const failsAtPreview = (fn) => {
  let caught;
  assert.throws(fn, (error) => {
    caught = error;
    return (
      error instanceof ObservationError &&
      error.stage === 'preview' &&
      error.infrastructure === true
    );
  });
  return caught;
};

test('a calculation that succeeded and produced the sheet BV is a value, including a real 0', () => {
  assert.deepEqual(checkSheetCalculation(header(1500), succeeded(1500)), {
    bv: 1500,
    cost: 1234,
  });
  assert.deepEqual(checkSheetCalculation(header(0, 0), succeeded(0)), {
    bv: 0,
    cost: 0,
  });
});

test('no calculation ran (the sheet was handed the 0 fallback): ObservationError at stage preview', () => {
  const error = failsAtPreview(() => checkSheetCalculation(header(0, 0), null));
  assert.match(error.message, /no mechBV calculation ran/);
});

test('calculation threw: the probe recorded a failure, so ObservationError at stage preview naming the cause', () => {
  const cause = new Error('registry not ready');
  const error = failsAtPreview(() =>
    checkSheetCalculation(header(0, 0), { result: null, error: cause }),
  );
  assert.match(error.message, /calculation threw: registry not ready/);
  assert.equal(
    error.cause,
    undefined,
    'the cause lives on the wrapped error, not the observation',
  );
  // A thrown non-Error value is still named.
  const odd = failsAtPreview(() =>
    checkSheetCalculation(header(0, 0), { result: null, error: 'boom' }),
  );
  assert.match(odd.message, /calculation threw: boom/);
});

test('the BV handed to the sheet differs from the one calculated (cost failed, or the value was replaced): ObservationError at stage preview', () => {
  const error = failsAtPreview(() =>
    checkSheetCalculation(header(0, 0), succeeded(1500)),
  );
  assert.match(error.message, /handed BV 0 but its calculation produced 1500/);
  failsAtPreview(() => checkSheetCalculation(header(1499), succeeded(1500)));
});

test('previewFailure is the one way a preview failure is raised', () => {
  const error = previewFailure('x', new Error('why'));
  assert.ok(error instanceof ObservationError);
  assert.deepEqual(
    [error.stage, error.infrastructure, error.message],
    ['preview', true, 'x'],
  );
});
