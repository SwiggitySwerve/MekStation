## ADDED Requirements

### Requirement: Bot Retreat Trigger Conditions

`BotPlayer` SHALL place a unit into retreat mode (`isRetreating = true`) when either of the following conditions becomes true:

1. **Structural damage trigger**: The fraction of destroyed internal structure across all locations exceeds `IBotBehavior.retreatThreshold` (default `0.5`). Destroyed internal structure is counted as `sum(startingInternalStructure - currentInternalStructure) / sum(startingInternalStructure)`.

2. **Critical hit trigger**: The unit has received any through-armor critical hit on cockpit, gyro, or engine at any prior point in the match. This trigger fires independent of total damage level.

Retreat is sticky: once triggered, `isRetreating` SHALL remain `true` for the rest of the match regardless of later state changes. If `IBotBehavior.retreatEdge === 'none'`, retreat SHALL NOT trigger under any condition.

#### Scenario: Structural-damage trigger fires at threshold

- **GIVEN** a bot unit with starting total internal structure of 100 points across all locations
- **WHEN** the unit accumulates 51 points of total internal-structure destruction
- **THEN** `shouldRetreat` SHALL return `true`
- **AND** `isRetreating` SHALL be set on the unit
- **AND** `retreatTargetEdge` SHALL be resolved from `IBotBehavior.retreatEdge`

#### Scenario: Cockpit TAC triggers retreat regardless of damage

- **GIVEN** a bot unit at full structural integrity that receives a through-armor critical hit on the cockpit
- **WHEN** the critical-hit event is processed
- **THEN** `shouldRetreat` SHALL return `true` in the next AI evaluation
- **AND** retreat mode SHALL engage before the unit's next movement phase

#### Scenario: Gyro or engine TAC also triggers

- **GIVEN** a bot unit that receives a through-armor critical on the gyro (or engine) without cockpit damage
- **WHEN** retreat evaluation runs
- **THEN** retreat SHALL trigger on that single critical

#### Scenario: retreatEdge 'none' disables retreat

- **GIVEN** a bot unit with `IBotBehavior.retreatEdge === 'none'` that is crippled to 10% structure remaining
- **WHEN** retreat evaluation runs
- **THEN** `shouldRetreat` SHALL return `false`
- **AND** the unit SHALL continue fighting normally until destroyed

#### Scenario: Retreat is sticky once triggered

- **GIVEN** a unit in retreat mode that somehow has its critical-hit trigger condition reversed (not possible in Phase 1 but defended against)
- **WHEN** retreat evaluation runs again
- **THEN** `isRetreating` SHALL remain `true`
- **AND** the unit SHALL NOT resume normal combat behavior

### Requirement: Retreat Edge Resolution

The concrete map edge used for retreat SHALL be resolved once, at the moment retreat triggers, and locked for the rest of the match. The resolution SHALL be deterministic.

- Explicit values `'north'`, `'south'`, `'east'`, `'west'` SHALL return themselves.
- Value `'nearest'` SHALL return the map edge with minimum Chebyshev distance from the unit's current hex. Ties SHALL break in priority order: north > east > south > west.
- Value `'none'` SHALL return `null` and retreat SHALL NOT engage.

#### Scenario: Nearest edge resolution picks closest

- **GIVEN** a bot unit positioned 3 hexes from the north edge, 8 hexes from the east edge, 12 hexes from the south edge, and 15 hexes from the west edge, with `retreatEdge: 'nearest'`
- **WHEN** retreat triggers
- **THEN** `retreatTargetEdge` SHALL resolve to `'north'`

#### Scenario: Nearest edge ties break deterministically

- **GIVEN** a bot unit exactly equidistant from north and east edges with `retreatEdge: 'nearest'`
- **WHEN** retreat triggers
- **THEN** `retreatTargetEdge` SHALL resolve to `'north'` (tiebreaker priority)

#### Scenario: Locked edge survives subsequent moves

- **GIVEN** a unit that triggered retreat with `retreatTargetEdge = 'north'` and then moved laterally so that `'east'` is now closer
- **WHEN** the next movement phase begins
- **THEN** the unit SHALL continue retreating toward `'north'`
- **AND** the target edge SHALL NOT be re-resolved

### Requirement: Retreat Movement Scoring

While `unit.isRetreating === true`, `MoveAI` SHALL use a retreat-specific scoring formula that prioritizes progress toward the locked retreat edge over line-of-sight maintenance or firing-arc considerations.

Retreat move scoring:

- `+1000 * progressTowardEdge` where `progressTowardEdge = distanceToEdgeBefore - distanceToEdgeAfter` (positive means move reduces distance to edge)
- `+200` if the move's resulting facing points the unit's forward arc toward the retreat edge
- `-50` if the move is a jump move (discourage jumping)
- Standard line-of-sight and threat-arc bonuses SHALL NOT be applied

Ties SHALL be broken via `SeededRandom` so decisions remain reproducible.

#### Scenario: Retreating unit picks move with greatest edge progress

- **GIVEN** a unit retreating toward `'north'` with two candidate moves: move A reduces distance to north edge by 2 hexes, move B reduces it by 1 hex
- **WHEN** move scoring runs
- **THEN** move A SHALL score higher (+2000 vs +1000)
- **AND** the bot SHALL commit move A

#### Scenario: Retreating unit rotates forward toward edge

- **GIVEN** two moves with equal edge progress but different ending facings — facing 0 points north (toward retreat edge), facing 3 points south
- **WHEN** move scoring runs
- **THEN** facing-0 move SHALL receive the `+200` bonus
- **AND** the bot SHALL commit the forward-facing move

#### Scenario: Retreating unit prefers run over jump with equal progress

