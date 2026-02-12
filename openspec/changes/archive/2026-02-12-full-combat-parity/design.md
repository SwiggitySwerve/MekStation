## Context

MekStation uses an event-sourced architecture for game state. `IGameSession` stores an append-only `events[]` array; the current `IGameState` is derived by replaying all events through `applyEvent()` reducers in `gameState.ts`. Combat functions in `gameSession.ts` are pure — they take an `IGameSession`, produce new events, and return a new session with those events appended. The `GameEngine.ts` orchestrator wraps these pure functions with AI logic and phase sequencing.

The existing architecture has strong foundations:

- **Phase enum** already includes `PhysicalAttack` (unused)
- **Event types** already include `CriticalHit`, `AmmoExplosion`, `PilotHit`, `UnitDestroyed` (unused)
- **`IUnitGameState`** already tracks `armor`, `structure`, `destroyedLocations`, `destroyedEquipment`, `ammo`, `pilotWounds`, `pilotConscious`
- **`damage.ts`** has a complete immutable damage pipeline (`resolveDamage()` → `ILocationDamageResult`) that is never called from the game engine
- **`hitLocation.ts`** has correct 2d6 tables for all four arcs plus punch/kick

The core problem is that the game engine bypasses all of this: `resolveAttack()` in `gameSession.ts` hardcodes `damage = 5`, always uses `FiringArc.Front`, and emits `DamageApplied` events with zeroed armor/structure fields. The `applyDamageApplied()` reducer in `gameState.ts` simply subtracts a flat damage value from a unit's first armor location.

Two execution paths exist:

1. **Interactive** — `GameEngine.InteractiveSession` wraps `gameSession.ts` pure functions for player + AI turns
2. **Simulation** — `SimulationRunner` runs autonomous battles with its own `applySimpleDamage()` bypass

Both must be updated to use the real combat pipeline.

## Goals / Non-Goals

**Goals:**

- Achieve TechManual-compliant combat resolution for BattleMech vs BattleMech engagements
- Preserve the event-sourced, pure-function, immutable-state architecture
- All new combat systems follow the existing pattern: pure function → event → reducer → state
- Both execution paths (interactive + simulation) use the same combat pipeline
- Deterministic combat: all randomness flows through injectable `DiceRoller` / `SeededRandom`
- Incremental delivery: each phase is independently testable and shippable

**Non-Goals:**

- Vehicle combat (different hit tables, motive damage)
- Infantry/Battle Armor combat
- Aerospace combat
- ProtoMech combat
- Double-blind / fog-of-war
- Artillery / off-board attacks
- Building/bridge destruction rules
- Advanced movement (MASC, supercharger usage — only PSR triggers if equipped)
- Campaign-level SPA acquisition/XP (only combat effects of existing SPAs)
- UI changes (this is engine-only; UI will adapt to richer event streams)

## Decisions

### D1: Single Combat Pipeline, Two Consumers

**Decision**: Create a unified `CombatResolver` module that both `GameEngine.InteractiveSession` and `SimulationRunner` call. No separate damage paths.

**Rationale**: The current dual-path architecture (interactive uses `gameSession.ts`, simulation uses `applySimpleDamage()`) is the root cause of divergence. A single pipeline ensures both paths produce identical results.

**Alternative considered**: Keep separate paths and sync them. Rejected — maintaining two implementations doubles the bug surface and violates DRY.

**Shape**:

```typescript
// Single entry point for all weapon attack resolution
function resolveWeaponAttack(
  session: IGameSession,
  attackEvent: IGameEvent,
  diceRoller: DiceRoller,
): IGameSession;

// Single entry point for physical attack resolution
function resolvePhysicalAttack(
  session: IGameSession,
  attackEvent: IGameEvent,
  diceRoller: DiceRoller,
): IGameSession;
```

Both return an `IGameSession` with all resulting events appended (attack resolved, damage applied, critical hits, ammo explosions, PSR triggers, pilot hits, unit destroyed — all as events).

### D2: Event Granularity — Fine-Grained Events

**Decision**: Each combat effect produces its own event. A single weapon hit may generate 5+ events:

