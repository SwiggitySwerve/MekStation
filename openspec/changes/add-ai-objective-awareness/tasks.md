# Tasks: Add AI Objective Awareness

## 1. Objective Tier Parameters

- [ ] 1.1 Add `IAITierObjectiveParameters` (`objectiveAwareness`, `objectiveSeekingWeight`, `objectiveHoldWeight`) and an optional `objective` block on `IAITierParameters` in `src/simulation/ai/AITierRegistry.ts`
- [ ] 1.2 Populate the `objective` block per tier — `Green`/`Regular`/`Veteran` fully inert (`objectiveAwareness: false`, zeroed weights); `Elite` populated
- [ ] 1.3 Tests: every tier resolves an `objective` block; lower tiers ignore the objective map and play `Destroy`

## 2. Objective Ingestion and Classification

- [ ] 2.1 Create `src/simulation/ai/AIObjectivePlanner.ts` with `classifyObjectives(session, botSide)` returning `IClassifiedObjective` records
- [ ] 2.2 Classify each marker as `take`, `hold`, or `deny` from the bot side's scenario objective type
- [ ] 2.3 An empty objective map (or a `Destroy` scenario type) SHALL yield no classified objectives
- [ ] 2.4 Tests: an attacker's capture marker classifies `take`; a defender's marker classifies `hold`; a `Destroy` scenario yields nothing

## 3. Objective Layer on the Lance Plan

- [ ] 3.1 Add an optional `objectivePlan` field (`IObjectiveLancePlan`) to A3a's `ILanceTurnPlan`
- [ ] 3.2 In `AILancePlanner.planTurn`, when objective awareness is enabled and the scenario is not `Destroy`, assign each unit an `ObjectiveRole` (`capture`, `hold`, `screen`)
- [ ] 3.3 Assign the capture role to the unit(s) closest by A1 pathfinder cost to a `take` marker; the hold role to the unit(s) on or nearest a `hold` marker; the screen role to the rest
- [ ] 3.4 Populate `targetHexes` with the hex each role-bearing unit is working toward or holding
- [ ] 3.5 Tests: a capture role goes to the nearest unit; a hold role goes to the unit on the marker; screen units get no objective hex

## 4. Objective-Seeking Movement

- [ ] 4.1 Add an objective term to `scoreMove` for capture-role units — `+objectiveSeekingWeight` scaled by pathfinder-distance reduction to the `take` marker, with a large bonus for a destination on the marker hex
- [ ] 4.2 Add an objective term for hold-role units — `+objectiveHoldWeight` for a destination on the `hold` marker, reduced for adjacent hexes, zero for destinations abandoning it
- [ ] 4.3 Screen-role units SHALL receive zero objective contribution and play pure A3a movement
- [ ] 4.4 Gate the objective term on `objectiveAwareness`; when disabled it contributes zero
- [ ] 4.5 Tests: a capture unit moves toward and onto its marker; a hold unit stays on its marker; a screen unit is unaffected

## 5. Objective-Aware Target Discipline

- [ ] 5.1 In `playAttackPhase`, for `capture`/`hold`-role units, prefer targets engageable without leaving the objective hex or its path
- [ ] 5.2 A hold unit SHALL fire from the marker rather than pursue an enemy off it
- [ ] 5.3 Screen-role units SHALL keep A3a target selection unchanged
- [ ] 5.4 Tests: a hold unit engages from the marker and does not chase; a screen unit's selection matches A3a

## 6. Verification

- [ ] 6.1 Integration test: an `Elite` bot wins a generated `Capture` scenario by moving a unit onto the objective and holding it; a `Veteran` bot fails to capture
- [ ] 6.2 Integration test: an `Elite` bot wins a generated `Defend` scenario by holding its marker to the turn limit
- [ ] 6.3 Integration test: an `Elite` bot wins a generated `Breakthrough` scenario by moving units to the exit edge
- [ ] 6.4 Determinism test: SimulationRunner golden traces on the `Veteran` tier are byte-identical to pre-change traces
- [ ] 6.5 `npx openspec validate add-ai-objective-awareness --strict` reports valid
- [ ] 6.6 Build, lint, and typecheck pass
