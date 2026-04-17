# Change: Add What-If To-Hit Preview

## Why

Phase 1's weapon-attack UI (`add-attack-phase-ui`) lets the player
preview to-hit target numbers and hit probability before committing —
but stops there. The player can't see expected damage, cluster-hit
variance, or crit probability until they actually fire. Phase 2's
decision-support promise is "see what the attack _will likely do_
before you commit". This change adds a non-committing preview that
plugs directly into the existing weapon-picker: toggle "Preview
Damage", and every selected weapon row shows expected damage (mean),
damage stddev, hit probability (already there from Phase 1), and crit
probability — all purely informational, no events appended, no state
mutated.

## What Changes

- Add `previewAttackOutcome(attack): IAttackPreview` to the to-hit
  resolution system, returning `{hitProbability, expectedDamage,
damageStddev, critProbability, clusterHitsMean, clusterHitsStddev}`
  for a prospective attack, with no dice rolls and no state mutation
- Extend the damage system with `expectedDamage(weapon, hitProbability)`
  and `damageVariance(weapon, hitProbability)` helpers that integrate
  the cluster-hit table expectation (for cluster weapons) with the
  hit probability
- Extend the weapon-resolution-system UI projection with
  `preview: IAttackPreview | null` on `IUIWeaponState`, populated when
  the Preview Damage toggle is enabled
- Add a "Preview Damage" toggle in the weapon-picker header; when ON,
  each weapon row shows preview columns (exp. damage, stddev, crit %)
  next to the existing hit-probability column
- Preview is purely read-only — no `AttackDeclared` event fires, no
  ammo decrements, and toggling the switch SHALL NOT cost the player a
  turn

## Dependencies

- **Requires**: `add-attack-phase-ui` (the weapon picker this extends),
  `to-hit-resolution` (existing `forecastToHit` + `hitProbability`),
  `damage-system` (cluster hit tables, crit probability derivation),
  `weapon-resolution-system` (existing `IUIWeaponState` projection),
  Phase 1 A4 (damage pipeline integration — otherwise expected damage
  is wrong)
- **Required By**: none (leaf informational surface)

## Impact

- Affected specs: `to-hit-resolution` (ADDED — `previewAttackOutcome`
  - `critProbability` derivation), `damage-system` (ADDED — expected
    damage + variance from cluster tables + hit probability),
    `weapon-resolution-system` (MODIFIED — `IUIWeaponState` gains
    optional `preview` field; the weapon-picker toggles population)
- Affected code: new `src/utils/gameplay/toHit/preview.ts`, new
  `src/utils/gameplay/damage/expectedDamage.ts`,
  `src/components/gameplay/WeaponPicker.tsx` (adds toggle + preview
  columns), `src/stores/useGameplayStore.ts` (gains `previewEnabled:
boolean` UI flag)
- Non-goals: predicting hit location (random), predicting specific
  critical hit effects (too noisy), showing preview on non-weapon
  actions (physical attacks are a separate future scope), persisting
  preview state across page reloads (session-scoped toggle is enough)
