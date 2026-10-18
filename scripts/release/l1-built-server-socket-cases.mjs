/**
 * L1-SMOKE-A1 authenticated HTTP/WebSocket transport and fog-off spectator baseline on the owned built server;
 * frozen, A2/B import read-only. Real sockets only: no source host, /api/e2e, test mode or mocks. Credentials ride
 * the bearer header or WS subprotocol, never a URL, and are registered with the harness redactor before use.
 */
import { webcrypto } from 'node:crypto';
import WebSocket from 'ws';

export const A1_REQUIRED_CASES = Object.freeze(['credential-malformed-refused', 'credential-url-refused', 'credential-foreign-refused',
  'participants-authenticated', 'participant-action-accepted', 'spectator-seat-witnessed', 'spectator-replay-public',
  'spectator-live-public', 'spectator-cannot-act', 'callbacks-exercised']);
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const b64url = (text) => text.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function base58(bytes) {
  let [value, out] = [bytes.reduce((v, byte) => (v << 8n) | BigInt(byte), 0n), ''];
  for (; value > 0n; value /= 58n) out = B58[Number(value % 58n)] + out;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i += 1) out = `1${out}`;
  return out;
}
/** Ed25519 player credential in the production wire format; both secret parts redacted before use. */
export async function issueIdentity(ctx, label) {
  const keys = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await webcrypto.subtle.exportKey('raw', keys.publicKey));
  const playerId = `pid_${base58(raw.slice(0, 20))}`;
  const [issuedAt, expiresAt] = [new Date().toISOString(), new Date(Date.now() + 3_600_000).toISOString()];
  const signature = b64(await webcrypto.subtle.sign('Ed25519', keys.privateKey, Buffer.from(JSON.stringify({ expiresAt, issuedAt, playerId }))));
  const wire = b64(JSON.stringify({ playerId, issuedAt, expiresAt, publicKey: b64(raw), signature }));
  ctx.redactor.add(`${label}-token`, wire);
  ctx.redactor.add(`${label}-signature`, signature);
  return { label, playerId, wire };
}
/** Bearer-authenticated HTTP call; a response echoing any registered credential fails. */
export async function api(ctx, method, route, identity, body) {
  const headers = { authorization: `Bearer ${identity.wire}`, ...(body ? { 'content-type': 'application/json' } : {}) };
  const res = await fetch(`${ctx.origin}${route}`, { method, headers, body: body && JSON.stringify(body), signal: AbortSignal.timeout(ctx.limits.waitMs) });
  const text = await res.text();
  ctx.check(!ctx.redactor.leaks(text).length, 'credential-redaction', `${route} echoed a credential`);
  const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
  ctx.evidence.record('http', { method, route, as: identity.label, status: res.status, body: json ?? text.slice(0, 400) });
  return { status: res.status, json };
}
/**
 * Credential-bearing socket. Inbound frames are retained (sanitized), parsed and scanned; an echoed
 * credential or unparseable frame faults the connection, and a close fails pending waits as premature.
 */
