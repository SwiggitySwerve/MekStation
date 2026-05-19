# Design: Add Campaign Refit and Prestige

## Context

After CP0–CP2b, the campaign can be persisted, runs the combat loop, and exposes
bay and command UIs. Two business systems are still missing. **Refit**: the
construction tooling (`construction-services`, `construction-rules-core`) can
build and validate units, but there is no path to apply a construction change to
an *owned campaign unit* as a cost-and-time-bearing operation — the player
cannot swap a weapon or upgrade a variant in-campaign. **Prestige and morale**:
the campaign tracks faction standing and contract reputation but has no per-unit
cohesion score and no company-morale model.

Faction standing, markets, and negotiation are built and out of scope. This
change adds exactly the refit pipeline and the prestige + morale state machine.
The refit pipeline is modelled on the existing repair-ticket pipeline (hour
budget consumed per day); the morale model is a small explicit state machine.

## Goals / Non-Goals

**Goals:**

- Let the player refit an owned campaign unit — equipment swap, variant upgrade,
  chassis conversion — as a cost-and-hours operation.
- Validate every refit target against the existing construction rules.
- Track a per-unit prestige score and a company-morale state machine.
- Surface morale and prestige in a dedicated UI.

**Non-Goals:**

- Faction standing / markets / negotiation (built, out of scope).
- A new construction engine; a loadout library; per-pilot loyalty;
  prestige-gated unlocks.

## Decisions

### D1. New capability `campaign-refit-and-prestige`

Refit and prestige/morale are two new business systems with no clean home in an
existing campaign capability. Grouping them in one capability keeps Wave 4 at
the five changes the council decomposition specified.

### D2. `IRefitOrder` and refit classes

A refit is described by an order:

```typescript
enum RefitClass {
  EquipmentSwap = 'equipment-swap',   // swap items, same chassis/variant
  VariantUpgrade = 'variant-upgrade', // change to a known variant of the chassis
  ChassisConversion = 'chassis-conversion', // structural change (engine, structure)
}

interface IRefitOrder {
  readonly id: string;
  readonly unitId: string;                 // owned campaign unit
  readonly targetConfiguration: unknown;   // the full target unit configuration
  readonly refitClass: RefitClass;
  readonly estimatedCost: number;          // C-bills
  readonly estimatedHours: number;         // tech-hours
  readonly hoursCompleted: number;
  readonly status: 'proposed' | 'in-progress' | 'completed' | 'cancelled';
  readonly createdAt: string;              // ISO 8601
}
```

`refitClass` is assigned by `classifyRefit(currentConfig, targetConfig)` — it
inspects the diff between the unit's current configuration and the target and
returns the least-disruptive class that covers the change.

### D3. Refit cost and hours mirror the repair model

`estimateRefit(order)` computes cost and hours from the configuration diff and a
per-`RefitClass` multiplier, mirroring `repairQueueBuilder`'s hour-table
approach. An equipment swap is cheap and fast; a chassis conversion is expensive
and slow. The estimate is fixed when the order is committed.

### D4. Refit is validated against existing construction rules

Before an `IRefitOrder` moves from `proposed` to `in-progress`, its
`targetConfiguration` MUST pass the existing `construction-rules-core`
validation — an invalid target unit cannot be refit toward. Refit does not
reimplement construction; it gates on it.

### D5. Refit day processor consumes hours per day

`refitProcessor` (a day processor in the `UNITS` phase block) advances each
`in-progress` refit by the day's available tech-hours, mirroring how repair
tickets are worked. When `hoursCompleted >= estimatedHours` the refit completes:
the unit's campaign configuration is replaced with `targetConfiguration` and a
day event is emitted. A campaign with no active refits is a no-op.

### D6. Refit launches from the mech bay

The mech bay (CP2a) gains a per-unit "Refit" affordance. Selecting it opens a
refit launch flow: choose a target configuration, see the classified refit class
with estimated cost and hours, and commit — which creates a `proposed`
`IRefitOrder` and, on construction-validation pass, moves it to `in-progress`.

### D7. Unit prestige score

`IUnitPrestige` is a per-unit `{ unitId, score, history }` record. `score` is a
bounded integer adjusted by `adjustPrestige(unit, signal)` — victories and
notable performance raise it, heavy damage and crew loss lower it. A
prestige-update step runs when a battle outcome is applied (post-battle), so
prestige tracks combat results deterministically.

### D8. Company morale state machine

Morale is an explicit state machine:

```typescript
enum MoraleState {
  Mutinous = 'mutinous',
  Unhappy = 'unhappy',
  Steady = 'steady',
  High = 'high',
  Elite = 'elite',
}
```

States are linearly ordered. `evaluateMoraleTransition(campaign, signals)`
inspects morale-affecting signals — recent victories/defeats, whether pay was
met, desertions from `personnel-progression` — and returns at most **one** step
transition per day (up, down, or none). One step per day keeps morale from
swinging wildly and makes the model legible.

### D9. Morale day processor

`moraleProcessor` (an `EVENTS`-phase day processor) gathers the day's signals,
calls `evaluateMoraleTransition`, applies the at-most-one transition, and emits
a day event when morale changes. Morale state persists on the campaign.

### D10. Prestige & Morale UI surface

A `Prestige & Morale` page (under the campaign navigation, near the bays) shows
the current `MoraleState`, recent morale transitions, and the per-unit prestige
scores. Read-only — morale and prestige change through processors, not the UI.

## Risks / Trade-offs

- **[Risk] Refit silently expands into construction-engine work** → Mitigation:
  D4 — refit *gates on* the existing construction validation and never
  reimplements it; the `targetConfiguration` is produced by existing
  construction tooling.
- **[Risk] A refit target configuration is invalid** → Mitigation: the
  `proposed → in-progress` transition is blocked unless construction validation
  passes; an invalid order stays `proposed` and surfaces the validation errors.
- **[Risk] Morale oscillates day to day** → Mitigation: D8 — at most one step
  transition per day; a single bad day cannot crater morale.
- **[Risk] Prestige and morale signal sources are ambiguous** → Mitigation:
  prestige updates only on battle-outcome application (D7); morale consumes a
  fixed, enumerated signal set (D8). Both are deterministic functions of named
  inputs.
- **[Risk] Refit hours compete with repair hours for the same tech pool** →
  Mitigation: this change scopes the refit processor to consume from the same
  daily tech-hour budget as repairs; the budget-sharing policy (which gets hours
  first) is an open question, defaulting to repairs-before-refits.

## Migration Plan

Purely additive. The refit pipeline, prestige scorer, and morale state machine
are new modules; the refit and morale processors are new day processors. New
campaign fields (`refitOrders`, `unitPrestige`, `moraleState`) are optional,
absent on existing campaigns and defaulting (`[]`, `[]`, `MoraleState.Steady`).
No destructive migration. Rollback = revert the change-set; the campaign loop
keeps running without refit or morale.

## Open Questions

- Tech-hour budget sharing between repairs and refits — proposed: repairs
  consume the daily tech-hour budget first, refits consume the remainder;
  revisit if refits starve.
- Default starting morale for a new campaign — proposed: `MoraleState.Steady`.
- Prestige score bounds and the exact per-signal deltas — proposed: a bounded
  0–100 integer with small per-signal deltas; tune during implementation.
- Whether a chassis conversion should require the unit to be combat-ready —
  proposed: no hard gate, but a destroyed unit cannot be refit; confirm against
  the salvage write-off semantics during implementation.
