## Context

MekStation has two mature, independent systems that need to be connected:

**Simulation Layer** (production-ready, 500+ tests):

- Combat utilities at `src/utils/gameplay/` — `damage.ts`, `toHit.ts`, `heat.ts`, `movement.ts` implement full BattleTech combat mechanics using real unit data
- Event-sourced game state at `src/utils/gameplay/gameSession.ts` — `createGameSession(config, units)` returns `IGameSession` with immutable event history and derived state
- `BotPlayer` at `src/simulation/ai/BotPlayer.ts` — basic AI that makes movement and attack decisions given unit state, hex grid, and movement capabilities
- `GameOutcomeCalculator` at `src/services/game-resolution/` — determines victory via elimination, mutual destruction, turn limit, or concession
- `KeyMomentDetector` — identifies 18 significant battle events across 3 tiers

**UI Layer** (built, but wired to demo data):

- `HexMapDisplay.tsx` (1,037 lines) — fully implemented SVG hex map with unit tokens, terrain patterns, overlays, pan/zoom, click handlers. Already used by game session page in demo mode.
- `QuickGamePlay.tsx` — shows demo "Mark Destroyed" buttons instead of calling combat utilities
- `useGameplayStore` — holds `IGameSession | null` but only ever loaded via `createDemoSession()`
- `useQuickGameStore` — manages Quick Play setup (unit selection, scenario config) but `startNewGame()` only creates a game instance object, never a real `IGameSession`
- Force builder page has `availableUnits: UnitInfo[] = []` with a TODO comment
- Encounter launch handler calls `router.push('/gameplay/encounters')` (back to list) instead of navigating to a game session

**Unit Data Layer** (complete):

- `CanonicalUnitService` — singleton providing `getIndex(): Promise<IUnitIndexEntry[]>` with 4,200+ canonical units loaded from bundled JSON. Client-side only, no API route.
- `UnitSearchService` — MiniSearch-powered full-text search across canonical + custom units. Client-side.
- `IUnitIndexEntry` (`src/types/unit/UnitIndex.ts`) — lightweight metadata: id, name, chassis, variant, tonnage, techBase, weightClass, bv, cost, year, role
- Full unit data loaded on-demand via `canonicalUnitService.getById(id)` — returns complete construction data (weapons, armor allocation, engine, structure)

**Key constraint**: `SimulationRunner` (`src/simulation/runner/SimulationRunner.ts`) is a fuzz-testing tool. It creates hardcoded minimal units internally with `SIMPLE_DAMAGE = 5` and cannot accept external unit data. It must NOT be modified or repurposed as a game engine.

**Key types** (all at `src/types/gameplay/GameSessionInterfaces.ts`):

- `IUnitGameState` (line 433) — runtime unit state: id, side, position, facing, heat, armor (Record<string, number>), structure, destroyedLocations, ammo, pilotWounds, destroyed, lockState
- `IGameState` (line 473) — overall state: gameId, status, turn, phase, initiativeWinner, units (Record<string, IUnitGameState>), result
- `IGameSession` (line 506) — session envelope: id, config, units (IGameUnit[]), events (IGameEvent[]), currentState (IGameState)
- `IGameConfig` (line 396) — mapRadius, turnLimit, victoryConditions, optionalRules
- `IGameUnit` (line 410) — unit roster entry: id, name, side, unitRef, pilotRef, gunnery, piloting

## Goals / Non-Goals

**Goals:**

- Build a `GameEngine` class that wraps existing combat utilities and accepts real compendium unit data, providing auto-resolve and interactive turn-by-turn execution modes
- Create an adapter layer that converts compendium construction data (`IUnitIndexEntry` + full unit data) into runtime game state (`IUnitGameState`)
- Wire Quick Play, Encounter, and Campaign flows to use `GameEngine` for real combat instead of demo interfaces
- Enable Playwright agents to autonomously play through complete games via store reads + UI interactions
- Reuse existing `IGameSession` event-sourced architecture — all game events stay compatible with the replay system

**Non-Goals:**

- Refactoring or modifying `SimulationRunner` (stays as fuzz-testing tool)
- Improving `BotPlayer` AI beyond current basic behavior (move toward enemy, attack nearest)
- Implementing physical attacks, LOS blocking, heat shutdown, ammo explosion
- Adding campaign financial transactions, repair mechanics, morale, faction standing
- Building mobile/responsive layouts for new UI components
- Creating new API routes for unit data (use client-side `CanonicalUnitService`)
- Terrain combat modifiers (terrain stays visual-only)
- Animated turn-by-turn replay for auto-resolve mode

## Decisions

### Decision 1: New GameEngine Class — Not SimulationRunner Refactoring

**Choice**: Create `src/engine/GameEngine.ts` as a new class.

**Alternatives considered**:

- **Refactor SimulationRunner** to accept real units — rejected because SimulationRunner's `createInitialState()` deeply couples unit creation with hardcoded templates (`SIMPLE_DAMAGE = 5`, single Medium Laser per unit). Refactoring would break 500+ fuzz tests and change the tool's purpose.
- **Extend SimulationRunner** with a subclass — rejected because the base class assumptions (hardcoded units, batch execution focus) leak into every method.

