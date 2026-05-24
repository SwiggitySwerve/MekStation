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

#### Scenario: Charge and death from above helpers reject non-entity building targets

- **GIVEN** a charge or death from above helper evaluates a building or fuel-tank target object
- **WHEN** the action-specific legality gate runs
- **THEN** the attack SHALL be rejected with `InvalidPhysicalTarget`
- **AND** the catalog SHALL record that MegaMek source order returns `Invalid Target` for non-entity targets before the later adjacent-building branch
- **AND** non-unit building and fuel-tank physical target resolution SHALL remain an explicit gap

#### Scenario: Gun-emplacement physical targets resolve as automatic hits

- **GIVEN** a punch, kick, death from above, or runtime melee physical attack targets an adjacent gun emplacement
- **WHEN** the physical to-hit and resolution helpers run
- **THEN** the attack SHALL resolve as an automatic hit without consuming to-hit dice
- **AND** the resolved event SHALL carry automatic-hit metadata

#### Scenario: Charge rejects gun-emplacement targets by standing-Mek source order

- **GIVEN** a BattleMech-compatible attacker declares a charge against an adjacent gun emplacement
- **WHEN** the charge legality gate runs through helper, eligibility, event-sourced declaration, or runner resolution inputs
- **THEN** the charge SHALL be rejected with `TargetNotMek`
- **AND** no automatic-hit metadata, damage, displacement, or PSR side effects SHALL be emitted

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

#### Scenario: Physical displacement rejects climbs above BattleMech limits

- **GIVEN** a push, charge, or death-from-above displacement would move a BattleMech target into a destination hex more than two elevation levels above its source hex
- **WHEN** the shared displacement helper evaluates the destination
- **THEN** the displacement SHALL be treated as invalid before position changes or displacement PSRs are emitted
- **AND** successful charge damage SHALL still apply while both units remain in their original hexes
- **AND** helper, event-sourced resolution, runner resolution, catalog, and source-truth audit evidence SHALL cite the MegaMek `Compute.isValidDisplacement` and `Mek.getMaxElevationChange` anchors
- **AND** domino-chain displacement, friendly-unit avoidance, and DropShip-radius displacement SHALL remain explicit gaps

#### Scenario: Runner physical displacement refreshes same-phase occupancy

- **GIVEN** one physical attack displaces a unit into a hex that a later same-phase physical attack would otherwise use as its displacement destination
- **WHEN** the runner resolves the later physical attack
- **THEN** the runner SHALL evaluate displacement legality against the refreshed grid occupancy from the earlier displacement payload
- **AND** the later attack SHALL NOT emit a displacement payload or charge-specific displacement PSRs when that refreshed destination is occupied
- **AND** runner behavior, parity catalog, task list, and source-truth audit evidence SHALL report the same stale-occupancy closure
- **AND** domino-chain displacement, friendly-unit avoidance, and DropShip-radius displacement SHALL remain explicit gaps

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

#### Scenario: Death from above helper rejects mechanical jump boosters

- **GIVEN** a DFA helper evaluates an attacker that jumped using a mechanical jump booster
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `MechanicalJumpBooster`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** the validation catalog SHALL mark this as helper-only until runtime movement declarations hydrate the mechanical jump booster movement step

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

#### Scenario: Death from above helper checks VTOL/WIGE elevation reach

- **GIVEN** a DFA helper evaluates an airborne VTOL or WIGE target
- **WHEN** the target elevation above the attacker's height is within the attacker's jump MP
- **THEN** the generic airborne-target gate SHALL NOT reject the target
- **WHEN** the target elevation above the attacker's height exceeds the attacker's jump MP
- **THEN** death from above SHALL be rejected with `ElevationMismatch`
- **AND** the validation catalog SHALL mark this as helper-only until runtime physical declarations hydrate VTOL/WIGE target motion state and attacker jump MP

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

### Requirement: Source-Backed Physical Weapon Runtime Support

