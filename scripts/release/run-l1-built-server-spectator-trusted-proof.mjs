#!/usr/bin/env node
/**
 * L1-SMOKE-A2F runner: trusted brand and stale-assignment fixtures and the
 * observed non-spectating-GM positive on the built production image, composed
 * over the A2FP ordinary reachability rows in one image and private DB.
 *   node scripts/release/run-l1-built-server-spectator-trusted-proof.mjs --build --expected-sha=<sha> --output=<abs-new-dir> [--repo-root=<abs>]
 * M and A2 import AUDIENCES, F_REQUIRED_CASES, prepareAudience, trustedOp,
 * joinWatcher and runTrustedCases read-only.
 */
import { fileURLToPath } from 'node:url';

import { openSocket } from './l1-built-server-socket-cases.mjs';
import {
  COMMANDS,
  accepted,
  commandFor,
  connOf,
  offline,
  phaseReady,
  provision,
  witnessRequest,
} from './l1-built-server-spectator-context.mjs';
import {
  FP_REQUIRED_CASES,
  runDirect,
  runReachabilityCases,
} from './run-l1-built-server-spectator-fixture-proof.mjs';

export const TRUSTED = fileURLToPath(
  new URL('./l1-built-server-spectator-trusted-fixtures.ts', import.meta.url),
);
/** The branded principal is the spectator, or the idle participant for the non-spectating GM. */
export const AUDIENCES = Object.freeze([
  { id: 'player-stale', brand: 'player', stale: true, participant: false },
  { id: 'gm-stale', brand: 'gm', stale: true, participant: false },
  { id: 'gm-unassigned', brand: 'gm', stale: false, participant: false },
  { id: 'gm-participant', brand: 'gm', stale: false, participant: true },
]);
export const F_REQUIRED_CASES = Object.freeze([
  ...FP_REQUIRED_CASES,
  ...AUDIENCES.map((audience) => `trusted-${audience.id}`),
  'gm-brand-recovered',
]);
const anchor = (ready) => ({
  count: ready.eventCount,
  sha256: ready.eventsSha256,
});

/** One trusted op (ready, declared or prepare) between a stop and a restart. */
export function trustedOp(
  ctx,
  state,
  op,
  ready,
  audience,
  command,
  extra = {},
) {
  const request = {
    ...witnessRequest(ctx, state, command, { ready: anchor(ready), ...extra }),
    audience,
    subjectId: audience.participant
      ? ready.other.playerId
      : state.identities.watcher.playerId,
    activeSide: ready.active.side,
  };
  return offline(ctx, state, TRUSTED, [
    op,
    `--request=${JSON.stringify(request)}`,
  ]);
}
export const prepareAudience = (ctx, state, ready, audience, command, extra) =>
  trustedOp(ctx, state, 'prepare', ready, audience, command, extra);

/** The trusted facts must be the ones the audience asked for, or the fixture is vacuous. */
export function established(ctx, id, audience, after) {
  ctx.check(
    after.brand === audience.brand &&
      after.staleEffective === audience.stale &&
      (after.marker !== null) === (audience.brand === 'gm') &&
      after.seatKinds.join() ===
        (audience.participant ? 'human' : 'spectator') &&
      after.facts.revealed !== true,
    id,
    'trusted audience not established',
    after,
  );
}

/** Watcher socket on the current server process; waits for the server-side attach. */
export async function joinWatcher(ctx, state) {
  const { watcher } = state.identities;
  const label = `${state.label}-watcher${state.generation}`;
  const conn = (state.conns.watcher = await openSocket(
    ctx,
    watcher,
    state.matchId,
    { label },
  ));
  const replay = await conn.join();
  const lobby = (
    await conn.waitFor((m) => m.kind === 'LobbyUpdated', 'spectator seat')
  ).frame;
  const own = lobby.seats.filter(
    (seat) => seat.occupant?.playerId === watcher.playerId,
  );
  ctx.check(
    own.length === 1 && own[0].kind === 'spectator',
    state.label,
    'current spectator seat not witnessed',
    own,
  );
  for (
    const end = Date.now() + ctx.limits.waitMs;
    !ctx
      .serverOutput()
      .includes(
        `session joined matchId=${state.matchId} playerId=${watcher.playerId}`,
      );
  )
    if (Date.now() > end)
      throw new Error(`${label}: server never attached the watcher`);
    else await new Promise((resolve) => setTimeout(resolve, 50));
  return { conn, replay };
}

export const sees = (conn, since, id) =>
  conn.frames.slice(since).some((frame) => frame.raw.includes(id));
