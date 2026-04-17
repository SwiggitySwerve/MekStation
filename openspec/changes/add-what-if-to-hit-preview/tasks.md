# Tasks: Add What-If To-Hit Preview

## 1. Attack Preview Shape

- [ ] 1.1 Define `IAttackPreview` with `{hitProbability,
    expectedDamage, damageStddev, critProbability, clusterHitsMean,
    clusterHitsStddev}` (all numbers in `[0, +∞)`, probabilities in
      `[0, 1]`)
- [ ] 1.2 Document that all fields are purely informational — no dice
      rolls are performed to produce them

## 2. Preview Derivation

- [ ] 2.1 Create `previewAttackOutcome(attack): IAttackPreview` that
      composes `forecastToHit`, `hitProbability`, `expectedDamage`,
      `damageVariance`, and `critProbability`
- [ ] 2.2 Guarantee zero state mutation — function takes a read-only
      attack descriptor and produces a pure result
- [ ] 2.3 Unit test that 1000 consecutive calls with identical input
      return identical output (proves no hidden randomness)

## 3. Expected Damage Helper

- [ ] 3.1 Create `expectedDamage(weapon, hitProbability)` in the
      damage system
- [ ] 3.2 For single-shot weapons: `expectedDamage = hitProbability *
    weapon.damage`
- [ ] 3.3 For cluster weapons: `expectedDamage = hitProbability *
    expectedClusterHits * damagePerCluster`, where
      `expectedClusterHits` integrates the cluster hit table over all
      2d6 outcomes weighted by their 2d6 probability
- [ ] 3.4 For Streak weapons: `expectedDamage = hitProbability *
    rackSize * damagePerMissile` (Streak fires all-or-nothing)
- [ ] 3.5 For one-shot weapons: same as single-shot but capped at the
      one remaining shot

## 4. Damage Variance Helper

- [ ] 4.1 Create `damageVariance(weapon, hitProbability)` returning
      stddev (not variance) so the UI can display it directly
- [ ] 4.2 For single-shot weapons: stddev derived from Bernoulli
      (`sqrt(p * (1-p)) * damage`)
- [ ] 4.3 For cluster weapons: stddev derived from the cluster hit
      distribution plus the Bernoulli hit factor
- [ ] 4.4 Clamp stddev to 0 when hit probability is exactly 0 or 1

## 5. Crit Probability Helper

- [ ] 5.1 Create `critProbability(attack)` returning the probability
      that the attack produces at least one critical hit
- [ ] 5.2 Decompose into: `P(hit) * P(location with 0 armor) *
    P(crit on 2d6 location roll)` for through-armor crits
- [ ] 5.3 For cluster weapons, aggregate across expected cluster hits
- [ ] 5.4 Simplification: the preview MAY use a closed-form
      approximation rather than full Monte Carlo; document the
      approximation in the spec

## 6. Expected Cluster Hits Table

- [ ] 6.1 Pre-compute `expectedClusterHits[rackSize]` for each cluster
      rack size (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20) as the dot
      product of 2d6 probability mass × cluster table row
- [ ] 6.2 Cache the result as a module-level constant so the preview
      never re-computes during UI interaction
- [ ] 6.3 Unit test expected values against TechManual cluster tables

## 7. UI Weapon State Projection Extension

- [ ] 7.1 Extend `IUIWeaponState` with optional `preview: IAttackPreview
    | null`
- [ ] 7.2 When `useGameplayStore.previewEnabled === false`, projection
      SHALL set `preview = null`
- [ ] 7.3 When enabled, projection SHALL call `previewAttackOutcome`
      per weapon and populate `preview`
- [ ] 7.4 Projection SHALL be memoized per
      `{attackerId, targetId, weaponId, previewEnabled}` to avoid
      recomputing on unrelated store changes

## 8. Weapon Picker UI

- [ ] 8.1 Add a "Preview Damage" toggle to the weapon-picker header
- [ ] 8.2 Toggle state lives on `useGameplayStore.previewEnabled`
- [ ] 8.3 When ON: each weapon row shows three additional columns —
      "Exp. Dmg", "± stddev", "Crit %"
- [ ] 8.4 When OFF: columns are hidden; existing hit-probability column
      (from `add-attack-phase-ui`) remains
- [ ] 8.5 Toggling SHALL NOT clear selected weapons or the target
      lock
- [ ] 8.6 Toggling SHALL NOT append any event or mutate session state

## 9. Zero-Commit Guarantee

- [ ] 9.1 Write an integration test that enables the preview toggle,
      reads `preview` values for every weapon, then verifies
      `session.events.length` is unchanged
- [ ] 9.2 Verify that `session.units[*]` is deeply equal before and
      after preview queries
- [ ] 9.3 Document in the spec: "Preview SHALL NOT fire the weapon"

## 10. Visual Formatting

- [ ] 10.1 Expected damage formatted to 1 decimal (e.g., `"8.4"`)
- [ ] 10.2 Stddev formatted as `"±2.1"` prefixed with the plus-minus
      sign
- [ ] 10.3 Crit probability formatted as percentage to 1 decimal
      (e.g., `"3.2%"`)
- [ ] 10.4 Out-of-range weapons show `"—"` in preview columns instead
      of zeros (clarity: "not applicable" vs "0%")

## 11. Tests

- [ ] 11.1 Unit test: `previewAttackOutcome` for a Medium Laser at
      medium range vs. gunnery 4 target produces the expected
      `{hitProbability ≈ 0.72, expectedDamage ≈ 3.6, damageStddev, ...}`
- [ ] 11.2 Unit test: Cluster weapon (LRM-10) expected damage matches
      manually computed `hitProbability * 6.14 * 1`
- [ ] 11.3 Unit test: Preview is zero across the board when
      `inRange === false`
- [ ] 11.4 Integration test: Toggling Preview Damage does not append
      events
- [ ] 11.5 Integration test: Preview stays accurate when the player
      switches targets mid-phase

## 12. Spec Compliance

- [ ] 12.1 Every delta requirement across `to-hit-resolution`,
      `damage-system`, and `weapon-resolution-system` has at least one
      GIVEN/WHEN/THEN scenario
- [ ] 12.2 `openspec validate add-what-if-to-hit-preview --strict`
      passes clean
