# Aerospace Combat (2D Simplified)

> Phase 7 — Wave 3. Design reference for the 2D aerospace combat subsystem.
> Source of truth: `openspec/changes/add-aerospace-combat-behavior/`

## Scope

MekStation operates on a single planar hex grid. Rather than reproduce Total
Warfare's full 3D Aerospace rules (altitude bands, velocity vectors, multi-hex
thrust points, deceleration), this subsystem implements a **2D simplification**
that preserves the tactical signal of aerospace combat (arc armor, structural
integrity, control rolls, heat, fuel, fly-over strafing) without the cognitive
cost of 3D tracking.

The 2D model is used by both the human player and the bot AI.

## Design Principles

1. **Side-by-side with ground combat** — aerospace resolvers live in a separate
   namespace (`src/utils/gameplay/aerospace/`) and are dispatched via a thin
   type-guard shim. Existing mech/vehicle resolvers remain untouched.
2. **Stateless, deterministic, pure** — every resolver takes a state + inputs
   and returns a new state + events. RNG is injected via `D6Roller`.
3. **Discriminated-union events** — resolvers never mutate a global bus. They
   return `readonly AerospaceEvent[]` for the combat engine to collect.
4. **Armor and SI are canonical** — no altitude, no velocity, no heading bands.
   A unit has `armorByArc`, `currentSI`, and a 60° facing.

## Module Layout

```
src/utils/gameplay/aerospace/
├── state.ts           # IAerospaceCombatState + helpers
├── events.ts          # AerospaceEvent discriminated union
├── hitLocation.ts     # FRONT / SIDE / REAR hit tables
├── damage.ts          # armor → SI → crit → destroy chain
├── controlRoll.ts     # 2d6 + pilot + dmgMod vs TN 8
├── criticalHits.ts    # TAC crit table + deterministic tiebreak
├── movement.ts        # hexLine, distance cap, edge-exit, fuel burn
├── firingArcs.ts      # classifyAerospaceArc (Nose/Wings/Aft or Sides)
├── flyOver.ts         # strafe declaration + bomb drops
├── heat.ts            # aerospace heat thresholds
├── fuel.ts            # fuel consumption
├── aiBehavior.ts      # bot heuristics (withdraw, strafe order, firing plan)
├── dispatch.ts        # polymorphic entry points for the combat engine
└── index.ts           # barrel
```

## Key Concepts

### Structural Integrity (SI)

SI is the unit's "hull" number. It is reduced when inbound damage exceeds the
struck arc's armor. SI reaches 0 → unit destroyed.

Excess damage after armor → `floor(damage / 10)` SI loss. **No arc-to-arc
transfer** — leftover damage from one arc never bleeds into another.

### Firing Arcs

- **Nose**: 60° forward cone (±30° off facing).
- **LeftWing / RightWing** (ASF/CF) or **LeftSide / RightSide** (Small Craft):
  120° each, 30°–150° off facing.
- **Aft**: 60° rear cone.
- **Fuselage**: not an armored arc; fuselage weapons fire in whichever arc the
  pilot declares.

### Hit-Location Tables

Inbound attack direction (`FRONT | SIDE_LEFT | SIDE_RIGHT | REAR`) selects a
2d6 hit table. Roll 2 or 12 = **Threshold-Armor Crit (TAC)** — trigger a crit
in addition to the damage hit.

Small Craft targets substitute Wings → Sides in all hit tables
(see `toSmallCraftArc`).

### Damage Chain

```
1. Armor absorbs damage first (clamped to 0)
2. Excess → floor(excess/10) SI loss
3. SI reaches 0 → destroy + UNIT_DESTROYED event
4. If damage > 10% of pre-hit SI → Control Roll
5. Control Roll fail → +1 SI loss + +1 thrust penalty
6. TAC or SI-exposing hit → roll a critical (see criticalHits.ts)
```

### Control Roll

```
result = 2d6 + pilotSkill + damageModifier
TN = 8
damageModifier = floor(damage / 5)
```

Passing allows the pilot to ignore control-loss penalties. Failing applies
+1 SI loss and +1 thrust penalty.

### Critical Hit Table (2d6)

| Total | Category        | Effect                                                 |
| ----- | --------------- | ------------------------------------------------------ |
| 2     | none            | —                                                      |
| 3     | crewStunned     | `crewStunned = true`                                   |
| 4–5   | cargo / fuel    | fuel: -5 fuel; cargo: cosmetic                         |
| 6–7   | avionics        | `avionicsDamaged = true` (+1 to-hit on future attacks) |
| 8–9   | engine          | +5 heat                                                |
| 10–11 | controlSurfaces | +1 thrust penalty                                      |
| 12    | catastrophic    | destroy unit                                           |

The 4–5 band is resolved by a deterministic tiebreak d6 roll (odd → fuel,
even → cargo). This keeps the resolver pure under an injected roller.

### Movement

Flying units move up to `2 × effective safeThrust` hexes per turn with at most
one 60° heading change. Fuel consumed per turn = `ceil(dist / 2)`.

Reaching an edge hex (distance ≥ boardRadius) puts the unit into `offMap`
state for `offMapReturnDelay` turns (default 2). Fuel-depleted off-map units
cannot re-enter and emit `UNIT_DESTROYED` with cause `fuel_off_board`.

### Heat

| Heat ≥ | Effect                             |
| ------ | ---------------------------------- |
| 9      | -1 thrust next turn                |
| 15     | shutdown check TN 10 + (heat - 15) |
| 25     | auto shutdown                      |

Dissipation = `heatSinks` per turn.

### Fly-Over / Strafe

During movement, the pilot may declare strafe hexes along the path. Each
strafed hex adds `+2` to-hit penalty to shots at ground targets in that hex.
Bomb bays drop one bomb per declared drop hex.

### Bot AI

`decideAerospaceBotTurn` produces:

- **shouldWithdraw** — true when SI ≤ 30% or fuel < 2 turns' worth
- **strafeOrder** — ground targets sorted by BV descending
- **firingPlan** — greedy heat-safe weapon selection
- **predictedHeat** — post-dissipation next-turn heat

## Dispatcher Contract

Callers (GameEngine, InteractiveSession) don't branch on unit type — they call
`dispatchResolveDamage` / `dispatchHitLocation` / `dispatchResolveCriticalHits`
/ `dispatchMovement` with an `onGround` fallback that routes to the existing
mech/vehicle resolvers.

```typescript
const result = dispatchResolveDamage(target, aeroParams, () =>
  existingMechResolveDamage(groundParams),
);
```

Non-aerospace targets invoke `onGround`; aerospace targets short-circuit into
the aerospace resolvers.

## Testing

Every module has a jest suite under `src/utils/gameplay/aerospace/__tests__/`.
As of this change: **159 tests across 11 suites**, all green.

Coverage highlights:

- Exhaustive FRONT / SIDE_LEFT / REAR hit-table rolls (every 2d6 outcome)
- Armor → SI → crit → destroy chain with deterministic rollers
- Control-roll pass/fail parity and damage-modifier boundary tests
- Movement distance cap, heading limit, fuel burn, edge-exit, re-entry
- Heat thresholds (9 / 15 / 25) + shutdown-check branches
- Fuel depletion event emission and idempotency
- Bot heuristics: withdraw triggers, strafe-target sort, greedy firing plan
- Dispatcher: aerospace vs ground routing + Small Craft arc override