/** The actor's own public lock: the live barrier after a withheld declaration. */
export const lockedFor = (unitId) => (m) =>
  m.kind === 'Event' &&
  /_locked$/.test(m.event.type) &&
  m.event.payload?.unitId === unitId;

/**
 * Stale-first watcher. The product reads the first assignment of a side as that
 * side's only sealed owner (MatchWireSealedChoices), so a stale entry listed
 * first would also withhold the real actor's own declaration (Step 3 finding,
 * owner decisions 2026-10-26 item 3; the live case is MISSION-MATCH-1's). The
 * assignment therefore lands AFTER the accepted declaration, and the spectator
 * guard is witnessed on the replay after the restart.
 */
async function staleCase(ctx, audience) {
  const id = `trusted-${audience.id}`;
  const command = COMMANDS[0];
  const state = await provision(ctx, id);
  const ready = await phaseReady(ctx, state, command);
  const intent = commandFor(command, ready);
  const result = await accepted(ctx, state, ready, intent, command.type);
  const extra = { intent, intentId: result.intentId };
  const prepared = await prepareAudience(
    ctx,
    state,
    ready,
    audience,
    command,
    extra,
  );
  established(ctx, id, audience, prepared.after);
  const { conn } = await joinWatcher(ctx, state);
  ctx.check(
    conn.frames.some((frame) => /_locked"/.test(frame.raw)),
    id,
    'watcher replay lacks the public lock',
    { frames: conn.frames.length },
  );
  const leaked = sees(conn, 0, result.reply.event.id);
  ctx.check(
    !leaked,
    id,
    'stale-first spectator received a sealed declaration',
    {
      leaked,
    },
  );
  const durable = await trustedOp(
    ctx,
    state,
    'declared',
    ready,
    audience,
    command,
    extra,
  );
  established(ctx, id, audience, durable);
  return { prepared, durable, leaked };
}

/** Live delivery of one accepted declaration to the idle participant, before or after it is branded GM. */
async function gmCase(ctx, id, brandFirst) {
  const audience = AUDIENCES.find((a) => a.participant);
  const command = COMMANDS[0];
  const state = await provision(ctx, id);
  const ready = await phaseReady(ctx, state, command);
  if (brandFirst) await prepareAudience(ctx, state, ready, audience, command);
  const gm = connOf(state, ready.other.playerId);
  const since = gm.frames.length;
  const intent = commandFor(command, ready);
  const result = await accepted(ctx, state, ready, intent, command.type);
  const declaration = result.reply.event;
  await gm.waitFor(
    lockedFor(ready.active.unitId),
    'public lock after the declaration',
    {
      since,
    },
  );
  const live = sees(gm, since, declaration.id);
  ctx.check(
    live === brandFirst,
    id,
    brandFirst
      ? 'branded GM did not receive the declaration'
      : 'unbranded participant received a sealed declaration',
    { live },
  );
  const extra = { intent, intentId: result.intentId };
  const branded = brandFirst
    ? null
    : await prepareAudience(ctx, state, ready, audience, command, extra);
  const durable = branded
    ? branded.after
    : await trustedOp(ctx, state, 'declared', ready, audience, command, extra);
  const replayed = sees(connOf(state, ready.other.playerId), 0, declaration.id);
  ctx.check(replayed, id, 'GM brand did not survive the restart', { replayed });
  established(ctx, id, audience, durable);
  return { declaration, durable };
}

export async function runTrustedCases(ctx) {
  await runReachabilityCases(ctx);
  for (const audience of AUDIENCES.filter((a) => !a.participant)) {
    const id = `trusted-${audience.id}`;
    if (audience.stale) {
      ctx.pass(id, await staleCase(ctx, audience));
      continue;
    }
    const command = COMMANDS[0];
    const state = await provision(ctx, id);
    const ready = await phaseReady(ctx, state, command);
    const prepared = await prepareAudience(
      ctx,
      state,
      ready,
      audience,
      command,
    );
    established(ctx, id, audience, prepared.after);
    await joinWatcher(ctx, state);
    const intent = commandFor(command, ready);
    const result = await accepted(ctx, state, ready, intent, command.type);
    const durable = await trustedOp(
      ctx,
      state,
      'declared',
      ready,
      audience,
      command,
      { intent, intentId: result.intentId },
    );
    established(ctx, id, audience, durable);
    ctx.pass(id, { prepared, durable });
  }
  const live = await gmCase(ctx, 'trusted-gm-participant', true);
  ctx.pass('trusted-gm-participant', live);
  ctx.pass(
    'gm-brand-recovered',
    await gmCase(ctx, 'gm-brand-recovered', false),
  );
}

runDirect(import.meta.url, F_REQUIRED_CASES, runTrustedCases, {
  limits: { casesMs: 900_000 },
});
