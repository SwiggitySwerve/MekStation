## Why

MekStation has a production-ready simulation engine (500+ tests, complete combat mechanics, ~50ms per game) and fully-built UI pages (Quick Play, Forces, Encounters, Campaigns, Game Session) — but they are not connected. The simulation engine was designed for fuzz testing and uses hardcoded units; the UI shows demo buttons instead of calling real combat utilities. A user cannot currently play a single battle end-to-end. This change bridges the gap by building a GameEngine that wraps existing combat utilities, wiring it to the UI, and enabling autonomous Playwright agent gameplay through all single-player flows.

## What Changes

- **New GameEngine class** (`src/engine/`) that wraps existing combat utilities (`damage.ts`, `toHit.ts`, `heat.ts`, `movement.ts`) and accepts real compendium unit data — separate from the existing `SimulationRunner` (which stays as a fuzz-testing tool)
- **New compendium-to-game adapter** that converts the 4,200+ canonical unit records into runtime game state (`IUnitGameState`) with real weapons, armor, structure, movement, and pilot skills
- **Quick Play auto-resolve**: replace demo "Mark Destroyed" buttons with real `GameEngine.runToCompletion()` → results → replay
- **Quick Play interactive mode**: turn-by-turn gameplay on the existing hex map (`HexMapDisplay.tsx`) with player movement/attack decisions and AI opponent via existing `BotPlayer`
- **Force Builder unit selection**: wire the empty `availableUnits` array to the compendium API so users can assign real units to forces
- **Encounter launch fix**: capture `gameSessionId` from launch API response and navigate to game session page (currently navigates back to encounter list)
- **Encounter-to-game flow**: encounter config (forces, map, scenario template) feeds into GameEngine for auto-resolve or interactive play
- **AI-vs-AI spectator mode**: both sides controlled by `BotPlayer`, rendered on hex map with playback controls
- **Campaign MVP**: roster assignment (replace "coming soon" placeholder), mission generation (reuse existing scenario templates + OpFor generator), battle damage carry-forward between missions
- **Game results page**: winner announcement, battle statistics, per-unit status, key moments, replay link
- **Hex map data-testid selectors**: add `data-testid="hex-{q}-{r}"` to hex elements for Playwright agent addressability
- **Playwright autonomous agent**: agent reads game state from `window.__ZUSTAND_STORES__`, makes tactical decisions (move toward enemy, fire highest-damage weapon), executes via UI clicks
- **E2E store helper fix**: update dead `e2e/helpers/store.ts` from stale `__STORES__` to correct `__ZUSTAND_STORES__`

### Non-goals

- ❌ Multiplayer/P2P synchronization (separate OpenSpec change exists)
- ❌ New combat mechanics (physical attacks, LOS blocking, heat shutdown, ammo explosion) — use engine as-is
- ❌ Unit customizer modifications — read-only access to existing canonical + custom units
- ❌ Campaign finances, repair/refit, morale, faction standing — MVP campaign only (roster + missions + damage carry-forward)
- ❌ BotPlayer AI improvements — use existing basic move/attack AI
- ❌ Mobile/responsive design for new UI — desktop-first
- ❌ PDF record sheet export changes
- ❌ SimulationRunner refactoring — it stays as-is for fuzz testing
- ❌ Terrain combat modifiers — terrain is visual-only for this change
- ❌ Animated turn-by-turn replay in auto-resolve mode

## Capabilities

### New Capabilities

- `game-engine`: Core battle engine (`GameEngine` class) that wraps existing combat utilities, accepts real unit data via compendium adapter, and provides two execution modes: `runToCompletion()` for auto-resolve and `createInteractiveSession()` for turn-by-turn play with player input and AI opponent. Includes compendium-to-game unit adapter.
- `game-session-ui`: Interactive game session UI — hex map integration for turn-by-turn play (movement overlay, target selection, weapon firing, phase indicators, turn counter), game results page (winner, statistics, per-unit status, key moments), pre-battle mode selection (auto-resolve vs interactive), and AI-vs-AI spectator mode with playback controls.
- `agent-autonomous-play`: Playwright agent infrastructure for autonomous gameplay — agent player helper (`e2e/helpers/agent-player.ts`) that reads game state from stores, makes tactical movement/attack decisions, and executes through UI. Hex-level `data-testid` selectors. E2E store helper fix. Integration test suites for Quick Play, Encounter, Campaign, and agent autonomy flows.

