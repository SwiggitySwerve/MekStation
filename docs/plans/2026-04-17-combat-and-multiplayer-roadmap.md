# MekStation — Combat & Multiplayer Roadmap

> Date: 2026-04-17
> Status: Draft — awaiting review
> Scope: End-to-end plan from today's post-Tier-A state to playable multiplayer BattleTech

## North Star

Realistic BattleTech tabletop experience with three pillars:

1. **Editor** — mech construction (largely done — 99.8% BV parity, 91 SPA catalog, 4,226 canonical units)
2. **Single-player campaign** — MekHQ-style outer loop already built; combat is what players trigger between day advancements
3. **Multiplayer co-op + PvP (2–8 players)** — full tabletop parity, either side can be human or AI, authoritative server

Combat itself in two presentation modes:

- **Quick simulation** — auto-resolve with probability output, for decision support
- **Deep visualization (Civ-style)** — hex grid, stateful units, full phase play, 2D presentation (no 3D — licensing friction on mech IP)

## Confirmed scope decisions (from interview)

| Decision                | Answer                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| Multiplayer model       | PvP + co-op, 2–8 players, authoritative state                                   |
| Critical-path unit type | BattleMechs only (non-mechs follow later)                                       |
| Campaign integration    | Existing system IS the outer loop — wire combat outcomes back in                |
| MVP demo                | 4-mech skirmish end-to-end (2v2, AI opponent, full phases, no campaign wrapper) |

## Current state summary (what we start from)

| Area                             | State                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| BattleMech construction          | ✅ Full, 99.8% BV parity                                                                        |
| Equipment + unit catalogs        | ✅ 1,107 items, 4,226 canonical mechs                                                           |
| SPA system                       | ✅ 91-entry unified catalog, combat modifiers bridged, random picker                            |
| Campaign system (day processors) | ✅ 16 processors live — turnover / acquisition / finances / faction standing / medical / awards |
| GameEngine                       | ✅ Auto-resolve with AI bot, phase orchestration                                                |
| Hex grid + math                  | ✅ Complete                                                                                     |
| `EncounterService → GameSession` | ✅ Wired (PR 293)                                                                               |
| Vault sync + rollback            | ✅ Complete                                                                                     |
| Interactive combat UI            | ❌ `InteractiveSession.ts` exists but no front-end player                                       |
| Multiplayer networking           | ❌ Yjs used for customizer tabs only; no game-session sync                                      |
| Non-mech construction            | ❌ Aerospace / Vehicle / BA / Infantry / ProtoMech are skeletons                                |

---

## Phase 0 — Foundation cleanup (IN FLIGHT, ~this session)

**Goal:** close every known stub so Phase 1 builds on a clean base.

- 8 Tier A PRs shipped or shipping — unit card actions, SHA-256, encounter→session, vault sync/rollback, unified SPA catalog, combat wiring, random SPA, Coming-Soon cleanup
- One deferred item: pilot SPA picker UI (becomes Phase 6)

**Checkpoint:** `main` is green with zero known stubs in customer-facing paths.

---

## Phase 1 — Interactive Combat MVP (the 4-mech skirmish)

**Goal:** two humans (hot-seat) or one human vs AI pit two lances against each other, play all BattleTech phases through to a winner, on an open hex map.

### Current gaps

- `InteractiveSession.ts` exists but is headless — no UI consumes it.
- Hex grid renders (in `components/gameplay/HexMapDisplay/`) but no unit tokens, no click-to-select, no action panels.
- Phase transitions exist in `GameEngine.phases.ts` but aren't driven by human input.
- No end-of-turn summary, no victory screen.

### Specs

Each phase of combat needs an interactive surface:

| Phase               | UI required                                                                                                      | Engine wiring                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Initiative**      | Roll animation, side that wins shown                                                                             | `rollInitiative()` already exists                                  |
| **Movement**        | Click unit → pathfinder overlay shows reachable hexes colored by walk/run/jump cost; click destination to commit | `runMovementPhase` — needs pathfinder + MP accounting hooks        |
| **Weapon attack**   | Click unit → weapon list with to-hit calc per target (range, movement, terrain, heat, SPA) → fire or hold        | `resolveAllAttacks` + `calculateToHit` (both exist); UI is missing |
| **Physical attack** | Punch / kick / charge / DFA options with to-hit + damage                                                         | Logic exists in `gameSessionAttackResolution`                      |
| **Heat**            | Heat buildup, shutdown rolls, ammo explosion rolls, PSR triggers                                                 | `gameSessionHeat` exists                                           |
| **End of turn**     | Damage/crit summary per unit, pilot KO / conscious rolls, PSRs                                                   | `gameSessionPSR` exists                                            |

