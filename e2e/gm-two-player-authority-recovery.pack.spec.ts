/**
 * Authority recovery (E2E-01 / E2E-02).
 *
 * E2E-01: WHEN the GM creates a campaign and all three contexts and the
 * server restart THEN the campaign, genesis branch, non-playing GM
 * membership, two player memberships, and authorized baselines SHALL
 * recover.
 * E2E-02: WHEN Player 1 and Player 2 receive owned forces and all
 * contexts refresh or the host process restarts THEN player slots,
 * force ownership, readiness revision, branch, and cursors SHALL remain
 * authoritative.
 *
 * The genesis/branch rows are live through the production flag:
 * CAMPAIGN_JOURNAL_AUTHORITY_ENABLED is on with no override, so the
 * campaign create appends its genesis and the co-op creation checkpoint
 * runs its genesis-branch step.
 * Do not use test.skip.
 *
 * WHY this group is in RESPAWNING_GROUPS: both rows arm
 * process-exit-after-commit and kill the server.
 *
 * @tags @authority-recovery @E2E-01 @E2E-02
 */

import { expect, test } from '@playwright/test';

import {
  assertCursorsNotRewound,
  assertGenesisBranchRecovers,
  boundPlayingSeats,
  readAuthorizedBaseline,
  readParticipants,
  readStoredCampaign,
  snapshotOwnership,
} from './helpers/authorityRecoveryEvidence';
import {
  fireHostDeath,
  markPlayersReadyIfVisible,
  openRecoverableCampaign,
  prepareHostDeathTrigger,
  reloadAll,
  type IRecoveryDrive,
} from './helpers/gmTwoPlayerAuthorityRecovery';

test('E2E-01 durable campaign cold recovery @authority-recovery @E2E-01', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(240_000);
  const drive = await recoverAfterRestart({
    browser,
    request,
    baseURL: baseURL ?? '',
    markReady: false,
  });
  try {
    await assertPlainE2E01(drive, request);
  } finally {
    await drive.fixture.cleanup();
  }
});

test('E2E-01 genesis branch recovers @authority-recovery @E2E-01', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(240_000);
  const drive = await recoverAfterRestart({
    browser,
    request,
    baseURL: baseURL ?? '',
    markReady: false,
  });
  try {
    assertGenesisBranchRecovers(drive);
  } finally {
    await drive.fixture.cleanup();
  }
});

test('E2E-02 participant ownership survives restart @authority-recovery @E2E-02', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(240_000);
  const drive = await openRecoverableCampaign({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  try {
    await markPlayersReadyIfVisible(drive);
    await prepareHostDeathTrigger(drive);
    const before = snapshotOwnership(drive);
    await fireHostDeath(drive, request);
    // Seats must survive the host death on disk. Read them from the
    // same sqlite evidence as `before`, after waitForRelaunch and
    // before any client reload/rejoin can occupy again.
    const persisted = snapshotOwnership(drive);
    const beforePlaying = boundPlayingSeats(before.seats);
    const persistedPlaying = boundPlayingSeats(persisted.seats);
    expect(persistedPlaying).toEqual(beforePlaying);
    expect(persistedPlaying).toHaveLength(2);
    expect(persistedPlaying.map((seat) => seat.occupantPlayerId)).toEqual(
      beforePlaying.map((seat) => seat.occupantPlayerId),
    );
    await reloadAll(drive);
    const after = snapshotOwnership(drive);
    expect(after.claims).toEqual(before.claims);
    // IMatchMeta carries readiness as seats[].ready; no revision column.
    expect(after.seatReady).toEqual(before.seatReady);
    assertCursorsNotRewound(before.deliveryCursors, after.deliveryCursors);
  } finally {
    await drive.fixture.cleanup();
  }
});

test('E2E-02 effective branch remains authoritative @authority-recovery @E2E-02', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(240_000);
  const drive = await openRecoverableCampaign({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  try {
    await markPlayersReadyIfVisible(drive);
    await prepareHostDeathTrigger(drive);
    const before = snapshotOwnership(drive);
    await fireHostDeath(drive, request);
    await reloadAll(drive);
    const after = snapshotOwnership(drive);
    expect(after.effectiveBranchId).not.toBeNull();
    expect(after.effectiveBranchId).toBe(before.effectiveBranchId);
    assertGenesisBranchRecovers(drive);
  } finally {
    await drive.fixture.cleanup();
  }
});

async function recoverAfterRestart(input: {
  readonly browser: import('@playwright/test').Browser;
  readonly request: import('@playwright/test').APIRequestContext;
  readonly baseURL: string;
  readonly markReady: boolean;
}): Promise<IRecoveryDrive> {
  const drive = await openRecoverableCampaign(input);
  if (input.markReady) await markPlayersReadyIfVisible(drive);
  await prepareHostDeathTrigger(drive);
  await fireHostDeath(drive, input.request);
  await reloadAll(drive);
  return drive;
}

async function assertPlainE2E01(
  drive: IRecoveryDrive,
  request: import('@playwright/test').APIRequestContext,
): Promise<void> {
  const stored = await readStoredCampaign(request, drive.session.campaignId);
  expect(stored.campaignId).toBe(drive.session.campaignId);
  expect(stored.name).toBe(drive.session.campaignName);
  const participants = readParticipants(drive);
  expect(participants.map((row) => row.seat).sort()).toEqual(
    ['gm', 'player', 'player'].sort(),
  );
  expect(participants.every((row) => row.revoked_at === null)).toBe(true);
  const gm = participants.find((row) => row.seat === 'gm');
  expect(gm?.participant_id).toBe(drive.gm.identity.playerId);
  const baseline = readAuthorizedBaseline(drive);
  expect(baseline.campaignId).toBe(drive.session.campaignId);
  expect(baseline.hasState).toBe(true);
}
