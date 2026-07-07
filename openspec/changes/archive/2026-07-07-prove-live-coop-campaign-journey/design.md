# Design: prove-live-coop-campaign-journey

## Technical Approach

Two transport layers exist in this repo and are in opposite states of readiness:

1. **Combat/match transport** — a real `ws` WebSocket server hosted by `server.js` on the same HTTP port as Next.js, dispatched through `MatchHostRegistry` + `ServerMatchHost` via `bindMultiplayerSocketConnection`. It is **proven cross-browser**: `e2e/multiplayer-live-vault-auth.spec.ts` opens two `browser.newContext()` instances, authenticates two vault identities, has the host create a match and the guest join by room code, and drives both through ready/launch/phase-advance over the socket. The Playwright `webServer` config boots this server with `reuseExistingServer: true` and no separate global-setup.

2. **CO1 campaign-sync transport** — the `CampaignMatchHost` / `CampaignSyncSession` / `CampaignGmArbiter` / `useCampaignMirrorStore` classes are real and unit-tested, but they run in **per-browser module-scoped `Map`s** (`runtimeByMatchId`, `activeHosts`, `participationByMission`). There is **no network bridge**: `bindMultiplayerSocketConnection.ts` has zero Campaign references, no `pages/api/multiplayer/*` route streams campaign events, `CampaignSyncSession.joinGuest` has zero production callers, and `useCampaignMirrorStore` has zero production callers. Across two real browsers this produces three dead ends — the guest gets an empty campaign, participation choices never cross, and guest proposals resolve `session-closed`.

The wave's engineering is the **bridge for layer 2, built by reusing layer 1's proven pattern**. The CO1 classes are transport-agnostic; the work is to run them in the server process, bind a campaign-sync socket channel to them, and connect the three unwired client seams. Then the journey is authored on the layer-1 two-context template.

## Architecture Decisions

### Decision: D1 — Server-resident CO1 campaign host over the existing WebSocket, not a host-browser relay

**Choice**: Move the authoritative `CampaignMatchHost` / `CampaignSyncSession` / `CampaignGmArbiter` into the `server.js` process behind a matchId-keyed campaign-host registry (a sibling of `MatchHostRegistry`), and bind a campaign-sync socket channel to it that mirrors `bindMultiplayerSocketConnection`. Host and guest browsers are both clients; the server holds the single authoritative writer.

**Rationale**:
- The `coop-campaign-sync` spec already requires a **server-authoritative** `intent → validate → commit → broadcast` loop with "a single authoritative writer." The current same-process design technically violates this (authority sits in the host browser). Server-resident authority is the spec-correct fix, not just a proof enabler.
- It is **uniform** with the combat transport (`ServerMatchHost` in the server process), reusing the same registry + binding + authenticated-upgrade primitives rather than inventing a divergent pattern.
- It **reuses code that already exists but is uncalled**: `CampaignSyncSession.joinGuest` (snapshot + replay) and `useCampaignMirrorStore` (mirror reducer) are built and tested — the server simply becomes their caller. A host-browser relay would instead require inventing new host-side relay glue.

**Alternatives considered**:
- **Host-browser-authoritative relay** (server is a dumb frame relay within a matchId room; `CampaignMatchHost` stays in the host browser). Rejected: fewer server lines but keeps authority in the browser (spec violation persists), diverges from the combat pattern, and still needs the host browser online — so it buys nothing the server-resident design doesn't, at the cost of a second, inconsistent topology.
- **Polling REST API** for campaign events. Rejected: higher latency, and `src/lib/multiplayer/server/TRANSPORT.md` documents a WebSocket-only transport policy — a polling channel would contradict it.

**Note on host-in-the-loop**: `host-review` GM arbitration needs the human host's approve/veto. Even with server-resident authority, that decision round-trips to the host browser (server holds a `pending` proposal, forwards it as a `CampaignProposal`-review frame, and commits only on the returned `CampaignDecision`). `auto-approve` mode commits server-side with no host round-trip. This is consistent with the existing `GmArbitrationMode` requirement.

### Decision: D2 — Campaign-sync frames ride the existing upgrade path, added to the envelope schema with a loud exhaustiveness check

