/**
 * L1-SMOKE-A2 final composition and its own rows on the owned built server;
 * frozen after merge, B imports it read-only. Real HTTP and WebSocket only: no
 * source host, /api/e2e, test mode or mock. runA2Cases runs the A1 baseline once,
 * every frozen A2M matrix row once, then the rows owned here: concurrent first
 * sockets (CF-MPHD-5) and a real co-op mission restarted on the same image and
 * private DB with its first captured post-restart rolls (CF-MPRU2-3).
 */
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  A1_REQUIRED_CASES,
  api,
  issueIdentity,
  openSocket,
  runA1Cases,
} from './l1-built-server-socket-cases.mjs';
import {
  A2M_REQUIRED_CASES,
  runMatrixCases,
} from './l1-built-server-spectator-privacy-cases.mjs';

export const A2_FIXTURES = fileURLToPath(
  new URL('./l1-built-server-spectator-fixtures.ts', import.meta.url),
);
export const A2_OWN_CASES = Object.freeze([
  'concurrent-first-sockets',
  'coop-mission-provisioned',
  'coop-restart-action-accepted',
  'coop-first-rolls-captured',
]);
/** A1, then A2M, then the rows owned here; B composes exactly this list. */
export const A2_REQUIRED_CASES = Object.freeze([
  ...A1_REQUIRED_CASES,
  ...A2M_REQUIRED_CASES,
  ...A2_OWN_CASES,
]);
const DICE = new Set([
  'initiative_rolled',
  'attack_resolved',
  'physical_attack_resolved',
]);
const CONFIG = { mapRadius: 8, turnLimit: 5, fogOfWar: false };
const replayed = (frames) =>
  frames.filter((m) => m.kind === 'ReplayChunk').flatMap((m) => m.events);

/** The first dice event must carry captured d6 rolls (CF-MPRU2-3). */
export function capturedRolls(event) {
  const rolls = event?.payload?.rolls;
  const d6 = (die) => Number.isInteger(die) && die >= 1 && die <= 6;
  if (!Array.isArray(rolls) || rolls.length === 0 || !rolls.every(d6)) {
    throw new Error(
      `first dice event carries no captured d6 rolls: ${JSON.stringify(event?.payload ?? null)}`,
    );
  }
  return rolls;
}

/** CF-MPHD-5: every first upgrade and join of a fresh match is in flight at once. */
async function concurrentFirstSockets(ctx) {
  const who = await Promise.all(
    ['host', 'guest'].map((n) => issueIdentity(ctx, `cfs-${n}`)),
  );
  const [host] = who;
  const created = await api(ctx, 'POST', '/api/multiplayer/matches', host, {
    config: CONFIG,
    layout: '1v1',
    displayName: 'cfs',
  });
  const matchId = created.json?.matchId;
  ctx.check(
    created.status === 201,
    'concurrent-first-sockets',
    'provisioning failed',
    created,
  );
  const joined = await Promise.all(
    who.map(async (identity) => {
      const conn = await openSocket(ctx, identity, matchId, {
        label: `cfs-${identity.label}`,
      });
      return { conn, replay: await conn.join() };
    }),
  );
  const whole = joined.every(({ replay }) =>
    ['ReplayStart', 'ReplayEnd'].every((kind) =>
      replay.some((m) => m.kind === kind),
    ),
  );
  const [h, g] = joined.map(({ conn }) => conn);
  const lobby = [
    [g, { kind: 'OccupySeat', slotId: 'bravo-1' }],
    [g, { kind: 'SetReady', slotId: 'bravo-1', ready: true }],
    [h, { kind: 'SetReady', slotId: 'alpha-1', ready: true }],
    [h, { kind: 'LaunchMatch' }],
  ];
  for (const [conn, intent] of lobby) {
    const { reply } = await conn.intent(intent);
    ctx.check(
      reply.kind === 'LobbyUpdated',
      'concurrent-first-sockets',
      'lobby intent refused',
      reply,
    );
  }
  const acted = await h.intent({ kind: 'AdvancePhase' });
  const seen = await g.waitFor(
    (m) => m.kind === 'Event' && m.event.payload?.intentId === acted.intentId,
    'shared accepted event',
  );
  const ids = new Set([acted.reply.event?.id, seen.frame.event.id]);
  const errors = [h, g].flatMap((c) =>
    c.frames.filter((f) => f.parsed?.kind === 'Error'),
  );
  ctx.check(
    whole && acted.reply.kind === 'Event' && ids.size === 1 && !errors.length,
    'concurrent-first-sockets',
    'concurrent first sockets conflicted',
    { whole, ids: [...ids], errors: errors.map((e) => e.raw) },
  );
  await ctx.stop();
  const [row] = (
    await ctx.prepareOffline(undefined, ['lineage', `--match=${matchId}`])
  ).matches;
  ctx.check(
    row.eventCount === row.maxSequence + 1,
    'concurrent-first-sockets',
    'journal has a gap or duplicate',
    row,
  );
  ctx.pass('concurrent-first-sockets', {
    matchId,
    events: row.eventCount,
    sockets: who.length,
  });
  await ctx.restart();
}

