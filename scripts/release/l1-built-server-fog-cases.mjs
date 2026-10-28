/** L1-SMOKE-B fog-on refusal rows; real HTTP and WebSocket only, no mock. Imports A1/FP read-only. */
import { fileURLToPath } from 'node:url';

import {
  api,
  issueIdentity,
  openSocket,
} from './l1-built-server-socket-cases.mjs';
import { provision } from './l1-built-server-spectator-context.mjs';

/** The wire contract is the oracle, so it is restated here, never imported. */
export const FOG_REFUSAL = 'fog-projection-unavailable';
const HIDDEN_KEYS = /digest|revision|branchId|effectiveGeneration/;
export const FOG_FIXTURES = fileURLToPath(
  new URL('./l1-built-server-fog-fixtures.ts', import.meta.url),
);
export const B_REQUIRED_CASES = Object.freeze([
  'fog-off-controls',
  'fog-on-socket-refused',
  'fog-on-metadata-refused',
  'fog-on-history-refused',
  'fog-on-head-refused',
  'fog-refusals-secret-free',
  'fog-on-state-intact',
  'fog-off-controls-after',
]);

/** Past the auth and fog gates: a digest, or 404 'no head' when a default build holds no journal. */
export const headLive = (r) =>
  (r.status === 200 && typeof r.json?.digest === 'string') ||
  (r.status === 404 && r.json?.error === 'no head');
const replayIds = (frames) =>
  frames
    .filter((m) => m.kind === 'ReplayChunk')
    .flatMap((m) => m.events.map((event) => event.id));

const CLOSE_KEYS = ['kind', 'matchId', 'ts', 'code', 'reason'];

/** GET that keeps the raw body: the secret scan needs it even when it is not JSON. */
async function rawApi(ctx, route, identity) {
  const headers = identity ? { authorization: `Bearer ${identity.wire}` } : {};
  const res = await fetch(`${ctx.origin}${route}`, {
    headers,
    signal: AbortSignal.timeout(ctx.limits.waitMs),
  });
  const text = await res.text();
  ctx.check(
    !ctx.redactor.leaks(text).length,
    'credential-redaction',
    `${route} echoed a credential`,
  );
  const json = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();
  ctx.evidence.record('http', {
    method: 'GET',
    route,
    as: identity?.label ?? 'anonymous',
    status: res.status,
    body: json ?? text.slice(0, 400),
  });
  return { status: res.status, json, text };
}

/** A fog-on member gets one fixed terminal Close and nothing numbered. */
export function checkMemberRefusal(result, matchId) {
  const [frame, ...rest] = result.frames;
  const { closed } = result;
  const fixed = { kind: 'Close', matchId, code: 'AUTH_REJECTED' };
  const ok =
    rest.length === 0 &&
    Object.keys(frame ?? {}).every((key) => CLOSE_KEYS.includes(key)) &&
    Object.entries({ ...fixed, reason: FOG_REFUSAL }).every(
      ([key, value]) => frame?.[key] === value,
    ) &&
    closed?.code === 1008 &&
    closed.reason === FOG_REFUSAL;
  if (!ok)
    throw new Error(`member refusal broke it: ${JSON.stringify(result)}`);
}

/** A non-member gets the generic admission answer: nothing names fog. */
export function checkStrangerRefusal(result) {
  const kinds = new Set(result.frames.map((frame) => frame.kind));
  if (
    !kinds.has('Close') ||
    [...kinds].some((kind) => !['Close', 'Error'].includes(kind)) ||
    result.closed?.code !== 1008 ||
    /fog/i.test(JSON.stringify([result.frames, result.closed]))
  ) {
    throw new Error(
      `non-member refusal not generic: ${JSON.stringify(result)}`,
    );
  }
}

/** No sentinel may appear in anything a refused or controlled caller received. */
export function scanReceived(sentinels, received) {
  if (sentinels.length < 2)
    throw new Error('refusal scan has no sentinels to look for');
  const blob = received.join('\n');
  const leaked = sentinels.filter((secret) => blob.includes(secret));
  if (leaked.length)
    throw new Error(`refusal leaked ${leaked.length} sentinels`);
  return blob.length;
}