**Choice**: Add campaign-sync frame kinds (`CampaignJoin`, `CampaignSnapshot`, `CampaignEvent`, `CampaignProposal`, `CampaignDecision`, `CampaignParticipation`) to the multiplayer message-envelope schema, dispatched by the same authenticated upgrade handler as combat frames. No new port, no second server.

**Rationale**: Minimum surface area; one transport to secure and reason about. The repo memory flags that `jest+babel silently passes wrong enum members` — so the decoder MUST carry an explicit runtime exhaustiveness assertion that throws on an unknown campaign-sync kind, not a silent `default` no-op.

**Note**: These are **campaign** frame kinds, distinct from the combat `GameEventType` union. No combat `GameEventType` is added, so the "~14 QC pin surfaces" ripple does not apply — but the message-envelope validators and any envelope exhaustiveness tests DO need updating (see Risks).

### Decision: D3 — Guest join hydrates from the snapshot instead of building an empty campaign

**Choice**: Rewire `createGuestMirrorCampaignAction` so guest join opens a `CampaignSyncSession`, awaits the `CampaignSnapshot` baseline + event-log replay via `joinGuest`, and initializes `useCampaignMirrorStore` from it — replacing the current `createCampaignEntity('', factionId)` empty-campaign construction.

**Rationale**: This is both the transport wiring AND a fix for a standalone defect (guest currently lands on an empty campaign regardless of transport). Hydration-from-snapshot is the behavior the `coop-campaign-sync` "Guest join receives a baseline then the log" scenario already specifies; it simply had no production caller.

### Decision: D4 — Journey modeled on `multiplayer-live-vault-auth.spec.ts`, proving the maximum honestly provable

**Choice**: Author `e2e/coop-campaign-two-browser-journey.spec.ts` using the two-context helper from `multiplayer-live-vault-auth.spec.ts` (`browser.newContext()` twice → `hostPage`, `guestPage`). Drive the real create/join UI (`create-coop-campaign-btn`, `join-coop-campaign-btn`, `join-coop-room-code-input`, `join-coop-submit-btn`) and assert against the guest mirror, not the host's heap.

**Rationale**: The two-context pattern is proven and the `webServer` boot is automatic. Asserting against real synced guest state (not a heap bridge) is the honesty bar the `e2e-testing` delta encodes.

## Two-Context Harness Approach

- **Boot**: unchanged. Playwright `webServer` runs `npm run dev` → `server.js` (HTTP + WebSocket on port 3600). `reuseExistingServer: true` lets a manually-started dev server satisfy it.
- **Contexts**: reuse `openContextPage(browser)` from `multiplayer-live-vault-auth.spec.ts` — two independent `browser.newContext()` instances give host and guest isolated storage + vault identities, both connecting to the one server.
- **Identity**: two distinct vault identities (the vault-auth spec already establishes this pattern; the co-op create flow mints an auth token via `POST /api/multiplayer/auth/token` before `POST /api/multiplayer/matches`).
- **Assertions**: host asserts `Co-op session: Host` badge + GM controls; guest asserts `Co-op session: Guest` badge, hydrated funds/roster, absence of GM-private controls, and post-battle convergence — all read from rendered guest UI backed by the mirror store.

## UI Audit Integration

The audit rides the existing harness rather than a new one:
- `qc:ux-audit` (`scripts/qc/run-ux-walkthrough.mjs`) and `qc:command-evidence` (`scripts/playwright/...playable-command-feature-screens.spec.ts` + `validate-playable-command-screen-slices.mjs --require-evidence`) are the two established evidence patterns.
- The co-op flow set (create, join, host dashboard, guest dashboard, mission launch) is audited for the four checks in the `e2e-testing` "Co-op Campaign Journey UI Audit Coverage" requirement: screen fit, clickability, private/public visibility, action completion.
- Evidence lands under the established `.sisyphus/evidence/` tree so the validator can assert `--require-evidence`.

## Data Flow

```
Host browser                     server.js (authoritative)                Guest browser
  create co-op  ── POST /matches ─▶ register CampaignMatchHost (registry)
  (host GM)                          │
  campaign mutation ─ CampaignEvent ▶ commit → append log → broadcast ──▶ CampaignEvent ─▶ mirror.applyEvent
                                     │                                     join ─ CampaignJoin ─▶
  approve/veto ◀─ review frame ──────┤◀─ CampaignProposal ── guest proposal
                                     │── CampaignSnapshot + replay ──────▶ mirror.applySnapshot (hydrate)
  participation ─ CampaignParticipation ▶ fan-out ─────────────────────▶ otherChoice updates gate
  post-battle reconcile ─ intents ──▶ Funds/Salvage/Roster events ─────▶ mirror converges
```

