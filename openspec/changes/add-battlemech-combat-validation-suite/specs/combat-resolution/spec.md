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

#### Scenario: Missing action surfaces stay visible

- **GIVEN** a BattleMech action surface has source-backed or product-visible relevance but no authoritative command, game intent, wire payload, P2P translation, or runner action path
- **WHEN** the action support catalog is contract-tested
- **THEN** sprint movement, voluntary go-prone, MASC activation, and Supercharger activation SHALL appear as unsupported absent-action rows
- **AND** those rows SHALL NOT be inferred from helper prose or omitted because no UI command currently emits them

#### Scenario: Weapon catalog hygiene traps stay explicit

- **GIVEN** official ranged weapon validation relies on catalog hydration rather than legacy defaults
- **WHEN** the validation scope and requirement crosswalks are contract-tested
- **THEN** the static weapon database subset, synthetic Medium Laser fallback ban, and variable missile damage-string guard SHALL each appear as explicit integrated validation-scope rows
- **AND** fallback-prevention and damage-string-hazards requirements SHALL reference those specific rows rather than relying only on broad official-catalog coverage
- **AND** broad known-limitation filters SHALL remain banned from catalog validation gates

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

Designator marker events SHALL replay into the same target marker state consumed by combat resolution. TAG markers SHALL set transient `tagDesignated` state that clears at turn start. Standard NARC markers SHALL append the marking team to `narcedBy` without duplicate entries and SHALL persist across turn starts. iNARC launcher hits SHALL derive the attached `iNarcPods` `podType` from the selected ammo weapon type so Homing, ECM, Haywire, and Nemesis ammo can each attach distinct marker state without falling back to `narcedBy`. Direct NARC-compatible missile cluster resolution and runner to-hit declaration SHALL consume Homing pod state. Runner to-hit declaration SHALL consume Haywire pod state on the attacker as a source-backed +1 attacker to-hit modifier. Runner missile cluster resolution SHALL consume attacker iNARC ECM pod state as flight-path ECM for Artemis IV/prototype IV/V suppression without treating it as target ECM for NARC guidance. C3 ECM disruption SHALL consume iNARC ECM pod state and deny C3 targeting benefit through the same ECM-disrupted C3 helper path. Runner weapon attack resolution SHALL consume friendly intervening iNARC Nemesis pod state to redirect source-backed direct confusable missile attacks. Remaining iNARC ECM sensor effects and automatic C3 network assembly from hydrated equipment SHALL remain explicit gaps until their variant-specific runner effects are represented.

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
- **AND** the catalog SHALL continue to list remaining iNARC ECM sensor effects and automatic C3 network assembly from hydrated equipment as explicit gaps until those effects are implemented

### Requirement: Source-Backed Sandblaster Cluster-Table Modifier

Cluster-table validation SHALL apply MegaMek's Sandblaster SPA modifier when the attacker has Sandblaster, the firing weapon matches the designated weapon type, and attack range is known. Sandblaster SHALL add `+4` at short range, `+3` beyond short through medium, and `+2` beyond medium to the cluster-table roll, and SHALL take precedence over Cluster Hitter for that attack. MekStation SHALL apply this only to represented LB-X and missile cluster-table resolution until UAC/RAC and TacOps rapid-fire AC rate-of-fire Sandblaster semantics are modeled.

#### Scenario: Sandblaster applies to designated LB-X cluster fire

- **GIVEN** a pilot with Sandblaster has designated an LB-X autocannon
- **AND** the LB-X autocannon fires in cluster mode at short range
- **WHEN** cluster-table damage is resolved
- **THEN** the cluster-table roll SHALL include the source-backed `+4` Sandblaster modifier
- **AND** the validation catalog SHALL keep UAC/RAC and rapid-fire AC Sandblaster support as a visible remaining gap

#### Scenario: Sandblaster SPA catalogs require weapon designation

- **GIVEN** the canonical SPA catalog and legacy gameplay SPA catalog both expose Sandblaster
- **WHEN** the BattleMech combat catalog contract validates SPA metadata
- **THEN** both Sandblaster entries SHALL require a `weapon_type` designation
- **AND** the legacy gameplay SPA catalog SHALL describe the source-backed range-based cluster-table bonus instead of the obsolete flat UAC/RAC bonus

### Requirement: C3 Range Modifier Integration