1. `AttackResolved` (hit/miss)
2. `DamageApplied` (armor/structure at location)
3. `CriticalHitRolled` (slot selection, component hit)
4. `AmmoExplosion` (if ammo crit)
5. `PilotHit` (head hit or accumulated damage)
6. `UnitDestroyed` (if CT destroyed)

**Rationale**: Fine-grained events preserve the replay/audit trail, enable rich UI animations, and allow the `applyEvent()` reducer to remain simple (one state change per event). This matches the existing pattern where `AttackResolved` and `DamageApplied` are already separate events.

**Alternative considered**: Coarse events (single `CombatResolved` containing all effects). Rejected — would require complex reducer logic, lose replay granularity, and break the existing UI event consumption pattern.

### D3: Extend IUnitGameState, Don't Replace

**Decision**: Add new fields to `IUnitGameState` alongside existing ones:

```typescript
interface IUnitGameState {
  // ... existing fields (armor, structure, heat, etc.)

  // New fields for combat parity
  readonly componentDamage: IComponentDamageState; // engine hits, gyro hits, sensor hits, etc.
  readonly prone: boolean;
  readonly shutdown: boolean;
  readonly ammoState: Record<string, IAmmoSlotState>; // ammo bin tracking
  readonly pendingPSRs: readonly IPendingPSR[]; // queued piloting checks
  readonly damageThisPhase: number; // for 20+ damage PSR
  readonly weaponsFiredThisTurn: readonly string[]; // for physical attack restrictions
}
```

**Rationale**: Backward-compatible. Existing reducers continue to work. New reducers handle new event types. Default values (`prone: false`, `shutdown: false`, empty component damage) mean existing game saves/replays still load.

**Alternative considered**: New `IUnitCombatState` wrapper. Rejected — splits state into two objects, complicating every function that needs both movement and combat state.

### D4: Component Damage as Typed State, Not Strings

**Decision**: Track component damage with a structured type, not the current approach of `destroyedEquipment: string[]`:

```typescript
interface IComponentDamageState {
  readonly engineHits: number; // 0-3 (3 = destroyed)
  readonly gyroHits: number; // 0-2 (2 = destroyed for standard)
  readonly sensorHits: number; // 0-2
  readonly lifeSupport: number; // 0-2
  readonly cockpitHit: boolean;
  readonly actuators: Record<ActuatorType, boolean>; // destroyed per actuator
  readonly weaponsDestroyed: readonly string[]; // weapon IDs
  readonly heatSinksDestroyed: number;
  readonly jumpJetsDestroyed: number;
}
```

**Rationale**: Typed state enables efficient lookups (e.g., `state.componentDamage.engineHits` instead of filtering `destroyedEquipment.filter(e => e.startsWith('engine'))`). Each field directly maps to combat mechanics (to-hit modifiers, PSR triggers, heat effects).

**Alternative considered**: Continue using `destroyedEquipment: string[]`. Rejected — requires parsing strings to determine combat effects, error-prone, poor TypeScript narrowing.

### D5: New Event Types for New Combat Effects

**Decision**: Add new `GameEventType` values for combat events not yet covered:

```typescript
enum GameEventType {
  // ... existing ...

  // New combat events
  CriticalHitResolved = 'critical_hit_resolved', // slot selected, effect determined
  PSRTriggered = 'psr_triggered',
  PSRResolved = 'psr_resolved',
  UnitFell = 'unit_fell',
  PhysicalAttackDeclared = 'physical_attack_declared',
  PhysicalAttackResolved = 'physical_attack_resolved',
  ShutdownCheck = 'shutdown_check',
  StartupAttempt = 'startup_attempt',
  AmmoConsumed = 'ammo_consumed',
}
```

**Rationale**: Follows the existing pattern — every state change is an event. Enables replay, undo, and UI animation for each distinct game effect.

### D6: Pure Functions with Injectable Randomness

**Decision**: All new combat modules follow the existing `DiceRoller` injection pattern from `resolveAttack()`:

