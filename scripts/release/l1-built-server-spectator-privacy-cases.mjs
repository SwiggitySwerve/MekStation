/**
 * L1-SMOKE-A2M privacy matrix on the built production image; frozen, A2 and B
 * import it read-only. Rows are the three sealed declarations (Move, Attack,
 * Physical) times the A2F audiences: the three spectator audiences are the
 * withheld-secret rows; a fixture-branded GM is the positive control, so
 * these tactical fixtures do not claim the real mission host has GM role.
 * Every row uses actual accepted intents, a second actor that keeps the reveal
 * pending, the actor's own public lock as the live barrier, and the same
 * private DB through a reconnect, a restart and the authoritative reveal.
 * A stale audience is assigned BEFORE the actor acts (live stale-first, the
 * case A2F deferred to MISSION-MATCH-1): the actor still receives its own
 * declaration live and after the restart; the watcher holds only the public lock.
 * Sentinels are the declaration id, the intent id and the exact payload.
 */
import {
  COMMANDS,
  accepted,
  commandFor,
  connOf,
  phaseReady,
  provision,
} from './l1-built-server-spectator-context.mjs';
import {
  AUDIENCES,
  established,
  joinWatcher,
  lockedFor,
  prepareAudience,
  sees,
  trustedOp,
} from './run-l1-built-server-spectator-trusted-proof.mjs';

export const ROWS = Object.freeze(
  COMMANDS.flatMap((command) =>
    AUDIENCES.map((audience) => ({
      id: `matrix-${command.kind}-${audience.id}`,
      command,
      audience,
    })),
  ),
);
export const A2M_REQUIRED_CASES = Object.freeze(ROWS.map((row) => row.id));

/** Events a connection received, live and replayed, with their delivery index. */
export const events = (conn, since = 0) =>
  conn.frames.slice(since).flatMap(({ parsed: m }) => {
    if (m?.kind === 'Event')
      return [{ event: m.event, delivery: m.deliverySequence }];
    if (m?.kind !== 'ReplayChunk') return [];
    return m.events.map((event, i) => ({
      event,
      delivery: m.deliverySequences?.[i],
    }));
  });
const contiguous = (rows) =>
  rows.every(
    (row, i) =>
      Number.isInteger(row.delivery) &&
      (i === 0 || row.delivery === rows[i - 1].delivery + 1),
  );

/**
 * What a viewer must never hold before the reveal; empty is clean. The authority
 * sequence is a player-projection secret only: the gm projection keeps it by
 * design (ViewerFrameProjector shouldRemoveAuthorityFieldForRole).
 */
export function leaks(conn, since, secret, brand) {
  const rows = events(conn);
  return [
    ...secret.needles
      .filter((needle) => sees(conn, since, needle))
      .map(() => 'sealed sentinel'),
    ...(rows.some(
      ({ event }) =>
        /_declared$/.test(event.type) &&
        event.phase === secret.phase &&
        event.turn === secret.turn,
    )
      ? ['declaration or placeholder event']
      : []),
    ...(contiguous(rows) ? [] : ['delivery cursor gap']),
    ...(brand === 'player' &&
    rows.some(({ event }) => Object.hasOwn(event, 'sequence'))
      ? ['authority sequence']
      : []),
  ];
}

/** Withheld from a spectator; delivered, live and replayed, to the non-spectating GM. */
export function observe(ctx, row, leg, viewer, since, secret) {
  const { audience } = row;
  if (audience.participant) {
    ctx.check(
      sees(viewer, since, secret.id),
      row.id,
      `${leg}: non-spectating GM lost the declaration`,
      null,
    );
    return;
  }
  ctx.check(
    !leaks(viewer, since, secret, audience.brand).length,
    row.id,
    `${leg}: spectator holds withheld material`,
    leaks(viewer, since, secret, audience.brand),
  );
}

async function runRow(ctx, row) {
  const { id, command, audience } = row;
  const state = await provision(ctx, id);
  const ready = await phaseReady(ctx, state, command);
  const prepared = await prepareAudience(ctx, state, ready, audience, command);
  established(ctx, id, audience, prepared.after);
  const viewerOf = async () =>
    audience.participant
      ? connOf(state, ready.other.playerId)
      : (await joinWatcher(ctx, state)).conn;
  let viewer = await viewerOf();
  const joined = viewer.frames.length;
  ctx.check(
    events(viewer).length > 0 &&
      (audience.participant || contiguous(events(viewer))),
    id,
    'no public facts before the declaration',
    events(viewer),
  );
  const intent = commandFor(command, ready);
  const result = await accepted(ctx, state, ready, intent, command.type);
  const declaration = result.reply.event;
  const secret = {
    id: declaration.id,
    type: declaration.type,
    phase: declaration.phase,
    turn: declaration.turn,
    needles: [
      declaration.id,
      result.intentId,
      JSON.stringify(declaration.payload),
    ],
  };
  await viewer.waitFor(
    lockedFor(ready.active.unitId),
    'public lock after the declaration',
    { since: joined },
  );
  observe(ctx, row, 'live', viewer, joined, secret);
  viewer = (await ctx.reconnect(viewer)).conn;
  observe(ctx, row, 'reconnect', viewer, 0, secret);
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
  ctx.check(
    durable.facts.declaration.id === declaration.id &&
      durable.facts.revealed === false,
    id,
    'the withheld declaration is not the durable one',
    durable,
  );
  viewer = await viewerOf();
  observe(ctx, row, 'restart', viewer, 0, secret);
  ctx.check(
    sees(connOf(state, ready.active.playerId), 0, declaration.id),
    id,
    'the actor lost its own declaration',
    null,
  );
  ctx.check(
    audience.participant ||
      !sees(connOf(state, ready.other.playerId), 0, declaration.id),
    id,
    'the opposing actor holds the actor declaration',
    null,
  );
  const authorityBeforeReveal =
    audience.brand === 'gm' && !audience.participant
      ? events(viewer).map(({ event }) => event.sequence)
      : undefined;
  const since = viewer.frames.length;
  const advance = await connOf(state, state.identities.host.playerId).intent({
    kind: 'AdvancePhase',
  });
  ctx.check(
    advance.reply.kind === 'Event',
    id,
    'reveal advance refused',
    advance.reply,
  );
  await viewer.waitFor(
    (m) =>
      m.kind === 'Event' &&
      (m.event.type === 'attacks_revealed' ||
        (m.event.type === 'phase_changed' &&
          m.event.payload?.fromPhase === command.phase)),
    'authoritative reveal',
    { since },
  );
  const after = (await ctx.reconnect(viewer)).conn;
  ctx.check(
    sees(after, 0, declaration.id),
    id,
    'the reveal did not release the declaration',
    null,
  );
  ctx.pass(id, {
    secret: secret.id,
    durable: durable.facts.declaration,
    brand: durable.brand,
    staleBeforeDeclaration: prepared.after.staleEffective,
    authorityBeforeReveal,
  });
}

export async function runMatrixCases(ctx) {
  for (const row of ROWS) await runRow(ctx, row);
}
