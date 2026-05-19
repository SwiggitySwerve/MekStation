# Tasks: Harden the Multiplayer Transport

## 1. Durable Match Store

- [x] 1.1 Add a durable `IMatchStore` implementation backed by an embedded transactional persistent store, implementing the `IMatchStore` interface unchanged
- [x] 1.2 Persist `IMatchMeta` per match and each `IGameEvent` keyed by `(matchId, sequence)` with a unique constraint enforcing the sequence-collision guarantee
- [x] 1.3 Make `appendEvent` transactional all-or-nothing, rejecting a sequence collision with `MatchStoreSequenceCollisionError`
- [x] 1.4 Make `getEvents` return events ordered by ascending `sequence` with no gaps; `closeMatch` idempotent
- [x] 1.5 Wire `getDefaultMatchStore()` to select the durable store in production and `InMemoryMatchStore` in dev/test
- [x] 1.6 Tests: round-trip meta and event log; sequence collision rejected; ordering preserved; the durable store passes the same contract tests as `InMemoryMatchStore`

## 2. Server-Startup Match Recovery

- [x] 2.1 Add a startup recovery routine that enumerates `status: 'active'` matches from the durable store
- [x] 2.2 For each recovered match, re-instantiate a `ServerMatchHost` whose `InteractiveSession` is rebuilt by replaying the stored event log
- [x] 2.3 Tests: a match with persisted events survives a simulated process restart; a reconnecting client receives the missing events from its `lastSeq`

## 3. Host Migration

- [x] 3.1 On host-socket loss, promote the longest-connected surviving human seat to `hostPlayerId` for privileged operations
- [x] 3.2 Record the promotion in `IMatchMeta` via `updateMatchMeta` and broadcast it to all connected clients
- [x] 3.3 If the promoted holder also disconnects, repeat the promotion; if no human seat survives, fall through to the grace path
- [x] 3.4 Tests: host disconnect promotes a survivor; privileged operations work for the new holder; the original host's reconnect does not abort the match

## 4. Graceful Degradation

- [x] 4.1 Route a host-connection loss through the existing pending/grace mechanism (`PendingPeerTracker`) so the match pauses rather than aborts
- [x] 4.2 Resume the match on host reconnect within grace; complete it cleanly through the existing outcome path on grace expiry
- [x] 4.3 Ensure the legacy `reason: 'aborted'` abort path is not taken for a server-authoritative match
- [x] 4.4 Tests: host blip pauses then resumes the match; grace expiry completes the match cleanly without an abort

## 5. Intent Rate-Limiting

- [x] 5.1 Add a per-connection token-bucket rate limiter to the authoritative intent dispatch, with a configured budget
- [x] 5.2 Reject an over-budget intent with a non-fatal `Error {code: 'RATE_LIMITED'}`; keep the connection open and append no event
- [x] 5.3 Exempt heartbeat and replay traffic from the limiter
- [x] 5.4 Tests: a flood of intents trips the limiter; a worst-case human play rate never trips it; a rejected intent appends no event

## 6. Replay-Attack Protection

- [x] 6.1 Require every `Intent` envelope to carry a unique id; maintain a per-match bounded set of accepted intent ids
- [x] 6.2 Reject an intent whose id is already accepted with `Error {code: 'DUPLICATE_INTENT'}` and append no event
- [x] 6.3 Reconstruct the accepted-id set from the event log on recovery so a restart does not reopen the replay window
- [x] 6.4 Tests: a re-sent intent envelope is rejected and produces no event; the set is reconstructed correctly after recovery

## 7. Transport Consolidation (DP1)

- [x] 7.1 Document the authoritative server WebSocket as the supported transport and y-webrtc as a non-authoritative fallback
- [x] 7.2 Confirm the client-side `mirrorSession` / `gameSessionChannel` pattern is retained only as the client event-application layer pointed at the server WebSocket
- [x] 7.3 Tests: a networked match runs end-to-end over the server WebSocket transport with no y-webrtc dependency

## 8. Verification

- [x] 8.1 Integration test: an active match survives a server restart and both clients reconnect to the rebuilt host
- [x] 8.2 Integration test: a host disconnect mid-match migrates host privilege and the match continues to completion
- [x] 8.3 Stress test: measure `appendEvent` latency under the durable store and confirm the rate-limit budget is not tripped by legitimate play
- [x] 8.4 `openspec validate harden-multiplayer-transport --strict` passes
- [x] 8.5 `npm run build`, lint, and `tsc --noEmit` typecheck all pass