```typescript
type DiceRoller = () => {
  dice: readonly number[];
  total: number;
  isSnakeEyes: boolean;
  isBoxcars: boolean;
};

function resolveWeaponAttack(
  session: IGameSession,
  event: IGameEvent,
  diceRoller: DiceRoller,
): IGameSession;
function resolveCriticalHit(
  state: IUnitGameState,
  location: CombatLocation,
  numCrits: number,
  diceRoller: DiceRoller,
): ICriticalHitResult;
function resolvePSR(
  pilotingSkill: number,
  modifiers: number,
  diceRoller: DiceRoller,
): IPSRResult;
```

**Rationale**: Deterministic testing (mock dice), simulation reproducibility (seeded random), and replay accuracy.

**Note**: `hitLocation.ts` currently uses `Math.random()` instead of injectable dice. This must be fixed as part of Phase 1 to ensure determinism.

### D7: Heat System — Single Source of Truth

**Decision**: `constants/heat.ts` becomes the single canonical heat effects table. Delete the duplicate in `toHit.ts` (wrong values) and `HeatManagement.ts` (validation-time only, also wrong). The canonical thresholds are:

| Heat | To-Hit | MP Reduction | Shutdown TN | Ammo TN |
| ---- | ------ | ------------ | ----------- | ------- |
| 8+   | +1     | —            | —           | —       |
| 13+  | +2     | —            | —           | —       |
| 14+  | —      | —            | 4           | —       |
| 17+  | +3     | —            | —           | —       |
| 19+  | —      | —            | —           | 4       |
| 24+  | +4     | —            | —           | —       |
| 30+  | —      | —            | auto        | auto    |

Movement penalty: `floor(heat / 5)` MP reduction.

Shutdown TN formula: `4 + floor((heat - 14) / 4) * 2` for heat ≥ 14.

**Rationale**: MegaMek's `Entity.java` and `HeatResolver.java` are the canonical implementation. The three MekStation systems all have different wrong values. A single source prevents future drift.

### D8: Phase Ordering — Physical Attacks After Weapons

**Decision**: `GamePhase.PhysicalAttack` (already in the enum) is activated between `WeaponAttack` and `Heat`:

Initiative → Movement → WeaponAttack → **PhysicalAttack** → Heat → End

**Rationale**: Standard BattleTech Total Warfare turn sequence. `advancePhase()` in `gameSession.ts` already handles phase transitions — adding PhysicalAttack to the sequence is a one-line change.

### D9: Phased Delivery Order

**Decision**: Implementation phases are ordered by dependency chain, not feature importance:

1. **Phase 0**: Bug fixes (no architecture changes, immediate value)
2. **Phase 1**: Wire real weapon data (unblocks all subsequent phases)
3. **Phase 2**: Wire damage pipeline (unblocks criticals)
4. **Phase 3**: Critical hit resolution (unblocks ammo explosions, component damage)
5. **Phase 4**: Ammo system (depends on criticals)
6. **Phase 5**: Heat system overhaul (depends on real weapon heat from Phase 1)
7. **Phase 6**: PSR & falls (depends on criticals for triggers, independent of ammo)
8. **Phase 7**: Physical attacks (depends on PSR for kick/charge triggers)
9. **Phase 8**: To-hit modifier completion (can be parallelized with 6-7)
10. **Phase 9**: SPAs & quirks (can be parallelized with 6-8)
11. **Phase 10**: Special weapon mechanics (can be parallelized with 6-9)

Phases 6-10 have minimal interdependencies and can be developed in parallel by different agents/developers.

### D10: Retain Existing Interfaces, Extend via Optional Fields

**Decision**: `IAttackerState`, `ITargetState`, and other existing interfaces are extended with optional fields rather than redesigned:

```typescript
interface IAttackerState {
  // Existing required fields (unchanged)
  readonly gunnery: number;
  readonly movementType: MovementType;
  readonly heat: number;
  readonly damageModifiers: readonly IToHitModifierDetail[];

  // New optional fields
  readonly pilotWounds?: number;
  readonly abilities?: readonly string[];
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Record<string, readonly string[]>;
  readonly sensorHits?: number;
  readonly actuatorDamage?: Partial<Record<ActuatorType, boolean>>;
  readonly targetingComputer?: boolean;
  readonly prone?: boolean;
  readonly secondaryTarget?: boolean;
  readonly secondaryTargetRearArc?: boolean;
}
```