Direct runner weapon attack declarations SHALL consume explicit `IGameState.c3Network` state when scenario/session builders provide it. The runner SHALL refresh C3 member positions and ECM/iNARC ECM disruption from current unit state before calculating the declared to-hit number, SHALL suppress C3 range sharing for indirect fire, SHALL use default MegaMek C3 behavior where the network range-sharing unit does not need line of sight to the target, and SHALL keep automatic C3 network assembly from hydrated equipment explicit until those state builders exist.

#### Scenario: Direct weapon attack uses explicit C3 state

- **GIVEN** a direct weapon attack has an attacker and same-team spotter in explicit C3 network state
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL use the best C3 network range bracket when it improves the attacker's own bracket
- **AND** current unit positions SHALL override stale C3 member positions before range math
- **AND** iNARC ECM pod state on a C3 member SHALL deny C3 benefit through the ECM-disrupted C3 path
- **AND** the attack payload SHALL retain the attacker's actual range band while listing the effective C3 range math in modifiers

#### Scenario: Catalog hydration records mounted C3 equipment roles

- **GIVEN** a BattleMech catalog unit carries mounted C3 Master, C3 Slave, boosted C3, or C3i equipment in its equipment list or critical slots
- **WHEN** UnitHydration creates combat state for that unit
- **THEN** the unit state SHALL record mounted C3 equipment roles as `master`, `slave`, or `c3i` with source equipment id and mount location
- **AND** boosted C3 master/slave entries SHALL retain a boosted marker in the hydrated equipment state
- **AND** Battle Armor C3 and Battle Armor Improved C3 entries SHALL NOT hydrate as BattleMech C3 equipment
- **AND** the catalog SHALL continue to list battle-wide C3/C3i network assembly from hydrated equipment as an explicit gap until session builders create `IGameState.c3Network`

#### Scenario: Default C3 range sharing does not require spotter LOS

- **GIVEN** a direct weapon attack has legal attacker-to-target LOS
- **AND** the nearest same-team C3 network member has a better range bracket but blocked LOS to the target
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL still use that member's improved C3 range bracket
- **AND** the catalog SHALL not list default C3 spotter LOS hydration as a helper-only gap
- **AND** PLAYTEST_3 C3 spotter LOS gating SHALL remain out of scope until MekStation models rules-profile-specific C3 options

#### Scenario: C3 remaining gaps stay separate from explicit-state support

- **GIVEN** the runner consumes explicit C3 network state for direct weapon attack to-hit math
- **WHEN** the to-hit support catalog and requirement crosswalk are contract-tested
- **THEN** automatic C3 equipment/network formation SHALL remain a helper-only to-hit row
- **AND** the integrated `c3` row SHALL describe explicit network-state consumption, position refresh, ECM/iNARC ECM disruption, indirect-fire suppression, and default no-LOS-required C3 range sharing

### Requirement: Hull-Down Runner To-Hit Integration

Runner weapon attack declarations SHALL consume explicit target `IUnitGameState.hullDown` state. Hull-down targets SHALL receive MegaMek's source-backed +2 terrain to-hit modifier instead of the normal partial-cover +1 modifier, and confirmed front-arc leg hit-location rolls SHALL be redirected through the hull-down hit-location option before damage is applied.

#### Scenario: Explicit hull-down target affects declared and resolved attacks

- **GIVEN** a target BattleMech has explicit `hullDown: true`
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL include a +2 `Hull-Down` terrain modifier
- **AND** the normal `Partial Cover` modifier SHALL NOT also be emitted for that attack
- **AND** a confirmed front-arc leg hit-location roll SHALL resolve against center torso through hull-down hit-location logic

### Requirement: Active TSM Movement Validation

Runner movement validation SHALL consume explicit BattleMech `hasTSM` state and current heat when calculating movement capability. Active TSM SHALL follow MegaMek's source-backed sequence: apply heat movement penalties and the heat-9 TSM walk bonus to walk MP, derive run MP from that adjusted walk MP, then validate the declared movement against the adjusted capability.

#### Scenario: Active TSM expands movement validation at heat 9

- **GIVEN** a BattleMech has `hasTSM: true`, base walk MP 4, and current heat 9
- **WHEN** the runner validates a 5 MP walking movement
- **THEN** the movement SHALL be accepted with 5 MP used
- **AND** a BattleMech with the same TSM equipment below heat 9 SHALL NOT receive the TSM walk bonus
- **AND** the movement-enhancement catalog SHALL mark TSM movement as integrated while leaving MASC and Supercharger helper-only