### Tasks (suggested atomic PRs)

1. **Unit token layer** on `HexMapDisplay` — render mech silhouettes at hex coords, facing indicator, selection ring.
2. **Movement overlay + pathfinder** — BFS over walkable hexes, MP cost per path, honor elevation / terrain modifiers.
3. **Action panel component** — right-side panel bound to selected unit; shows armor diagram, heat bar, weapons, pilot stats, SPA list.
4. **Weapon attack flow** — click target → to-hit breakdown modal (list every modifier) → confirm → engine resolves → damage animation + log entry.
5. **Physical attack flow** — same pattern, restricted to adjacent targets.
6. **Heat phase driver** — end-of-turn heat application triggers UI confirmation for each shutdown / ammo roll.
7. **Turn-end summary** — list of events, pending PSRs, damage taken.
8. **AI opponent driver** — wire `BotPlayer` into the phase flow so CPU-controlled units play without human input.
9. **Victory detection + screen** — last-side-standing, eject option, post-battle report.
10. **Record-sheet overlay** — hover/click unit to see full record sheet (damage, crits, ammo remaining).

### Out of scope for Phase 1

- Terrain rendering beyond flat hexes (woods / buildings / elevation visible as overlays only)
- Animations (damage is shown as numbers, not explosions)
- Networked multiplayer (hot-seat + AI opponent only)
- Salvage, XP, campaign integration

### Checkpoint

"I can sit down with a friend at one laptop, pick 2 mechs each, play a full match to a decisive outcome." Auto-save of the match log.

**Rough size:** 10 PRs, 4–6 weeks if solo.

---

## Phase 2 — Quick Simulation mode

**Goal:** decision-support during campaign play and pre-battle planning.

### Deliverables

- "Quick resolve" button on any encounter — runs `GameEngine.runToCompletion()` with seeded RNG, reports outcome distribution across N runs (e.g. 100 sims).
- "What if" calculator on any selected weapon/target pair — shows to-hit, expected damage, crit probability without committing.
- Pre-battle force comparison — BV delta, tonnage, pilot skill averages, SPA summary, expected salvage if won.

### Tasks

1. Monte Carlo wrapper on `runToCompletion` — N seeds, aggregate winner/loss/turns/casualties.
2. Stats-aggregation helpers (mean, stddev, percentile) in `src/utils/gameplay/`.
3. Result-display component — win probability bar, likely casualties, turn-count distribution.
4. "What if" modal from the Phase 1 weapon picker — reuses the modifier calc, shows probabilistic outcome instead of triggering the attack.

**Checkpoint:** campaign players can evaluate a prospective encounter without committing to the full visual fight.

**Rough size:** 4 PRs, 1–2 weeks.

---

## Phase 3 — Campaign ↔ Combat integration

**Goal:** fights launched from a campaign feed their outcomes back — damage, XP, pilot wounds, salvage all persist.

### Current gaps

- `EncounterService.launchEncounter` now produces a `gameSessionId` (PR 293) but nothing listens for the finished session to update campaign state.
- Salvage rules aren't implemented.
- Post-battle XP distribution exists in `src/lib/campaign/progression/xpAwards.ts` but isn't invoked from combat.
- Mech damage from combat doesn't persist back to the unit record — repair system can't see it.

### Specs

- Post-battle handler: given a completed `IGameSession`, update:
  - Pilot XP (from `xpAwards`)
  - Pilot wounds / status (from consciousness checks during battle)
  - Unit damage (armor / internals / crits)
  - Contract salvage (BattleTech standard: defeated units auction between employer and mercenary)
  - Mission completion → contract status
- Post-battle review UI — shows casualties, XP gained, salvage picked, repair cost estimate.

### Tasks

1. `CombatOutcome` shape — serializes `IGameSession` final state into campaign-consumable form.
2. `PostBattleProcessor` — applies pilot XP, wounds, unit damage.
3. Salvage rules engine — implement Total Warfare / Campaign Ops salvage tables.
4. Repair queue integration — damaged units flow to the existing maintenance system.
5. Post-battle review page — readable summary replacing raw game log.

**Checkpoint:** complete a mercenary contract end-to-end: accept contract → encounter → battle → outcome applied → payment → next day advances.

**Rough size:** 5 PRs, 2–3 weeks.

---