/** Ordinary co-op path: campaign record, session, campaign-channel joins, participation, head, mission. */
async function provisionCoop(ctx) {
  const who = await Promise.all(
    ['gm', 'one', 'two'].map((n) => issueIdentity(ctx, `coop-${n}`)),
  );
  const [gm, one, two] = who;
  const [campaignId, missionId] = [`a2-${randomUUID()}`, 'a2-mission'];
  const now = new Date().toISOString();
  const body = {
    campaignId,
    name: 'A2 co-op smoke',
    factionId: 'mercenary',
    campaignStartDate: now,
    currentDate: now,
    finances: { balance: 1_000_000, transactions: [] },
    forces: [],
    missions: [[missionId, { id: missionId, name: 'A2 mission' }]],
    factionStandings: {},
  };
  const put = await api(ctx, 'PUT', `/api/campaigns/${campaignId}`, gm, {
    envelope: {
      campaignId,
      schemaVersion: 2,
      version: 0,
      savedAt: now,
      originDeviceId: 'a2-smoke',
      instanceId: 'a2-placeholder',
      authority: { role: 'source' },
      body,
    },
    baseVersion: 0,
  });
  const unit = (unitId) => ({
    unitId,
    designation: unitId,
    status: 'operational',
    unitRef: 'atlas-as7-d',
    unitSource: 'canonical',
  });
  const state = {
    campaignId,
    day: 0,
    balance: 1_000_000,
    rosterUnits: { 'a2-u1': unit('a2-u1'), 'a2-u2': unit('a2-u2') },
    forceUnits: { 'a2-f1': ['a2-u1'], 'a2-f2': ['a2-u2'] },
    pilots: {},
    contracts: {},
    factionStanding: {},
    salvagePool: 0,
  };
  const session = await api(ctx, 'POST', '/api/multiplayer/matches', gm, {
    config: CONFIG,
    layout: '1v1',
    displayName: 'A2 co-op',
    coopCampaign: { campaignId, arbitrationMode: 'auto-approve', state },
  });
  const sessionId = session.json?.matchId;
  const sync = async (identity, role) => {
    const conn = await openSocket(ctx, identity, sessionId, {
      label: `sync-${identity.label}`,
      query: `&channel=campaign&playerId=${identity.playerId}`,
    });
    conn.send({
      kind: 'CampaignJoin',
      playerId: identity.playerId,
      role,
      token: identity.wire,
      ...(role === 'guest' ? { roomCode: session.json.roomCode } : {}),
    });
    await conn.waitFor(
      (m) => m.kind === 'CampaignSnapshot',
      'CampaignSnapshot',
    );
    return conn;
  };
  const syncs = [
    await sync(gm, 'host'),
    await sync(one, 'guest'),
    await sync(two, 'guest'),
  ];
  for (const [conn, identity, forceId] of [
    [syncs[1], one, 'a2-f1'],
    [syncs[2], two, 'a2-f2'],
  ]) {
    conn.send({
      kind: 'CampaignParticipation',
      playerId: identity.playerId,
      participation: { missionId, forceId, choice: 'deploy' },
    });
    await conn.waitFor(
      (m) =>
        m.kind === 'CampaignParticipation' &&
        m.participation?.forceId === forceId,
      `participation ${forceId}`,
    );
  }
  const head = await api(ctx, 'GET', `/api/campaigns/${campaignId}/head`, gm);
  const { branchId, revision, effectiveGeneration } = head.json ?? {};
  const bootstrap = ['a2-u1', 'a2-u2'].map((unitId) => ({
    unitId,
    unitRef: 'atlas-as7-d',
    side: 'player',
  }));
  const contributions = [
    ['a2-f1', 'a2-u1'],
    ['a2-f2', 'a2-u2'],
  ].map(([forceId, unitId]) => ({
    forceId,
    choice: 'deploy',
    unitIds: [unitId],
  }));
  const mission = await api(ctx, 'POST', '/api/multiplayer/matches', gm, {
    config: CONFIG,
    layout: '1v1',
    unitBootstrap: bootstrap,
    coopCampaign: {
      campaignId,
      sessionId,
      missionId,
      expectedHead: { branchId, revision, effectiveGeneration },
      contributions,
    },
  });
  ctx.check(
    [put.status, session.status, mission.status].every(
      (s) => s === 201 || s === 200,
    ) && mission.json?.matchId,
    'coop-mission-provisioned',
    'ordinary co-op provisioning refused',
    { put, session, head, mission },
  );
  return {
    who,
    matchId: mission.json.matchId,
    campaignId,
    missionId,
    syncs,
    reopenGm: () => sync(gm, 'host'),
  };
}

