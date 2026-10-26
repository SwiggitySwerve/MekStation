/**
 * L1-SMOKE-A2FP ordinary provisioning and phase-ready reachability for the
 * built-server spectator proofs; frozen, F/M/A2 import it read-only. Production
 * HTTP and serial sockets only: no source host, injected declaration or mock.
 * Deployment rows, activation order, weapons and reveal state are never
 * restated here: the read-only stopped-DB witness reports them from the
 * product, and every command is sent by the principal owning the active unit.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  api,
  issueIdentity,
  openSocket,
} from './l1-built-server-socket-cases.mjs';

export const REACHABILITY = fileURLToPath(
  new URL('./l1-built-server-spectator-reachability.ts', import.meta.url),
);
export const COMMANDS = Object.freeze([
  { kind: 'Move', phase: 'movement', type: 'movement_declared', advances: 1 },
  {
    kind: 'Attack',
    phase: 'weapon_attack',
    type: 'attack_declared',
    advances: 2,
  },
  {
    kind: 'Physical',
    phase: 'physical_attack',
    type: 'physical_attack_declared',
    advances: 3,
  },
]);
/** startHex is not sent: the product deploys at fixed rows and ignores it. */
export const BOOTSTRAP = Object.freeze([
  { unitId: 'fixture-player', unitRef: 'atlas-as7-d', side: 'player' },
  { unitId: 'fixture-opponent', unitRef: 'atlas-as7-d', side: 'opponent' },
]);

/** Serial participant sockets for the current server process (A1 serial-first rule). */
export async function connect(ctx, state) {
  state.generation = (state.generation ?? 0) + 1;
  for (const role of ['host', 'guest']) {
    state.conns?.[role]?.close();
    // A fresh label per connection keeps intent ids unique across restarts.
    const label = `${state.label}-${role}${state.generation}`;
    state.conns = {
      ...state.conns,
      [role]: await openSocket(ctx, state.identities[role], state.matchId, {
        label,
      }),
    };
    await state.conns[role].join();
  }
}
/** Ordinary create, lobby launch and spectator registration; no trusted edit. */
export async function provision(ctx, label) {
  const identities = {};
  for (const role of ['host', 'guest', 'watcher'])
    identities[role] = await issueIdentity(ctx, `${label}-${role}`);
  const config = { mapRadius: 8, turnLimit: 5, fogOfWar: false }; // deploy rows +-5 need radius 7+
  const created = await api(
    ctx,
    'POST',
    '/api/multiplayer/matches',
    identities.host,
    { config, layout: '1v1', displayName: label, unitBootstrap: BOOTSTRAP },
  );
  ctx.check(created.status === 201, label, 'ordinary create failed', created);
  const state = {
    label,
    matchId: created.json.matchId,
    identities,
    conns: null,
  };
  await connect(ctx, state);
  const { host, guest } = state.conns;
  for (const [conn, intent] of [
    [guest, { kind: 'OccupySeat', slotId: 'bravo-1' }],
    [guest, { kind: 'SetReady', slotId: 'bravo-1', ready: true }],
    [host, { kind: 'SetReady', slotId: 'alpha-1', ready: true }],
    [host, { kind: 'LaunchMatch' }],
  ]) {
    const { reply } = await conn.intent(intent);
    ctx.check(
      reply.kind === 'LobbyUpdated' &&
        (intent.kind !== 'LaunchMatch' || reply.status === 'active'),
      label,
      'ordinary lobby intent refused',
      reply,
    );
  }
  const spectate = await api(
    ctx,
    'POST',
    `/api/multiplayer/matches/${state.matchId}/spectate`,
    identities.watcher,
  );
  ctx.check(
    spectate.status === 201,
    label,
    'ordinary spectate failed',
    spectate,
  );
  return state;
}

/** The connection of the participant holding this principal id. */
export const connOf = (state, playerId) =>
  state.conns[playerId === state.identities.host.playerId ? 'host' : 'guest'];

