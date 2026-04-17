# Change: Add Player Identity and Auth

## Why

**Sub-phase 4b.** The server needs to know which player occupies which
seat, which player can close a match they host, and which player should
receive fog-of-war filtered events for their side. The existing
`user-identity` spec already covers vault sharing via Ed25519 keypairs
and friend codes, but those identities are local-to-the-vault and never
leave the device. Phase 4b needs an identity contract that is:
(a) addressable over the network, (b) verifiable against a token, and
(c) usable by the server to gate match operations. This change defines
the contract without committing to a specific auth provider.

## What Changes

- Introduce `player-identity` spec: the server-side contract for a
  multiplayer player
- Define `IPlayerRef` = `{playerId, displayName, avatarUrl?}` —
  everything the server needs to track a seat occupant
- Define `IPlayerToken` = `{playerId, issuedAt, expiresAt, signature}`
  — a bearer token the client sends on every REST/WebSocket call
- Token issuance paths are pluggable:
  - **Vault-identity path**: the existing `user-identity` Ed25519
    keypair signs a self-issued token; server verifies via the public
    key published in a vault profile
  - **Future OAuth path**: reserved for a dedicated change; not
    implemented here
- Token contains no sensitive material; private key stays on device
- Server maintains an `IPlayerStore` keyed by `playerId`, with opt-in
  display names, match history list, last-seen timestamp
- No password auth in this change; the identity model is public-key
  based to match the existing vault design

## Dependencies

- **Requires**: existing `user-identity` (Ed25519 keypair + friend
  codes on device), `add-multiplayer-server-infrastructure` (server
  needs identities for matchmaking/seat binding)
- **Required By**: `add-multiplayer-lobby-and-matchmaking-2-8`
  (seats bind to `playerId`), `add-reconnection-and-session-
rehydration` (reconnect verifies the same player is returning),
  `add-fog-of-war-event-filtering` (per-player event filtering)

## Impact

- Affected specs: `player-identity` (ADDED — server identity model,
  token verification, player store contract), `multiplayer-server`
  (MODIFIED — every REST and WebSocket operation requires a valid
  player token)
- Affected code: new `src/server/multiplayer/auth.ts` (token verify),
  new `src/server/multiplayer/playerStore.ts`, new
  `src/lib/multiplayer/clientAuth.ts` (token issuance on the client
  using the existing vault identity), extension of
  `src/lib/multiplayer/client.ts` to attach tokens
- Non-goals: OAuth/SSO integration, password reset, account recovery,
  email/username account model, rate limiting, anti-abuse