### Requirement: Source-Backed Active MASC/Supercharger Run Movement Boundary

Runner movement validation SHALL consume explicit active `activeMASC` and `activeSupercharger` BattleMech combat state when calculating running movement capability. A single active MASC or Supercharger SHALL double the effective walk MP for run validation, and active MASC plus active Supercharger SHALL validate run movement against `ceil(effectiveWalkMP * 2.5)`. Runner movement SHALL queue the corresponding MASC and/or Supercharger failure PSR triggers when an explicit active booster is used for running movement. Those pending PSRs SHALL carry source-backed standard fixed target numbers from explicit `mascTurnsUsed` and `superchargerTurnsUsed` prior-use state, defaulting first use to 3 and mapping prior-use counts through `[3, 5, 7, 11, 13, 13, 13]`. At turn reset, runner state SHALL advance the used booster's prior-use counter, clear active booster use, and decay idle prior-use counters. Alternate MASC option tables, IndustrialMek/support-unit supercharger adjustment, `MovementType.Sprint`, activation command/wire payloads, Edge rerolls, and failure critical-slot damage SHALL remain explicit gaps.

#### Scenario: Active MASC expands run validation and queues a failure PSR

- **GIVEN** a BattleMech has `hasMASC: true`, `activeMASC: true`, and base walk/run MP `4/6`
- **WHEN** the runner validates an 8 MP running movement
- **THEN** the movement SHALL be accepted with 8 MP used
- **AND** the unit SHALL receive a pending `MASCFailure` PSR with fixed target number 3
- **AND** the movement-enhancement catalog SHALL keep MASC helper-only with MegaMek source anchors for the implemented run/trigger boundary and explicit gaps for sprint and full failure lifecycle

#### Scenario: Active MASC and Supercharger combine for boosted run validation

- **GIVEN** a BattleMech has `activeMASC: true`, `activeSupercharger: true`, and base walk/run MP `4/6`
- **WHEN** the runner validates a 10 MP running movement
- **THEN** the movement SHALL be accepted with 10 MP used
- **AND** the unit SHALL receive pending `MASCFailure` and `SuperchargerFailure` PSRs
- **AND** a BattleMech with installed but inactive MASC SHALL NOT receive expanded run MP

#### Scenario: Prior active booster use raises fixed failure target numbers

- **GIVEN** a BattleMech has `activeMASC: true`, `activeSupercharger: true`, `mascTurnsUsed: 2`, `superchargerTurnsUsed: 3`, and base walk/run MP `4/6`
- **WHEN** the runner validates a 10 MP running movement
- **THEN** the movement SHALL be accepted with 10 MP used
- **AND** the unit SHALL receive a pending `MASCFailure` PSR with fixed target number 7
- **AND** the unit SHALL receive a pending `SuperchargerFailure` PSR with fixed target number 11

#### Scenario: Turn reset advances and decays booster prior-use counters

- **GIVEN** a BattleMech ended the previous movement phase with explicit active MASC and Supercharger use
- **WHEN** the runner resets state for the next turn
- **THEN** MASC and Supercharger prior-use counters SHALL advance
- **AND** active MASC and Supercharger use SHALL clear before the next movement phase
- **AND** a later idle reset SHALL decay those counters using the source-backed MegaMek idle-decay marker

### Requirement: Source-Backed Partial Wing Jump Movement

Runner movement validation SHALL consume explicit BattleMech `partialWingJumpBonus` state when calculating jump movement capability and jump heat. Partial Wing SHALL follow MegaMek's source-backed sequence: apply the explicit bonus only when the unit already has positive base jump MP, expand jump MP by that bonus, and subtract the bonus from generated jump heat before the minimum jump-heat floor is applied. Atmosphere-specific Partial Wing bonuses and damaged/bad torso critical-slot refinements SHALL remain explicit gaps until combat state hydrates those source-backed conditions.

#### Scenario: Partial Wing expands jump validation and reduces jump heat

- **GIVEN** a BattleMech has `partialWingJumpBonus: 2` and base jump MP 3
- **WHEN** the runner validates a 5 MP jumping movement
- **THEN** the movement SHALL be accepted with 5 MP used
- **AND** generated jump heat SHALL subtract the Partial Wing bonus before applying the minimum jump heat floor
- **AND** the movement-enhancement catalog SHALL mark Partial Wing movement as integrated with MegaMek source anchors

#### Scenario: Partial Wing does not create jump capability