/** The refused socket gets only its Close, even when it joins, resumes and acts. */
export async function refusedSocket(ctx, identity, matchId, label) {
  const conn = await openSocket(ctx, identity, matchId, { label });
  const { playerId, wire: token } = identity;
  const intent = { kind: 'AdvancePhase' };
  for (const message of [
    { kind: 'SessionJoin', playerId, token, lastSeq: 0 },
    { kind: 'SessionJoin', playerId, token, lastSeq: 1 },
    { kind: 'Intent', playerId, intentId: `${label}-1`, intent },
  ]) {
    try {
      conn.send(message);
    } catch {
      // The server may already have closed the socket.
    }
  }
  await conn.waitFor(() => false, `${label} close`).catch(() => {});
  ctx.check(conn.closed, 'fog-on-socket-refused', `${label} not closed`);
  const frames = conn.frames.map((f) => f.parsed ?? { unparsed: f.raw });
  return { label, frames, closed: conn.closed };
}

/** Run one expected-answer table; a refusal body that is not the fixed one must not name fog. */
export async function expectAnswers(ctx, seen, id, rows) {
  for (const [route, audience, status, body] of rows) {
    for (const who of audience) {
      const answer = await rawApi(ctx, route, who);
      const text = answer.text;
      seen.push(text);
      const fixed =
        answer.json !== null &&
        (body === undefined ||
          JSON.stringify(answer.json) === JSON.stringify(body));
      const named = body?.error === FOG_REFUSAL || !/fog/i.test(text);
      const quiet = status === 200 || (named && !HIDDEN_KEYS.test(text));
      ctx.check(
        answer.status === status && fixed && quiet,
        id,
        `${who.label} ${route}`,
        answer,
      );
    }
  }
}

/** The unauthenticated caller is refused 401, and whatever body came back is scanned. */
export async function expectUnauthenticated(ctx, seen, id, route) {
  const bare = await rawApi(ctx, route);
  seen.push(bare.text);
  ctx.check(
    bare.status === 401,
    id,
    `unauthenticated head answered ${bare.status}`,
  );
}

/** Fog-off controls after one accepted action; returns the secrets a refusal must never carry. */
async function observeFogOff(ctx, match) {
  const { host, guest, watcher } = match.identities;
  const [id, head] = [match.matchId, `/api/matches/${match.matchId}/head`];
  const answer = (who, route) => api(ctx, 'GET', route, who);
  const played = await match.conns.host.intent({ kind: 'AdvancePhase' });
  const [headed, meta, exported] = await Promise.all([
    answer(host, head),
    answer(host, `/api/multiplayer/matches/${id}`),
    answer(guest, `/api/matches/${id}/export?streamType=match`),
  ]);
  const spectator = await openSocket(ctx, watcher, id, {
    label: 'fog-watch-1',
  });
  const ids = replayIds(await spectator.join());
  spectator.close();
  const digest =
    typeof headed.json?.digest === 'string' ? [headed.json.digest] : [];
  const live =
    played.reply.kind === 'Event' &&
    headLive(headed) &&
    exported.status === 200 &&
    meta.json?.meta?.config?.fogOfWar === false &&
    ids.length > 1;
  ctx.check(live, 'fog-off-controls', 'controls not live before the flip', {
    played: played.reply,
    headed,
    meta,
    exported,
  });
  ctx.pass('fog-off-controls', {
    events: ids.length,
    head: headed.status,
  });
  return [...ids, ...digest];
}

/** Stopped-server lineage of the matches: events, seats and the fog flag. */
const lineages = (ctx, ...matches) =>
  Promise.all(
    matches.map(async ({ matchId }) => {
      const result = await ctx.prepareOffline(undefined, [
        'lineage',
        `--match=${matchId}`,
      ]);
      return result.matches[0];
    }),
  );

/** The refusing process still delivers on a sibling fog-off match. */
async function controlsAfter(ctx, control) {
  const { host, watcher } = control.identities;
  const id = control.matchId;
  const { conn } = await ctx.reconnect(control.conns.host);
  const spectator = await openSocket(ctx, watcher, id, {
    label: 'fog-watch-2',
  });
  await spectator.join();
  const acted = await conn.intent({ kind: 'AdvancePhase' });
  const live = await spectator.waitFor(
    (m) => m.kind === 'Event' && m.event.payload?.intentId === acted.intentId,
    'live public fact',
  );
  const head = await api(ctx, 'GET', `/api/matches/${id}/head`, host);
  const ok = acted.reply.kind === 'Event' && headLive(head);
  ctx.check(
    ok,
    'fog-off-controls-after',
    'sibling fog-off match stopped delivering',
    { acted: acted.reply, head },
  );
  ctx.pass('fog-off-controls-after', {
    delivery: live.frame.deliverySequence,
    head: head.status,
  });
}

