# OMO Council Decision — Waves 2-5 Decomposition

**Date:** 2026-05-19
**Question:** Decompose roadmap Waves 2-5 into concrete, dependency-ordered OpenSpec changes and resolve the open architectural decision points.
**Variant:** Lean++ thin (Metis pre-phase + Oracle / Explore-Deep / Momus).
**Survival score:** 7/10.

## Architectural decisions

### DP1 — Multiplayer transport: consolidate on the authoritative server
`src/lib/multiplayer/server/ServerMatchHost.ts` and its satellites are a finished, mature server-authoritative stack — per-intent roll capture, fog-of-war redaction, reconnection grace timers, lobby intents, replay streaming, Wave-5 outcome publisher. There is **no rewrite**. Wave 3 hardens this server; P2P / y-webrtc is demoted to a fallback we stop investing in. The P2P `mirrorSession` / `gameSessionChannel` event-application pattern is kept as the **client-side** layer, pointed at the server WebSocket instead of y-webrtc. Cheating defense (roll capture, intent zod-refinement, fog redaction) is structurally impossible on a peer mesh — this decision is what makes Wave 3 M2 integrity achievable.

### DP2 — Co-op campaign authority: host-as-GM, server-arbitrated (NOT CRDT)
Campaign state is a transactional ledger (money, hiring, contract acceptance, salvage allocation). Yjs `Y.Map` last-writer-wins silently resolves "both players spent the same C-bills" with no overdraft check — CRDTs guarantee convergence, not correctness. **This overrides the roadmap's CO1 "extend Yjs vault-sync" plan.** Co-op campaign reuses the `ServerMatchHostIntent` pattern: a guest's "hire pilot" / "accept contract" is an intent the host validates against current state, then broadcasts the resulting campaign event. Sync uses the **server-authoritative event-broadcast channel** with campaign event payloads; the guest's campaign store is a read-only mirror. The Yjs vault-sync (`useSyncedVaultStore`) stays for the content library (sharing unit/pilot designs) only — LWW is harmless there.

### DP3 — Wave ordering: Wave 2 (AI) before Wave 4 (campaign). Closed.
Confirmed by roadmap §5 and user. Wave 3 (multiplayer) is independent and may run in parallel if staffed.

## Final decomposition — 15 changes

### Wave 2 — Tactical AI (5 changes)
| Slug | Scope | Capability | Depends on |
|---|---|---|---|
| `add-ai-terrain-aware-movement` (A1) | Terrain-cost pathfinder + LOS/cover-aware move scoring; introduces the **AI Difficulty Tier Registry** (ADDED to `simulation-system`); design.md freezes the pathfinder API contract. Extract `getTerrainMovementCost` from `renderHelpers.ts` into a shared sim util. | `simulation-system` | Wave 1 (terrain/objectives) |
| `add-ai-resource-planning` (A2) | Multi-turn heat lookahead, ammo-runway projection, crit-seeking + weapon-mode selection (LB-X cluster/slug). | `simulation-system` | A1 |
| `add-ai-coordination-tactics` (A3a) | Lance/formation tactics, multi-unit threat aggregation. | `simulation-system` | A1 (pathfinder API) |
| `add-ai-objective-awareness` (A3b) | AI reads scenario objective markers and plays the scenario, not just kills. | `simulation-system` | Wave 1 `add-scenario-objective-engine`, A3a |
| `add-ai-advanced-systems` (A4) | Jump-jet tactics; ECM-awareness (consumes existing `src/utils/gameplay/electronicWarfare/`); spotting/vision (consumes existing `fogOfWar.ts`). | `simulation-system` | A1, A2 |

Each A-change ADDs its tier parameters to the **AI Difficulty Tier Registry** requirement in `simulation-system` — all-ADDED, no MODIFIED chaining. Difficulty tiers are player-selectable (Veteran = A1+A2 depth, Elite = A3+A4).