- **GIVEN** a BattleMech has `partialWingJumpBonus: 2` and base jump MP 0
- **WHEN** the runner validates a jumping movement
- **THEN** the movement SHALL be rejected as unable to jump

### Requirement: Source-Backed Dodge Maneuver To-Hit

Runner ranged to-hit validation SHALL apply Dodge Maneuver as a +2 target modifier only when the target has the source-backed Dodge Maneuver SPA and is explicitly dodging. Both canonical `dodge_maneuver` and legacy `dodge-maneuver` ids SHALL resolve through the SPA canonicalization layer. When target unit type is explicit, non-Mek targets SHALL NOT receive the Dodge Maneuver target modifier.

#### Scenario: Dodging Mek target applies Dodge Maneuver

- **GIVEN** a ranged weapon attack targets a BattleMech with `dodge_maneuver`
- **AND** the target has `isDodging: true`
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL include a +2 `Dodge Maneuver` SPA modifier

#### Scenario: Non-dodging or non-Mek targets do not apply Dodge Maneuver

- **GIVEN** a ranged weapon attack targets a unit with `dodge_maneuver`
- **WHEN** the target is not explicitly dodging
- **THEN** the declared to-hit number SHALL NOT include a `Dodge Maneuver` modifier
- **WHEN** the target unit type is explicit and is not a Mek type
- **THEN** the declared to-hit number SHALL NOT include a `Dodge Maneuver` modifier

### Requirement: Source-Backed Jump Attack SPA To-Hit Relief

Ranged to-hit validation SHALL apply MegaMek's jump-attacker SPA relief: Jumping Jack reduces the attacker's jump movement penalty from +3 to +1, Hopping Jack reduces it from +3 to +2, and plain jump movement remains +3. Both canonical (`jumping_jack`, `hopping_jack`) and legacy (`jumping-jack`, `hopping-jack`) ids SHALL resolve through the SPA canonicalization layer. If both jump SPAs are present, Jumping Jack SHALL take precedence.

#### Scenario: Jumping Jack applies stronger jump attacker relief

- **GIVEN** a ranged weapon attack is declared by an attacker with `jumping_jack`
- **AND** the attacker moved by jumping this turn
- **WHEN** the to-hit number is computed
- **THEN** the declared to-hit number SHALL include a `Jumping Jack` SPA modifier of `-2`
- **AND** the net attacker jump movement penalty SHALL be +1

#### Scenario: Hopping Jack applies lighter jump attacker relief

- **GIVEN** a ranged weapon attack is declared by an attacker with `hopping_jack`
- **AND** the attacker moved by jumping this turn
- **WHEN** the to-hit number is computed
- **THEN** the declared to-hit number SHALL include a `Hopping Jack` SPA modifier of `-1`
- **AND** the net attacker jump movement penalty SHALL be +2

#### Scenario: Non-jumping attackers do not consume jump SPAs

- **GIVEN** a ranged weapon attack is declared by an attacker with `hopping_jack` or `jumping_jack`
- **WHEN** the attacker did not jump this turn
- **THEN** no jump-attack SPA modifier SHALL apply

### Requirement: Source-Backed Terrain Master Frogman Physical To-Hit

Physical to-hit validation SHALL apply MegaMek's Terrain Master: Frogman relief as a `-1` to-hit modifier only when the attacker has canonical `tm_frogman` or legacy `terrain-master-frogman`, the attacker is a Mek or ProtoMek, and the attacker occupies water deeper than level 1. Runner and event-sourced physical resolution SHALL derive or accept attacker water depth without using target-only water. Generic Terrain Master movement and PSR behavior beyond source-backed Frogman water-entry and Mountaineer rubble-entry relief SHALL remain an explicit gap until separately source-backed.

#### Scenario: Frogman applies in depth-2 attacker water

- **GIVEN** a physical attack is declared by a BattleMech or ProtoMech attacker with `tm_frogman`
- **AND** the attacker occupies depth-2 or deeper water
- **WHEN** the physical to-hit number is computed
- **THEN** the to-hit number SHALL include a `Frogman` SPA modifier of `-1`

#### Scenario: Frogman does not apply from shallow, target-only, or non-Mek state

- **GIVEN** a physical attack is declared by an attacker with `tm_frogman`
- **WHEN** the attacker occupies depth-1 or shallower water
- **THEN** no `Frogman` modifier SHALL apply
- **WHEN** only the target occupies water
- **THEN** no `Frogman` modifier SHALL apply
- **WHEN** the attacker unit type is explicit and is neither Mek nor ProtoMek
- **THEN** no `Frogman` modifier SHALL apply