## File Changes (indicative — Atlas/Codex confirms exact paths during execution)

- New: `src/lib/multiplayer/server/CampaignHostRegistry.ts` — matchId-keyed server-resident campaign host registry (sibling of `MatchHostRegistry`).
- New: `src/lib/multiplayer/server/bindCampaignSyncConnection.ts` — socket binding routing campaign-sync frames to the registry (mirror of `bindMultiplayerSocketConnection`).
- New: `src/lib/campaign/coop/campaignSyncTransport.ts` (client) — connect/send/receive adapter over the multiplayer socket, reusing the combat client's auth-token/connect pattern.
- New: `e2e/coop-campaign-two-browser-journey.spec.ts` — the two-context journey.
- Modified: `server.js` — dispatch campaign-sync upgrades/frames alongside combat.
- Modified: multiplayer message-envelope schema/types (`src/types/...` / `src/lib/multiplayer/...`) — add campaign-sync frame kinds + exhaustiveness assertion.
- Modified: `src/stores/campaign/useCampaignStore.actions.ts` (`createGuestMirrorCampaignAction`) — hydrate from snapshot via `joinGuest` instead of building an empty campaign.
- Modified: `src/lib/campaign/coop/coopRuntimeSession.ts` — `submitGuestProposalToHost` + `publish/subscribeCoopParticipation` route over the transport instead of in-memory maps.
- Modified: `src/components/campaign/coop/CampaignCoopRouteSurfaceConnected.tsx` — guest mount subscribes to the sync transport (currently short-circuits for non-host).
- Modified: `package.json` — add `verify:qc:coop-campaign-journey`; extend the co-op UI-audit evidence set.

## Risks

- **R1 — Wave size.** This is a transport-layer build plus a capstone journey plus an audit. It is bounded (every piece exists except the wire) but larger than a typical UI wave. Mitigation: strict sequential task ordering (Waves 1→5), each transport task landing with its own contract test before the journey consumes it. Codex-first, sequential — parallel fan-out has failed on this repo and is prohibited here.
- **R2 — Host-review round-trip complexity (honest fallback).** The `host-review` approve/veto round-trip (server holds pending → forwards to host browser → commits on decision) is the most intricate seam. If it proves not fully closeable in-wave, the **fallback** is: the journey exercises `auto-approve` mode (commits server-side with no host round-trip) to prove cross-browser proposal→commit→guest-convergence end-to-end, and the `host-review` interactive approve/veto round-trip is asserted at the maximum provable point (proposal reaches the host review surface across browsers) with the commit-on-approve round-trip filed as an explicit residual follow-up. The journey stays green and honest either way; it never fakes convergence via a heap bridge.
- **R3 — Envelope validator ripple.** Adding campaign-sync frame kinds touches the multiplayer message-envelope schema and its exhaustiveness/validator tests. `jest+babel silently passes wrong enum members`, so the decoder needs an explicit runtime assertion and the envelope tests need the new kinds added deliberately. Task 1.2 owns this.
- **R4 — Formatter/validator race.** Per repo memory, the double-quote formatter hook vs oxfmt single-quote can break token-matching QC validators. After any spec/validator edit, run oxfmt + the validator + its jest wrapper (baked into the relevant task verification).
- **R5 — Reconnection tail.** Guest resync-after-disconnect (streaming only the missing tail vs a fresh snapshot on a large gap) is specified in `coop-campaign-sync` but is a secondary path. The journey proves reload-rehydration (fresh snapshot); the incremental missing-tail resync is exercised by a contract test, and if it slips it is a residual, not a journey blocker.

## Out of Scope (explicit)

- Pilot-XP reconciliation — no XP event exists in `CampaignEventType` today; funds/salvage/roster are the reconciled set.
- P2P vault-sync (BroadcastChannel/WebRTC) `test.fixme`s — different subsystem, architecturally blocked across Playwright contexts.
- The other-user-flows QC backlog (hub/lobby edge cases, customizer, economy loops, matchmaking, spectate).