export async function openSocket(ctx, identity, matchId, { label = identity.label, protocols, query = '' } = {}) {
  const url = `${ctx.wsOrigin}/api/multiplayer/socket?matchId=${encodeURIComponent(matchId)}${query}`;
  const ws = new WebSocket(url, protocols ?? ['mekstation.v1', `mekstation.token.${b64url(identity.wire)}`], { perMessageDeflate: false, handshakeTimeout: ctx.limits.waitMs });
  const conn = { label, identity, matchId, ws, frames: [], closed: null, fault: null, intents: 0 };
  const waiters = new Set();
  const wake = () => [...waiters].forEach((waiter) => waiter());
  ws.on('message', (data) => {
    const raw = data.toString();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { conn.fault ??= 'unparseable frame'; }
    if (ctx.redactor.leaks(raw).length) conn.fault ??= 'credential echoed in a server frame';
    conn.frames.push({ raw, parsed });
    ctx.evidence.record('frame', { conn: label, dir: 'in', index: conn.frames.length - 1, raw });
    wake();
  });
  ws.on('close', (code, reason) => {
    conn.closed = { code, reason: reason.toString() };
    wake(ctx.evidence.record('socket', { conn: label, event: 'close', ...conn.closed }));
  });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve).once('error', reject).once('unexpected-response', (request, res) => {
      request.destroy();
      ws.on('error', () => {});
      reject(Object.assign(new Error(`${label}: upgrade refused ${res.statusCode}`), { status: res.statusCode }));
    });
  });
  ctx.evidence.record('socket', { conn: label, event: 'open', as: identity.label, matchId, query });
  /** First frame at index >= since matching pred; rejects on fault, close or timeout. */
  conn.waitFor = (pred, what, { since = 0, ms = ctx.limits.waitMs } = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(reject, new Error(`${label}: timeout waiting for ${what}`)), ms);
    const finish = (settle, value) => { clearTimeout(timer); waiters.delete(check); settle(value); };
    const check = () => {
      const index = conn.frames.findIndex((frame, i) => i >= since && frame.parsed && pred(frame.parsed));
      if (conn.fault) finish(reject, new Error(`${label}: ${conn.fault} while waiting for ${what}`));
      else if (index >= 0) finish(resolve, { frame: conn.frames[index].parsed, index });
      else if (conn.closed) finish(reject, new Error(`${label}: premature close ${conn.closed.code} while waiting for ${what}`));
    };
    waiters.add(check);
    check();
  });
  conn.send = (message) => {
    const raw = JSON.stringify({ matchId, ts: new Date().toISOString(), ...message });
    ctx.evidence.record('frame', { conn: label, dir: 'out', raw });
    ws.send(raw);
  };
  /** SessionJoin; resolves the ReplayStart..ReplayEnd window, rejects on Close/Error. */
  conn.join = async ({ lastSeq = 0, playerId = identity.playerId } = {}) => {
    const since = conn.frames.length;
    conn.send({ kind: 'SessionJoin', playerId, token: identity.wire, lastSeq });
    const end = await conn.waitFor((m) => ['ReplayEnd', 'Close', 'Error'].includes(m.kind), 'ReplayEnd', { since });
    if (end.frame.kind !== 'ReplayEnd') throw new Error(`${label}: join refused ${end.frame.code}:${end.frame.reason}`);
    const window = conn.frames.slice(since, end.index + 1).map((frame) => frame.parsed);
    if (!window.some((m) => m.kind === 'ReplayStart')) throw new Error(`${label}: ReplayEnd without ReplayStart`);
    return window;
  };
  /** Intent; resolves its correlated reply: lobby echo or Error by intentId, or an Event payload.intentId. */
  conn.intent = async (intent) => {
    const [intentId, since] = [`${label}-${(conn.intents += 1)}`, conn.frames.length];
    conn.send({ kind: 'Intent', playerId: identity.playerId, intentId, intent });
    const reply = await conn.waitFor((m) => m.intentId === intentId || m.event?.payload?.intentId === intentId, `reply to ${intent.kind}`, { since });
    return { intentId, since, reply: reply.frame };
  };
  conn.close = () => conn.closed || ws.close(1000);
  return conn;
}
const refused = (ctx, identity, matchId, options) => openSocket(ctx, identity, matchId, options).then((c) => (c.close(), { opened: true }), (e) => ({ status: e.status ?? null }));
const replayEvents = (frames) => frames.flatMap((m) => (m.kind === 'ReplayChunk' ? m.events.map((event, i) => ({ event, delivery: m.deliverySequences?.[i] })) : []));
const liveEvents = (conn, since = 0) => conn.frames.slice(since).map((f) => f.parsed).filter((m) => m?.kind === 'Event');
const contiguous = (ns) => ns.every((n, i) => Number.isInteger(n) && (i === 0 || n === ns[i - 1] + 1));
const until = async (ctx, pred, what, end = Date.now() + ctx.limits.waitMs) => {
  while (!pred()) await (Date.now() > end ? Promise.reject(new Error(`timeout waiting for ${what}`)) : new Promise((r) => setTimeout(r, 50)));
};
const verify = (ctx, ok, id, message, observation) => { ctx.check(ok, id, message, observation); ctx.pass(id, observation); };
/** A real accepted participant action: an Event carrying its intent id, never an Error. */
async function act(ctx, conn, id) {
  const result = await conn.intent({ kind: 'AdvancePhase' });
  ctx.check(result.reply.kind === 'Event', id, `${conn.label} action was not accepted`, result.reply);
  return result;
}
/** A1 fog-off baseline: credential refusals, authenticated participants, spectator public facts, spectator-cannot-act. */
export async function runBaseline(ctx) {
  const [host, guest, watcher] = [await issueIdentity(ctx, 'host'), await issueIdentity(ctx, 'guest'), await issueIdentity(ctx, 'watcher')];
  const created = await api(ctx, 'POST', '/api/multiplayer/matches', host, { config: { mapRadius: 4, turnLimit: 5 }, displayName: 'L1 smoke host', layout: '1v1' });
  const matchId = created.json?.matchId;
  const wsUrlOk = created.json?.wsUrl === `${ctx.wsOrigin}/api/multiplayer/socket?matchId=${matchId}`;
  ctx.check(created.status === 201 && created.json.meta.config.fogOfWar === false && wsUrlOk, 'participants-authenticated', 'fog-off match not created on the owned listener', created);
  const malformed = await refused(ctx, host, matchId, { label: 'malformed', protocols: ['mekstation.v1', 'mekstation.token.bm90LWEtY3JlZGVudGlhbA'] });
  verify(ctx, malformed.status === 401, 'credential-malformed-refused', 'malformed credential not refused 401', malformed);
  const inUrl = await refused(ctx, host, matchId, { label: 'url-credential', query: '&token=placeholder-not-a-credential' });
  verify(ctx, inUrl.status === 400, 'credential-url-refused', 'URL-borne token not refused 400', inUrl);
  // Serial first connections: concurrent first upgrades race MatchHostRegistry.getOrCreate (src-owned finding).
  const h = await openSocket(ctx, host, matchId);
  await h.join();
  const g = await openSocket(ctx, guest, matchId);
  await g.join();
  const seated = [await g.intent({ kind: 'OccupySeat', slotId: 'bravo-1' }), await g.intent({ kind: 'SetReady', slotId: 'bravo-1', ready: true })];
  seated.push(await h.intent({ kind: 'SetReady', slotId: 'alpha-1', ready: true }), await h.intent({ kind: 'LaunchMatch' }));
  const lobby = seated.at(-1).reply;
  const occupant = (slotId) => lobby.seats?.find((s) => s.slotId === slotId)?.occupant?.playerId;
  const launched = seated.every((r) => r.reply.kind === 'LobbyUpdated') && lobby.status === 'active';
  const seatedIds = { matchId, host: host.playerId, guest: guest.playerId, seats: lobby.seats };
  verify(ctx, launched && occupant('alpha-1') === host.playerId && occupant('bravo-1') === guest.playerId, 'participants-authenticated', 'lobby did not launch with authenticated seats', seatedIds);
  const foreign = await openSocket(ctx, guest, matchId, { label: 'foreign' });
  const refusal = await foreign.join({ playerId: host.playerId }).then(() => null, (error) => error.message);
  const close = (await foreign.waitFor((m) => m.kind === 'Close', 'Close')).frame;
  const noReplay = !foreign.frames.some((f) => f.parsed?.kind === 'ReplayStart');
  verify(ctx, /AUTH_REJECTED:player-mismatch/.test(refusal ?? '') && close.code === 'AUTH_REJECTED' && noReplay, 'credential-foreign-refused', 'foreign SessionJoin not refused', { refusal, close });
  const first = await act(ctx, h, 'participant-action-accepted');
  const acted = liveEvents(h, first.since);
  verify(ctx, acted.length > 0, 'participant-action-accepted', 'no live event', { intentId: first.intentId, events: acted.map((m) => m.event.type) });
  const spectate = await api(ctx, 'POST', `/api/multiplayer/matches/${matchId}/spectate`, watcher);
  ctx.check(spectate.status === 201 && spectate.json.slotId === 'spectator-1', 'spectator-seat-witnessed', 'spectator registration failed', spectate);
  const s = await openSocket(ctx, watcher, matchId);
  const replay = await s.join();
  const seats = (await s.waitFor((m) => m.kind === 'LobbyUpdated', 'spectator LobbyUpdated')).frame;
  await until(ctx, () => ctx.serverOutput().includes(`session joined matchId=${matchId} playerId=${watcher.playerId}`), 'server-side spectator join');
  const own = seats.seats.filter((seat) => seat.occupant?.playerId === watcher.playerId);
  verify(ctx, own.length === 1 && own[0].kind === 'spectator' && seats.status === 'active', 'spectator-seat-witnessed', 'current spectator seat not witnessed', { own, status: seats.status });
  const replayed = replayEvents(replay);
  const ids = replayed.map((r) => r.event.id);
  const facts = replayed[0]?.event.type === 'game_started' && replayed[0].delivery === 0 && acted.length && acted.every((m) => ids.includes(m.event.id));
  const replayRow = { types: replayed.map((r) => r.event.type), deliveries: replayed.map((r) => r.delivery), ids };
  verify(ctx, facts && contiguous(replayRow.deliveries), 'spectator-replay-public', 'spectator replay lacks the public facts', replayRow);
  const second = await act(ctx, g, 'spectator-live-public');
  const live = (await s.waitFor((m) => m.kind === 'Event' && m.event.payload?.intentId === second.intentId, 'live public fact')).frame;
  verify(ctx, live.deliverySequence === replayed.at(-1).delivery + 1, 'spectator-live-public', 'live delivery not contiguous with replay', live);
  const { reply, ...attempt } = await s.intent({ kind: 'AdvancePhase' });
  ctx.check(reply.kind === 'Error' && reply.code === 'INVALID_INTENT' && reply.reason === 'spectator-cannot-act', 'spectator-cannot-act', 'spectator intent not refused', reply);
  const third = await act(ctx, h, 'spectator-cannot-act');
  const next = (await s.waitFor((m) => m.kind === 'Event' && m.event.payload?.intentId === third.intentId, 'post-refusal public fact', { since: attempt.since })).frame;
  const stream = liveEvents(s);
  const unchanged = !stream.some((m) => m.event.payload?.intentId === attempt.intentId) && contiguous(stream.map((m) => m.deliverySequence));
  verify(ctx, unchanged && next.deliverySequence > live.deliverySequence, 'spectator-cannot-act', 'refused spectator intent changed the stream', { refusal: reply, next });
  return { matchId, identities: { host, guest, watcher }, conns: { host: h, guest: g, spectator: s }, replayed };
}
/** Exercise the frozen stop / offline-fixture / restart / reconnect callbacks; restart acceptance stays A2's. */
export async function exerciseCallbacks(ctx, baseline) {
  const pid = ctx.pid;
  await ctx.stop();
  const lineage = await ctx.prepareOffline(undefined, ['lineage', `--match=${baseline.matchId}`]);
  const row = lineage.matches?.[0];
  const persisted = row?.status === 'active' && row.fogOfWar === false && row.seats.some((seat) => seat.kind === 'spectator' && seat.occupant === baseline.identities.watcher.playerId);
  ctx.check(persisted, 'callbacks-exercised', 'offline lineage does not show the spectator match', lineage);
  await ctx.restart();
  const replayed = replayEvents((await ctx.reconnect(baseline.conns.spectator)).replay);
  const kept = ctx.pid !== pid && baseline.replayed.every((r) => replayed.some((x) => x.event.id === r.event.id));
  verify(ctx, kept, 'callbacks-exercised', 'reconnect after restart lost public facts', { stoppedPid: pid, restartedPid: ctx.pid, eventCount: row.eventCount, replayTypes: replayed.map((r) => r.event.type) });
}
export async function runA1Cases(ctx) {
  const baseline = await runBaseline(ctx);
  [baseline.conns.host, baseline.conns.guest].forEach((conn) => conn.close());
  await exerciseCallbacks(ctx, baseline);
}