export function witnessRequest(ctx, state, command, extra = {}) {
  const { host, guest, watcher } = state.identities;
  return {
    matchId: state.matchId,
    expectedDb: path.join(ctx.evidence.dir, 'db', 'smoke.sqlite'),
    hostId: host.playerId,
    guestId: guest.playerId,
    watcherId: watcher.playerId,
    unitBootstrap: BOOTSTRAP,
    command: {
      kind: command.kind,
      phase: command.phase,
      type: command.type,
      ...extra,
    },
  };
}

/** Close every socket, stop the owned server, run one offline script, restart and reconnect. */
export async function offline(ctx, state, script, args) {
  Object.values(state.conns).forEach((conn) => conn.close());
  await ctx.stop();
  const result = await ctx.prepareOffline(script, args);
  await ctx.restart();
  await connect(ctx, state);
  return result;
}

/** One read-only witness op between a stop and a restart. */
export async function witness(ctx, state, op, command, extra = {}) {
  const request = witnessRequest(ctx, state, command, extra);
  const facts = await offline(ctx, state, REACHABILITY, [
    op,
    `--request=${JSON.stringify(request)}`,
  ]);
  ctx.check(
    facts.op === op && facts.phase === command.phase,
    state.label,
    'witness answered another op or phase',
    facts,
  );
  return facts;
}

/** Ordinary AdvancePhase from the host; the engine rolls initiative itself. */
async function advance(ctx, state, count) {
  for (let i = 0; i < count; i += 1) {
    const { reply } = await state.conns.host.intent({ kind: 'AdvancePhase' });
    ctx.check(
      reply.kind === 'Event',
      state.label,
      'phase advance refused',
      reply,
    );
  }
}

/** One accepted authoritative declaration, correlated to its intent id. */
export async function accepted(ctx, state, ready, intent, type) {
  const result = await connOf(state, ready.active.playerId).intent(intent);
  const { event } = result.reply;
  ctx.check(
    result.reply.kind === 'Event' &&
      event.type === type &&
      event.payload.intentId === result.intentId &&
      event.actorId === ready.active.unitId,
    state.label,
    `${intent.kind} not accepted as ${type}`,
    result.reply,
  );
  return result;
}

/** Straight-line destination toward the other unit; deployment must share a column. */
function stepToward(from, to, hexes) {
  if (from.position.q !== to.position.q || from.position.r === to.position.r)
    throw new Error('deployment: units do not share a column');
  return {
    q: from.position.q,
    r: from.position.r + Math.sign(to.position.r - from.position.r) * hexes,
  };
}

/** Both units run into contact so the Physical phase has an adjacent legal target. */
async function closeIn(ctx, state, ready) {
  const runs = [
    [ready.active, ready.other, 5],
    [ready.other, ready.active, ready.distance - 6],
  ];
  for (const [mover, target, hexes] of runs) {
    const intent = {
      kind: 'Move',
      unitId: mover.unitId,
      to: stepToward(mover, target, hexes),
      facing: mover.facing,
      movementType: 'run',
    };
    await accepted(ctx, state, { active: mover }, intent, 'movement_declared');
  }
}

/** Ordinary phase advances to the command phase, then the read-only `ready` witness. */
export async function phaseReady(ctx, state, command) {
  await advance(ctx, state, 1);
  if (command.kind === 'Physical') {
    await closeIn(ctx, state, await witness(ctx, state, 'ready', COMMANDS[0]));
    await advance(ctx, state, command.advances - 1);
  } else await advance(ctx, state, command.advances - 1);
  return witness(ctx, state, 'ready', command);
}

export function commandFor(command, ready) {
  const [attackerId, targetId] = [ready.active.unitId, ready.other.unitId];
  if (command.kind === 'Move')
    return {
      kind: 'Move',
      unitId: attackerId,
      to: stepToward(ready.active, ready.other, 1),
      facing: ready.active.facing,
      movementType: 'walk',
    };
  if (command.kind === 'Attack')
    return {
      kind: 'Attack',
      attackerId,
      targetId,
      weaponIds: [ready.weaponId],
    };
  return {
    kind: 'Physical',
    attackerId,
    targetId,
    attackType: 'punch',
    limb: 'leftArm',
  };
}