## Phase 4 — Multiplayer foundation ✅ MVP COMPLETE (2026-04-18)

**Goal:** 2–8 players on a live match, any mix of sides, authoritative state, roll arbitration.

**Delivered (PR pending):** WebSocket transport on a custom Next.js server, in-memory match + player stores, Ed25519-signed `IPlayerToken` auth, server-authoritative `CryptoDiceRoller` with rolls embedded in events, lobby + invite flow for 1v1/2v2/3v3/4v4 + ffa-2..ffa-8 with AI-fill seats, 120s grace + replay-on-reconnect, lobby UI pages, capstone E2E test (2 mock clients run a full 1v1 match, drop+reconnect, concede, outcome publishes once).

**Deferred:** 4a P2P sub-phase (superseded by 4b server), 4c fog-of-war (Phase 4.5), persistent SQLite/Postgres stores (in-memory now; contracts pluggable), production hosting decision, OAuth (vault Ed25519 path only), per-event roll splitting (currently stamps on first eligible event), bot driver loop wired to AI seats during gameplay.

### Architectural decision points (to confirm early in this phase)

- **Authority model:** server-authoritative (needs hosting) vs. P2P-with-host (cheaper, but host-leaves = game over). Lean server-authoritative given the 2–8 player scope and cheating resistance.
- **State sync:** event-sourced (the engine is already event-sourced — this is a big tailwind) vs. state snapshots. Event-sourced fits naturally.
- **Hosting:** cloud (AWS/Fly/Railway) or self-hosted. Needs a decision per target audience.
- **Identity:** reuse existing vault identity (if vault-sharing auth is in place) or add OAuth.

### Specs

- Game sessions persist server-side, identified by code/URL for invites.
- Clients send "intent" events (move, fire, etc.); server validates and broadcasts the resolved event back.
- Authoritative RNG on server — clients can't fabricate rolls.
- Reconnect on disconnect — client replays event log from persistence.
- Optional fog-of-war — each client receives only the events visible to their side (double-blind rules).

### Tasks (big, roughly ordered)

1. Game-session persistence layer — SQLite or Postgres backing store for `IGameSession`.
2. WebSocket or similar real-time transport — broadcast engine events.
3. Server-side engine authority — server runs `GameEngine`, clients are view-only (send intents).
4. Lobby + matchmaking — create game, invite by code, assign sides.
5. Authentication — tie player identity to session participation.
6. Reconnection flow — re-hydrate client from event log.
7. Fog of war (optional for Phase 4, could be Phase 4.5) — per-side event filtering.
8. AI + human mix — `BotPlayer` continues to drive any unoccupied side.

### Checkpoint

Two humans on different machines play a full match against each other; a third joins the same side as co-op; AI fills remaining slots.

**Rough size:** 12–15 PRs, 2–3 months. Biggest phase.

---

## Phase 5 — Pilot SPA UI (formerly Tier A #5c, deferred)

**Goal:** pilot editor lets users browse all 91 SPAs by category, purchase with XP, designate options (weapon type, target, etc.); pilot sheets render SPAs; PDF export includes them.

### Tasks

1. SPA picker component — category tabs, search, description tooltip, XP cost, origin-only tag.
2. Pilot editor integration — "Add SPA" button on pilot detail page.
3. Designation prompts — when an SPA requires a weapon type / range bracket / target id at selection time.
4. Unit card + pilot sheet display — badge list with category colors.
5. PDF export extension — SPA section on the printed pilot sheet.

**Checkpoint:** a pilot's SPAs are visible everywhere the pilot appears; they can be purchased / assigned / removed.

**Rough size:** 4 PRs, 1–2 weeks. Can run in parallel with Phase 2/3.

---

## Phase 6 — Non-mech unit types (combined arms)

**Goal:** vehicles, aerospace, BattleArmor, Infantry, ProtoMechs get full construction + combat support.

### Scope per unit type

- Construction rules (chassis, motive, weapons slots, crew)
- BV calculation
- Combat behavior (speed, hit locations, firing arcs)
- Record-sheet rendering
- Unit-type-specific validation

### Ordering suggestion (revenue/impact)

1. **Ground vehicles** (most common second unit type in campaigns)
2. **Aerospace fighters** (air-to-ground contributions matter in campaigns)
3. **BattleArmor** (common hostile infantry in contracts)
4. **Conventional infantry** (occupy-ground role)
5. **ProtoMechs** (niche, Clan-only)

Each is effectively a mini-phase mirroring the mech work: construction specs → validation → BV → combat behavior → display.