### Modified Capabilities

- `quick-session`: Add real auto-resolve and interactive gameplay modes. Currently specifies demo interface with manual buttons; this change wires it to the new GameEngine for actual combat resolution and adds interactive turn-by-turn play on hex map.
- `force-management`: Add unit selection from compendium to force builder. Currently specifies pilot-mech assignment but the unit selector has an empty `availableUnits` array; this change wires it to the compendium API for the 4,200+ canonical units.
- `combat-resolution`: Add GameEngine-backed resolution that uses real unit data instead of BV-probability-based ACAR. Currently specifies probability-based auto-calculate; this change adds turn-by-turn combat resolution using real damage, to-hit, heat, and movement utilities.
- `scenario-generation`: Wire scenario generation output to encounter launch flow. Currently specifies OpFor generation but generated results aren't applied to encounters; this change connects generated scenarios to the GameEngine for actual battle execution.
- `campaign-management`: Add roster assignment and mission-to-battle loop. Currently specifies campaign creation and persistence but roster configuration is a placeholder; this change implements unit assignment, mission generation via encounter templates, and damage carry-forward between missions.
- `tactical-map-interface`: Add interactive gameplay integration and agent-addressable selectors. Currently specifies hex rendering and overlays; this change adds `data-testid` selectors per hex, wires click handlers to GameEngine interactive session for movement/targeting, and adds AI-vs-AI spectator rendering.

## Impact

### Code

- **New**: `src/engine/` directory — `GameEngine.ts`, `adapters/CompendiumAdapter.ts`, `types.ts`
- **New**: `e2e/helpers/agent-player.ts` — autonomous agent player
- **New**: `e2e/quick-play.spec.ts`, `e2e/encounter-flow.spec.ts`, `e2e/campaign-flow.spec.ts`, `e2e/agent-autonomy.spec.ts` — integration test suites
- **Modified**: `src/components/quickgame/QuickGamePlay.tsx` — demo → real auto-resolve/interactive
- **Modified**: `src/pages/gameplay/games/[id].tsx` — demo → real game session with hex map integration
- **Modified**: `src/pages/gameplay/encounters/[id].tsx` — fix launch navigation
- **Modified**: `src/pages/gameplay/forces/[id].tsx` — wire unit selector to compendium API
- **Modified**: `src/components/gameplay/HexMapDisplay.tsx` — add hex-level data-testid selectors
- **Modified**: `src/stores/useQuickGameStore.ts` — bridge to GameEngine and useGameplayStore
- **Modified**: Campaign creation wizard and dashboard — roster assignment, mission generation, damage carry-forward
- **Modified**: `e2e/helpers/store.ts` — fix stale `__STORES__` → `__ZUSTAND_STORES__`

### Stores

- `useQuickGameStore` — new: bridge `startGame()` to create real GameSession via GameEngine
- `useGameplayStore` — new: accept game sessions from Quick Play and Encounter flows
- `useCampaignStore` (personnel, forces, missions sub-stores) — new: roster assignment, mission-battle loop, damage state persistence

### APIs

- No new API endpoints required (existing `/api/units`, `/api/encounters/[id]/launch`, `/api/forces` are sufficient)
- Potential: `/api/units` endpoint may need to be created or located if it doesn't exist at the expected path

### Dependencies

- No new npm dependencies required
- Uses existing: Zustand stores, combat utilities, BotPlayer AI, GameSession event system, GameOutcomeCalculator, DamageCalculator, KeyMomentDetector, replay hooks

### Systems Explicitly NOT Affected

- `SimulationRunner` and all fuzz-testing infrastructure — untouched
- Unit customizer/builder — read-only access, no modifications
- Multiplayer/P2P sync — not touched
- PDF record sheet export — not touched
- Mobile/responsive layouts — not touched