### Requirement: Source-Backed Terrain Master Frogman Water-Entry PSR

Movement PSR validation SHALL apply MegaMek's water-entry depth modifier when a runner movement step enters water with a known level: depth 1 SHALL apply `-1`, depth 2 SHALL apply `0`, and depth 3 or deeper SHALL apply `+1`. The PSR resolver SHALL also apply Terrain Master: Frogman as a named `-1` SPA modifier only when the pending PSR is an entering-water PSR, the water depth is greater than 1, the acting unit has canonical `tm_frogman` or legacy `terrain-master-frogman`, and the acting unit is a Mek or ProtoMek. Frogman SHALL NOT apply to exiting-water PSRs, shallow water, non-water terrain PSRs, or explicit non-Mek/non-ProtoMek units.

#### Scenario: Frogman applies to depth-2 water-entry PSR

- **GIVEN** a BattleMech or ProtoMech with `tm_frogman`
- **AND** a movement step enters depth-2 or deeper water
- **WHEN** the pending entering-water PSR is resolved
- **THEN** the PSR target number SHALL include a `Frogman` SPA modifier of `-1`

#### Scenario: Water-depth modifier is queued from complex terrain

- **GIVEN** a runner movement step enters a water terrain feature with a known level
- **WHEN** the terrain movement PSR is queued
- **THEN** the pending entering-water PSR SHALL retain the water depth
- **AND** the PSR trigger modifier SHALL match MegaMek's depth 1 `-1`, depth 2 `0`, and depth 3+ `+1` table

#### Scenario: Frogman water-entry boundaries

- **GIVEN** a pending entering-water PSR for a unit with `tm_frogman`
- **WHEN** the water depth is 1 or lower
- **THEN** no `Frogman` PSR modifier SHALL apply
- **WHEN** the unit type is explicit and is neither Mek nor ProtoMek
- **THEN** no `Frogman` PSR modifier SHALL apply
- **WHEN** the PSR reason is not entering water
- **THEN** no `Frogman` PSR modifier SHALL apply

### Requirement: Source-Backed Terrain Master Mountaineer Rubble-Entry PSR

Movement PSR validation SHALL apply MegaMek's Terrain Master: Mountaineer relief as a named `-1` SPA modifier only when the pending PSR is an entering-rubble PSR and the acting unit has canonical `tm_mountaineer` or legacy `terrain-master-mountaineer`. Mountaineer movement-cost and elevation movement effects SHALL remain explicit gaps until separately wired.

#### Scenario: Mountaineer applies to entering-rubble PSR

- **GIVEN** a unit with `tm_mountaineer`
- **AND** the unit has a pending entering-rubble PSR
- **WHEN** the PSR target number is computed
- **THEN** the PSR target number SHALL include a `Mountaineer` SPA modifier of `-1`

#### Scenario: Mountaineer rubble-entry boundaries

- **GIVEN** a unit with `tm_mountaineer`
- **WHEN** the pending PSR reason is not entering rubble
- **THEN** no `Mountaineer` PSR modifier SHALL apply

### Requirement: Source-Backed Swamp Bog-Down Gap

Terrain PSR validation SHALL keep MegaMek's BattleMech swamp bog-down rule visible as an explicit unsupported stuck-state gap until MekStation has a bogged/stuck lifecycle state. The catalog SHALL NOT model swamp bog-down as a normal pending PSR that causes a fall on failure. MegaMek mud bog-down SHALL remain excluded from the BattleMech swamp gap because biped and quad movement modes do not bog down in mud. Terrain Master: Swamp Beast bog-down relief SHALL remain helper-only until the stuck-state path exists.

#### Scenario: Swamp bog-down is cataloged as stuck-state gap

- **GIVEN** the terrain PSR support catalog is generated
- **WHEN** swamp terrain support is inspected
- **THEN** swamp SHALL be helper-only with MegaMek source references for bog-down and Swamp Beast relief
- **AND** the gap SHALL name the missing bogged/stuck lifecycle state

#### Scenario: Mud is not promoted to a BattleMech bog-down gap

- **GIVEN** the terrain PSR support catalog is generated
- **WHEN** mud terrain support is inspected
- **THEN** mud SHALL remain integrated for the existing BattleMech movement-cost and terrain-modifier coverage

