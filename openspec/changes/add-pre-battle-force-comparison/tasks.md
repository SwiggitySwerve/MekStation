# Tasks: Add Pre-Battle Force Comparison

## 1. Force Summary Shape

- [ ] 1.1 Define `IForceSummary` with `{side, totalBV, totalTonnage,
    heatDissipation, avgGunnery, avgPiloting,
    weaponDamagePerTurnPotential, spaSummary:
    Array<{spaId, name, unitIds: string[]}>}`
- [ ] 1.2 Define `IForceComparison` with `{player: IForceSummary,
    opponent: IForceSummary, deltas: Record<string, {value: number,
    severity: 'low'|'moderate'|'high'}>, bvRatio: number}`

## 2. Force Summary Derivation

- [ ] 2.1 Create `deriveForceSummary(side, force): IForceSummary`
- [ ] 2.2 `totalBV`: sum of `unit.battleValue` for every unit in the
      force
- [ ] 2.3 `totalTonnage`: sum of `unit.tonnage`
- [ ] 2.4 `heatDissipation`: sum of per-unit dissipation (heat sinks
      × 2 for doubles, × 1 for singles, + engine-integrated)
- [ ] 2.5 `avgGunnery`: arithmetic mean of assigned pilots' gunnery
- [ ] 2.6 `avgPiloting`: arithmetic mean of assigned pilots' piloting
- [ ] 2.7 `weaponDamagePerTurnPotential`: sum of every weapon's max
      damage per turn if fired at medium range (uses existing weapon
      catalog damage values, no hit-probability factor — this is
      potential, not expected)
- [ ] 2.8 `spaSummary`: flat list of `{spaId, name, unitIds: string[]}`
      (one entry per unique active SPA across all pilots; `unitIds`
      lists the units whose pilots hold that SPA)

## 3. Force Comparison

- [ ] 3.1 Create `compareForces(player, opponent): IForceComparison`
- [ ] 3.2 Compute deltas for: BV (player − opponent), tonnage,
      heat dissipation, avg gunnery (inverted — lower gunnery is
      better), avg piloting (inverted), DPT potential
- [ ] 3.3 `bvRatio` = `max(player.totalBV, opponent.totalBV) /
    min(player.totalBV, opponent.totalBV)`
- [ ] 3.4 Severity thresholds: - BV: `bvRatio > 1.25` → high, `1.10–1.25` → moderate,
      otherwise low - Tonnage: `|delta| / max_tonnage > 0.20` → high, `> 0.10` →
      moderate, otherwise low - Pilot skill: `|avgGunnery delta| >= 1.0` OR `|avgPiloting
      delta| >= 1.0` → high, `>= 0.5` → moderate, otherwise low - DPT: `|delta| / max_dpt > 0.25` → high, `> 0.15` → moderate,
      otherwise low - Heat dissipation: `|delta| / max_heat > 0.30` → high, `> 0.15`
      → moderate, otherwise low

## 4. Comparison Panel Component

- [ ] 4.1 Create `ForceComparisonPanel` that takes `{comparison:
    IForceComparison}`
- [ ] 4.2 Two-column layout: Player (left) / Opponent (right) with
      the delta badge in the gap between columns
- [ ] 4.3 Rows: Total BV, Total Tonnage, Heat Dissipation, Avg
      Gunnery, Avg Piloting, Weapon DPT Potential
- [ ] 4.4 Each row shows both side values and a signed delta with
      severity color (low = neutral gray, moderate = amber, high =
      red)
- [ ] 4.5 SPA Summary sub-section: shows each side's active SPAs as a
      list with count chips (e.g., "Sniper × 2", "Marksman × 1")

## 5. Delta Badge Styling

- [ ] 5.1 Delta value rendered with a signed prefix: `"+325 BV"` or
      `"−4.2 tons"`
- [ ] 5.2 "Player advantage" deltas use green accent, "Opponent
      advantage" deltas use red accent; low-severity deltas use a
      neutral accent regardless of sign
- [ ] 5.3 `aria-label` on the badge explains the delta:
      `"Player BV 5325, Opponent BV 5000, player advantage 325"`

## 6. SPA Summary Sub-Section

- [ ] 6.1 Show top-level counts per SPA ID (e.g., `"Sniper × 2"`) per
      side
- [ ] 6.2 Hover / tap reveals which unit designations hold that SPA
- [ ] 6.3 When a side has zero SPAs, show `"No active SPAs"`

## 7. Pre-Battle Page Integration

- [ ] 7.1 Mount `ForceComparisonPanel` in the pre-battle page sidebar
- [ ] 7.2 Panel is collapsible; defaults to expanded when both sides
      have units assigned
- [ ] 7.3 Panel subscribes to `onForcesChange` from
      `game-session-management` so edits to either force (adding a
      mech, swapping a pilot) re-derive the summary
- [ ] 7.4 When a side has no units yet, show
      `"Configure both sides to see comparison"`

## 8. Decision Hints

- [ ] 8.1 Above the comparison table, show a one-line hint derived
      from the highest-severity delta: e.g., `"Opponent has a 28% BV
    advantage"` or `"Forces look evenly matched"`
- [ ] 8.2 If any delta is `high` severity, the panel header shows a
      warning icon
- [ ] 8.3 Hint text SHALL be neutral and descriptive — SHALL NOT
      recommend swaps (that's a future scope)

## 9. Empty / Partial State

- [ ] 9.1 When only one side is configured, show per-side summary
      but suppress the delta columns
- [ ] 9.2 When no forces are configured, show `"Configure forces to
    begin"` placeholder
- [ ] 9.3 When a side is configured with invalid unit IDs, surface
      `"Force contains unknown units"` and fall back to a best-effort
      partial summary (skip invalid units)

## 10. Tests

- [ ] 10.1 Unit test: `deriveForceSummary` with a known 2-mech force
      produces the expected totals
- [ ] 10.2 Unit test: `compareForces` returns correct deltas and
      severity tiers for a 25% BV advantage case
- [ ] 10.3 Unit test: SPA summary aggregation groups duplicate SPAs
      across pilots
- [ ] 10.4 Component test: panel renders all rows for a sample
      comparison
- [ ] 10.5 Component test: Panel updates when `onForcesChange` fires
- [ ] 10.6 Component test: Collapsed state hides the comparison table

## 11. Accessibility

- [ ] 11.1 Delta badges use both color and signed text so color-blind
      users can read severity
- [ ] 11.2 Comparison table uses `<table>` semantics with proper
      `<th>` headers and `<caption>`
- [ ] 11.3 SPA chips are keyboard-focusable with accessible tooltips

## 12. Spec Compliance

- [ ] 12.1 Every delta requirement across `after-combat-report` and
      `game-session-management` has at least one GIVEN/WHEN/THEN
      scenario
- [ ] 12.2 `openspec validate add-pre-battle-force-comparison --strict`
      passes clean
