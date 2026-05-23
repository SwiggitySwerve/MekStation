# Spec Delta: Combat Resolution - BattleMech Combat Validation Suite

## ADDED Requirements

### Requirement: BattleMech Combat Validation Catalog

Combat resolution SHALL maintain a catalog-driven validation suite that enumerates every BattleMech combat action, modifier, legality gate, source-truth reference, executable test surface, and unsupported gap. Catalog rows SHALL classify support as `integrated`, `partial`, or `unsupported`, and `unsupported` rows SHALL remain visible until an implementation and executable evidence exist.

#### Scenario: Unsupported mechanics stay explicit

- **GIVEN** a combat mechanic is known from source-truth rules but is not implemented
- **WHEN** the validation catalog is generated or contract-tested
- **THEN** the mechanic SHALL appear as `unsupported`
- **AND** the catalog SHALL include a concise reason or follow-up label
- **AND** the mechanic SHALL NOT be omitted from the suite

#### Scenario: Integrated mechanics require executable evidence

- **GIVEN** a combat mechanic is marked `integrated`
- **WHEN** the catalog contract tests run
- **THEN** the row SHALL reference executable tests or source support
- **AND** the referenced tests SHALL validate behavior through the narrowest helper and at least one higher-level combat path when that path exists

### Requirement: Physical Attack Legality Gates

Physical attack declaration and resolution SHALL validate action-specific legality gates before scheduling a combat action. Push, charge, death from above, melee weapon, punch, kick, and club logic SHALL share the same legality helpers across eligibility display, event-sourced declaration, and simulation runner resolution so UI options, game events, and automated combat cannot diverge.

#### Scenario: Physical attacks require existing targets

- **GIVEN** an attacker declares any supported BattleMech physical attack against a target id that is not present in combat state
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetMissing`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Stale physical declarations resolve missing targets as invalid

- **GIVEN** an already-declared physical attack whose target unit is missing at resolution time
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetMissing`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Physical attacks cannot target destroyed units

- **GIVEN** an attacker declares any supported BattleMech physical attack against a destroyed target unit
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetDestroyed`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Stale physical declarations resolve destroyed targets as invalid

- **GIVEN** an already-declared physical attack whose target unit is destroyed at resolution time
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetDestroyed`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Physical attacks cannot target ejected units

- **GIVEN** an attacker declares any supported BattleMech physical attack against an ejected target unit
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetEjected`
- **AND** physical eligibility and runner target selection SHALL remove ejected units from target lists
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Stale physical declarations resolve ejected targets as invalid

- **GIVEN** an already-declared physical attack whose target unit ejects before resolution
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetEjected`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Physical attacks cannot target retreated units

- **GIVEN** an attacker declares any supported BattleMech physical attack against a retreated or withdrawn target unit
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetRetreated`
- **AND** physical eligibility and runner target selection SHALL remove retreated units from target lists
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Stale physical declarations resolve retreated targets as invalid

- **GIVEN** an already-declared physical attack whose target unit retreats before resolution
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetRetreated`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted

#### Scenario: Push target must be directly ahead

- **GIVEN** an attacker declares a push against an adjacent target
- **AND** the target does not occupy the hex directly in front of the attacker's feet facing
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with `TargetNotDirectlyAhead`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Physical attacks require adjacent targets

