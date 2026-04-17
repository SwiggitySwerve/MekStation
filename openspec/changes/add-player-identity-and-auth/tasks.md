# Tasks: Add Player Identity and Auth

## 1. Data Model

- [ ] 1.1 Define `IPlayerRef` with `{playerId, displayName,
    avatarUrl?}` — the server's minimum view of a player
- [ ] 1.2 Define `IPlayerToken` with `{playerId, issuedAt, expiresAt,
    publicKey, signature}`
- [ ] 1.3 Define `IPlayerProfile` with `{playerId, publicKey,
    displayName, createdAt, lastSeenAt, matchHistory: string[]}`
- [ ] 1.4 `playerId` format: `pid_{base58(firstBytes(publicKey))}`
      derived from the public key so the id and the verification key
      are inherently linked

## 2. Token Issuance (Client Side)

- [ ] 2.1 Extend `user-identity` client API with `issuePlayerToken(ttl
    = 1 hour): IPlayerToken`
- [ ] 2.2 Token is signed with the vault's Ed25519 private key over a
      canonical `{playerId, issuedAt, expiresAt}` payload
- [ ] 2.3 Client caches the most recent unexpired token in memory;
      refreshes with a new one when within 5 minutes of expiry

## 3. Token Verification (Server Side)

- [ ] 3.1 Add `auth.ts` with `verifyPlayerToken(token): {playerId} |
    null`
- [ ] 3.2 Verification: check `expiresAt > now`, derive `playerId`
      from `publicKey`, verify the Ed25519 signature over the
      canonical payload
- [ ] 3.3 Invalid tokens result in `401 Unauthorized` on REST
      endpoints and `Error {code: 'UNAUTHORIZED'}` then socket close
      on WebSocket

## 4. Player Store Contract

- [ ] 4.1 Define `IPlayerStore` interface with:
      `getOrCreatePlayer(profile): Promise<IPlayerProfile>`,
      `updateProfile(playerId, patch): Promise<void>`,
      `recordMatchParticipation(playerId, matchId): Promise<void>`
- [ ] 4.2 Implementation MUST be pluggable (SQLite, Postgres, memory)
- [ ] 4.3 In-memory implementation for dev mode, same pattern as
      `InMemoryMatchStore`

## 5. REST Endpoint Integration

- [ ] 5.1 All `/api/multiplayer/*` REST endpoints require the
      `Authorization: Bearer <token>` header
- [ ] 5.2 Middleware extracts and verifies the token; on success,
      attaches `{playerId}` to the request context
- [ ] 5.3 Missing or invalid token → `401 Unauthorized`
- [ ] 5.4 The existing health-check endpoint does NOT require auth

## 6. WebSocket Endpoint Integration

- [ ] 6.1 WebSocket upgrade requires a token either in the
      `Authorization` header or the `?token=` query param
- [ ] 6.2 Verified `playerId` is attached to the socket
- [ ] 6.3 `SessionJoin` intent is cross-checked: the socket's
      `playerId` must match the intent's `playerId`; mismatches are
      rejected with `Error {code: 'UNAUTHORIZED'}`

## 7. Profile Bootstrapping

- [ ] 7.1 First time a client connects with a new `playerId`, the
      server calls `getOrCreatePlayer({playerId, publicKey,
    displayName: ..., avatarUrl: ...})`
- [ ] 7.2 Client provides `displayName` in the token request or
      separately in a profile-setup step
- [ ] 7.3 Subsequent connections skip creation and use the existing
      profile

## 8. Match Membership

- [ ] 8.1 `OccupySeat` intent verifies the requesting `playerId`
      matches the socket's identity
- [ ] 8.2 On successful lobby-ready → launch, the server records
      `matchId` in each participant's `matchHistory` via
      `recordMatchParticipation`
- [ ] 8.3 Only the match's `hostPlayerId` may `DELETE` the match

## 9. Token Rotation

- [ ] 9.1 Tokens expire every hour
- [ ] 9.2 Client detects `UNAUTHORIZED` on an active connection,
      re-issues a token, reconnects
- [ ] 9.3 Server accepts a token with `issuedAt` up to 10 seconds in
      the future to tolerate clock drift

## 10. Tests

- [ ] 10.1 Unit test: token issuance and verification round-trip
- [ ] 10.2 Unit test: tampered token (altered payload, same sig) is
      rejected
- [ ] 10.3 Unit test: expired token is rejected
- [ ] 10.4 Integration test: unauthorized REST call returns 401
- [ ] 10.5 Integration test: unauthorized WebSocket upgrade fails
- [ ] 10.6 Integration test: two players with valid tokens can create
      and join a match

## 11. Spec Compliance

- [ ] 11.1 Every requirement in the `player-identity` ADDED delta has
      at least one GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in the `multiplayer-server` MODIFIED
      delta has at least one GIVEN/WHEN/THEN scenario
- [ ] 11.3 `openspec validate add-player-identity-and-auth --strict`
      passes clean
