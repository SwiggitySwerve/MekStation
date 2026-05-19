# Design: Add AI Resource Planning

## Context

A1 made the bot move intelligently over terrain. A2 makes it *spend* intelligently. Today the bot's resource model is one turn deep: `AttackAI.applyHeatBudget` trims the fire list so projected heat fits `safeHeatThreshold` for the current turn and stops there. It cannot see that two more turns of the same fire list shut the unit down. Ammo is a binary gate — a weapon with `ammo[weaponId] <= 0` is culled, but a weapon with two shots left is treated exactly like one with forty. `scoreTarget` rewards threat and kill-probability but is indifferent to *where* damage lands; it never notices that a target with a stripped side torso is one good roll from a crit kill. Multi-mode weapons always fire their default mode.

A2 is the second half of the `Veteran` tier. It registers a resource parameter block into the AI Difficulty Tier Registry from A1 — additively, never modifying A1's requirement. `Green`/`Regular` leave the block inert; `Veteran`/`Elite` switch it on.

## Goals / Non-Goals

**Goals:**

- Project the heat curve across a multi-turn lookahead window so the bot throttles fire *before* a shutdown.
- Estimate per-weapon ammo runway and ration scarce ammo through a conservation weight.
- Add a crit-seeking term to target scoring that rewards reachable crippling hits.
- Select the best mode for multi-mode weapons (LB-X cluster/slug, Ultra/Rotary rate-of-fire).
- Register the A2 parameter block into the Tier Registry without touching A1's block.

**Non-Goals:**

- Lance-level ammo sharing / fire allocation (A3a), objective-driven fire discipline (A3b), ECM effects (A4 / out of scope).
- New weapon-mode mechanics — A2 only chooses among modes the engine already resolves.

## Decisions

### D1. `AIHeatPlanner` — multi-turn heat projection

A new pure module projects the unit's heat over a lookahead window of `heatLookaheadTurns` (a tier parameter). The projection assumes the candidate fire list repeats each turn, applies the unit's dissipation, and reports the turn (if any) at which projected heat crosses the shutdown-risk ceiling. `AttackAI` consults the planner: if a shutdown is predicted inside the window, the effective heat budget is lowered so the curve flattens. The single-turn `applyHeatBudget` stays as the inner trim; the planner wraps it with a forward-looking ceiling.

```typescript
interface IHeatProjection {
  /** Projected heat at the end of each turn in the window. */
  readonly perTurnHeat: readonly number[];
  /** First turn index at which a shutdown risk is predicted, or -1. */
  readonly shutdownRiskTurn: number;
}

function projectHeat(
  currentHeat: number,
  dissipation: number,
  perTurnHeatGenerated: number,
  lookaheadTurns: number,
): IHeatProjection;
```

### D2. `AIAmmoRunway` — turns-of-fire projection

A pure module estimates, per ammo-dependent weapon, how many turns of fire the remaining ammo supports at the bot's expected per-turn fire rate. The result feeds a **conservation weight**: when runway is short, the weapon's effective selection priority drops so the bot saves it for a higher-value shot. When runway is long, the weight is neutral. Energy weapons (no ammo) are unaffected. The binary "0 ammo = culled" rule is unchanged — runway only modulates *priority*, never eligibility.

```typescript
interface IAmmoRunway {
  readonly weaponId: string;
  /** Estimated turns of fire remaining, or Infinity for energy weapons. */
  readonly turnsRemaining: number;
  /** Conservation multiplier in [0,1] applied to selection priority. */
  readonly conservationWeight: number;
}
```

### D3. Crit-seeking term in `scoreTarget`

`scoreTarget` gains an additive crit-seeking term, multiplied by the tier `critSeekingWeight`. The term raises a target's score in proportion to how *exposed* its structure is — armor stripped from a location, prior internal damage, an already-open side torso. This is computed from target structure-state fields surfaced on `IAIUnitState` (armor and internal-structure remaining per location). A fresh, fully-armored target gets zero crit-seeking bonus; a target with an open side torso gets a large one. The existing threat and kill-probability terms are unchanged — crit-seeking is additive.

### D4. `AIWeaponModeSelector` — multi-mode weapon mode choice

For weapons exposing multiple firing modes, a pure selector picks the mode that maximizes *expected damage* given range, the target's armor state, and the remaining heat budget:

- **LB-X** — cluster mode against an armor-stripped or fast/evading target (cluster hits spread and crit-seek); slug mode against a fresh, armored target at short range.
- **Ultra / Rotary** — the higher rate of fire when the heat budget and ammo runway both allow; the lower rate when heat or ammo is constrained.

`IWeapon` gains optional mode metadata; weapons without it are single-mode and pass through unchanged (legacy fixtures keep working). The selected mode is recorded on the declared attack so the combat engine resolves the chosen mode.

### D5. A2 registers a resource block into the Tier Registry

`AITierRegistry` gains a `resource` block on `IAITierParameters`:

```typescript
interface IAITierResourceParameters {
  readonly heatLookaheadTurns: number;     // 0 disables multi-turn projection
  readonly ammoConservationWeight: number; // 0 disables runway weighting
  readonly critSeekingWeight: number;      // 0 disables crit-seeking
  readonly weaponModeSelection: boolean;   // false = always default mode
}
```

`Green`/`Regular` set `heatLookaheadTurns: 0`, zeroed weights, and `weaponModeSelection: false` — fully inert, legacy behavior preserved. `Veteran`/`Elite` populate the block. This is an ADDED requirement; A1's movement requirement is untouched.

### D6. Determinism

Heat projection, ammo runway, crit-seeking scoring, and mode selection are all pure functions of unit/weapon/target state. No `SeededRandom` is consumed inside them; existing tie-breaking in `selectTarget` / `selectWeapons` / `selectMove` is unchanged, so SimulationRunner seed sequences stay stable.

## Risks / Trade-offs

- **[Risk] Multi-turn projection assumes a static fire list and overshoots** → Mitigation: the projection is a conservative ceiling, not a commitment; the per-turn `applyHeatBudget` still runs and re-trims each turn from live state.
- **[Risk] Crit-seeking makes the bot tunnel-vision a near-dead target and ignore a bigger threat** → Mitigation: crit-seeking is an *additive* term bounded by `critSeekingWeight`; the threat and kill-probability terms still dominate when a fresh heavy is the bigger danger.
- **[Risk] Mode metadata absent on legacy `IWeapon` fixtures** → Mitigation: mode metadata is optional; a weapon without it is treated single-mode and the selector returns its default — byte-identical to today.
- **[Risk] Registering a new tier block breaks the all-ADDED rule** → Mitigation: `resource` is a new optional field; this change ADDs a separate requirement and never modifies A1's.

## Migration Plan

Purely additive. `Green`/`Regular` tiers leave every A2 parameter inert, so existing bots, the swarm harness, and SimulationRunner golden traces are unaffected until a caller selects `Veteran`/`Elite`. Optional mode metadata on `IWeapon` means existing weapon fixtures need no change. No database migrations — resource parameters live in the tier registry. Rollback = revert the change-set; the new planner/runway/selector modules become dead code with no behavior change.

## Open Questions

- Default `heatLookaheadTurns` for `Veteran` — proposed `3`; long enough to catch a building curve, short enough to stay relevant. Revisit after swarm-harness tuning.
- Whether crit-seeking should also influence *hit-location targeting* (called shots) or only target *selection* — proposed: target selection only for A2; called-shot location bias is a candidate follow-on.