export async function runFogCases(ctx) {
  const [control, target] = [
    await provision(ctx, 'fog-ctl'),
    await provision(ctx, 'fog-on'),
  ];
  const stranger = await issueIdentity(ctx, 'fog-stranger');
  const { host, guest, watcher } = target.identities;
  const [id, seen] = [target.matchId, []];
  const sentinels = await observeFogOff(ctx, target);
  [control, target].forEach((m) =>
    Object.values(m.conns).forEach((conn) => conn.close()),
  );
  await ctx.stop();
  const before = await lineages(ctx, control, target);
  const flip = await ctx.prepareOffline(FOG_FIXTURES, [
    'flip',
    `--match=${id}`,
  ]);
  ctx.check(
    flip.fogOfWar.after && flip.events.count === before[1].eventCount,
    'fog-on-state-intact',
    'flip moved the journal',
    flip,
  );
  await ctx.restart();

  const members = { host, guest, watcher };
  const sockets = [];
  for (const [name, who] of Object.entries(members)) {
    sockets.push(await refusedSocket(ctx, who, id, `fog-${name}`));
    checkMemberRefusal(sockets.at(-1), id);
  }
  sockets.push(await refusedSocket(ctx, stranger, id, 'fog-stranger'));
  checkStrangerRefusal(sockets.at(-1));
  ctx.pass('fog-on-socket-refused', {
    members: Object.keys(members),
    closeCode: 1008,
  });

  const [meta, head] = [
    `/api/multiplayer/matches/${id}`,
    `/api/matches/${id}/head`,
  ];
  const [exported, preview, timeline] = [
    'export?streamType=match',
    'private-preview?ref=fog-refusal',
    'timeline',
  ].map((tail) => `/api/matches/${id}/${tail}`);
  const [fixed, generic] = [
    { error: FOG_REFUSAL },
    { error: 'Authorization refused' },
  ];
  const seated = [host, guest, watcher];
  await expectAnswers(ctx, seen, 'fog-on-metadata-refused', [
    [meta, [host, guest], 403, fixed],
    [meta, [watcher, stranger], 404],
  ]);
  ctx.pass('fog-on-metadata-refused', {
    participants: 403,
    nonParticipants: 404,
  });
  await expectAnswers(ctx, seen, 'fog-on-history-refused', [
    [exported, seated, 500, fixed],
    [preview, seated, 500, fixed],
    [timeline, seated, 200],
    ...[exported, preview, timeline].map((route) => [
      route,
      [stranger],
      403,
      generic,
    ]),
  ]);
  ctx.pass('fog-on-history-refused', {
    export: 500,
    privatePreview: 500,
    timeline: 'audit rows only',
    nonMember: 403,
  });
  await expectAnswers(ctx, seen, 'fog-on-head-refused', [
    [head, [host], 403, fixed],
    [head, [guest, watcher, stranger], 403, generic],
  ]);
  await expectUnauthenticated(ctx, seen, 'fog-on-head-refused', head);
  ctx.pass('fog-on-head-refused', {
    gm: 403,
    others: 403,
    unauthenticated: 401,
  });

  const scanned = scanReceived(sentinels, [...seen, JSON.stringify(sockets)]);
  ctx.pass('fog-refusals-secret-free', {
    sentinels: sentinels.length,
    scannedBytes: scanned,
  });
  await controlsAfter(ctx, control);

  await ctx.stop();
  const after = await lineages(ctx, control, target);
  const same = (a, b) =>
    JSON.stringify({ ...a, fogOfWar: null }) ===
    JSON.stringify({ ...b, fogOfWar: null });
  const intact =
    same(before[1], after[1]) &&
    after[1].fogOfWar === true &&
    after[0].fogOfWar === false;
  ctx.check(
    intact,
    'fog-on-state-intact',
    'refusals changed stored match state',
    { before, after },
  );
  ctx.pass('fog-on-state-intact', {
    eventCount: after[1].eventCount,
    seats: after[1].seats.length,
  });
}
