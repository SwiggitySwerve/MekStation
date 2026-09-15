/**
 * The HTTP surface of the CO3 two-process drive.
 *
 * Split from the spec for the same reason `gmTwoPlayerMatchFlow.ts` is
 * split from the recovery pack: the spec should read as the argument it
 * is making, and the request shapes it argues with are a separate
 * concern that a second drive could reuse.
 *
 * Three shapes live here and each one is a decision, not boilerplate:
 * the campaign envelope the source is created from, the UNSCOPED host
 * token (a scoped one fails closed - see below), and the two routes the
 * drive reads and writes through.
 */

import { expect, type APIRequestContext } from '@playwright/test';

import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

export type ActivityBody = {
  kind: string;
  viewerSeat?: string;
  entries?: readonly unknown[];
};

export type CommandBody = {
  kind: string;
  reason?: string;
  state?: { day: number; balance: number };
};

/** Seed balance for the co-op ledger, in C-bills. */
export const SEED_BALANCE = 1_000_000;

/** What each command below spends. Small, and never the whole purse. */
export const SPEND_PER_COMMAND = 1_000;

export function campaignEnvelope(campaignId: string, version: number) {
  return {
    campaignId,
    schemaVersion: 2,
    version,
    savedAt: '2026-09-15T00:00:00.000Z',
    originDeviceId: 'co3-source',
    // The server owns `instanceId` and overwrites this placeholder.
    instanceId: 'co3-placeholder',
    authority: { role: 'source' },
    body: {
      campaignId,
      name: 'CO3 two-process convergence',
      factionId: 'mercenary',
      campaignStartDate: '3025-01-01T00:00:00.000Z',
      currentDate: '3025-01-01T00:00:00.000Z',
      finances: { balance: 1_000_000, transactions: [] },
      forces: [],
      missions: [],
      factionStandings: {},
    },
  };
}

/** A self-issued, UNSCOPED bearer token and the id it derives. */
export async function hostIdentity(): Promise<{
  wireToken: string;
  playerId: string;
}> {
  const keys = await generateKeyPair();
  // Unscoped deliberately: `expectedScopeForCampaign` reads the scope
  // from the campaign's OWN stored co-op session, and match creation
  // does not write one into the envelope - so a SCOPED token would fail
  // closed as `scope-unchecked`.
  const token = await issuePlayerToken({
    id: 'identity-co3-host',
    displayName: 'CO3 Host',
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'CCCC-OOOO-3333-AAAA',
    createdAt: new Date().toISOString(),
  });
  return { wireToken: encodeTokenForWire(token), playerId: token.playerId };
}

/**
 * One process's SCOPED view of the committed journal.
 *
 * `/activity` is the read this proof needs and `/head` is not: `/head`
 * resolves the event-history BRANCH record, which a plain journal append
 * never creates, so it answers `no-authoritative-stream` for a campaign
 * whose journal is demonstrably populated. `/activity` is derived from
 * the committed journal itself, read-only by construction, and scoped -
 * it resolves the caller's durable seat first and refuses a stranger
 * with 403 rather than a reduced feed. That makes it the surface where
 * "two-process SCOPED convergence" is a single assertion.
 */
export async function readActivity(
  request: APIRequestContext,
  origin: string,
  campaignId: string,
  sessionId: string,
  participantId: string,
): Promise<ActivityBody> {
  const response = await request.get(
    `${origin}/api/campaigns/${campaignId}/activity` +
      `?sessionId=${encodeURIComponent(sessionId)}` +
      `&participantId=${encodeURIComponent(participantId)}`,
  );
  expect(
    response.status(),
    `activity read failed on ${origin}: ${await response.text()}`,
  ).toBe(200);
  return (await response.json()) as ActivityBody;
}

/**
 * Post one campaign command and return its status plus body.
 *
 * `SpendFunds` rather than `AdvanceDay`, for two reasons that are the
 * same reason: a day advance derives `CampaignDayAdvanced`, and the
 * activity projection returns `null` for it BY DESIGN - "the clock the
 * other rows are stamped with", never a row of its own - so a drive
 * built on it could not observe convergence through the scoped feed at
 * all. A spend derives `FundsChanged`, which is both a feed row and a
 * LEDGER movement: the balance after N spends is N x the amount below,
 * so a process that quietly began a fresh log answers with the wrong
 * number instead of a plausible one.
 */
export async function postCommand(
  request: APIRequestContext,
  origin: string,
  campaignId: string,
  wireToken: string,
  commandId: string,
): Promise<{ status: number; body: CommandBody }> {
  const response = await request.post(
    `${origin}/api/campaigns/${campaignId}/commands`,
    {
      headers: { Authorization: `Bearer ${wireToken}` },
      data: {
        commandId,
        intent: {
          campaignId,
          intentId: `${commandId}-intent`,
          kind: 'SpendFunds',
          payload: { amount: SPEND_PER_COMMAND, reason: 'CO3 drive' },
        },
      },
    },
  );
  return {
    status: response.status(),
    body: (await response.json()) as CommandBody,
  };
}
