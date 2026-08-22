/**
 * Deliberate unstamped campaign-event construction used by the QC sweep
 * self-check. This file is NOT under src/ so the production scan does
 * not see it. The scanner must FAIL when pointed at this snippet.
 */
export const unstampedFundsChanged = {
  type: 'FundsChanged',
  sequence: 0,
  campaignId: 'fixture-campaign',
  ts: '3025-01-01T00:00:00.000Z',
  authorPlayerId: 'fixture-author',
  payload: { delta: -1, reason: 'unstamped', balance: 0 },
};

/** Control: a stamped construction the same fixture file also contains. */
export const stampedPilotHired = {
  type: 'PilotHired',
  sequence: 1,
  campaignId: 'fixture-campaign',
  ts: '3025-01-01T00:00:00.000Z',
  authorPlayerId: 'fixture-author',
  scope: 'campaign',
  payload: { pilot: { pilotId: 'p', name: 'N' }, cost: 1 },
};