**Rationale**: The existing combat utilities (`damage.ts`, `toHit.ts`, `heat.ts`, `movement.ts`) already support real unit data — they operate on `IUnitGameState` which has per-location armor, multiple weapons, real gunnery skills. The gap is only in the orchestration layer. A new `GameEngine` class that calls these utilities with real data is the minimal bridge.

**Architecture**:

```
GameEngine
├── adaptUnits()          → CompendiumAdapter (IUnitIndexEntry → IUnitGameState)
├── runToCompletion()     → BotPlayer (both sides) + combat utils → IGameSession
├── createInteractive()   → InteractiveSession
│   ├── getState()        → IGameState (derived from events)
│   ├── getActions(unitId)→ available movement hexes / weapon targets
│   ├── applyAction()     → append IGameEvent, derive new state
│   ├── runAITurn()       → BotPlayer (opponent side) + combat utils
│   └── isGameOver()      → GameOutcomeCalculator
└── Uses: createGameSession(), deriveState(), all combat utils, BotPlayer, SeededRandom
```

### Decision 2: CompendiumAdapter Uses Client-Side Services — No API Route

**Choice**: Build `src/engine/adapters/CompendiumAdapter.ts` that calls `canonicalUnitService.getById(id)` to load full unit data, then maps it to `IUnitGameState`.

**Alternatives considered**:

- **Create `/api/units` REST endpoint** — rejected because `CanonicalUnitService` is designed for client-side use (lazy-loads from bundled JSON), and no such endpoint exists today. Creating one would add unnecessary network round-trips.
- **Use `IUnitIndexEntry` directly** — rejected because index entries are lightweight metadata (no weapon details, no armor allocation per location). Full unit data is needed for combat.

**Rationale**: `canonicalUnitService.getById(id)` returns complete construction data (engine rating, armor per location, weapons with damage/heat/range, structure points). The adapter maps this to `IUnitGameState` shape expected by all combat utilities.

**Mapping summary**:
| Compendium Source | Game State Target | Transformation |
|---|---|---|
| Engine rating + tonnage | walk/run/jump MP | `floor(rating / tonnage)`, `floor(walk * 1.5)`, jump jets count |
| Armor allocation per location | `armor: Record<string, number>` | Direct map (head, CT, LT, RT, LA, RA, LL, RL + rear) |
| Structure from tonnage table | `structure: Record<string, number>` | Lookup from internal structure table |
| Weapon list | Weapons array with damage, heat, range bands | Map from equipment data |
| Pilot gunnery/piloting | gunnery, piloting numbers | Direct (default 4/5 if no pilot) |

### Decision 3: Store Bridging — Quick Play Creates Real GameSession

**Choice**: When Quick Play's "Start Battle" is clicked, bridge `useQuickGameStore` → `GameEngine` → `useGameplayStore`:

1. Read selected units and scenario config from `useQuickGameStore`
2. Convert units via `CompendiumAdapter`
3. Call `GameEngine.runToCompletion()` (auto-resolve) or `GameEngine.createInteractiveSession()` (interactive)
4. Store resulting `IGameSession` in `useGameplayStore`
5. Navigate to `/gameplay/games/{sessionId}`

**Alternatives considered**:

- **Merge stores into one** — rejected because `useQuickGameStore` handles setup flow (step wizard, scenario generation) while `useGameplayStore` handles active game state. Different responsibilities, different lifecycles.
- **Keep stores completely separate** — rejected because the game session page reads from `useGameplayStore`, so Quick Play must write there.

**Rationale**: The stores have clean, separate responsibilities. The bridge is a one-time handoff: Quick Play produces game configuration, GameEngine produces a session, and the gameplay store hosts it. No ongoing bidirectional sync needed.

### Decision 4: Force Builder Uses UnitSearchService — Client-Side Search

**Choice**: Replace empty `availableUnits` array in `src/pages/gameplay/forces/[id].tsx` with `UnitSearchService.search()` calls.

**Alternatives considered**:

- **Call `/api/units` endpoint** — rejected because it doesn't exist. Only custom unit API routes exist at `src/pages/api/units/custom/`.
- **Direct `canonicalUnitService.getIndex()`** — would work but lacks search/filter. `UnitSearchService` wraps this with MiniSearch-powered fuzzy search across name, chassis, variant.

**Rationale**: `UnitSearchService` already exists, is initialized with 4,200+ canonical units + custom units, and provides `search(query, options): IUnitIndexEntry[]`. The unit selector modal calls this for real-time search with weight class and tech base filtering via `IUnitQueryCriteria`.

### Decision 5: Interactive Mode Reuses HexMapDisplay — No New Map Component

**Choice**: Wire `HexMapDisplay.tsx` click handlers to `InteractiveSession` methods. Add game phase state to control which interactions are available.

**Alternatives considered**:

- **Build new game-specific map** — rejected because `HexMapDisplay` already has unit tokens, terrain rendering, movement range overlays, attack range overlays, pan/zoom, and click handlers. Building a new one would duplicate 1,037 lines.

**Rationale**: The existing map component already renders everything needed. The missing piece is connecting its click callbacks to game logic:

