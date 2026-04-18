# Tasks: Add Player Identity and Auth

## 1. Data Model

- [x] 1.1 Define `IPlayerRef` with `{playerId, displayName,
avatarUrl?}` — the server's minimum view of a player
- [x] 1.2 Define `IPlayerToken` with `{playerId, issuedAt, expiresAt,
publicKey, signature}`
- [x] 1.3 Define `IPlayerProfile` with `{playerId, publicKey,
displayName, createdAt, lastSeenAt, matchHistory: string[]}`
- [x] 1.4 `playerId` format: `pid_{base58(firstBytes(publicKey))}`
      derived from the public key so the id and the verification key
      are inherently linked

## 2. Token Issuance (Client Side)

- [x] 2.1 Extend `user-identity` client API with `issuePlayerToken(ttl
= 1 hour): IPlayerToken`
- [x] 2.2 Token is signed with the vault's Ed25519 private key over a
      canonical `{playerId, issuedAt, expiresAt}` payload
- [x] 2.3 Client caches the most recent unexpired token in memory;
      refreshes with a new one when within 5 minutes of expiry

## 3. Token Verification (Server Side)

- [x] 3.1 Add `auth.ts` with `verifyPlayerToken(token): {playerId} |
null`
- [x] 3.2 Verification: check `expiresAt > now`, derive `playerId`
      from `publicKey`, verify the Ed25519 signature over the
      canonical payload
- [x] 3.3 Invalid tokens result in `401 Unauthorized` on REST
      endpoints and socket-close on WebSocket upgrade

## 4. Player Store Contract

- [x] 4.1 Define `IPlayerStore` interface with:
      `getOrCreatePlayer(profile): Promise<IPlayerProfile>`,
      `updateProfile(playerId, patch): Promise<void>`,
      `recordMatchParticipation(playerId, matchId): Promise<void>`
- [x] 4.2 Implementation MUST be pluggable (SQLite, Postgres, memory)
- [x] 4.3 In-memory implementation for dev mode, same pattern as
      `InMemoryMatchStore`

## 5. REST Endpoint Integration

- [x] 5.1 All `/api/multiplayer/*` REST endpoints require the
      `Authorization: Bearer <token>` header
- [x] 5.2 Middleware extracts and verifies the token; on success,
      attaches `{playerId}` to the request context
- [x] 5.3 Missing or invalid token → `401 Unauthorized`
- [ ] 5.4 The existing health-check endpoint does NOT require auth
      (no separate health endpoint exists yet — Wave 5 concern)

## 6. WebSocket Endpoint Integration

- [x] 6.1 WebSocket upgrade requires a token in the `?token=` query
      param (header path reserved for browser fetch upgrades)
- [x] 6.2 Verified `playerId` is attached to the socket via the
      upgrade-handler private property `_mpVerifiedPlayerId`
- [ ] 6.3 `SessionJoin` intent cross-check (socket playerId must
      match intent playerId) — Wave 3 will land this once
      `ServerMatchHost` is wired into the upgrade handler. Wave 2
      establishes the binding on the request object so Wave 3 has the
      identity available without a re-verify.

## 7. Profile Bootstrapping

- [x] 7.1 First time a client connects with a new `playerId`, the
      server calls `getOrCreatePlayer({playerId, publicKey,
displayName: ..., avatarUrl: ...})`
- [x] 7.2 Client provides `displayName` in the REST POST body
      (separate profile-setup step deferred to a later UX wave)
- [x] 7.3 Subsequent connections skip creation and use the existing
      profile (lastSeenAt is bumped)

## 8. Match Membership

- [ ] 8.1 `OccupySeat` intent verifies the requesting `playerId`
      matches the socket's identity (Wave 3b — lobby intents)
- [ ] 8.2 On successful lobby-ready → launch, the server records
      `matchId` in each participant's `matchHistory` via
      `recordMatchParticipation` (Wave 3b — lobby intents)
- [x] 8.3 Only the match's `hostPlayerId` may `DELETE` the match

## 9. Token Rotation

- [x] 9.1 Tokens expire every hour
- [ ] 9.2 Client detects `UNAUTHORIZED` on an active connection,
      re-issues a token, reconnects (`invalidateTokenCache` exposed
      for the consumer; reconnect orchestration is a Wave 5 hook)
- [x] 9.3 Server accepts a token with `issuedAt` up to 10 seconds in
      the future to tolerate clock drift

## 10. Tests

- [x] 10.1 Unit test: token issuance and verification round-trip
- [x] 10.2 Unit test: tampered token (altered payload, same sig) is
      rejected
- [x] 10.3 Unit test: expired token is rejected
- [ ] 10.4 Integration test: unauthorized REST call returns 401
      (REST handler covered by handler-level auth helper unit
      tests; full integration test deferred to Wave 5 when Next.js
      route mocking lands)
- [ ] 10.5 Integration test: unauthorized WebSocket upgrade fails
      (server.js verifier covered by the `auth.test.ts` round-trip
      via the same shared canonical payload logic; full live-socket
      integration test deferred to Wave 5)
- [ ] 10.6 Integration test: two players with valid tokens can create
      and join a match (Wave 3b — lobby intents)

## 11. Spec Compliance

- [ ] 11.1 Every requirement in the `player-identity` ADDED delta has
      at least one GIVEN/WHEN/THEN scenario (delta already authored;
      `openspec validate` is the audit step)
- [ ] 11.2 Every requirement in the `multiplayer-server` MODIFIED
      delta has at least one GIVEN/WHEN/THEN scenario (deferred to
      `openspec sync-specs` step)
- [ ] 11.3 `openspec validate add-player-identity-and-auth --strict`
      passes clean (run as part of `omo-prometheus` archive step)