BattleMech physical weapon runtime support SHALL stay aligned with MegaMek `ClubAttackAction` damage, to-hit, and legality behavior before a cataloged physical weapon is marked integrated. Physical equipment that modifies existing physical actions, such as talons, SHALL be source-checked against the relevant MegaMek action resolvers before it is marked helper-only or integrated.

#### Scenario: Retractable blade uses source-backed damage, to-hit, and extension gate

- **GIVEN** a BattleMech declares a retractable blade attack against an adjacent valid target
- **WHEN** the blade is extended or the caller does not yet hydrate blade mode state
- **THEN** helper, eligibility, intent/wire validation, event-sourced resolution, and runner resolution SHALL accept `retractable-blade` as a runtime physical attack type
- **AND** target damage SHALL be `ceil(attackerWeight / 10)` with active TSM affecting effective weight
- **AND** to-hit SHALL include the source-backed `-2` retractable blade modifier
- **WHEN** the caller explicitly marks the retractable blade as not extended
- **THEN** helper and event-sourced declaration validation SHALL reject the attack with `RetractableBladeNotExtended`
- **AND** the validation catalog SHALL keep physical weapon mode hydration as a separate out-of-scope concern until combat units carry actual physical weapon mode state

#### Scenario: Flail and wrecking ball use source-backed constant club attacks

- **GIVEN** a BattleMech declares a flail or wrecking ball attack against an adjacent valid target
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** both `flail` and `wrecking-ball` SHALL be accepted as runtime physical attack types
- **AND** flail target damage SHALL be constant `9` plus physical damage bonuses, with underwater halving but without active TSM doubling
- **AND** wrecking ball target damage SHALL be constant `8` plus physical damage bonuses, with underwater halving but without active TSM doubling
- **AND** flail to-hit SHALL include source-backed `+0` and wrecking ball to-hit SHALL include source-backed `+1`
- **AND** flail SHALL not require a hand actuator but SHALL stay blocked on quad BattleMechs
- **AND** wrecking ball SHALL be treated as a non-arm-mounted physical weapon for arm, hand, shoulder, No Arms, and quad legality gates
- **AND** the validation catalog SHALL have no unsupported standalone official physical weapon runtime types after flail and wrecking ball integration, while modifier-only claw/talon lifecycle and full mounted physical-weapon lifecycle remain visible gaps

#### Scenario: Talons modify kick and DFA damage without becoming a selectable attack type

- **GIVEN** a BattleMech has explicit biped leg talon combat state and a working foot actuator
- **WHEN** it resolves a kick using that leg
- **THEN** kick target damage SHALL apply MegaMek's source-backed `round(baseKickDamage * 1.5)` talon modifier before physical damage bonuses
- **WHEN** it resolves death from above with at least one qualifying talon leg
- **THEN** DFA target damage SHALL apply MegaMek's source-backed truncating `baseDfaDamage * 1.5` talon modifier before physical damage bonuses
- **AND** talons SHALL remain non-selectable in runtime physical attack option lists because they modify existing kick/DFA actions rather than declaring a distinct physical attack
- **AND** catalog UnitHydration SHALL derive biped leg talon state from `LEFT_LEG` and `RIGHT_LEG` critical slots containing Talons entries
- **AND** the validation catalog SHALL keep destroyed/missing/breached talon equipment lifecycle and non-biped talon arm-location behavior visible as remaining gaps

#### Scenario: Claws modify punch damage and to-hit without becoming a selectable attack type

- **GIVEN** a BattleMech has explicit arm claw combat state for the punching arm
- **WHEN** it resolves a punch using that arm
- **THEN** punch target damage SHALL use MegaMek's source-backed `ceil(attackerWeight / 7)` claw base before actuator, pilot ability, quirk, and environmental modifiers
- **AND** punch to-hit SHALL include MegaMek's source-backed `+1` claw modifier while suppressing the hand-actuator destroyed modifier for that claw arm
- **AND** claws SHALL remain non-selectable in runtime physical attack option lists because they modify punch rather than declaring a distinct physical attack
- **AND** catalog UnitHydration SHALL derive arm claw state from `LEFT_ARM` and `RIGHT_ARM` critical slots containing `ISClaw` entries
- **AND** the validation catalog SHALL keep destroyed/missing/breached claw equipment lifecycle, the PLAYTEST_3 no-modifier option, and claw club-with-hand interactions visible as remaining gaps

