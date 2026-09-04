/**
 * Client Error-frame mapping in the session helpers (umbrella 19.2).
 *
 * The live combat STALE_BRANCH frame already carries conflictHead and
 * recoveryAction. handleClientError used to run that code through
 * projectionSignalFromServerError and keep null, so the surface only
 * toasted. These rows pin the helpers admission point itself.
 */

import { mapClientErrorToProjectionSignal } from '../useMultiplayerSession.helpers';

describe('useMultiplayerSession helpers error mapping', () => {
  it('does not map a STALE_BRANCH frame to null', () => {
    const signal = mapClientErrorToProjectionSignal({
      code: 'STALE_BRANCH',
      reason: 'not the effective branch',
      conflictHead: { branchId: 'root', revision: 7 },
      recoveryAction: 'resync-to-active-head',
    });

    expect(signal).not.toBeNull();
    expect(signal).toEqual({
      code: 'STALE_BRANCH',
      conflictHead: { branchId: 'root', revision: 7 },
      recoveryAction: 'resync-to-active-head',
    });
  });

  it('still maps PROJECTION_REBUILDING to the rebuild signal', () => {
    expect(
      mapClientErrorToProjectionSignal({
        code: 'PROJECTION_REBUILDING',
        reason: 'correction lease rebuilding history',
      }),
    ).toBe('PROJECTION_REBUILDING');
  });

  it('leaves an unrelated refusal unmapped', () => {
    expect(
      mapClientErrorToProjectionSignal({
        code: 'RATE_LIMITED',
        reason: 'slow down',
      }),
    ).toBeNull();
  });
});