- **GIVEN** a run move and a jump move that cover identical ground toward the retreat edge
- **WHEN** move scoring runs
- **THEN** the run move SHALL score higher by 50 points
- **AND** the bot SHALL NOT jump while retreating

#### Scenario: Immobilized retreating unit stays in place without error

- **GIVEN** a retreating unit with zero Walk and zero Run MP (all legs destroyed)
- **WHEN** the movement phase begins
- **THEN** `playMovementPhase` SHALL return `null` without throwing
- **AND** no `UnitRetreated` event SHALL fire
- **AND** the unit SHALL continue to be considered alive for attack and victory-check purposes

### Requirement: Retreating Units Run, Not Jump or Walk

`BotPlayer.selectMovementType` SHALL return `MovementType.Run` for retreating units whenever Run MP is available. If Run is unavailable, Walk SHALL be used. Jump SHALL NOT be selected during retreat under any circumstance.

#### Scenario: Run selected when available

- **GIVEN** a retreating unit with `runMP = 8`, `walkMP = 5`, `jumpMP = 4`
- **WHEN** movement-type selection runs
- **THEN** `MovementType.Run` SHALL be returned

#### Scenario: Walk fallback when run is unavailable

- **GIVEN** a retreating unit with damaged leg actuators preventing running (`runMP = 0`, `walkMP = 3`)
- **WHEN** movement-type selection runs
- **THEN** `MovementType.Walk` SHALL be returned

#### Scenario: Jump never selected during retreat

- **GIVEN** a retreating unit with `runMP = 0`, `walkMP = 0`, `jumpMP = 5`
- **WHEN** movement-type selection runs
- **THEN** `MovementType.Walk` SHALL be returned (even though Walk is also 0, yielding a zero-progress turn)
- **AND** `MovementType.Jump` SHALL NOT be returned

### Requirement: Retreating Units Fire with Reduced Heat Threshold

Retreating units MAY continue to declare weapon attacks, but SHALL reduce the effective `safeHeatThreshold` passed to heat management by 2 points (minimum 0). Retreating units SHALL NOT declare physical attacks. Weapons fired during retreat SHALL be limited to those whose mount arc aligns with the unit's forward-retreat facing — no torso twist to engage enemies behind the retreat vector.

#### Scenario: Retreating unit fires with tighter heat budget

- **GIVEN** a retreating unit with `IBotBehavior.safeHeatThreshold = 13`
- **WHEN** heat management runs for its attack phase
- **THEN** the effective threshold SHALL be `11`
- **AND** weapons that would push projected heat above 11 SHALL be culled

#### Scenario: Retreating unit with low base threshold clamps at zero

- **GIVEN** a retreating unit with `IBotBehavior.safeHeatThreshold = 1`
- **WHEN** heat management runs
- **THEN** the effective threshold SHALL be `0` (clamped, not -1)
- **AND** only zero-heat weapons SHALL fire

#### Scenario: Retreating unit does not torso-twist backward

- **GIVEN** a retreating unit with its forward facing pointed toward the retreat edge and an enemy directly behind it
- **WHEN** attack selection runs
- **THEN** forward-mounted weapons SHALL NOT be declared against the rear enemy (no torso twist is attempted)
- **AND** rear-mounted weapons MAY be declared against the rear enemy under the reduced heat threshold

#### Scenario: Retreating unit skips physical attacks

- **GIVEN** a retreating unit adjacent to an enemy that would normally warrant a punch or kick
- **WHEN** physical-attack evaluation runs
- **THEN** no physical attack SHALL be declared
- **AND** the retreating unit SHALL continue to the next phase

### Requirement: UnitRetreated Event on Reaching Map Edge

When a retreating unit's movement takes it onto a hex that lies on the locked `retreatTargetEdge`, a `GameEventType.UnitRetreated` event SHALL be emitted in the same turn as the movement. The unit SHALL be marked as no longer participating in combat (analogous to destruction for victory-check purposes) but SHALL be distinguished from combat destruction in the post-battle summary.

The event payload SHALL include:

```typescript
interface IUnitRetreatedPayload {
  readonly unitId: string;
  readonly retreatEdge: 'north' | 'south' | 'east' | 'west';
  readonly turn: number;
}
```

#### Scenario: Unit retreats off the north edge

- **GIVEN** a retreating unit one hex south of the north map edge with `retreatTargetEdge = 'north'` and enough Run MP to reach the edge
- **WHEN** the movement phase resolves
- **THEN** both a `MovementDeclared` event and a `UnitRetreated` event SHALL be emitted, in that order
- **AND** the `UnitRetreated` payload SHALL record `unitId`, `retreatEdge: 'north'`, and the current turn number

#### Scenario: Retreated unit removed from active list

- **GIVEN** a unit has emitted `UnitRetreated` in turn 6
- **WHEN** the victory-condition check runs at end of turn 6
- **THEN** the retreated unit SHALL NOT count toward its side's remaining-unit total
- **AND** if this causes its side's remaining unit count to reach zero, the opposing side SHALL be declared the winner

#### Scenario: Post-battle summary distinguishes retreat from destruction

- **GIVEN** a match ending with one unit destroyed in combat and one unit retreated
- **WHEN** the post-battle summary is generated (via `add-victory-and-post-battle-summary`)
- **THEN** the summary SHALL list the destroyed unit under "combat losses" and the retreated unit under "withdrawn"
- **AND** no XP or salvage SHALL be awarded for the retreated unit (campaign integration — Phase 3)

#### Scenario: Retreating unit that reaches edge on the same turn it triggered

- **GIVEN** a unit that triggers retreat while already adjacent to its chosen edge
- **WHEN** the next movement phase begins
- **THEN** the unit SHALL reach the edge on that turn
- **AND** `UnitRetreated` SHALL fire normally (single-turn retreat is valid)