**Rough size:** ~5 PRs per unit type × 5 types = 25 PRs, 4–6 months if sequential. Could be parallelized with different contributors.

---

## Phase 7 — 2D art + animation polish (final presentation layer)

**Goal:** the combat experience looks and feels like Civilization — animated movement, attack effects, visible damage, terrain art. **No 3D.** Licensing on mech IP (MechWarrior / BattleTech visual assets) makes a 3D upgrade not worth the build; 2D with good art direction is both legally safer and more faithful to the tabletop identity.

### Tasks

1. Mech sprite set (silhouettes with armor / hit-location overlays — homemade, not licensed).
2. Terrain rendering (woods, buildings, water, elevation shading).
3. Movement interpolation animations.
4. Attack visuals (laser beams, missile trails, physical impact).
5. Heat / shutdown visual indicators.
6. Damage feedback (screen shake, hit flash, smoke).
7. Line-of-sight / firing-arc overlays.
8. Minimap + camera controls.

**Checkpoint:** a stranger watching the screen understands what's happening without reading the log.

**Rough size:** 8–10 PRs, 2–3 months. This is the final presentation layer — there is no Phase 8.

---

## Cross-cutting concerns (attention throughout)

- **Performance** — `GameEngine` state derivation happens on every event. For long matches (100+ turns) verify no O(n²) pitfalls.
- **Testing** — every new combat pipeline needs unit tests + fixture scenarios. Integration tests that run whole seeded matches and assert winners are fast and high-signal.
- **Save / load** — event sourcing means any match is fully replayable. Wire save/load on interactive sessions too.
- **Accessibility** — hex grids are hard for color-blind players. Use shape + color for terrain.
- **BattleTech rules accuracy** — cite Total Warfare page numbers in code comments for any rule implementation.

---

## Critical files to keep in mind

| File                                          | Why it matters                                           |
| --------------------------------------------- | -------------------------------------------------------- |
| `src/engine/GameEngine.ts`                    | Orchestrates battles — extend for interactive sessions   |
| `src/engine/InteractiveSession.ts`            | Currently headless; the Phase 1 UI binds here            |
| `src/utils/gameplay/gameSessionCore.ts`       | `createGameSession`, `appendEvent` — event-sourced spine |
| `src/utils/gameplay/gameSession*.ts`          | Per-phase resolvers                                      |
| `src/types/gameplay/GameSessionInterfaces.ts` | The contract everything implements                       |
| `src/components/gameplay/HexMapDisplay/`      | Phase 1 UI home                                          |
| `src/lib/campaign/processors/`                | Phase 3 wiring target                                    |
| `src/lib/spa/`                                | Phase 5 consumer                                         |
| `src/services/encounter/EncounterService.ts`  | Phase 3 campaign ↔ combat bridge                         |

---

## Phase dependency / parallelization

```
Phase 0 (cleanup) ──► Phase 1 (Combat MVP) ──┬─► Phase 2 (Quick Sim)
                                              │
                                              ├─► Phase 3 (Campaign integration) ──► Phase 4 (Multiplayer)
                                              │                                             │
                                              └─► Phase 5 (Pilot SPA UI)                    │
                                                                                            │
                                              Phase 6 (non-mech) ──────────────────────────▶ merge
                                              Phase 7 (2D art + polish) ───────────────────▶ merge (final)
```

Phase 1 is the single-threaded critical path. Phases 2/3/5/6/7 can be parallelized once Phase 1 is playable. Phase 4 depends on Phase 3's post-battle hooks being real.

---

## Open questions / decisions to revisit

- **Multiplayer hosting target** — decide early in Phase 4 (self-host vs cloud vs hybrid).
- **AI quality ceiling** — current `BotPlayer` is simple. How smart does the AI need to be for single-player to be fun? Could become its own mini-phase.
- **Mission scripting** — Phase 3 covers "complete a mercenary contract," but not scripted campaign story missions. If story campaigns are desired, scripting DSL becomes a new phase.
- **Performance ceiling** — Phase 7 / 8 may require WebGL / Canvas2D optimization work not yet budgeted.

---

## How to use this doc

- Each phase is a sequence of PRs, not a branch of work. Spin an OpenSpec change for each phase when it comes up.
- Deliverables + tasks here are **suggested atomic PRs** — implementers will refine as they start.
- Phase checkpoints are the acceptance criteria — when the phase ships, the checkpoint should be demonstrable.
- Update this doc as decisions get made / scope changes. Archive it once everything ships.