- **GIVEN** an attacker declares any supported BattleMech physical attack against a target more than one hex away
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetNotAdjacent`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Physical attacks cannot self-target

- **GIVEN** an attacker declares any supported BattleMech physical attack against itself
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `SelfTarget`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Physical attacks cannot target friendly units

- **GIVEN** an attacker declares any supported BattleMech physical attack against a same-side unit
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `FriendlyTarget`
- **AND** no physical attack declaration SHALL be scheduled

#### Scenario: Push rejects invalid unit type, posture, arm, elevation, quirk, and displacement gates

- **GIVEN** a push declaration fails because of explicit non-Mek attacker/target unit type, missing arm location, no-arm quirk, elevation mismatch, prone attacker, prone target, or blocked destination
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with the matching restriction code
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Physical helpers reject invalid hex target objects

- **GIVEN** a physical helper evaluates a woods-clearing, building-ignition, or hex-ignition target object
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `InvalidPhysicalTarget`
- **AND** the validation catalog SHALL mark this as helper-only until runtime physical declarations can target non-unit objects

#### Scenario: Push helpers reject building and fuel-tank target objects

- **GIVEN** a push helper evaluates a building or fuel-tank target object
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with `TargetBuilding`
- **AND** the validation catalog SHALL mark this as helper-only until runtime physical declarations can target non-unit objects

#### Scenario: Charge rejects invalid standing-Mek target gates

- **GIVEN** a BattleMech-compatible attacker declares a charge after running this turn
- **AND** the target is explicitly non-Mek or prone
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `TargetNotMek` or `TargetProne`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Charge rejects non-Mek charges against Infantry or ProtoMech targets

- **GIVEN** an explicit non-Mek attacker declares a charge after running this turn
- **AND** the target is Infantry, Battle Armor, or ProtoMech
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `TargetInfantryOrProtoMek`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Charge rejects non-overlapping elevation bands

- **GIVEN** a BattleMech-compatible attacker declares a charge after running this turn
- **AND** the target elevation band does not overlap the attacker elevation band
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `ElevationMismatch`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Charge rejects targets that have not completed movement unless immobile

- **GIVEN** a charge declaration is evaluated after the attacker ran this turn
- **AND** the target has not completed movement this turn
- **AND** the target is not immobile
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `TargetMovementIncomplete`
- **AND** immobile targets SHALL remain legal for this gate even when movement is incomplete
- **AND** no damage, displacement, or PSR side effect SHALL be emitted on rejection

#### Scenario: Blocked successful charge displacement keeps both units in place

- **GIVEN** a charge attack hits after charge damage is resolved
- **AND** the target displacement hex in the attacker's facing direction is blocked or otherwise invalid
- **WHEN** the successful charge displacement branch runs
- **THEN** the target and attacker SHALL remain in their original hexes
- **AND** charge target damage and charge attacker self-damage SHALL still apply
- **AND** charge-specific displacement PSRs SHALL NOT be emitted for either unit
- **AND** the resolver SHALL NOT emit `cause=impossible_displacement`
- **AND** helper, event-sourced resolution, runner resolution, catalog, and source-truth audit evidence SHALL report the same source-backed outcome

#### Scenario: Push rejects arm-mounted weapons fired this turn

- **GIVEN** a push declaration is evaluated with evidence that either attacker arm fired a weapon this turn
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with `WeaponFiredThisTurn`
- **AND** helper and event-sourced declaration paths SHALL reject before side effects
- **AND** event-sourced and runner paths SHALL use hydrated mounted weapon locations to reject left/right-arm fire while allowing non-arm mounted fire
- **AND** unknown or unhydrated fired weapon ids SHALL remain conservative and reject the push rather than silently allowing a potentially arm-fired weapon

#### Scenario: Death from above rejects prone attackers

- **GIVEN** an attacker that jumped this turn is prone before resolving death from above
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected before hit resolution
- **AND** the validation catalog SHALL record the gate as integrated only when helper and runner evidence exist

#### Scenario: Death from above rejects infantry-family attackers

- **GIVEN** an Infantry or Battle Armor attacker declares death from above after jumping this turn
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `AttackerInfantry`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Death from above rejects targets that have not completed movement unless immobile

- **GIVEN** a DFA declaration is evaluated after the attacker jumped this turn
- **AND** the target has not completed movement this turn
- **AND** the target is not immobile
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `TargetMovementIncomplete`
- **AND** immobile targets SHALL remain legal for this gate even when movement is incomplete
- **AND** no damage, displacement, or PSR side effect SHALL be emitted on rejection

#### Scenario: Death from above applies Infantry and Battle Armor target-class modifiers

- **GIVEN** a DFA declaration is evaluated after the attacker jumped this turn
- **WHEN** the target is Infantry
- **THEN** death from above to-hit SHALL include a +3 target-class modifier
- **WHEN** the target is Battle Armor
- **THEN** death from above to-hit SHALL include a +1 target-class modifier
- **AND** helper, eligibility UI, event-sourced declaration, and runner resolution SHALL report the same modifier outcome

#### Scenario: Death from above applies piloting skill differential

- **GIVEN** a DFA declaration is evaluated after the attacker jumped this turn
- **AND** the attacker and target have different piloting skills
- **WHEN** the DFA to-hit number is calculated
- **THEN** death from above to-hit SHALL include attacker piloting minus target piloting as a modifier
- **AND** helper, eligibility UI, event-sourced declaration, and runner resolution SHALL report the same modifier outcome

#### Scenario: Death from above impossible displacement destroys the blocked unit

- **GIVEN** a DFA hit or miss is resolved and every legal displacement hex for the target is blocked or off-map
- **WHEN** the DFA displacement branch runs
- **THEN** a successful DFA SHALL destroy the target with `cause=impossible_displacement` and move the attacker into the target hex
- **AND** a missed DFA SHALL destroy the attacker with `cause=impossible_displacement` without queuing the normal miss PSR
- **AND** helper, event-sourced resolution, runner resolution, and the destruction-cause catalog SHALL report the same source-backed outcome

#### Scenario: Death from above successful attacker PSR uses source-backed modifier

- **GIVEN** a death-from-above attack hits its target
- **WHEN** the attacker-side post-DFA piloting skill roll is queued
- **THEN** the attacker PSR SHALL use the MegaMek-backed +4 "executed death from above" modifier
- **AND** event-sourced resolution and runner resolution SHALL both surface the same modifier while the target's hit-by-DFA PSR remains unmodified

#### Scenario: Death from above miss immediately drops the attacker

- **GIVEN** a death-from-above attack misses and the target has a legal displacement hex
- **WHEN** the DFA miss displacement branch runs
- **THEN** the target SHALL move to the preferred displacement hex and the attacker SHALL fall into the target's original hex
- **AND** event-sourced resolution and runner resolution SHALL immediately apply fall damage, set the attacker prone with the source-backed rear fall facing, emit `UnitFell`, and avoid queuing the normal `DFAMiss` PSR for that grid-backed fall branch
- **AND** the attacker SHALL roll the source-backed fall pilot-damage avoidance check, applying one fall-sourced pilot wound and `PilotHit` only when that check fails

### Requirement: Designator Marker Replay State

Designator marker events SHALL replay into the same target marker state consumed by combat resolution. TAG markers SHALL set transient `tagDesignated` state that clears at turn start. Standard NARC markers SHALL append the marking team to `narcedBy` without duplicate entries and SHALL persist across turn starts. iNARC pod variants SHALL remain explicit gaps until their variant-specific runner missile effects are represented.

#### Scenario: Replay applies TAG and standard NARC marker state

- **GIVEN** a replay stream contains `DesignatorMarkerApplied` events for TAG and standard NARC hits
- **WHEN** the event-sourced state reducer applies those events
- **THEN** TAG events SHALL mark the target as TAG-designated for the turn
- **AND** standard NARC events SHALL add the marking team to the target's `narcedBy` list without duplicate markers
- **AND** the catalog SHALL continue to list iNARC pod variants as helper-only until variant effects are implemented

### Requirement: Source-Truth Cross-Check Discipline

Combat feature work SHALL update OpenSpec, the validation catalog, and executable tests together. Before marking a mechanic integrated, the implementation SHALL be cross-checked against official rules or MegaMek / MekHQ behavior notes, with gaps recorded as partial or unsupported rather than inferred as complete.

#### Scenario: Feature headway updates specs and evidence together

- **GIVEN** a developer adds or changes BattleMech combat logic
- **WHEN** the work changes action availability, modifiers, turn lifecycle, damage, heat, movement, targetability, or resolution outcomes
- **THEN** the active OpenSpec change SHALL be updated in the same slice
- **AND** the validation catalog SHALL be updated in the same slice
- **AND** focused tests SHALL prove the updated rule path
