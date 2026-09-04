/**
 * HTTP rewind door, lineage read, and socket inject helpers for the
 * rewind pack. Kept beside gmTwoPlayerMatchFlow so the spec can stay
 * under the pack line cap.
 */

import {
  expect,
  type APIRequestContext,
  type APIResponse,
  type Browser,
  type Page,
} from '@playwright/test';
import path from 'node:path';

import { openSqliteEvidenceReader } from '../fixtures/sqliteEvidenceReader';
import {
  deleteIdentities,
  e2eRunId,
  launchOneVersusOne,
  openContextPage,
  tapErrorFrames,
} from './gmTwoPlayerMatchFlow';

export const REWIND_HOST_PASSWORD = 'RewindPackHost123!';
export const REWIND_GUEST_PASSWORD = 'RewindPackGuest123!';
export const ROOT_BRANCH_ID = 'root';
export const RESYNC_ACTION = 'resync-to-active-head';

export type ISocketTap = ReturnType<typeof tapErrorFrames>;

export interface IMatchToken {
  readonly token: string;
  readonly playerId: string;
}

export interface IRewindCas {
  readonly targetRevision: number;
  readonly expectedBranchId: string;
  readonly expectedRevision: number;
  readonly expectedDigest: string;
  readonly expectedGeneration: number;
}

export interface ILineage {
  readonly effectiveHead: {
    readonly branchId: string;
    readonly revision: number;
  } | null;
  readonly transitions: readonly {
    readonly fromBranchId: string;
    readonly toBranchId: string;
  }[];
}

export interface ILaunchedMatch {
  readonly matchId: string;
  readonly hostToken: IMatchToken;
  readonly hostTap: ISocketTap;
  readonly guestTap: ISocketTap;
  readonly hostPage: Page;
  readonly guestPage: Page;
}

/** WHAT: the run's match sqlite. WHY: durable claims must read the file the server wrote. */
function dbPath(): string {
  return path.resolve(
    '.sisyphus/e2e-runtime',
    e2eRunId(),
    'multiplayer-matches.db',
  );
}

/** WHAT: event count plus believed head. WHY: cancel/STALE_BRANCH append nothing; CAS names sequence+1. */
export function storeCensus(matchId: string): {
  readonly events: number;
  readonly headRevision: number;
} {
  const reader = openSqliteEvidenceReader(dbPath());
  try {
    const events =
      reader.select<{ n: number }>(
        'SELECT COUNT(*) AS n FROM mp_match_events WHERE match_id = ?',
        [matchId],
      )[0]?.n ?? 0;
    const maxSeq = reader.select<{ maxSeq: number | null }>(
      'SELECT MAX(sequence) AS maxSeq FROM mp_match_events WHERE match_id = ?',
      [matchId],
    )[0]?.maxSeq;
    return {
      events,
      headRevision: typeof maxSeq === 'number' ? maxSeq + 1 : 0,
    };
  } finally {
    reader.close();
  }
}

/** WHAT: five-field rewind CAS. WHY: both routes require targetRevision plus the four expected* fields. */
export function rewindCas(
  matchId: string,
  expectedBranchId = ROOT_BRANCH_ID,
): IRewindCas {
  const expectedRevision = storeCensus(matchId).headRevision;
  return {
    targetRevision: Math.max(0, expectedRevision - 1),
    expectedBranchId,
    expectedRevision,
    expectedDigest: '',
    expectedGeneration: 1,
  };
}

