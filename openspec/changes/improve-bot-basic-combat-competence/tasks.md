# Tasks: Improve Bot Basic Combat Competence

## 1. Behavior Configuration

- [ ] 1.1 Extend `IBotBehavior` in `src/simulation/ai/types.ts` with `safeHeatThreshold: number` (default 13)
- [ ] 1.2 Update `DEFAULT_BEHAVIOR` constant with the new field
- [ ] 1.3 Write unit tests that instantiate `BotPlayer` with overridden thresholds and confirm the value is honored

## 2. Threat Scoring

- [ ] 2.1 Add `scoreTarget(attacker, target)` helper in `AttackAI` that returns `threat * killProbability`
- [ ] 2.2 Implement threat = `totalWeaponDamagePerTurn / gunneryMod * remainingHpFraction` (higher damage, better gunnery, healthier = more threatening)
- [ ] 2.3 Implement killProbability = `1 - (toHitTN / 12)` clamped to `[0, 1]`; use the attacker's gunnery + range modifier + firing-arc modifier as the TN estimate
- [ ] 2.4 Write unit tests: assault mech with intact armor scores higher than crippled light mech at equal range; target at +4 TN scores lower than target at +2 TN
- [ ] 2.5 Update `AttackAI.selectTarget` to pick the highest-score target, using the injected `SeededRandom` only for tie-breaking

## 3. Firing-Arc Awareness

- [ ] 3.1 In `AttackAI.selectWeapons`, import `calculateFiringArc` from `src/utils/gameplay/firingArc.ts`
- [ ] 3.2 For each weapon, compute the arc of the target hex relative to the attacker's facing and exclude weapons whose mounting arc does not include the target
- [ ] 3.3 Write unit tests covering: front-arc weapon excluded when target is rear; rear-arc weapon included when target is rear; torso-twist shifts included-weapon set by one hex-side

## 4. Range-Bracket Weapon Ordering

- [ ] 4.1 Sort the candidate weapon list by `damage / max(heat, 1)` descending (energy weapons with zero heat use the damage value directly; add a guard for divide-by-zero)
- [ ] 4.2 Within equal damage-per-heat buckets, prefer weapons whose current range bracket is short over medium over long
- [ ] 4.3 Skip weapons where the target is inside `minRange` when an out-of-minimum-range alternative exists
- [ ] 4.4 Write unit tests: PPC + medium laser at short range fires ML first when heat pressure is high; LRM-20 skipped when target is 2 hexes away and another weapon can fire

## 5. Heat Management

- [ ] 5.1 Compute projected heat = `currentHeat + movementHeat + sum(candidateWeaponHeat)` for the proposed fire list
- [ ] 5.2 While `projectedHeat > behavior.safeHeatThreshold` and the candidate list is non-empty, remove the weapon with the lowest `damage / heat` ratio and recompute
- [ ] 5.3 Preserve the ordering invariant (section 4) — removal SHALL come from the tail of the sorted list
- [ ] 5.4 Write unit tests: candidate set of {PPC:10, ML:3, SL:1} with current heat 10 and threshold 13 drops PPC; same set with current heat 3 fires everything

## 6. Line-of-Sight Movement Positioning

- [ ] 6.1 In `MoveAI`, add a `scoreMove(move, attacker, allUnits, grid)` helper that returns a numeric score for candidate destinations
- [ ] 6.2 Score +1000 if at least one non-destroyed enemy unit has line of sight to the destination (use `src/utils/gameplay/lineOfSight.ts`)
- [ ] 6.3 Score +500 if the highest-threat target (from section 2) is in the move's resulting forward firing arc
- [ ] 6.4 Score -100 per hex of distance from the nearest enemy (discourage backing off) and -1 per point of movement heat generated
- [ ] 6.5 Write unit tests: given two moves where one maintains LoS and one does not, bot picks the LoS move; given equal-LoS moves, bot picks the one facing the threat

## 7. Selection Integration

- [ ] 7.1 Update `MoveAI.selectMove` to pick the highest-score move, using `SeededRandom` for tie-breaking only
- [ ] 7.2 Update `BotPlayer.playMovementPhase` to supply `scoreMove` with the current enemy list
- [ ] 7.3 Update `BotPlayer.playAttackPhase` to use the new `selectTarget` → `selectWeapons` (arc-aware, heat-managed) pipeline
- [ ] 7.4 Write integration tests: two-bot skirmish with fixed seed reaches identical outcome across runs (determinism check)

## 8. Edge-Case Tests

- [ ] 8.1 Bot with no weapons in any arc SHALL return a null attack event (no-op), not crash
- [ ] 8.2 Bot already above safe heat threshold SHALL still fire if a single weapon with positive damage brings net heat below threshold for next turn; otherwise fire nothing
- [ ] 8.3 All targets out of maximum weapon range → bot returns null attack and movement phase SHALL prioritize closing distance
- [ ] 8.4 All units destroyed except the bot → bot returns null for both phases without error