### Requirement: Source-Backed Cross-Country Scope Split

Pilot modifier validation SHALL keep MegaMek's Cross-Country SPA visible as an explicit non-BattleMech combat-vehicle movement/passability scope split. The BattleMech combat matrix SHALL NOT represent Cross-Country as a terrain PSR modifier unless a future source-backed BattleMech rule is identified.

#### Scenario: Cross-Country is cataloged outside BattleMech PSRs

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Cross-Country support is inspected
- **THEN** the SPA SHALL be unsupported with MegaMek source references to combat-vehicle terrain movement-cost and passability behavior
- **AND** the movement resolver family SHALL own the visible gap
- **AND** the PSR resolver family SHALL NOT assign Cross-Country

### Requirement: Source-Backed Heavy Lifter Carry/Throw Gap

Pilot modifier validation SHALL keep MegaMek's Heavy Lifter SPA visible as an unsupported carry/throw-object action gap. The source-backed BattleMech behavior SHALL be recorded as a `1.5x` ground-object lift-capacity multiplier for Meks with arms, while MekStation lacks object carry/throw physical action declarations and resolution.

#### Scenario: Heavy Lifter is cataloged as lift capacity without action support

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Heavy Lifter support is inspected
- **THEN** the SPA SHALL be unsupported with MegaMek source references to BattleMech lift-capacity behavior
- **AND** the movement resolver family SHALL own the visible carry/throw action gap
- **AND** Heavy Lifter SHALL NOT be represented as a physical damage or to-hit modifier

### Requirement: Source-Backed Shaky Stick Ground-To-Air Gap

Pilot modifier validation SHALL keep MegaMek's Shaky Stick SPA visible as an unsupported ground-to-air defender to-hit gap. The source-backed behavior SHALL be recorded as a `+1` defender modifier only when an airborne or airborne VTOL/WIGE target is attacked by a non-airborne attacker, while MekStation lacks airborne attacker/target state for the BattleMech ranged to-hit matrix.

#### Scenario: Shaky Stick is cataloged as airborne target-state gap

- **GIVEN** the canonical SPA combat scope catalog is generated
- **WHEN** Shaky Stick support is inspected
- **THEN** the SPA SHALL be unsupported with MegaMek source references to the airborne target and non-airborne attacker gates
- **AND** Shaky Stick SHALL NOT be represented as a generic BattleMech target movement, terrain, or PSR modifier

### Requirement: Source-Backed Initiative Quirk Bonuses

Initiative validation SHALL apply MegaMek's Command Mech and Battle Computer force initiative bonuses from active conscious units. Battle Computer SHALL provide `+2`, Command Mech SHALL provide `+1`, and the bonuses SHALL NOT stack. Explicit HQ initiative equipment bonuses SHALL be treated as the same best-of force turn bonus as initiative quirks, while explicit command initiative equipment bonuses SHALL stack as a separate command bonus. Tactical Genius SHALL be modeled as a reroll request that replaces only the requested side's raw initiative roll when that side has an active conscious Tactical Genius unit, not as a flat modifier. Raw `2d6` initiative payload fields SHALL remain raw dice values for replay/RNG arbitration, with modifier and total fields carrying adjusted values. Automatic command-console/HQ equipment hydration and Combat Intuition first-round sequencing SHALL remain explicit gaps until equipment-derived command state and movement-before-initiative flow are modeled. Automatic initiative equipment hydration SHALL fail closed unless source-kind/rules-profile, working/default-mode communications tonnage, active command-console crew, heavy-or-larger weight class, IndustrialMek, and advanced-fire-control eligibility context are represented.

#### Scenario: Battle Computer bonus remains non-cumulative with Command Mech

- **GIVEN** the player force has an active conscious unit with both `battle_computer` and `command_mech`
- **AND** raw initiative dice are lower than the opponent by 3
- **WHEN** initiative is rolled
- **THEN** the player receives only the source-backed `+2` bonus
- **AND** the opponent still wins
- **AND** the event payload retains raw `2d6` values plus modifier and total fields

#### Scenario: Explicit command bonus stacks with the best HQ or quirk bonus

- **GIVEN** the player force has an active conscious unit with `battle_computer`
- **AND** that force has an explicit command initiative equipment bonus of `+2`
- **WHEN** initiative is rolled
- **THEN** the player modifier SHALL be the best HQ/quirk bonus plus the command bonus
- **AND** raw `2d6` payload values SHALL remain unchanged