/** WHAT: host-authenticated rewind POST. WHY: GM rewind is the HTTP door, not the combat socket. */
export function postRewind(
  request: APIRequestContext,
  matchId: string,
  token: string,
  leaf: 'rewind-preview' | 'rewind-commit',
  body: IRewindCas,
): Promise<APIResponse> {
  return request.post(`/api/matches/${matchId}/${leaf}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: body,
  });
}

/** WHAT: seated timeline lineage. WHY: replacement vs superseded history is the HTTP audit surface. */
export async function readLineage(
  request: APIRequestContext,
  matchId: string,
  token: string,
): Promise<ILineage> {
  const response = await request.get(`/api/matches/${matchId}/timeline`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as { readonly lineage?: ILineage };
  return {
    effectiveHead: body.lineage?.effectiveHead ?? null,
    transitions: body.lineage?.transitions ?? [],
  };
}

/** WHAT: preview then commit as host. WHY: rows 40-44 drive the shipped GM door before the letter. */
export async function previewThenCommit(
  request: APIRequestContext,
  matchId: string,
  token: string,
  cas: IRewindCas,
): Promise<{
  readonly activatedBranchId: string;
  readonly priorBranchId: string;
}> {
  const preview = await postRewind(
    request,
    matchId,
    token,
    'rewind-preview',
    cas,
  );
  expect(preview.status(), await preview.text()).toBe(200);
  expect(((await preview.json()) as { kind?: string }).kind).toBe('preview');
  const commit = await postRewind(
    request,
    matchId,
    token,
    'rewind-commit',
    cas,
  );
  expect(commit.status(), await commit.text()).toBe(200);
  const body = (await commit.json()) as {
    readonly kind?: string;
    readonly activatedBranchId?: string;
    readonly priorBranchId?: string;
  };
  expect(body.kind).toBe('committed');
  if (!body.activatedBranchId || !body.priorBranchId) {
    throw new Error('commit omitted activated or prior branch');
  }
  return {
    activatedBranchId: body.activatedBranchId,
    priorBranchId: body.priorBranchId,
  };
}

/** WHAT: token id on an absolute side. WHY: host force is player, guest is opponent. */
export async function unitIdOnSide(
  page: Page,
  side: 'player' | 'opponent',
): Promise<string> {
  const tokens = page.locator('[data-testid^="unit-token-"]');
  await expect
    .poll(() => tokens.count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
  const total = await tokens.count();
  for (let index = 0; index < total; index += 1) {
    const token = tokens.nth(index);
    const label = (await token.getAttribute('aria-label')) ?? '';
    if (!label.includes(`side ${side}`)) continue;
    const testId = (await token.getAttribute('data-testid')) ?? '';
    if (testId.startsWith('unit-token-')) {
      return testId.slice('unit-token-'.length);
    }
  }
  throw new Error(`No rendered token on side ${side}`);
}

/** WHAT: hex and fog on one token. WHY: E2E-43 compares checkpoint, revealed, and restored projections. */
export async function tokenProjection(
  page: Page,
  unitId: string,
): Promise<{
  readonly position: string | null;
  readonly fogStatus: string | null;
}> {
  const token = page.getByTestId(`unit-token-${unitId}`);
  if ((await token.count()) === 0) {
    return { position: null, fogStatus: 'hidden' };
  }
  return {
    position: await token.getAttribute('data-token-map-position'),
    fogStatus: await token.getAttribute('data-fog-status'),
  };
}

/** WHAT: Intent envelope plus optional expected* head. WHY: inject must share the product socket. */
export function intentFrame(
  matchId: string,
  playerId: string,
  intentId: string,
  intent: Record<string, unknown>,
  expected?: IRewindCas,
): Record<string, unknown> {
  return {
    kind: 'Intent',
    matchId,
    ts: new Date().toISOString(),
    playerId,
    intentId,
    intent,
    ...(expected
      ? {
          expectedBranchId: expected.expectedBranchId,
          expectedRevision: expected.expectedRevision,
          expectedDigest: expected.expectedDigest,
          expectedGeneration: expected.expectedGeneration,
        }
      : {}),
  };
}

/** WHAT: Error code, head, and resync from a tap. WHY: STALE_BRANCH carries conflictHead and recoveryAction. */
export function parseError(raw: string): {
  readonly code?: string;
  readonly intentId?: string;
  readonly recoveryAction?: string;
  readonly branchId?: string;
} | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (record.kind !== 'Error') return null;
    const head = record.conflictHead;
    const branchId =
      typeof head === 'object' &&
      head !== null &&
      typeof (head as { branchId?: unknown }).branchId === 'string'
        ? (head as { branchId: string }).branchId
        : undefined;
    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      intentId:
        typeof record.intentId === 'string' ? record.intentId : undefined,
      recoveryAction:
        typeof record.recoveryAction === 'string'
          ? record.recoveryAction
          : undefined,
      branchId,
    };
  } catch {
    return null;
  }
}

/** WHAT: 1v1 with both sockets tapped. WHY: inject, reload, and GM HTTP share the launched match. */
export async function withRewindMatch(
  browser: Browser,
  request: APIRequestContext,
  body: (match: ILaunchedMatch) => Promise<void>,
): Promise<void> {
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const hostTap = tapErrorFrames(hostPage);
  const guestTap = tapErrorFrames(guestPage);
  await hostTap.install();
  await guestTap.install();
  let identityIds: readonly string[] = [];
  try {
    const opened = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Rewind Pack Host',
      guestName: 'Rewind Pack Guest',
      hostPassword: REWIND_HOST_PASSWORD,
      guestPassword: REWIND_GUEST_PASSWORD,
    });
    identityIds = opened.identityIds;
    await body({
      matchId: opened.match.matchId,
      hostToken: opened.hostToken,
      hostTap,
      guestTap,
      hostPage,
      guestPage,
    });
  } finally {
    await deleteIdentities(request, identityIds).catch(() => undefined);
    await hostPage.context().close();
    await guestPage.context().close();
  }
}