- Movement phase: `onHexClick` → `interactiveSession.applyAction({ type: 'move', unitId, destination })`
- Attack phase: `onUnitTokenClick` → set target, then `interactiveSession.applyAction({ type: 'attack', attackerId, targetId, weapons })`

### Decision 6: Campaign Mission Loop — Encounter as Bridge

**Choice**: Campaign missions create encounters, which use the existing encounter-to-game flow:

```
Campaign Dashboard
  → "Generate Mission" creates an IEncounter via useEncounterStore
  → Encounter uses existing scenario templates + OpFor generator
  → Launch encounter → GameEngine → battle → results
  → "Return to Campaign" applies damage back to campaign roster
```

**Alternatives considered**:

- **Direct campaign-to-game** — rejected because the encounter system already handles force validation, scenario templates, and map configuration. Skipping it means duplicating all that logic.
- **Campaign-specific game engine** — rejected because the same `GameEngine` serves all modes.

**Rationale**: Encounters are the natural bridge between force management and game execution. Campaigns generate encounters with pre-selected forces, then the existing encounter → game flow handles everything. After battle, `DamageCalculator` from `src/services/game-resolution/` assesses unit damage, which is written back to the campaign forces store.

### Decision 7: Agent Reads Store, Acts via UI

**Choice**: Playwright agent reads game state from `window.__ZUSTAND_STORES__.gameplay.getState()` for tactical decisions, but executes all actions through actual UI clicks (hex clicks, button clicks).

**Alternatives considered**:

- **Pure store manipulation** — rejected because it doesn't test the real user experience. Buttons might not call the right store methods.
- **Pure UI reading** — rejected because extracting unit positions, weapon ranges, and armor values from rendered SVG is extremely fragile and complex.

**Rationale**: This gives the best of both worlds. The agent has full tactical awareness (positions, weapons, damage, phase) from the store, but validates that the UI actually works by clicking through it. If a button is broken, the agent test fails — exactly what we want.

### Decision 8: AI-vs-AI Spectator Reuses Interactive Session with Timer

**Choice**: Spectator mode creates an `InteractiveSession` where both sides call `runAITurn()`, with a configurable delay between actions for visual rendering.

**Alternatives considered**:

- **Run `runToCompletion()` then replay** — rejected because user asked for live spectator mode on the hex map, not post-game replay.
- **New spectator-specific engine mode** — rejected because `InteractiveSession` already supports `runAITurn()` for any side. Just call it for both sides with a rendering delay.

**Rationale**: `InteractiveSession.runAITurn()` is side-agnostic. Spectator mode is simply: `runAITurn('player')` → render → delay → `runAITurn('opponent')` → render → delay → repeat. Playback controls (play/pause/speed) control the delay timer, following the same pattern as `useSharedReplayPlayer.ts`.

## Risks / Trade-offs

**[Risk] CompendiumAdapter may produce invalid game state for unusual units** → Mitigation: Test adapter with known units (Atlas AS7-D, Locust LCT-1V, Hunchback HBK-4G) and validate output shape against `IUnitGameState`. Add runtime validation that armor totals match compendium data.

**[Risk] BotPlayer AI is basic — games may feel repetitive** → Mitigation: Accepted for MVP. The AI moves toward nearest enemy and fires at nearest target. This is sufficient for functional gameplay. AI improvement is explicitly a non-goal and can be a follow-up change.

**[Risk] Two-store handoff (Quick Play → Gameplay) could lose state on page refresh** → Mitigation: `useGameplayStore` writes session to memory only (no persistence). If page refreshes mid-game, session is lost. This matches existing behavior. Campaign games persist damage to campaign store, so progress is recoverable at the campaign level.

**[Risk] HexMapDisplay click handlers may conflict between map interaction modes (pan vs select hex vs select unit)** → Mitigation: Use game phase to gate interactions. Movement phase: hex clicks = move destination. Attack phase: unit token clicks = target selection. Non-game state: normal pan/zoom only. This follows the existing overlay toggle pattern in HexMapDisplay.

**[Risk] Full unit data loading for 4+ units could be slow on first load** → Mitigation: `canonicalUnitService.getById()` uses lazy loading. Each unit file is ~5-20KB JSON. For a 4v4 game that's <200KB total. Performance target: <500ms for all units.

**[Risk] Campaign damage carry-forward requires CompendiumAdapter to accept starting damage** → Mitigation: Add optional `initialDamage: Partial<IUnitGameState>` parameter to adapter. For first mission: omit (full armor). For subsequent missions: pass saved damage state from campaign store.

**[Trade-off] No terrain combat modifiers means some hex map terrain features are purely decorative** → Accepted. The terrain rendering provides atmosphere even without mechanical effects. Adding terrain modifiers would require touching combat utilities (excluded from scope).

**[Trade-off] No `/api/units` endpoint means Force Builder unit search only works client-side** → Accepted. The canonical unit index is ~2MB bundled JSON, already loaded by the app. Client-side search via MiniSearch is fast (<50ms) and avoids network round-trips. If an API is needed later (e.g., for server-side rendering), it can be added independently.