async function connectAll(ctx, coop, suffix) {
  const conns = {};
  for (const identity of coop.who) {
    conns[identity.label] = await openSocket(ctx, identity, coop.matchId, {
      label: `${identity.label}${suffix}`,
    });
    await conns[identity.label].join();
  }
  return conns;
}

/** CF-MPRU2-3 on a real mission: pre-restart action, restart, real unit action, first captured rolls. */
async function coopRestart(ctx) {
  const coop = await provisionCoop(ctx);
  const { 'coop-gm': gm } = await connectAll(ctx, coop, '-1');
  const first = await gm.intent({ kind: 'AdvancePhase' });
  ctx.check(
    first.reply.kind === 'Event',
    'coop-mission-provisioned',
    'pre-restart action refused',
    first.reply,
  );
  ctx.pass('coop-mission-provisioned', {
    matchId: coop.matchId,
    campaignId: coop.campaignId,
    missionId: coop.missionId,
    pid: ctx.pid,
  });
  coop.syncs.forEach((conn) => conn.close());
  await ctx.stop();
  const active = await ctx.prepareOffline(A2_FIXTURES, [
    'active',
    `--match=${coop.matchId}`,
  ]);
  const pidBefore = ctx.pid;
  await ctx.restart();
  // A rebuilt campaign session stays paused until the GM's sync channel returns.
  await coop.reopenGm();
  const conns = await connectAll(ctx, coop, '-2');
  const owner = coop.who.find(
    (identity) => identity.playerId === active.ownerPlayerId,
  );
  const move = await conns[owner.label].intent({
    kind: 'Move',
    unitId: active.unitId,
    to: active.to,
    facing: active.facing,
    movementType: 'walk',
  });
  ctx.check(
    move.reply.kind === 'Event' &&
      move.reply.event.type === 'movement_declared',
    'coop-restart-action-accepted',
    'post-restart unit action refused',
    move.reply,
  );
  ctx.pass('coop-restart-action-accepted', {
    unitId: active.unitId,
    pid: ctx.pid,
    previousPid: pidBefore,
  });
  let dice = null;
  for (let i = 0; i < 8 && !dice; i += 1) {
    const { reply, intentId } = await conns['coop-gm'].intent({
      kind: 'AdvancePhase',
    });
    ctx.check(
      reply.kind === 'Event',
      'coop-first-rolls-captured',
      'phase advance refused',
      reply,
    );
    if (DICE.has(reply.event.type)) dice = { event: reply.event, intentId };
  }
  const rolls = capturedRolls(dice?.event);
  const { replay } = await ctx.reconnect(conns['coop-gm']);
  const again = replayed(replay).find((e) => e.id === dice.event.id);
  ctx.check(
    JSON.stringify(again?.payload.rolls) === JSON.stringify(rolls),
    'coop-first-rolls-captured',
    'replay rolls differ from live rolls',
    { rolls, replay: again?.payload.rolls },
  );
  await ctx.stop();
  const stored = await ctx.prepareOffline(A2_FIXTURES, [
    'event',
    `--match=${coop.matchId}`,
    `--id=${dice.event.id}`,
  ]);
  ctx.check(
    JSON.stringify(stored.rolls) === JSON.stringify(rolls) &&
      stored.intentId === dice.intentId,
    'coop-first-rolls-captured',
    'persisted rolls differ',
    { stored, rolls },
  );
  ctx.pass('coop-first-rolls-captured', {
    eventType: dice.event.type,
    rolls,
    intentId: dice.intentId,
    sequence: stored.sequence,
  });
  await ctx.restart();
}

export async function runOwnCases(ctx) {
  await concurrentFirstSockets(ctx);
  await coopRestart(ctx);
}

export async function runA2Cases(
  ctx,
  steps = { a1: runA1Cases, matrix: runMatrixCases, own: runOwnCases },
) {
  await steps.a1(ctx);
  await steps.matrix(ctx);
  await steps.own(ctx);
}
