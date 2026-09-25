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

import {
  expect,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test';

import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

/**
 * One row of a viewer's scoped feed, narrowed to the fields the drives
 * assert on. `message` is the redacted string the projection built for
 * THIS viewer - the byte the privacy drive compares.
 */
export type ActivityEntry = {
  ordinal: number;
  message: string;
  category: string;
  campaignDay: number;
  actorPlayerId: string;
  occurredAt: string;
};

export type ActivityBody = {
  kind: string;
  viewerSeat?: string;
  entries?: readonly ActivityEntry[];
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
  return campaignIdentity(
    'identity-co3-host',
    'CO3 Host',
    'CCCC-OOOO-3333-AAAA',
  );
}

/**
 * The same self-issued, UNSCOPED identity, parameterised.
 *
 * Extracted for the privacy drive, which needs FOUR principals rather
 * than one - a GM, two seated guests, and a stranger holding a valid
 * token and no seat. Unscoped for the reason `hostIdentity` already
 * carries: `expectedScopeForCampaign` reads the scope from the
 * campaign's own stored co-op session, and match creation writes none,
 * so a scoped token fails closed as `scope-unchecked`.
 * `server.js:368-378` accepts a scopeless token where a scope was
 * expected, which is the transition residual that makes this work.
 */
export async function campaignIdentity(
  id: string,
  displayName: string,
  friendCode: string,
): Promise<{ wireToken: string; playerId: string }> {
  const keys = await generateKeyPair();
  const token = await issuePlayerToken({
    id,
    displayName,
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode,
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
  const result = await requestActivity(
    request,
    origin,
    campaignId,
    sessionId,
    participantId,
  );
  expect(
    result.status,
    `activity read failed on ${origin}: ${JSON.stringify(result.body)}`,
  ).toBe(200);
  return result.body as ActivityBody;
}

/**
 * Read a response body as text exactly once and parse it as JSON.
 *
 * `response.json()` on a non-JSON answer (an HTML error page, an empty
 * body) throws a bare SyntaxError that names neither the status nor the
 * body, so a drive that failed there could not say what the server
 * sent. This reads the text once and, when it does not parse, throws an
 * Error naming the URL, the status and the whole body text.
 */
async function readJsonBody(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `non-JSON answer from ${response.url()}: status ${response.status()}, body ${JSON.stringify(text)}`,
    );
  }
}

/**
 * The same read, WITHOUT the 200 expectation.
 *
 * The privacy drive's central assertions are refusals - a revoked
 * member and a stranger are both answered 403 - so it needs the status
 * as a value rather than as a precondition. `readActivity` above is this
 * function plus the expectation, so the two can never disagree about
 * how the request is shaped. The body goes through `readJsonBody`, so a
 * non-JSON answer fails with its status and body.
 */
export async function requestActivity(
  request: APIRequestContext,
  origin: string,
  campaignId: string,
  sessionId: string,
  participantId: string,
): Promise<{ status: number; body: unknown }> {
  const response = await request.get(
    `${origin}/api/campaigns/${campaignId}/activity` +
      `?sessionId=${encodeURIComponent(sessionId)}` +
      `&participantId=${encodeURIComponent(participantId)}`,
  );
  return { status: response.status(), body: await readJsonBody(response) };
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
  return postIntentCommand(request, origin, campaignId, wireToken, commandId, {
    campaignId,
    intentId: `${commandId}-intent`,
    kind: 'SpendFunds',
    payload: { amount: SPEND_PER_COMMAND, reason: 'CO3 drive' },
  });
}

/**
 * The same POST carrying an arbitrary intent.
 *
 * The privacy drive needs it to establish, behaviourally rather than by
 * reading the source, that `RemoveParticipant` is NOT reachable through
 * this route: `campaignCommandPipeline.ts:503-508` calls
 * `validateCampaignIntent` with four arguments, leaving its
 * `hostPlayerId` parameter undefined, and
 * `CampaignMatchHostIntent.ts:222-223` refuses the removal whenever the
 * author is not that host. So the HTTP surface answers 422 `host-only`
 * for every caller including the GM, and the removal this drive needs
 * has to come from the socket. The body goes through `readJsonBody`,
 * like `requestActivity`'s.
 */
export async function postIntentCommand(
  request: APIRequestContext,
  origin: string,
  campaignId: string,
  wireToken: string,
  commandId: string,
  intent: Record<string, unknown>,
): Promise<{ status: number; body: CommandBody }> {
  const response = await request.post(
    `${origin}/api/campaigns/${campaignId}/commands`,
    {
      headers: { Authorization: `Bearer ${wireToken}` },
      data: { commandId, intent },
    },
  );
  return {
    status: response.status(),
    body: (await readJsonBody(response)) as CommandBody,
  };
}