### Wave 3 — Multiplayer (3 changes)
| Slug | Scope | Depends on |
|---|---|---|
| `complete-multiplayer-game-surface` (M1) | Replace the `active`-state stub at `src/pages/multiplayer/lobby/[roomCode].tsx:307-325` with the real networked game UI — board state over WS, intent send/receive, opponent moves. The critical gap. | — (server infra exists) |
| `harden-multiplayer-transport` (M2) | Consolidate on the authoritative server; durable match store (replace `InMemoryMatchStore`); host migration / graceful degradation; intent rate-limiting + replay-attack protection (former M3, merged in). | M1 |
| `add-matchmaking-and-spectator` (M3) | Match browser / matchmaking; spectator seat type (consumes existing server FoW). | M1, M2 |

### Wave 4 — Campaign (5 changes)
| Slug | Scope | Depends on |
|---|---|---|
| `add-campaign-persistence` (CP0) | Server-side campaign save/load API + store. Foundational — also a co-op prerequisite. | — |
| `add-campaign-combat-loop` (CP1) | Auto `GameSession`→`pendingBattleOutcomes` trigger; scenario-event→`IEncounter` persistence bridge; mission→encounter launch. **Scoped to integration wire-up** — `postBattleProcessor`/`salvageProcessor`/`repairQueueBuilder` are 60-70% built. CP1 design.md freezes the inventory schema. | CP0 |
| `add-campaign-bay-ui` (CP2a) | Mech bay, repair bay, medical, salvage-acceptance UI surfaces. | CP1 (inventory schema) |
| `add-campaign-command-ui` (CP2b) | Personnel/hiring, finances/loans, contract-market UI surfaces. | CP0 |
| `add-campaign-refit-and-prestige` (CP3) | Refit / equipment-swap; prestige + morale state machine. Other business logic (faction standing, markets, negotiation) already exists — scoped narrow. | CP2a |

Roadmap's CP4 (`campaign-events-and-generation`) is **dropped** — `randomEventsProcessor`, contract processors, and `scenarioGenerationProcessor` already exist; the genuine remnant (encounter persistence) folds into CP1.

### Wave 5 — Co-op Campaign (2 changes)
| Slug | Scope | Depends on |
|---|---|---|
| `add-shared-campaign-state` (CO1) | Extend the **server-authoritative event-broadcast loop** to campaign state — campaign event log + guest mirror. NOT Yjs vault-sync (see DP2). | CP0, CP1, M2 |
| `add-coop-campaign-play` (CO2) | Co-op mission launch with both players' forces + host-as-GM authority model (intent→validate→commit→broadcast for campaign decisions). Former CO2+CO3, merged. | CO1 |

## Built-vs-missing notes (Explore-Deep)

- **Wave 2:** `MoveAI.scoreMove` weighs LOS (terrain-aware via `calculateLOS`) but NOT movement-point cost or cover. `AttackAI` heat budget is single-turn; no crit-seeking. ECM module and server FoW already exist — A4 wires them into AI, does not build them.
- **Wave 3:** Server infra, lobby state machine, and lobby UI are all real. The `active`-state game surface is a hardcoded stub. No durable match store, no matchmaking/browser, no spectator seat.
- **Wave 4:** Day-pipeline + 12 processors + `postBattleProcessor` all built. Gaps: scenario-event→`IEncounter` bridge, repair/medical/salvage execution UI, server-side campaign persistence.
- **Wave 5:** `SyncableItemType` = `unit|pilot|force` — no campaign type. Campaign state is entirely outside any sync boundary today.

## Preserved dissent (Momus)

- A4's ECM "play" may require to-hit modifiers in the **core combat engine**, which may not be implemented. A4 is scoped to **AI-awareness only**; if engine ECM modifiers are missing, that is a flagged question for a later change — A4 must not silently expand into engine work.
- CP2a/CP2b remain large (UI surface area). If a single change exceeds ~80 tasks during authoring, split further into PR sub-waves.

## Implementation order

PR by PR, sequential to keep CI green: Wave 1 (3) → Wave 2 (A1→A2→A3a→A3b→A4) → Wave 3 (M1→M2→M3) → Wave 4 (CP0→CP1→CP2a→CP2b→CP3) → Wave 5 (CO1→CO2). 18 changes total.