**Rationale**: Backward-compatible. Existing calls to `calculateToHit()` continue to work without modification. New modifiers only apply when their optional fields are provided. No breaking changes to existing tests.

## Risks / Trade-offs

### R1: Event Volume

**Risk**: Fine-grained events significantly increase the `events[]` array size per game. A single weapon attack that crits could generate 6+ events. A full turn with 8 units could produce 100+ events.

**Mitigation**: Events are lightweight (small payloads). The existing `deriveState()` replays all events from scratch — this is already O(n) in total events. For performance: implement incremental state derivation (apply only new events to cached state) as a future optimization if needed. Current game lengths (10-20 turns) won't hit performance issues.

### R2: Backward Compatibility of Game Saves

**Risk**: Existing saved games / replays won't have new event types or state fields.

**Mitigation**: All new `IUnitGameState` fields are optional with defaults (`prone: false`, `shutdown: false`, `componentDamage: empty`). The `applyEvent()` reducer's `default` case already returns state unchanged for unknown event types. Old replays will play back identically — they simply won't produce new combat effects.

### R3: Simulation Runner Divergence

**Risk**: `SimulationRunner` has its own state management (`ISimulationState`) separate from `IGameSession`. Unifying them risks breaking the simulation.

**Mitigation**: Phase 2 creates an adapter layer: `SimulationRunner` continues to use `ISimulationState` internally but delegates damage resolution to the shared `CombatResolver` which operates on `IGameSession` state. The adapter maps between the two state shapes. Long-term, `SimulationRunner` should migrate to `IGameSession` entirely, but that's a separate change.

### R4: Scope Creep from MegaMek Edge Cases

**Risk**: MegaMek has hundreds of edge cases (superheavy gyros, torso-mounted cockpits, compact engines, etc.). Attempting 100% MegaMek parity in one change could stall indefinitely.

**Mitigation**: This change targets **standard Total Warfare BattleMech combat**. Exotic equipment variants (heavy-duty gyro, small cockpit, compact engine, etc.) are handled with sensible defaults (treat like standard) and flagged as future enhancements. The architecture supports adding them later via the component damage system.

### R5: Three Heat Systems During Migration

**Risk**: During implementation, there will be a period where the old and new heat systems coexist, potentially causing inconsistencies.

**Mitigation**: Phase 0 immediately deletes the wrong `toHit.ts` heat table and redirects to the corrected `constants/heat.ts`. This is a surgical fix — one constant table replacement. Phases 1 and 5 then wire the correct values into the game engine.

## Open Questions

1. **Cluster hit table authority**: `clusterWeapons.ts` and `DamageSystem.ts` have conflicting values. Need to verify against TechManual PDF for the ground truth, then delete the wrong copy. MegaMek's `Compute.java` cluster table should be the reference.

2. **SimulationRunner migration**: Should the simulation fully migrate to `IGameSession` event-sourced state in this change, or use the adapter approach? The adapter is lower risk but adds a maintenance burden.

3. **Ammo tracking granularity**: Track ammo per individual bin (MegaMek approach — each ton of ammo is a separate bin) or per weapon type (simpler, less accurate for CASE interactions)? Per-bin is needed for accurate CASE damage containment.

4. **PSR queue resolution order**: When multiple PSRs are triggered in a single phase (e.g., 20+ damage AND leg actuator destroyed), resolve them individually (each failure = fall, skip remaining) or batch them (worst modifier applies once)? MegaMek resolves individually — first failure causes fall, clearing remaining PSRs.

5. **Critical slot manifest**: MekStation currently doesn't track which equipment occupies which critical slots during gameplay. `IUnitGameState` has `destroyedEquipment: string[]` but not a slot-level manifest. Critical hit resolution needs to know which slots are occupied and by what. Should we build this from the unit's construction data at game start, or add it to `IGameUnit`?