#### Scenario: Explicit HQ and quirk bonuses do not stack

- **GIVEN** the player force has source-backed `battle_computer`
- **AND** the player force has an explicit HQ initiative bonus of `+2`
- **WHEN** initiative is rolled
- **THEN** only the best HQ or quirk bonus SHALL apply before command bonuses

#### Scenario: Tactical Genius replaces the requested side roll

- **GIVEN** the player force has an active conscious unit with `tactical_genius`
- **AND** Tactical Genius is requested for the player side
- **WHEN** initiative is rolled
- **THEN** the player raw initiative roll SHALL be replaced with a new raw `2d6` roll
- **AND** the event payload SHALL retain the initial raw player and opponent rolls separately
- **AND** no flat Tactical Genius initiative modifier SHALL be applied

#### Scenario: Tactical Genius request requires an eligible active unit

- **GIVEN** no active conscious unit on the requested side has `tactical_genius`
- **WHEN** Tactical Genius is requested for that side
- **THEN** no replacement roll SHALL be consumed
- **AND** no Tactical Genius reroll metadata SHALL be emitted

#### Scenario: Command-looking metadata does not imply initiative equipment hydration

- **GIVEN** a unit name, cockpit label, or equipment entry implies command-console or HQ communications equipment
- **AND** that unit does not provide explicit `initiativeHQBonus` or `initiativeCommandBonus`
- **WHEN** initiative is rolled
- **THEN** the initiative modifier SHALL remain `0`
- **AND** the combat validation catalog SHALL continue to mark automatic HQ communications and command-console hydration as unsupported until all MegaMek eligibility gates are modeled

### Requirement: Source-Backed Terrain Master Defender To-Hit Variants

Ranged to-hit validation SHALL apply MegaMek's Terrain Master defender to-hit variants from target state and target terrain: Forest Ranger SHALL add a `+1` to-hit modifier only when the target has canonical `tm_forest_ranger` or legacy `terrain-master-forest-ranger`, the target moved by walking, and the target occupies wooded terrain; Swamp Beast SHALL add a `+1` to-hit modifier only when the target has canonical `tm_swamp_beast` or legacy `terrain-master-swamp-beast`, the target moved by running, and the target occupies mud or swamp. Runner ranged attacks SHALL hydrate target terrain features into to-hit state. Generic Terrain Master movement and PSR behavior beyond source-backed Frogman water-entry and Mountaineer rubble-entry relief, including Swamp Beast bog-down relief, SHALL remain an explicit gap until separately source-backed.

#### Scenario: Forest Ranger applies to walking wooded targets

- **GIVEN** a ranged weapon attack targets a unit with `tm_forest_ranger`
- **AND** the target moved by walking this turn
- **AND** the target occupies woods
- **WHEN** the ranged to-hit number is computed
- **THEN** the declared to-hit number SHALL include a `Forest Ranger` SPA modifier of `+1`

#### Scenario: Swamp Beast applies to running mud or swamp targets

- **GIVEN** a ranged weapon attack targets a unit with `tm_swamp_beast`
- **AND** the target moved by running this turn
- **AND** the target occupies mud or swamp
- **WHEN** the ranged to-hit number is computed
- **THEN** the declared to-hit number SHALL include a `Swamp Beast` SPA modifier of `+1`

#### Scenario: Terrain Master defender variants require matching movement and terrain

- **GIVEN** a ranged weapon attack targets a unit with `tm_forest_ranger` or `tm_swamp_beast`
- **WHEN** the target movement type does not match that variant's MegaMek gate
- **THEN** no Terrain Master defender to-hit modifier SHALL apply
- **WHEN** the target terrain does not match that variant's MegaMek gate
- **THEN** no Terrain Master defender to-hit modifier SHALL apply

### Requirement: Source-Backed Maneuvering Ace Skidding PSR Relief

Runner movement and PSR resolution SHALL apply MegaMek's movement-before-skid PSR distance table and subtract 1 for canonical Maneuvering Ace only when resolving skidding PSRs. The skidding distance modifier SHALL be queued as PSR trigger state, while Maneuvering Ace SHALL be applied during PSR resolution from hydrated pilot ability state so runner and interactive paths share the same target-number math. Terrain-specific Maneuvering Ace PSR behavior beyond skidding SHALL remain an explicit catalog gap.

#### Scenario: Skidding PSRs consume distance and Maneuvering Ace modifiers