### Requirement: Designator Marker Replay State

Designator marker events SHALL replay into the same target marker state consumed by combat resolution. TAG markers SHALL set transient `tagDesignated` state that clears at turn start. Standard NARC markers SHALL append the marking team to `narcedBy` without duplicate entries and SHALL persist across turn starts. iNARC launcher hits SHALL derive the attached `iNarcPods` `podType` from the selected ammo weapon type so Homing, ECM, Haywire, and Nemesis ammo can each attach distinct marker state without falling back to `narcedBy`. Direct NARC-compatible missile cluster resolution and runner to-hit declaration SHALL consume Homing pod state. Runner to-hit declaration SHALL consume Haywire pod state on the attacker as a source-backed +1 attacker to-hit modifier. Runner missile cluster resolution SHALL consume attacker iNARC ECM pod state as flight-path ECM for Artemis IV/prototype IV/V suppression without treating it as target ECM for NARC guidance. Helper-level C3 ECM disruption SHALL consume iNARC ECM pod state and deny C3 targeting benefit through the same ECM-disrupted C3 helper path. Runner weapon attack resolution SHALL consume friendly intervening iNARC Nemesis pod state to redirect source-backed direct confusable missile attacks. Remaining iNARC ECM sensor effects and automatic runner C3 state hydration SHALL remain explicit gaps until their variant-specific runner effects are represented.

#### Scenario: Replay applies TAG, standard NARC, and iNARC variant marker state

- **GIVEN** a replay stream contains `DesignatorMarkerApplied` events for TAG, standard NARC, and iNARC variant hits
- **WHEN** the event-sourced state reducer applies those events
- **THEN** TAG events SHALL mark the target as TAG-designated for the turn
- **AND** standard NARC events SHALL add the marking team to the target's `narcedBy` list without duplicate markers
- **AND** iNARC selected-ammo hits SHALL add Homing, ECM, Haywire, or Nemesis `{ teamId, podType }` entries to target `iNarcPods` without adding the team to `narcedBy`
- **AND** direct NARC-compatible missile cluster and to-hit resolution SHALL consume source-backed iNARC Homing state while indirect-fire cluster bonuses stay suppressed
- **AND** attack declaration SHALL consume source-backed iNARC Haywire state on the attacker as a +1 to-hit modifier
- **AND** missile cluster resolution SHALL consume source-backed attacker iNARC ECM state to suppress Artemis flight-path guidance while preserving target-only NARC guidance
- **AND** C3 ECM disruption helpers SHALL consume source-backed iNARC ECM pod state to deny C3 targeting benefit
- **AND** direct confusable missile attacks SHALL redirect to friendly intervening units carrying source-backed iNARC Nemesis pod state
- **AND** the catalog SHALL continue to list remaining iNARC ECM sensor effects and runner C3 hydration as helper-only until variant effects are implemented

### Requirement: Source-Truth Cross-Check Discipline

Combat feature work SHALL update OpenSpec, the validation catalog, and executable tests together. Before marking a mechanic integrated, the implementation SHALL be cross-checked against official rules or MegaMek / MekHQ behavior notes, with gaps recorded as partial or unsupported rather than inferred as complete.

#### Scenario: Feature headway updates specs and evidence together

- **GIVEN** a developer adds or changes BattleMech combat logic
- **WHEN** the work changes action availability, modifiers, turn lifecycle, damage, heat, movement, targetability, or resolution outcomes
- **THEN** the active OpenSpec change SHALL be updated in the same slice
- **AND** the validation catalog SHALL be updated in the same slice
- **AND** focused tests SHALL prove the updated rule path