- **GIVEN** a running BattleMech turns on pavement or ice
- **WHEN** the movement phase queues a skidding PSR
- **THEN** the queued PSR SHALL carry the source-backed movement-before-skid distance modifier
- **WHEN** that PSR resolves for a pilot with `maneuvering_ace`
- **THEN** the target number SHALL include an additional `Maneuvering Ace` SPA modifier of `-1`
- **AND** non-skidding PSRs SHALL NOT receive the Maneuvering Ace skidding modifier

### Requirement: Source-Backed Animal Mimicry Quad-Mek PSR Relief

Runner and interactive PSR resolution SHALL apply MegaMek's source-backed Animal Mimicry `-1` piloting-roll modifier only for explicit quad BattleMech combat state. Both canonical `animal_mimic` and legacy `animal-mimicry` ids SHALL resolve through the SPA canonicalization layer. Animal Mimicry terrain-designation movement effects SHALL remain an explicit catalog gap until movement state consumes those designated-terrain rules.

#### Scenario: Quad Mek PSRs consume Animal Mimicry relief

- **GIVEN** a BattleMech has `isQuad: true` and the `animal_mimic` SPA
- **WHEN** runner or interactive pending PSRs resolve
- **THEN** the target number SHALL include an `Animal Mimicry` SPA modifier of `-1`
- **WHEN** runner or interactive stand-up PSRs resolve
- **THEN** the same `Animal Mimicry` SPA modifier SHALL apply
- **AND** non-quad units SHALL NOT receive the Animal Mimicry PSR modifier

### Requirement: Source-Backed Heat Lifecycle Catalog Anchors

Heat lifecycle support rows SHALL carry MegaMek source references before they are treated as integrated validation coverage. Startup SHALL be pinned to `HeatResolver` automatic restart below heat 14 and startup rolls at heat 14+ for non-manual shutdown. Shutdown SHALL be pinned to avoidable heat 14+ shutdown checks and automatic default heat 30 shutdown. Ammo-explosion risk SHALL be pinned to the heat 19+ roll path, and pilot heat damage SHALL be pinned to life-support heat 15/25+ damage resolution. Any future heat profile, optional TacOps heat, equipment-mode, or crew modifier expansion SHALL update those source references or add explicit gap rows instead of relying on prose.

#### Scenario: Heat lifecycle support rows expose source truth

- **GIVEN** the BattleMech heat rule support catalog is generated
- **WHEN** startup, shutdown, ammo-explosion risk, heat-induced ammo explosion, and pilot heat damage rows are inspected
- **THEN** each row SHALL expose structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the active OpenSpec task list SHALL record the cross-check as a completed heat-validation slice

### Requirement: Source-Backed Heat SPA Boundary

Heat-driven pilot ability rows SHALL distinguish source-backed MegaMek behavior from local helper behavior before claiming parity. Some Like It Hot SHALL carry MegaMek source references for reducing positive heat firing modifiers by 1. Hot Dog SHALL remain helper-only until MekStation's local +3 heat-threshold shift is reconciled with MegaMek's `hotDogMod = 1` target-number modifier. Cool Under Fire SHALL remain helper-only until a source authority for generated-heat relief is identified.

#### Scenario: Heat SPA support rows expose source truth

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Hot Dog, Cool Under Fire, Some Like It Hot, and the heat-application resolver row are inspected
- **THEN** Some Like It Hot SHALL be integrated with structured MegaMek source references
- **AND** Hot Dog SHALL be helper-only with structured MegaMek source references describing the target-number modifier mismatch
- **AND** Cool Under Fire SHALL be helper-only with the unresolved source authority recorded as a gap
- **AND** the heat-application resolver SHALL be helper-only until those heat-SPA gaps are resolved

### Requirement: Source-Truth Cross-Check Discipline

Combat feature work SHALL update OpenSpec, the validation catalog, and executable tests together. Before marking a mechanic integrated, the implementation SHALL be cross-checked against official rules or MegaMek / MekHQ behavior notes, with gaps recorded as partial or unsupported rather than inferred as complete.

#### Scenario: Feature headway updates specs and evidence together

- **GIVEN** a developer adds or changes BattleMech combat logic
- **WHEN** the work changes action availability, modifiers, turn lifecycle, damage, heat, movement, targetability, or resolution outcomes
- **THEN** the active OpenSpec change SHALL be updated in the same slice
- **AND** the validation catalog SHALL be updated in the same slice
- **AND** focused tests SHALL prove the updated rule path
