# Spec Delta: Combat Resolution - BattleMech Combat Validation Suite

## ADDED Requirements

### Requirement: BattleMech Combat Validation Catalog

Combat resolution SHALL maintain a catalog-driven validation suite that enumerates every BattleMech combat action, modifier, legality gate, source-truth reference, executable test surface, and unsupported gap. Catalog rows SHALL classify support as `integrated`, `helper-only`, `unsupported`, or `out-of-scope`, and unresolved `helper-only` / `unsupported` rows SHALL remain visible until an implementation and executable evidence exist.

#### Scenario: Unsupported mechanics stay explicit

- **GIVEN** a combat mechanic is known from source-truth rules but is not implemented
- **WHEN** the validation catalog is generated or contract-tested
- **THEN** the mechanic SHALL appear as `unsupported`
- **AND** the catalog SHALL include a concise reason or follow-up label
- **AND** the mechanic SHALL NOT be omitted from the suite
- **AND** helper-only and unsupported rows SHALL remain queryable as a machine-readable unresolved completion-blocker inventory
- **AND** the unresolved inventory SHALL expose stable catalog refs, support levels, evidence, gap text, and row-level source references outside test-local helper code
- **AND** combat validation tooling SHALL expose the unresolved inventory through a named command suitable for review and PR gates
- **AND** source-pinned non-BattleMech and non-combat control-plane rows SHALL be queryable as `out-of-scope` audit evidence through combat validation tooling without counting as BattleMech unresolved completion blockers

#### Scenario: Integrated mechanics require executable evidence

- **GIVEN** a combat mechanic is marked `integrated`
- **WHEN** the catalog contract tests run
- **THEN** the row SHALL reference executable tests or source support
- **AND** the referenced tests SHALL validate behavior through the narrowest helper and at least one higher-level combat path when that path exists

#### Scenario: Catalog maps declare source-boundary and executable test evidence

- **GIVEN** a combat validation support map catalogs one or more BattleMech combat mechanics
- **WHEN** the aggregate catalog contract tests run
- **THEN** the support map SHALL declare whether its source authority boundary is row-level source references, requirement-primary-authority inheritance, or a MekStation deviation boundary
- **AND** every map with integrated rows SHALL cite executable test files and the assertion surface those tests protect
- **AND** every indexed support row SHALL carry row-level source references, including MekStation product-boundary rows and unsupported gap rows
- **AND** maps that claim row-level source-reference authority SHALL fail contract validation if any row lacks structured `sourceRefs`
- **AND** MegaMek and MekHQ row references SHALL be commit-pinned and line-anchored
- **AND** MekStation deviation row references SHALL be line-anchored
- **AND** this map-level triad evidence SHALL NOT be treated as full row-level rule parity for mechanics that still rely on requirement inheritance or MekStation deviation boundaries

### Requirement: Diff-Area Outcome Traceability

Every implementation area touched by the BattleMech combat validation suite SHALL have a high-level expected outcome recorded in the OpenSpec change before that area is presented for review. The outcome text SHALL connect the code area to one of the three validation lanes: catalog contracts, behavior-class tests, or representative runner-vs-interactive integration scenarios.

#### Scenario: OpenSpec and audit files describe review outcomes

- **GIVEN** a combat feature slice changes `openspec/` or `docs/audits/`
- **WHEN** reviewers inspect the change
- **THEN** the files SHALL state the intended combat outcome, the source-truth authority boundary, and any unsupported gaps that remain visible
- **AND** detailed rule rows SHALL not be the only place where the feature's review purpose can be inferred

#### Scenario: Runner and catalog files describe quick-sim outcomes

- **GIVEN** a combat feature slice changes `src/simulation/runner/`
- **WHEN** the runner catalog and behavior tests execute
- **THEN** official weapon, ammo, critical-slot, equipment, movement, heat, physical, PSR, lifecycle, and terminal-state data SHALL hydrate from catalog or event state before use
- **AND** static weapon defaults, synthetic Medium Laser fallbacks, zero-damage string parsing, and broad known-limitation suppression SHALL remain explicit validation traps
- **AND** every integrated runner outcome SHALL cite executable catalog or behavior evidence

#### Scenario: Gameplay helper and interactive engine files describe shared behavior outcomes

- **GIVEN** a combat feature slice changes `src/utils/gameplay/` or `src/engine/`
- **WHEN** helper, event-sourced session, and interactive-engine paths are reviewed
- **THEN** legality checks, invalid attack no-side-effect guarantees, targetability, action locking, heat, PSR, damage, physical resolution, and terminal-state transitions SHALL match the cataloged behavior class
- **AND** any runner-only or helper-only behavior SHALL remain classified as partial or unsupported until a higher-level path proves the same outcome

#### Scenario: UI, wire, multiplayer, and type files describe action-boundary outcomes

- **GIVEN** a combat feature slice changes `src/components/gameplay/`, `src/lib/p2p/`, `src/lib/multiplayer/`, `src/types/gameplay/`, or `src/types/multiplayer/`
- **WHEN** action-surface and event-payload coverage is reviewed
- **THEN** the spec SHALL state which command, game intent, wire payload, P2P host translation, server dispatch, replay event, or type payload is expected to preserve the combat action outcome
- **AND** product-visible commands without official rule authority SHALL be cataloged as MekStation deviation or unsupported rows instead of implied BattleTech parity

#### Scenario: AI, scenario, and validation tooling files describe evidence outcomes

- **GIVEN** a combat feature slice changes AI selection, representative scenarios, or `scripts/validate-combat-suite.mjs`
- **WHEN** the validation suite is run
- **THEN** AI and scenario tests SHALL prove hydrated combat state is consumed for weapon ranges, ammo, arcs, movement state, physical legality, lifecycle status, objectives, and terminal outcomes
- **AND** validation tooling SHALL continue to execute catalog contracts, behavior-class tests, and representative integration scenarios as separate evidence lanes

#### Scenario: Destruction cause persists through combat state and replay

- **GIVEN** a BattleMech damage path reports `unitDestroyed=true` with a canonical destruction cause
- **WHEN** runner state snapshots apply that result or event replay applies the corresponding `UnitDestroyed` event
- **THEN** `IUnitGameState.destroyed` SHALL be true
- **AND** `IUnitGameState.destructionCause` SHALL preserve the same canonical cause
- **AND** ammo-explosion cascades SHALL be able to override generic damage destruction with `ammo_explosion`
- **AND** this persistence SHALL be cataloged as a MekStation lifecycle contract rather than an external rulebook claim

#### Scenario: Fatal head and center-torso destruction use cause-specific terminal labels

- **GIVEN** a BattleMech damage path destroys the head location without reaching lethal pilot wounds
- **WHEN** the damage pipeline checks unit destruction
- **THEN** the terminal cause SHALL be `head_destroyed`
- **AND** runner snapshots and `UnitDestroyed` events SHALL preserve `head_destroyed`
- **GIVEN** a BattleMech damage path destroys the center torso location
- **WHEN** the damage pipeline checks unit destruction
- **THEN** the terminal cause SHALL be `ct_destroyed`
- **AND** runner snapshots and `UnitDestroyed` events SHALL preserve `ct_destroyed`
- **AND** lethal pilot wounds SHALL still take priority as `pilot_death`

#### Scenario: Shutdown stays outside UnitDestroyed cause taxonomy

- **GIVEN** a BattleMech overheats into avoidable or automatic shutdown
- **WHEN** the heat lifecycle persists shutdown state
- **THEN** the unit SHALL leave normal action rotation through shutdown lifecycle support
- **AND** the engine SHALL NOT emit `UnitDestroyed` with `cause: 'shutdown'`
- **AND** the canonical `UnitDestroyed.cause` and damage `destructionCause` unions SHALL exclude `shutdown`
- **AND** destruction-cause catalog coverage SHALL not carry a helper-only shutdown row

#### Scenario: Missing action surfaces stay visible

- **GIVEN** a BattleMech action surface has source-backed or product-visible relevance but no authoritative command, game intent, wire payload, P2P translation, or runner action path
- **WHEN** the action support catalog is contract-tested
- **THEN** optional TacOps sprint and evade movement SHALL appear as integrated tactical command rows when their command, intent, wire, P2P, movement, heat, and state paths exist
- **AND** the sprint row SHALL cite MegaMek source anchors for optional TacOps sprint availability, BattleMech sprint MP, MASC/Supercharger sprint formulas, sprint heat, attacker-sprinted firing failure, target-sprinted to-hit relief, and sprinting spotter rejection
- **AND** the evade row SHALL cite MegaMek source anchors for optional TacOps evade availability, evasion state, evasion heat, attacker-evading firing restrictions, and target-evading to-hit modifiers
- **AND** product-visible MekStation command surfaces without identified BattleMech rule authority, including `movement.stabilize`, SHALL stay in `COMBAT_COMMAND_ACTION_SUPPORT` as `out-of-scope` `mekstation-deviation` rows rather than absent official action rows or BattleMech completion blockers
- **AND** integrated movement tactical command rows, including walk, run, sprint, evade, jump, stand, go-prone, MASC activation, and Supercharger activation, SHALL cite the MekStation command factory that exposes the movement surface
- **AND** utility tactical command rows, including eject, concede, withdraw, and request-spot, SHALL cite the MekStation command factory that exposes the utility surface
- **AND** weapon tactical command rows, including the fire-volley attack commit surface, SHALL cite the MekStation command factory that exposes the weapon surface
- **AND** facing tactical command rows, including chassis rotation and torso twist surfaces, SHALL cite the MekStation command factory that exposes the facing surface
- **AND** physical tactical command rows, including punch, kick, push, charge, death from above, and melee weapon surfaces, SHALL cite the MekStation command factory that exposes the physical attack surface
- **AND** heat/end tactical command rows, including heat continue, end phase, and next turn, SHALL cite the MekStation command factory that exposes the phase-control surface
- **AND** request-spot command rows SHALL cite the MekStation command factory that exposes the local surface, MegaMek `SpotAction` source anchors, and SHALL be integrated once the command preserves active/target ids, emits `SpottingDeclared`, latches `isSpotting` plus `spotTargetId`, locks the spotting unit, clears spotting on turn/movement reset, maps `requestSpot` to `RequestSpot`, dispatches through server and P2P paths, and applies the source-backed +1 spotting attacker penalty to ranged and physical attacks
- **AND** request-spot coverage SHALL document that the active command-console exception remains unmodeled until command-console state is hydrated into MekStation combat state
- **AND** local draft/reset and superseded command-shell rows, including movement cancel, weapon draft declaration/clear, and the edge-less withdraw shortcut, SHALL cite the MekStation command factory as `out-of-scope` UI shell rows outside official BattleMech combat action handling
- **AND** direct UI action rows, including withdrawal edge selection, SHALL cite the MekStation component that exposes the direct action surface
- **AND** every game-intent action row SHALL cite the MekStation game-intent mapper that constructs or maps the local intent to its server wire payload
- **AND** every wire-intent action row SHALL cite the MekStation server dispatcher, with lobby and reconnect wire intents remaining `out-of-scope` non-combat scope splits
- **AND** every P2P intent translation row SHALL cite the MekStation intent translator, plus host-router source anchors for host-owned command translations
- **AND** P2P phase-advance, movement, and weapon-attack rows SHALL prove the host revalidates or rebuilds combat state from authoritative host data instead of trusting guest-supplied phase events, movement MP/heat/path, to-hit numbers, or weapon stats
- **AND** `physicalAttackCommands` catalog rows SHALL enforce row-level MekStation command source references before PR approval
- **AND** GM command exclusion rows SHALL cite the MekStation GM/referee command factory as `out-of-scope` control-plane rows and SHALL remain outside player BattleMech combat action handling
- **AND** those rows SHALL NOT be inferred from helper prose or omitted because no UI command currently emits them

#### Scenario: Torso twist emits source-backed secondary facing through command and wire paths

- **GIVEN** a BattleMech commits torso twist during the weapon-attack phase through local tactical commands, game intent, wire intent, P2P host command translation, or server dispatch
- **WHEN** the action and movement rule catalogs are contract-tested
- **THEN** `facing.torso-twist`, `torsoTwist`, and `TorsoTwist` rows SHALL cite MegaMek source anchors for `TorsoTwistAction`, secondary-facing persistence, BattleMech twist legality, extended/no-twist quirk boundaries, and secondary-facing arc consumption
- **AND** the action SHALL reject non-weapon-attack phases, inactive or terminal units, non-BattleMech units, prone units, bracing units, already-twisted units, `no_twist` units, and twist distances beyond one hexside unless `ext_twist` allows two
- **AND** successful torso twist SHALL emit replayable `FacingChanged` secondary-facing state
- **AND** event-sourced secondary facing SHALL feed replay, AI weapon-arc filtering, runner secondary-target front-arc math, game intent, wire intent, P2P translation, and server dispatch paths

#### Scenario: Core movement rule rows stay source-backed

- **GIVEN** the movement rule catalog covers walk, run, jump, stand, voluntary go-prone, facing, occupancy, elevation, heat MP penalties, and torso twist
- **WHEN** the aggregate catalog triad and BattleMech combat catalog contract tests run
- **THEN** every integrated or helper-only movement rule row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the aggregate catalog triad for `movementRules` SHALL require row-level source references rather than inherited requirement authority
- **AND** ground movement validation SHALL include path-alignment and terminal facing-change MP in addition to path and terrain costs so same-hex, bent-path, and moved-then-turned facings are all validated as movement spend
- **AND** helper-only movement rows SHALL keep their remaining runtime gaps explicit instead of treating source-backed row evidence as complete parity

#### Scenario: Voluntary go-prone emits source-backed movement step

- **GIVEN** MegaMek defines voluntary go-prone as `MoveStepType.GO_PRONE` for standing Meks
- **WHEN** a unit commits the go-prone movement command through local, wire, P2P command routing, or an opt-in runner AI movement decision
- **THEN** the action SHALL emit a same-hex `MovementDeclared` payload with a `goProne` step, `mpUsed: 1`, `heatGenerated: 0`, and `hexesMoved: 0`
- **AND** the reducer SHALL mark the unit prone and lock its movement activation
- **AND** runner movement SHALL preserve the same `goProne` step when the AI chooses the opt-in stationary go-prone posture
- **AND** explicit non-Mek and already-prone units SHALL be rejected before emitting a go-prone movement declaration
- **AND** a hull-down go-prone transition SHALL cost 0 MP and clear `hullDown` when the reducer marks the unit prone
- **AND** swarmer dislodge, inferno wash-off, and broader tactical go-prone policy SHALL remain explicit follow-up gaps

#### Scenario: Movement booster activation emits replayable active state

- **GIVEN** a BattleMech has installed MASC or Supercharger equipment
- **WHEN** the unit commits the matching activation command through local, wire, or P2P command routing during movement
- **THEN** the action SHALL emit a `MovementEnhancementActivated` event for `MASC` or `Supercharger`
- **AND** the reducer SHALL mark `activeMASC` or `activeSupercharger` without locking movement activation
- **AND** later run movement validation SHALL consume the active booster state for boosted MP and failure-PSR handling

#### Scenario: Weapon catalog hygiene traps stay explicit

- **GIVEN** official ranged weapon validation relies on catalog hydration rather than legacy defaults
- **WHEN** the validation scope and requirement crosswalks are contract-tested
- **THEN** the static weapon database subset, synthetic Medium Laser fallback ban, and variable missile damage-string guard SHALL each appear as explicit integrated validation-scope rows
- **AND** every official string-damage missile weapon row SHALL be pinned to its resolved nonzero volley damage, including MML-style `1-2/missile` descriptors
- **AND** fallback-prevention and damage-string-hazards requirements SHALL reference those specific rows rather than relying only on broad official-catalog coverage
- **AND** every requirement crosswalk row SHALL carry row-level source references derived from its support-map refs, while preserving its explicit primary authority classification
- **AND** broad known-limitation filters SHALL remain banned from catalog validation gates
- **AND** every broad known-limitation category SHALL have a BattleMech validation trap proving the validation invariant bypass remains visible instead of filtered
- **AND** known-limitation filtering and partitioning helpers SHALL preserve BattleMech validation traps as potential bugs even when their text matches broad known-limitation patterns
- **AND** every validation-scope row for known-limitation bypasses, catalog filter gates, fallback guards, variable-damage parsing, and non-BattleMech scope splits SHALL carry anchored MekStation source references
- **AND** validation-scope non-BattleMech ammo and combat-system split rows SHALL remain `out-of-scope` audit evidence instead of unresolved BattleMech completion blockers
- **AND** the non-BattleMech objective requirement row SHALL remain `out-of-scope` until separate vehicle, aerospace, infantry, battle armor, and ProtoMech validation matrices exist

#### Scenario: Non-BattleMech event scope rows stay explicit

- **GIVEN** the BattleMech combat event support catalog partitions every `GameEventType`
- **WHEN** event-stream support is contract-tested
- **THEN** vehicle, VTOL, battle armor, swarm, leg-attack, mimetic, and stealth event rows SHALL remain `out-of-scope` non-BattleMech rows outside the BattleMech combat matrix
- **AND** each non-BattleMech event-scope row SHALL carry anchored MekStation source references to the event factory, payload, helper, or scenario surface that owns that non-BattleMech event family
- **AND** non-BattleMech event-scope rows SHALL be excluded from the unresolved BattleMech gap count while remaining available through the catalog's out-of-scope audit inventory

#### Scenario: BattleMech event stream rows stay source pinned

- **GIVEN** the BattleMech combat event support catalog lists lifecycle, phase, initiative, movement, attack, damage, heat, PSR, physical, objective, morale, retreat, withdrawal, and ejection event rows
- **WHEN** event-stream support is contract-tested
- **THEN** each BattleMech event-stream row SHALL carry anchored MekStation source references to the event factory, runner phase, session helper, reducer, test, or explicit unsupported enum boundary that owns that event contract
- **AND** broad event-stream triad prose SHALL NOT satisfy event coverage without row-level source references
- **AND** initiative resolution SHALL emit both the dice-bearing `InitiativeRolled` event and a replayable `InitiativeOrderSet` event that records the winning side, first mover, and second mover for turn-rotation replay
- **AND** weapon attack locking SHALL emit a public `AttacksRevealed` boundary after every active weapon-phase unit has locked attacks, replay that boundary into the `Revealed` lock state, and still allow phase advancement once all active units are locked, revealed, or resolved
- **AND** replayable `FacingChanged` secondary-facing events SHALL be integrated when torso twist is covered through tactical command, game intent, wire intent, P2P translation, server dispatch, session emission, replay, and runner arc-consumption evidence

#### Scenario: Ammo catalog compatibility traps stay explicit

- **GIVEN** official ammunition validation relies on `compatibleWeaponIds` to hydrate consumable BattleMech ammo bins
- **WHEN** the ammunition compatibility catalog is contract-tested
- **THEN** official ammo rows that hydrate consumable BattleMech ammo bins SHALL be pinned by exact id
- **AND** every compatible ammo row SHALL initialize an ammo bin, report total rounds, and consume through combat ammo tracking for each referenced official weapon id
- **AND** source-backed Improved Autocannon ammunition rows SHALL name their matching official Improved Autocannon weapon ids before they are counted as consumable BattleMech ammo
- **AND** source-backed LB 2-X cluster ammunition SHALL name the matching Inner Sphere and Clan LB 2-X AC weapon ids before it is counted as consumable BattleMech ammo
- **AND** official ammo rows that duplicate weapon runtime ids SHALL be pinned by exact id and classified before compatibility checks
- **AND** standard or advanced official ammo rows with no compatible weapon references SHALL be pinned by exact id as helper-only BattleMech ammo gaps
- **AND** aerospace/capital, battle armor, ProtoMech, aquatic torpedo, and artillery ammo rows SHALL be pinned by exact id as `out-of-scope` separate validation-matrix scope splits
- **AND** those non-BattleMech ammo scope splits SHALL be excluded from the unresolved BattleMech gap count while remaining available through the catalog's out-of-scope audit inventory
- **AND** experimental or nonstandard official ammo rows with no compatible weapon references SHALL be pinned by exact id as catalog-visible scope gaps
- **AND** every ammunition compatibility support row SHALL carry structured row-level source references to the official ammo catalog import list, ammo hydration or tracking path, and exact-id classification contract
- **AND** the ammunition compatibility catalog triad SHALL enforce row-level source references before PR approval
- **AND** remaining no-compatible-reference rows SHALL NOT be counted as consumable BattleMech ammunition until catalog data supplies unambiguous compatible weapon references

#### Scenario: Range bracket rows stay source-backed

- **GIVEN** the range bracket catalog covers short, medium, long, extreme, and out-of-range attack boundaries
- **WHEN** the aggregate catalog triad and BattleMech combat catalog contract tests run
- **THEN** every integrated range bracket row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the minimum-range to-hit modifier row SHALL carry structured MegaMek source references for its close-range penalty formula
- **AND** the aggregate catalog triad for `rangeBrackets` SHALL require row-level source references rather than inherited requirement authority
- **AND** out-of-range attacks SHALL remain invalidation coverage instead of being treated as a normal declared attack range

#### Scenario: Ranged to-hit modifier rows stay source-backed

- **GIVEN** the ranged to-hit modifier catalog covers gunnery, range, minimum range, attacker movement, target movement, target evasion, heat, environmental conditions, partial cover, target prone/immobile state, indirect fire, pilot wounds, sensor damage, actuator damage, attacker prone state, hull-down, secondary targets, called shots, ECM, C3, terrain features, and physical-DFA to-hit boundaries
- **WHEN** the aggregate catalog triad and BattleMech combat catalog contract tests run
- **THEN** every integrated or helper-only to-hit modifier row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the aggregate catalog triad for `toHitModifiers` SHALL require row-level source references rather than inherited requirement authority
- **AND** the integrated ECM row SHALL describe source-backed guidance suppression and no generic ECM to-hit penalty across Artemis, NARC/iNARC Homing, semi-guided TAG, and C3 paths
- **AND** helper-only modifier rows such as C3 equipment network formation SHALL keep their runtime gaps explicit instead of treating source-backed row evidence as complete parity

#### Scenario: Ranged invalid target-state rows stay source-backed

- **GIVEN** the ranged invalidation catalog covers missing, destroyed, same-side, retreated, and ejected target states
- **WHEN** the aggregate catalog triad and attack-invalidation catalog contract tests run
- **THEN** every invalid target-state row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the aggregate catalog triad for `invalidTargetStates` SHALL require row-level source references rather than inherited requirement authority
- **AND** MekStation lifecycle targetability removal SHALL stay visible as executable product evidence layered over the MegaMek targetability/removal source boundary

#### Scenario: Ranged invalidation reason rows stay source-backed or explicitly deviated

- **GIVEN** the attack invalidation catalog covers out-of-ammo, same-hex, out-of-range, no-LOS, invalid target, attacker-evading, unknown weapon, destroyed weapon, and jammed weapon reasons
- **WHEN** the aggregate catalog triad and attack-invalidation catalog contract tests run
- **THEN** every AttackInvalid reason row SHALL carry structured source references with line anchors
- **AND** MegaMek-backed rows SHALL use commit-pinned MegaMek source references
- **AND** local event-shape rows such as `SameHex` SHALL identify their MekStation-deviation boundary instead of inheriting generic invalidation authority
- **AND** the aggregate catalog triad for `attackReasons` SHALL require row-level source references rather than inherited requirement authority

#### Scenario: Evading attackers cannot make ranged attacks

- **GIVEN** a unit has explicit `isEvading: true`
- **WHEN** that unit attempts a ranged weapon attack through runner attack resolution or event-sourced `declareAttack`
- **THEN** the attack SHALL emit `AttackInvalid` with reason `AttackerEvading`
- **AND** no `AttackDeclared`, `AttackResolved`, heat, ammo, damage, or fired-weapon state side effects SHALL follow

#### Scenario: TacOps Evade movement declares a source-backed run-based action

- **GIVEN** a unit declares `MovementType.Evade` through the movement command, game intent, wire intent, P2P host translation, interactive reducer, or runner movement phase
- **WHEN** movement validation and movement event creation resolve the action
- **THEN** the action SHALL use the unit's unboosted run MP envelope, run pathing, and run animation mode
- **AND** the action SHALL generate source-backed BattleMech evade movement heat of `4`
- **AND** the action SHALL set authoritative current-turn `isEvading: true` and default `evasionBonus: 1` state for attack invalidation, target evasion modifiers, and spotter rejection
- **AND** active MASC or Supercharger SHALL NOT extend the Evade movement envelope
- **AND** turn reset SHALL clear Evade current-turn state before the next unit action cycle
- **AND** the legacy local `evasive` SPA row SHALL remain out-of-scope so TacOps Evade action coverage is not counted as an unresolved pilot-ability blocker

#### Scenario: Sprinting attackers cannot make ranged attacks

- **GIVEN** a unit has explicit `sprintedThisTurn: true`
- **WHEN** that unit attempts a ranged weapon attack through runner attack resolution or event-sourced `declareAttack`
- **THEN** the attack SHALL emit `AttackInvalid` with reason `AttackerSprinted`
- **AND** no `AttackDeclared`, `AttackResolved`, heat, ammo, damage, or fired-weapon state side effects SHALL follow
- **AND** declared TacOps Sprint movement SHALL be one source-backed creator of that current-turn state
- **AND** engine-variant/coolant sprint heat SHALL remain a visible heat-rule gap until source-backed engine-state hydration exists

#### Scenario: TacOps Sprint declares movement state

- **GIVEN** a BattleMech declares `MovementType.Sprint` through movement UI, game intent, wire, P2P, interactive, or runner movement paths
- **WHEN** movement validation computes its envelope and commits the movement
- **THEN** base Sprint MP SHALL be `walkMP * 2`
- **AND** one active MASC or Supercharger SHALL validate Sprint MP against `ceil(walkMP * 2.5)`
- **AND** active MASC plus active Supercharger SHALL validate Sprint MP against `walkMP * 3`
- **AND** Sprint SHALL use run-based terrain/pathing/PSR behavior and queue active MASC/Supercharger failure PSRs when boosters are used
- **AND** the committed movement SHALL create current-turn `sprintedThisTurn: true`, `movementThisTurn: MovementType.Sprint`, normal-engine sprint heat `+3`, and a run-mode movement animation payload
- **AND** engine-variant/coolant sprint heat SHALL remain a visible heat-rule gap until source-backed engine-state hydration exists

#### Scenario: Sprinting and evading units cannot spot indirect fire

- **GIVEN** an indirect-capable ranged attack has no attacker-to-target line of sight
- **AND** the only friendly spotter candidates with target line of sight have explicit `sprintedThisTurn: true`, `isEvading: true`, `movementType: MovementType.Sprint`, or `movementType: MovementType.Evade`
- **WHEN** the runner or interactive indirect-fire context elects a LOS spotter
- **THEN** those candidates SHALL be rejected before spotter election
- **AND** the attack SHALL continue through the normal no-spotter `NoLineOfSight` invalidation path without heat, ammo, fired-weapon, or damage side effects

#### Scenario: Sprint state and Evade movement generate movement heat

- **GIVEN** a unit has explicit `sprintedThisTurn: true`, declared `MovementType.Sprint`, or declared `MovementType.Evade`
- **WHEN** runner heat resolution computes movement heat
- **THEN** explicit sprint state and declared Sprint movement SHALL generate normal-engine sprint heat
- **AND** Evade movement SHALL generate run heat plus the source-backed evasion heat surcharge
- **AND** engine-variant/coolant sprint heat SHALL remain a visible heat-rule gap until source-backed engine-state hydration exists

#### Scenario: Evading targets modify ranged to-hit

- **GIVEN** a ranged attack targets a unit with explicit `isEvading: true`
- **WHEN** helper to-hit calculation, event-sourced `declareAttack`, or runner attack resolution builds the `AttackDeclared` to-hit payload
- **THEN** the attack SHALL include a `Target Evasion` to-hit modifier of `+1`
- **AND** explicit `evasionBonus` values SHALL be consumed as a source-backed Skilled Evasion bonus from `0` through `3`, where `0` suppresses the modifier without clearing evasion
- **AND** prone evading targets SHALL not receive the target-evasion modifier
- **AND** declared Evade movement SHALL create the default `+1` target-evasion state, while explicit `evasionBonus` state remains the source-backed hook for optional Skilled Evasion scaling

#### Scenario: Sprinting targets modify ranged to-hit

- **GIVEN** a ranged attack targets a unit with explicit `sprintedThisTurn: true`
- **WHEN** helper to-hit calculation, event-sourced `declareAttack`, or runner attack resolution builds the `AttackDeclared` to-hit payload
- **THEN** the attack SHALL include a `Target Sprinted` to-hit modifier of `-1`
- **AND** runner turn reset SHALL clear `sprintedThisTurn` so the target-sprinted modifier is current-turn state
- **AND** declared TacOps Sprint movement SHALL be one source-backed creator of that current-turn state
- **AND** engine-variant/coolant sprint heat SHALL remain a visible heat-rule gap until source-backed engine-state hydration exists

#### Scenario: Evading targets modify physical to-hit

- **GIVEN** a physical attack targets a unit with explicit `isEvading: true`
- **WHEN** helper physical to-hit calculation, event-sourced `declarePhysicalAttack` or physical resolution, or runner physical resolution builds the physical attack to-hit number
- **THEN** the physical attack SHALL apply a `Target Evasion` to-hit modifier of `+1`
- **AND** explicit `evasionBonus` values SHALL be consumed as a source-backed Skilled Evasion bonus from `0` through `3`, where `0` suppresses the modifier without clearing evasion
- **AND** prone evading physical targets SHALL not receive the target-evasion modifier
- **AND** declared Evade movement SHALL create the default `+1` target-evasion state, while explicit `evasionBonus` state remains the source-backed hook for optional Skilled Evasion scaling

#### Scenario: Invalid ranged attack side-effect guards stay source-backed as MekStation contracts

- **GIVEN** the attack invalidation catalog covers no `AttackDeclared`, no `AttackResolved`, no heat, no ammo, no damage, and no fired-weapon state side effects
- **WHEN** the aggregate catalog triad and attack-invalidation catalog contract tests run
- **THEN** every invalid attack side-effect row SHALL carry structured MekStation source references with line anchors
- **AND** the source references SHALL point to the invalidation gates and the event/state mutation boundaries they must not reach
- **AND** the aggregate catalog triad for `invalidAttackSideEffects` SHALL require row-level source references rather than inherited requirement authority

#### Scenario: Physical damage modifier rows stay source-backed

- **GIVEN** the physical damage modifier catalog covers active TSM, claws, talons, and underwater physical damage
- **WHEN** the aggregate catalog triad and BattleMech combat catalog contract tests run
- **THEN** every integrated or helper-only physical damage modifier row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** core claw punch and talon kick/DFA damage modifier rows SHALL be integrated only when their source-backed damage, to-hit, option-rule, hydration, critical-event cleanup, destroyed-location replay, and runner/session consumption paths are represented
- **AND** separate helper-only claw and talon equipment-lifecycle rows SHALL keep remaining automatic damaged-equipment state creation and claw club-with-hand interaction gaps explicit instead of treating source-backed damage formulas as full physical-weapon lifecycle parity
- **AND** the aggregate catalog triad for `physicalDamageModifiers` SHALL require row-level source references rather than inherited requirement authority

#### Scenario: AMS helper boundary stays source-backed

- **GIVEN** AMS behavior is partially represented by projectile reduction, mounted-arc enforcement when `mountingArc` state is available, canonical `isRearMounted` equipment hydration into Front/Rear `mountingArc` state, Streak/all-shots-hit cluster parity, single-missile interception, ammo/heat/fired lifecycle, and interception-event rows
- **WHEN** the special weapon catalog rows are contract-tested
- **THEN** the AMS family row and AMS mechanic rows SHALL cite MegaMek source anchors for assignment, defender choice, arc checks, cluster-table reduction, single-missile interception, ammo/heat usage, and optional multi-use lifecycle
- **AND** AMS SHALL remain helper-only until defender choice and optional multi-use/PLAYTEST_3 rules are authoritative in runner/session combat

#### Scenario: Special weapon family rows stay source-backed

- **GIVEN** the special weapon family catalog covers UAC, RAC, LB-X, Streak SRM, MML, NARC/iNARC, AMS, TAG, Artemis, and plasma-cannon family behavior
- **WHEN** the special weapon family support map is contract-tested
- **THEN** every integrated or helper-only special weapon family row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** official UAC, RAC, LB-X, and MML family ids SHALL be pinned exactly before their firing-mode support rows are treated as integrated
- **AND** damage-capable official Streak SRM ids SHALL be pinned separately from zero-damage Streak LRM/OS/prototype catalog rows before Streak support is treated as integrated
- **AND** zero-damage Streak LRM/OS/prototype rows SHALL remain catalog-visible data gaps instead of inheriting Streak SRM damage behavior by name match
- **AND** the official zero-damage Clan Plasma Cannon SHALL emit zero BattleMech damage plus external target heat from the source-backed 2d6 plasma roll when runner combat hits a heat-tracking BattleMech target
- **AND** the Clan Plasma Cannon SHALL halve external target heat through intact reflective or heat-dissipating armor when combat state includes armor-type data for the hit location
- **AND** the Clan Plasma Cannon SHALL follow source-backed `PLAYTEST_3` armor behavior where reflective armor no longer halves plasma heat and heat-dissipating armor receives zero plasma heat
- **AND** the Clan Plasma Cannon and Plasma Rifle SHALL hydrate official plasma ammunition bins from source-backed catalog ammo rows and consume those rounds during runner combat despite MegaMek energy weapon flags
- **AND** the Clan Plasma Cannon SHALL remain helper-only until MegaMek external-heat timing/caps and non-Mek special damage paths are represented
- **AND** the NARC/iNARC family row SHALL be integrated once standard NARC markers, iNARC selected-ammo pod attachment, Homing guidance, Haywire to-hit, ECM flight-path/C3 disruption, Nemesis redirect, event replay, and marker lifecycle behavior are represented
- **AND** remaining iNARC ECM sensor side paths SHALL stay visible under the `inarc-pod-variants` mechanic row instead of keeping the NARC family row helper-only
- **AND** the aggregate catalog triad for `specialWeaponFamilies` SHALL require row-level source references rather than inherited requirement authority
- **AND** helper-only family rows SHALL keep their remaining runtime/session gaps explicit instead of treating source-backed family evidence as complete parity

#### Scenario: Special weapon mechanic rows stay source-backed

- **GIVEN** the special weapon mechanic catalog covers UAC, RAC, LB-X, Streak SRM, MML, NARC/iNARC, AMS, TAG, Artemis, ECM, active-probe, and stealth mechanics
- **WHEN** the special weapon mechanic support map is contract-tested
- **THEN** every integrated or helper-only special weapon mechanic row SHALL carry structured MegaMek source references with commit-pinned URLs and line anchors
- **AND** the aggregate catalog triad for `specialWeaponMechanics` SHALL require row-level source references rather than inherited requirement authority
- **AND** source-checked mechanic mismatches SHALL remain helper-only gaps or be removed from official combat surfaces instead of integrated parity claims

#### Scenario: Catalog critical slots seed runner critical resolution

- **GIVEN** a catalog-hydrated BattleMech unit carries location-keyed `criticalSlots`
- **WHEN** UnitHydration prepares runner combat data for that unit
- **THEN** occupied critical slots SHALL be mapped into the runner `CriticalSlotManifest` by source location and source slot index
- **AND** heat sink slots SHALL resolve through `applyHeatSinkHit` so later heat phases reduce dissipation through `heatSinksDestroyed`
- **AND** jump-jet slots SHALL resolve through `applyJumpJetHit` so later movement phases reduce effective jump MP through `jumpJetsDestroyed`
- **AND** weapon slots hydrated with runtime weapon ids SHALL resolve through `applyWeaponHit` so later attack planning and stale declaration validation remove destroyed weapon mounts
- **AND** ammo critical-slot strings SHALL hydrate runtime ammo bins with stable `binId`, `weaponType`, location, remaining/max rounds, and explosive flag data
- **AND** ammo critical entries SHALL carry `ammoBinId` when the catalog slot resolves to a runtime ammo bin
- **AND** mounted CASE, CASE-P/prototype CASE, and CASE II critical-slot strings SHALL hydrate per-location `caseProtection` combat state
- **AND** critical-slot hydration, effect, and aggregate critical-component catalog rows SHALL carry MegaMek source anchors for the system/equipment slot boundary before any row can be used as validation evidence
- **AND** the aggregate catalog triads for critical-slot hydration and critical-slot effects SHALL require row-level source references rather than inherited requirement authority
- **AND** generic equipment and special-ammo lifecycle nuances SHALL remain explicit gaps until their damage paths cascade through the corresponding combat state

#### Scenario: Jump-jet critical damage reduces runner jump movement

- **GIVEN** a BattleMech has base jump MP and accumulated `componentDamage.jumpJetsDestroyed`
- **WHEN** runner movement validation computes the unit's jump capability
- **THEN** each destroyed jump jet SHALL subtract one base jump MP before jump movement validation
- **AND** Partial Wing bonuses SHALL NOT recreate jump capability after critical damage has reduced base jump MP to zero

#### Scenario: Weapon critical damage removes runner attack availability

- **GIVEN** a BattleMech has hydrated weapon critical slots with runtime weapon ids
- **WHEN** critical resolution records that weapon id in `componentDamage.weaponsDestroyed`
- **THEN** AI attack planning SHALL see that hydrated mount as destroyed and SHALL NOT declare it
- **AND** runner attack resolution SHALL reject any stale declaration for that destroyed weapon with `AttackInvalid` before heat, ammo, fired-weapon, or damage side effects

#### Scenario: Ammo critical damage targets hydrated bin

- **GIVEN** a catalog-hydrated BattleMech has ammo critical slots and matching runtime ammo bins
- **WHEN** critical resolution destroys one of those ammo slots
- **THEN** `CriticalHitResolved` and `ComponentDestroyed` SHALL carry the resolved `ammoBinId`
- **AND** any crit-induced `AmmoExplosion` SHALL use that same `binId`
- **AND** a crit on an empty exact bin SHALL NOT explode another loaded ammo bin in the same location

#### Scenario: CASE-contained ammo cookoffs suppress transfer

- **GIVEN** a BattleMech has mounted CASE, CASE-P/prototype CASE, or CASE II projected into `caseProtection` for the ammo bin location
- **WHEN** runner heat, runner crit, or event-sourced heat ammo explosion resolution emits `AmmoExplosion`
- **THEN** `AmmoExplosion.caseProtection` SHALL report the protection level used for the cascade
- **AND** standard CASE and CASE-P/prototype CASE SHALL cap protected explosion damage at 10 before local runner or event-sourced damage resolution
- **AND** CASE II SHALL cap protected explosion damage at 1 before local runner or event-sourced damage resolution
- **AND** ammo explosion damage SHALL bypass normal armor absorption and apply the capped or uncapped cascade directly to internal structure
- **AND** protected torso ammo explosions that do not destroy the source location SHALL blow out that torso's rear armor while preserving front armor
- **AND** protected explosion damage SHALL NOT emit `TransferDamage` from the CASE-protected location
- **AND** event-sourced heat cookoffs SHALL empty the exploded bin before applying the CASE-adjusted damage cascade
- **AND** broad non-CASE equipment names that merely contain the substring "case" SHALL NOT hydrate phantom CASE protection

#### Scenario: Ammo-explosion pilot damage emits pilot-hit state

- **GIVEN** MegaMek applies BattleMech ammunition-explosion pilot damage and reduces that damage for Pain Resistance or Iron Man
- **WHEN** runner heat, runner critical, or event-sourced heat cookoff resolution emits `AmmoExplosion`
- **THEN** the cookoff path SHALL emit `PilotHit` with `source: 'ammo_explosion'`, persist the pilot wound total, and destroy the unit with `pilot_death` when the lethal wound threshold is reached
- **AND** Iron Man or Pain Resistance SHALL reduce the ammo-explosion pilot damage by one, while artificial pain shunt SHALL suppress the pilot damage
- **AND** `PilotHit` event support SHALL include ammo-explosion coverage only after runner heat, runner critical, and event-sourced heat cookoff paths share that behavior end to end

#### Scenario: Damage and death catalog rows expose row-level source truth

- **GIVEN** the BattleMech damage/death support catalog covers damage resolution, pilot damage, and destruction causes
- **WHEN** the catalog triad marks `damageResolution`, `pilotDamage`, or `destructionCauses` as row-source-backed
- **THEN** every row in those maps SHALL carry structured source references
- **AND** core damage rows SHALL include source-backed rule or MegaMek anchors plus MekStation resolver/state anchors
- **AND** event, heat-cascade, pilot-wound, and destruction-cause rows SHALL cite the executable MekStation event/state paths they claim
- **AND** the `damageResolution`, `pilotDamage`, and `destructionCauses` catalog triads SHALL enforce row-level source references before PR approval

### Requirement: Physical Attack Legality Gates

Physical attack declaration and resolution SHALL validate action-specific legality gates before scheduling a combat action. Push, charge, death from above, melee weapon, punch, kick, and club logic SHALL share the same legality helpers across eligibility display, event-sourced declaration, and simulation runner resolution so UI options, game events, and automated combat cannot diverge.

#### Scenario: BattleMech physical classes stay source-backed

- **GIVEN** MegaMek exposes BattleMech-applicable brush-off, thrash, trip, grapple, break-grapple, and jump-jet physical action classes
- **WHEN** the physical action class scope catalog is contract-tested
- **THEN** every physical action class scope row SHALL cite the matching MegaMek source class with commit-pinned line anchors
- **AND** supported punch, kick, push, trip, thrash, jump-jet attack, brush-off, grapple, charge, death-from-above, and club/melee rows SHALL expose row-level MegaMek source references before PR approval
- **AND** non-BattleMech AirMek, battle armor, infantry explosive, ProtoMek, and aerospace ram rows SHALL remain explicit `out-of-scope` splits with row-level MegaMek source references
- **AND** `break-grapple` SHALL expose a runtime `PhysicalAttackType`, tactical command, event-sourced declaration/resolution, runner resolution path, source-backed optional-rule, airborne, common locked-grapple, chain-whip rejection, unit-type, grapple-target, original-attacker automatic-success, actuator/AES, and weight-class modifier branches, zero damage, both-unit grapple state clearing, grid-backed adjacent displacement, and moved-unit facing updates
- **AND** `brush-off` SHALL expose a runtime `PhysicalAttackType`, tactical command, selected-arm payload, event-sourced declaration/resolution, runner resolution path, source-backed swarming-infantry target legality, arm gates, dedicated brush-off modifiers, hit dislodgement, punch-equivalent target damage, and punch-equivalent miss self-damage while targetable iNARC pod removal remains visible under the iNARC pod mechanic gap
- **AND** `grapple` SHALL expose a runtime `PhysicalAttackType`, tactical command, event-sourced declaration/resolution, runner resolution path, source-backed optional-rule, airborne, common locked-grapple, friendly-fire, unit-type, arm/shoulder, range, elevation, front-arc, prone, weapon-fire, already-grappled, actuator/AES/TSM, and weight-class branches, zero damage, attacker relocation into the target hex, target facing reversal, and both-unit grapple state
- **AND** optional TacOps `trip` SHALL expose a runtime `PhysicalAttackType`, tactical command, event-sourced declaration/resolution, runner resolution path, optional-rule gate, source-backed front-arc/range/prone/elevation/usable-limb restrictions, `-1` base to-hit adjustment, zero damage on hit, and a target PSR trigger
- **AND** `thrash` SHALL expose a runtime `PhysicalAttackType`, tactical command, event-sourced declaration/resolution, runner resolution path, prone-Mek same-hex infantry legality, clear/pavement terrain validation, automatic-hit resolution, weight-based infantry damage, no target PSR, and an attacker PSR trigger
- **AND** optional TacOps `jump-jet-attack` SHALL expose a runtime `PhysicalAttackType`, tactical command, selected-leg payload, event-sourced declaration/resolution, runner resolution path, optional-rule gate, ready-jump-jet gate, leg-weapon-fire gate, source-backed range/elevation/facing restrictions, source-specific to-hit modifiers, selected-leg damage, and no self-PSR side effects
- **AND** no BattleMech-applicable physical action class scope row SHALL remain `unsupported` or `helper-only` for the normal BattleMech physical action classes listed above while chain-whip maintenance and simultaneous counter-grapple exchange remain separate explicit gaps
- **AND** the `physicalActionClassScope` catalog triad SHALL enforce row-level source references before PR approval

#### Scenario: Jump jet attacks resolve as selected-leg optional TacOps damage

- **GIVEN** a BattleMech with ready jump jets in the selected leg declares `jump-jet-attack` against an adjacent target with the TacOps jump-jet attack option enabled
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the attack SHALL apply the source-backed jump-jet attack to-hit modifier
- **AND** target damage SHALL be `3 * ready jump jets` for each selected non-wet leg
- **AND** the attack SHALL not queue attacker or target PSR side effects
- **AND** disabled optional rules, missing selected-leg jump jets, prior jump movement, prior selected-leg weapon fire, invalid range, invalid elevation, and invalid feet-facing state SHALL reject the attack before damage

#### Scenario: Thrash resolves as source-backed automatic infantry damage

- **GIVEN** a prone BattleMech declares `thrash` against enemy infantry in the same clear or pavement hex at the same elevation
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the attack SHALL resolve as an automatic hit with a to-hit number and roll of `0`
- **AND** target damage SHALL be `round(attackerWeight / 3)`
- **AND** the target SHALL not receive a physical-hit PSR
- **AND** the attacker SHALL receive a `thrash_attacker_hit` PSR for the thrashing attack
- **AND** standing attackers, non-infantry targets, non-same-hex targets, non-clear/non-pavement terrain, prior weapon fire, and missing usable arm/leg state SHALL reject the attack before damage or PSR side effects

#### Scenario: Brush-off resolves as source-backed swarmer dislodgement or miss self-damage

- **GIVEN** a BattleMech declares `brush-off` with a selected arm against enemy swarming infantry or Battle Armor attached to that attacker
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the attack SHALL apply the source-backed `+4` brush-off to-hit modifier plus selected-arm actuator/AES/claw/sensor/magnetic-claw modifiers
- **AND** a hit SHALL apply punch-equivalent damage to the swarming target and clear that target's swarming attachment state
- **AND** a miss SHALL apply punch-equivalent self-damage to the attacker on the punch hit table without dislodging the swarmer
- **AND** non-Mek attackers, missing or invalid selected arms, non-swarming non-iNARC targets, quad attackers, flipped arms, no/minimal-arms quirks, shoulder destruction, selected-arm weapon fire, target-DFA state, prone attackers, and explicit building/fuel-tank/hex targets SHALL reject the attack before damage
- **AND** targetable iNARC pod brush-off removal SHALL remain tracked as a separate iNARC pod target-model gap until pod objects can be selected and removed by physical attack resolution

#### Scenario: Grapple resolves as source-backed zero-damage grapple state

- **GIVEN** a biped BattleMech declares `grapple` against an adjacent Mek or ProtoMek with the TacOps grappling option enabled
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the attack SHALL apply source-backed actuator/AES/TSM, target movement, evasion, spotting, SPA, and weight-class to-hit modifiers
- **AND** a hit SHALL deal zero damage, set both units' grapple state, move the attacker into the target hex, mark both units as grappled this round, mark the attacker as the grapple initiator, and face the target opposite the attacker
- **AND** disabled optional rules, airborne state, common locked-grapple impossibility, friendly targets, invalid attacker or target unit type, missing arms, destroyed shoulders, invalid range, invalid elevation, non-front-arc targets, prone-state gates, selected-arm weapon fire, and already-grappled state SHALL reject the attack before grapple state changes
- **AND** chain-whip follow-up behavior and simultaneous counter-grapple exchange SHALL remain tracked as separate gaps from normal grapple state resolution

#### Scenario: Break-grapple resolves as source-backed zero-damage grapple release

- **GIVEN** a biped BattleMech or ProtoMek declares `break-grapple` against its currently grappled target with the TacOps grappling option enabled
- **WHEN** helper, eligibility, tactical-command, intent/wire, event-sourced, or runner resolution surfaces validate the declaration
- **THEN** the original grapple attacker SHALL resolve break-grapple as an automatic hit with a to-hit number and roll of `0`
- **AND** a defender breaking free SHALL apply source-backed both-arm actuator, both-arm AES, weight-class, target movement, evasion, spotting, SPA, and normal physical to-hit modifiers
- **AND** a hit SHALL deal zero damage, clear both units' grapple state, move the original grapple attacker to the least-dangerous valid adjacent hex when the original attacker breaks the grapple, or move the defender's opponent to the most-dangerous valid adjacent hex when the defender breaks free
- **AND** the moved unit SHALL face back toward its counterpart after displacement
- **AND** disabled optional rules, airborne state, common locked-grapple impossibility, chain-whip grapple state, invalid attacker unit type, target mismatch, and missing grapple target state SHALL reject the attack before grapple state, displacement, or damage side effects
- **AND** chain-whip maintenance/follow-up behavior and simultaneous counter-grapple exchange SHALL remain tracked as separate gaps from normal break-grapple release

#### Scenario: Physical attacks require existing targets

- **GIVEN** an attacker declares any supported BattleMech physical attack against a target id that is not present in combat state
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `TargetMissing`
- **AND** no physical attack declaration SHALL be scheduled
- **AND** explicit non-unit target-object declarations SHALL use their source-backed object rejection code instead of falling back to `TargetMissing`

#### Scenario: Stale physical declarations resolve missing targets as invalid

- **GIVEN** an already-declared physical attack whose target unit is missing at resolution time
- **WHEN** the physical attack resolver runs
- **THEN** the resolver SHALL emit `PhysicalAttackResolved` with `TargetMissing`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** explicit non-unit target-object context SHALL resolve with the source-backed object rejection code instead of `TargetMissing`

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

#### Scenario: Punch and kick reject missing attacker limbs

- **GIVEN** a BattleMech punch uses a selected arm location that has been destroyed or blown off
- **WHEN** the punch legality gate runs
- **THEN** the punch SHALL be rejected with `LimbMissing`
- **AND** no physical declaration, damage, PSR, or displacement side effect SHALL be emitted
- **GIVEN** a BattleMech kick has either leg location destroyed or blown off
- **WHEN** the kick legality gate runs
- **THEN** the kick SHALL be rejected with `LimbMissing`
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome from the shared helper

#### Scenario: Physical declarations reject invalid hex target objects

- **GIVEN** a physical helper or event-sourced declaration evaluates a woods-clearing, building-ignition, or hex-ignition target object
- **WHEN** the shared physical legality gate runs
- **THEN** the attack SHALL be rejected with `InvalidPhysicalTarget`
- **AND** stale declared resolution with explicit non-unit target context SHALL preserve `InvalidPhysicalTarget` without damage, displacement, or PSR side effects

#### Scenario: Push declarations reject building and fuel-tank target objects

- **GIVEN** a push helper or event-sourced declaration evaluates a building or fuel-tank target object
- **WHEN** the push legality gate runs
- **THEN** the push SHALL be rejected with `TargetBuilding`
- **AND** stale declared resolution with explicit non-unit target context SHALL preserve `TargetBuilding` without damage, displacement, or PSR side effects

#### Scenario: Charge and death from above declarations reject non-entity building targets

- **GIVEN** a charge or death from above helper or event-sourced declaration evaluates a building or fuel-tank target object
- **WHEN** the action-specific legality gate runs
- **THEN** the attack SHALL be rejected with `InvalidPhysicalTarget`
- **AND** the catalog SHALL record that MegaMek source order returns `Invalid Target` for non-entity targets before the later adjacent-building branch
- **AND** non-unit building and fuel-tank physical damage resolution SHALL remain an explicit gap

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

#### Scenario: Charge rejects prone attackers

- **GIVEN** a BattleMech-compatible attacker declares a charge after running this turn
- **AND** the attacker is prone at charge resolution time
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `AttackerProne`
- **AND** no physical declaration, damage, displacement, or PSR side effect SHALL be emitted
- **AND** runner physical phase SHALL skip prone attackers before bot or automatic charge declarations

#### Scenario: Charge rejects jump movement paths

- **GIVEN** a BattleMech-compatible attacker declares a charge after jumping this turn
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `ChargeJumpMovement`
- **AND** the jump movement rejection SHALL run before the generic no-run, backward-movement, and prone-attacker gates
- **AND** event-sourced declarations, stale physical resolution, and runner injected declarations SHALL consume the same movement-state-derived jump flag

#### Scenario: Charge rejects backward movement paths

- **GIVEN** a BattleMech-compatible attacker declares a charge after running this turn
- **AND** the attacker's movement step chain included backward or backward-lateral movement
- **WHEN** the charge legality gate runs
- **THEN** the charge SHALL be rejected with `ChargeBackwardMovement`
- **AND** event-sourced declarations, stale physical resolution, runner injected declarations, and automatic runner selection SHALL consume the same movement-step-derived state

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
- **AND** domino step-out fallout and broader DropShip footprint/secondary-hex consequences SHALL remain explicit gaps

#### Scenario: Physical displacement rejects prohibited BattleMech terrain

- **GIVEN** a push, charge, or death-from-above displacement would move a BattleMech target into an explicit impassable terrain hex or a represented woods/jungle terrain feature above level two
- **WHEN** the shared displacement helper evaluates the destination
- **THEN** the displacement SHALL be treated as invalid before position changes or displacement PSRs are emitted
- **AND** successful charge damage SHALL still apply while both units remain in their original hexes
- **AND** helper, event-sourced resolution, runner resolution, catalog, and source-truth audit evidence SHALL cite MegaMek `Compute.isValidDisplacement` prohibited-destination handling plus `Mek.isLocationProhibited` impassable and woods/jungle terrain-level handling
- **AND** hidden-unit deployment restrictions, track/wheel motive restrictions, domino step-out fallout, and broader DropShip footprint/secondary-hex consequences SHALL remain explicit gaps

#### Scenario: Runner physical displacement refreshes same-phase occupancy

- **GIVEN** one physical attack displaces a unit into a hex that a later same-phase physical attack would otherwise use as its displacement destination
- **WHEN** the runner resolves the later physical attack
- **THEN** the runner SHALL evaluate displacement legality against the refreshed grid occupancy from the earlier displacement payload
- **AND** the later attack SHALL NOT emit a displacement payload or charge-specific displacement PSRs when that refreshed destination is occupied
- **AND** runner behavior, parity catalog, task list, and source-truth audit evidence SHALL report the same stale-occupancy closure
- **AND** domino step-out fallout and broader DropShip footprint/secondary-hex consequences SHALL remain explicit gaps

#### Scenario: Displacement chain edge gaps stay source-backed

- **GIVEN** the physical legality support catalog tracks BattleMech displacement behavior
- **WHEN** the catalog is contract-tested
- **THEN** occupied-hex domino displacement SHALL remain a source-backed helper-only row that recursively moves blockers, cascades position updates, and queues DominoEffect PSRs through helper, event-sourced, and runner physical resolution
- **AND** domino step-out/CFR handling and broader `TWGameManager.doEntityDisplacement` terrain, building, and environment fallout SHALL remain explicit gaps
- **AND** DFA-miss friendly occupied displacement avoidance SHALL remain an integrated source-backed row that passes same-side target friendlies into preferred displacement before falling back to occupied friendly destinations
- **AND** grounded DropShip-radius displacement search SHALL be an integrated source-backed row that scans the radius-two ring in MegaMek `Compute.getValidDisplacement` order when same-board grounded DropShip source context is supplied or runtime-hydrated for runner and event-sourced DFA hit displacement
- **AND** broader DropShip footprint/secondary-hex consequences SHALL remain an explicit gap until large-aero occupancy is modeled beyond same-hex source context
- **AND** each helper-only, integrated, or unsupported row SHALL cite the corresponding MegaMek `Compute` or `TWGameManager` source anchor with commit-pinned line references

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

#### Scenario: Death from above rejects mechanical jump booster movement paths

- **GIVEN** a BattleMech movement declaration contains a jump step marked as using a mechanical jump booster
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `MechanicalJumpBooster`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration/resolution, runner resolution, and automatic runner selection SHALL use the same movement-step-derived gate

#### Scenario: Death from above evaluates airborne VTOL reach with hydrated jump context

- **GIVEN** a BattleMech declares death from above against an airborne VTOL target
- **AND** the declaration context carries attacker jump MP and target elevation difference
- **WHEN** the target elevation above the attacker's height exceeds attacker jump MP
- **THEN** death from above SHALL be rejected with `ElevationMismatch`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration/resolution, runner resolution, and automatic runner selection SHALL use the same reach gate for explicit airborne VTOL targets and airborne WIGE targets represented by combat motion type

#### Scenario: Death from above rejects infantry-family attackers

- **GIVEN** an Infantry or Battle Armor attacker declares death from above after jumping this turn
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `AttackerInfantry`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration, and runner resolution SHALL report the same gate outcome

#### Scenario: Death from above rejects DropShip targets

- **GIVEN** a BattleMech declares death from above against a DropShip target after jumping this turn
- **WHEN** the DFA legality gate runs
- **THEN** death from above SHALL be rejected with `TargetDropShip`
- **AND** no damage, displacement, or PSR side effect SHALL be emitted
- **AND** eligibility UI, event-sourced declaration/resolution, and runner resolution SHALL report the same gate outcome

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
- **AND** eligibility, event-sourced declarations, runner resolution, and automatic runner selection SHALL hydrate explicit airborne VTOL targets from unit type and airborne WIGE targets from combat motion type when attacker jump MP and elevation context are present
- **AND** the validation catalog SHALL mark the VTOL/WIGE reach gate integrated only when helper, event-sourced, runner, and automatic-selection evidence are present

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
- **AND** the target PSR SHALL use the MegaMek-backed +2 "hit by death from above" modifier
- **AND** event-sourced resolution and runner resolution SHALL both surface the same modifiers

#### Scenario: Physical PSR trigger rows stay source-backed

- **GIVEN** the runner PSR trigger catalog covers kick, charge, push, DFA, and physical-miss fallout
- **WHEN** the BattleMech combat catalog contract tests run
- **THEN** kick target, kick miss, push target, charge hit, DFA target, successful-DFA attacker, charge miss, and missed-DFA rows SHALL carry structured MegaMek source references with commit-pinned line anchors
- **AND** successful charge target and attacker PSRs SHALL use the MegaMek-backed `+2` modifier
- **AND** successful DFA target PSRs SHALL use the MegaMek-backed `+2` modifier
- **AND** normal missed charges SHALL displace the attacker without queuing a normal `ChargeMiss` PSR, keeping the legacy/local `ChargeMiss` factory in the `out-of-scope` audit inventory rather than an integrated parity claim or unresolved BattleMech blocker
- **AND** missed-DFA grid resolution SHALL remain immediate fall handling rather than a queued normal `DFAMiss` PSR, with the no-grid fallback factory remaining an `out-of-scope` audit row outside source-backed BattleMech blocker accounting

#### Scenario: Death from above miss immediately drops the attacker

- **GIVEN** a death-from-above attack misses and the target has a legal displacement hex
- **WHEN** the DFA miss displacement branch runs
- **THEN** the target SHALL move to the preferred displacement hex and the attacker SHALL fall into the target's original hex
- **AND** event-sourced resolution and runner resolution SHALL immediately apply fall damage, set the attacker prone with the source-backed rear fall facing, emit `UnitFell`, and avoid queuing the normal `DFAMiss` PSR for that grid-backed fall branch
- **AND** the attacker SHALL roll the source-backed fall pilot-damage avoidance check, applying one fall-sourced pilot wound and `PilotHit` only when that check fails

### Requirement: Source-Backed Physical Weapon Runtime Support

BattleMech physical weapon runtime support SHALL stay aligned with MegaMek `ClubAttackAction` damage, to-hit, and legality behavior before a cataloged physical weapon is marked integrated. Physical equipment that modifies existing physical actions, such as talons, SHALL be source-checked against the relevant MegaMek action resolvers before it is marked helper-only or integrated.

#### Scenario: Official physical weapon catalog partitions into runtime attacks and modifier equipment

- **GIVEN** the official physical weapon construction catalog includes standalone melee weapons and modifier equipment
- **WHEN** the physical weapon runtime-boundary contract runs
- **THEN** every official physical weapon id SHALL have a combat support row
- **AND** local construction physical weapon definitions SHALL expose the same id set as `weapons/physical.json`
- **AND** standalone physical weapon rows SHALL exactly match `SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES`
- **AND** claws and talons SHALL remain integrated modifier-only rows that do not pass intent, wire, or physical option validation as selectable attack types
- **AND** no official physical weapon row SHALL be left unsupported without an explicit support-map entry

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
- **AND** the validation catalog SHALL have no unsupported standalone official physical weapon runtime types after flail and wrecking ball integration, while modifier-only claw/talon lifecycle and full mounted physical-weapon lifecycle remain visible gaps under the physical-weapon action and damage-modifier lifecycle rows

#### Scenario: Talons modify kick and DFA damage without becoming a selectable attack type

- **GIVEN** a BattleMech has explicit biped leg talon combat state and a working foot actuator
- **WHEN** it resolves a kick using that leg
- **THEN** kick target damage SHALL apply MegaMek's source-backed `round(baseKickDamage * 1.5)` talon modifier before physical damage bonuses
- **AND** quad/non-biped BattleMech front-leg kicks SHALL map the selected kicking leg to the matching arm-location talon state before applying the same modifier
- **WHEN** it resolves death from above with at least one qualifying talon leg
- **THEN** DFA target damage SHALL apply MegaMek's source-backed truncating `baseDfaDamage * 1.5` talon modifier before physical damage bonuses
- **AND** quad/non-biped DFA talon checks SHALL include MegaMek's right-arm talon gate plus explicit and catalog-hydrated arm-location talon state for front legs
- **AND** talons SHALL remain non-selectable in runtime physical attack option lists because they modify existing kick/DFA actions rather than declaring a distinct physical attack
- **AND** catalog UnitHydration SHALL derive biped leg talon state from `LEFT_LEG` and `RIGHT_LEG` critical slots and quad/non-biped front-leg talon state from `LEFT_ARM` and `RIGHT_ARM` critical slots containing Talons entries
- **AND** `CriticalHitResolved` events that destroy, mark missing, or mark breached Talons equipment SHALL remove the matching leg or arm-location talon modifier from event replay and runner combat state
- **AND** destroyed leg or arm-location replay and runner damage persistence SHALL remove the matching talon modifier from represented combat state
- **AND** the validation catalog SHALL mark core talon damage modifier behavior integrated while keeping automatic missing/breached talon event production from mounted-equipment state beyond represented destroyed-location replay visible through a separate helper-only lifecycle row

#### Scenario: Claws modify punch damage and to-hit without becoming a selectable attack type

- **GIVEN** a BattleMech has explicit arm claw combat state for the punching arm
- **WHEN** it resolves a punch using that arm
- **THEN** punch target damage SHALL use MegaMek's source-backed `ceil(attackerWeight / 7)` claw base before actuator, pilot ability, quirk, and environmental modifiers
- **AND** punch to-hit SHALL include MegaMek's source-backed `+1` claw modifier while suppressing the hand-actuator destroyed modifier for that claw arm
- **AND** claws SHALL remain non-selectable in runtime physical attack option lists because they modify punch rather than declaring a distinct physical attack
- **AND** catalog UnitHydration SHALL derive arm claw state from `LEFT_ARM` and `RIGHT_ARM` critical slots containing `ISClaw` entries
- **AND** `CriticalHitResolved` events that destroy, mark missing, or mark breached Claw equipment SHALL remove the matching arm claw modifier from event replay and runner combat state
- **AND** destroyed arm location replay and runner damage persistence, including side-torso arm cascades, SHALL remove the matching arm claw modifier from represented combat state
- **AND** PLAYTEST_3 SHALL remove only the claw punch to-hit penalty while preserving claw punch damage
- **AND** the validation catalog SHALL mark core claw damage modifier behavior integrated while keeping automatic missing/breached claw event production from mounted-equipment state beyond represented destroyed-location replay and claw club-with-hand interactions visible through a separate helper-only lifecycle row

### Requirement: Designator Marker Replay State

Designator marker events SHALL replay into the same target marker state consumed by combat resolution. TAG markers SHALL set transient `tagDesignated` state that clears at turn start. Standard NARC markers SHALL append the marking team to `narcedBy` without duplicate entries and SHALL persist across turn starts. iNARC launcher hits SHALL derive the attached `iNarcPods` `podType` from the selected ammo weapon type so Homing, ECM, Haywire, and Nemesis ammo can each attach distinct marker state without falling back to `narcedBy`. Direct NARC-compatible missile cluster resolution and runner to-hit declaration SHALL consume Homing pod state when the target is not ECM-protected. Target ECM SHALL suppress standard NARC and iNARC Homing guidance without adding a generic ECM to-hit penalty. Runner to-hit declaration SHALL consume Haywire pod state on the attacker as a source-backed +1 attacker to-hit modifier. Semi-guided TAG to-hit resolution SHALL cancel positive target-movement modifiers and apply source-backed indirect-fire relief when semi-guided ammunition attacks a TAG-designated target not protected by ECM. Semi-guided TAG SHALL NOT expose or consume a cluster-table helper in official combat resolution. Runner missile cluster resolution SHALL consume attacker iNARC ECM pod state as flight-path ECM for Artemis IV/prototype IV/V suppression without treating it as target ECM for NARC guidance. C3 ECM disruption SHALL consume iNARC ECM pod state and deny C3 targeting benefit through the same ECM-disrupted C3 helper path. Runner weapon attack resolution SHALL consume friendly intervening iNARC Nemesis pod state to redirect source-backed direct confusable missile attacks. Remaining iNARC ECM sensor effects, targetable iNARC pod brush-off removal, and ambiguous/player-authored C3 network assignment SHALL remain explicit gaps until their variant-specific runner effects are represented.

#### Scenario: Replay applies TAG, standard NARC, and iNARC variant marker state

- **GIVEN** a replay stream contains `DesignatorMarkerApplied` events for TAG, standard NARC, and iNARC variant hits
- **WHEN** the event-sourced state reducer applies those events
- **THEN** TAG events SHALL mark the target as TAG-designated for the turn
- **AND** standard NARC events SHALL add the marking team to the target's `narcedBy` list without duplicate markers
- **AND** iNARC selected-ammo hits SHALL add Homing, ECM, Haywire, or Nemesis `{ teamId, podType }` entries to target `iNarcPods` without adding the team to `narcedBy`
- **AND** direct NARC-compatible missile cluster and to-hit resolution SHALL consume source-backed iNARC Homing state while indirect-fire and target-ECM-suppressed guidance bonuses stay suppressed
- **AND** attack declaration SHALL consume source-backed iNARC Haywire state on the attacker as a +1 to-hit modifier
- **AND** target ECM SHALL suppress standard NARC and iNARC Homing guidance without adding a generic ECM to-hit modifier
- **AND** missile cluster resolution SHALL consume source-backed attacker iNARC ECM state to suppress Artemis flight-path guidance while preserving target-only NARC guidance
- **AND** C3 ECM disruption helpers SHALL consume source-backed iNARC ECM pod state to deny C3 targeting benefit
- **AND** direct confusable missile attacks SHALL redirect to friendly intervening units carrying source-backed iNARC Nemesis pod state
- **AND** the catalog SHALL continue to list remaining iNARC ECM sensor effects, targetable iNARC pod brush-off removal, and ambiguous/player-authored C3 network assignment as explicit gaps until those effects are implemented

#### Scenario: Semi-guided TAG to-hit cancels target movement and offsets indirect fire

- **GIVEN** a semi-guided LRM, MML, NLRM, or mortar attack targets a TAG-designated unit that is not protected by ECM
- **WHEN** ranged to-hit is calculated against a target with a positive target-movement modifier
- **THEN** the normal target-movement modifier SHALL remain visible in the modifier list
- **AND** an equal negative `Semi-guided TAG target movement` modifier SHALL be appended to cancel it
- **WHEN** that attack is indirect fire
- **THEN** the normal indirect-fire penalty SHALL remain visible in the modifier list
- **AND** a `-1` `Semi-guided TAG indirect fire` modifier SHALL be appended
- **AND** no semi-guided TAG to-hit modifier SHALL apply when the target lacks TAG designation or ECM suppresses the guidance
- **AND** the validation catalog SHALL NOT include a semi-guided TAG cluster-bonus row or helper as BattleMech parity

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

Direct runner weapon attack declarations SHALL consume explicit `IGameState.c3Network` state when scenario/session builders provide it. The runner SHALL seed conservative unambiguous per-side C3 master/slave and C3i networks from hydrated BattleMech C3 equipment during initial state creation, SHALL refresh C3 member positions, operational lifecycle state, matching C3 equipment critical-slot damage, and ECM/iNARC ECM disruption from current unit state before calculating the declared to-hit number, SHALL suppress C3 range sharing for indirect fire, SHALL use default MegaMek C3 behavior where the network range-sharing unit does not need line of sight to the target, SHALL require spotter-to-target line of sight for C3 range sharing when the `PLAYTEST_3` optional rule is enabled, and SHALL keep ambiguous/player-authored C3 network assignment explicit until those session state builders exist.

#### Scenario: Direct weapon attack uses explicit C3 state

- **GIVEN** a direct weapon attack has an attacker and same-team spotter in explicit C3 network state
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL use the best C3 network range bracket when it improves the attacker's own bracket
- **AND** current unit positions SHALL override stale C3 member positions before range math
- **AND** current destroyed, ejected, retreated, withdrawing, shutdown, or transported C3 member state SHALL suppress stale C3 range sharing before range math
- **AND** matching destroyed C3 equipment critical slots SHALL suppress stale C3 range sharing before range math
- **AND** iNARC ECM pod state on a C3 member SHALL deny C3 benefit through the ECM-disrupted C3 path
- **AND** the attack payload SHALL retain the attacker's actual range band while listing the effective C3 range math in modifiers

#### Scenario: Catalog hydration records mounted C3 equipment roles

- **GIVEN** a BattleMech catalog unit carries mounted C3 Master, C3 Slave, boosted C3, or C3i equipment in its equipment list or critical slots
- **WHEN** UnitHydration creates combat state for that unit
- **THEN** the unit state SHALL record mounted C3 equipment roles as `master`, `slave`, or `c3i` with source equipment id and mount location
- **AND** boosted C3 master/slave entries SHALL retain a boosted marker in the hydrated equipment state
- **AND** Battle Armor C3 and Battle Armor Improved C3 entries SHALL NOT hydrate as BattleMech C3 equipment
- **AND** runner initial state SHALL seed one same-side C3 master/slave network when there is exactly one C3 master, at least one C3 slave, and no more than four standard C3 members
- **AND** runner initial state SHALL seed one same-side C3i network when there are at least two and no more than six C3i members
- **AND** the catalog SHALL continue to list session/player-authored C3 assignment, multiple same-side C3 networks, ambiguous multi-master equipment, and oversize network splitting as explicit gaps

#### Scenario: Default C3 range sharing does not require spotter LOS

- **GIVEN** a direct weapon attack has legal attacker-to-target LOS
- **AND** the nearest same-team C3 network member has a better range bracket but blocked LOS to the target
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL still use that member's improved C3 range bracket
- **AND** the catalog SHALL not list default C3 spotter LOS hydration as a helper-only gap

#### Scenario: PLAYTEST_3 C3 range sharing requires spotter LOS

- **GIVEN** a direct weapon attack has legal attacker-to-target LOS
- **AND** the nearest same-team C3 network member has a better range bracket but blocked LOS to the target
- **AND** the `PLAYTEST_3` optional rule is enabled
- **WHEN** the runner emits `AttackDeclared`
- **THEN** the declared to-hit number SHALL not use that member's improved C3 range bracket
- **AND** the attack payload SHALL omit the `C3 Network` modifier
- **AND** a C3 network member with clear target LOS SHALL still provide range sharing under `PLAYTEST_3`

#### Scenario: C3 remaining gaps stay separate from explicit-state support

- **GIVEN** the runner consumes explicit C3 network state for direct weapon attack to-hit math
- **WHEN** the to-hit support catalog and requirement crosswalk are contract-tested
- **THEN** ambiguous C3 equipment/network assignment edges SHALL remain a helper-only to-hit row
- **AND** the integrated `c3` row SHALL describe explicit network-state consumption, position refresh, operational lifecycle refresh, C3 critical-slot damage suppression, ECM/iNARC ECM disruption, indirect-fire suppression, default no-LOS-required C3 range sharing, and optional PLAYTEST_3 spotter LOS gating

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
- **AND** the movement-enhancement catalog SHALL mark TSM, core MASC, and core Supercharger movement behavior as integrated while keeping remaining MASC/Supercharger side paths helper-only

### Requirement: Source-Backed Active MASC/Supercharger Run Movement Boundary

Runner movement validation SHALL consume explicit active `activeMASC` and `activeSupercharger` BattleMech combat state when calculating running and sprinting movement capability. A single active MASC or Supercharger SHALL double the effective walk MP for run validation and validate Sprint MP against `ceil(effectiveWalkMP * 2.5)`, and active MASC plus active Supercharger SHALL validate run movement against `ceil(effectiveWalkMP * 2.5)` and Sprint movement against `effectiveWalkMP * 3`. Runner movement SHALL queue the corresponding MASC and/or Supercharger failure PSR triggers when an explicit active booster is used for running or sprinting movement. TacOps Evade SHALL remain run-based but SHALL use the unboosted run MP envelope rather than the MASC/Supercharger-boosted run capability. Those pending PSRs SHALL carry source-backed standard fixed target numbers from explicit `mascTurnsUsed` and `superchargerTurnsUsed` prior-use state, defaulting first use to 3 and mapping prior-use counts through `[3, 5, 7, 11, 13, 13, 13]`. When a runner `MASCFailure` or `SuperchargerFailure` check fails and the pilot has `edge_when_masc_fails` plus remaining Edge, runner PSR resolution SHALL spend one Edge point and reroll the failed check before applying fall or movement-enhancement failure aftermath. When the Edge reroll passes, the original failed roll SHALL be marked superseded and no fall or movement-enhancement failure aftermath SHALL occur. When a final runner `MASCFailure` check fails, runner PSR resolution SHALL apply one critical-slot hit to each leg from the current critical-slot manifest and SHALL NOT destroy the MASC system. When a final runner `SuperchargerFailure` check fails, runner PSR resolution SHALL destroy the Supercharger slot when present, roll the source-backed 2d6 engine critical table (`<=7` no engine hits, `8-9` one hit, `10-11` two hits, `12` three hits), and apply resulting engine critical slots in the center torso. At turn reset, runner state SHALL advance the used booster's prior-use counter, clear active booster use, and decay idle prior-use counters. Alternate MASC option tables, IndustrialMek/support-unit supercharger adjustment, separate first-step equipment-check timing, and non-BattleMech Supercharger motive-damage branches SHALL remain explicit gaps.

#### Scenario: Active MASC expands run validation and queues a failure PSR

- **GIVEN** a BattleMech has `hasMASC: true`, `activeMASC: true`, and base walk/run MP `4/6`
- **WHEN** the runner validates an 8 MP running movement
- **THEN** the movement SHALL be accepted with 8 MP used
- **AND** the unit SHALL receive a pending `MASCFailure` PSR with fixed target number 3
- **AND** the movement-enhancement catalog SHALL mark the core MASC row integrated and keep alternate table and first-step timing side paths in a separate helper-only row with MegaMek source anchors
- **AND** the PSR trigger catalog SHALL mark the core MASC failure trigger integrated because alternate table and first-step timing concerns live on the separate MASC side-path row

#### Scenario: Failed MASC check applies leg critical damage

- **GIVEN** a BattleMech has active MASC and a pending `MASCFailure` PSR
- **WHEN** runner PSR resolution fails that check
- **THEN** one hittable critical slot in each leg SHALL be marked destroyed through the critical-slot manifest
- **AND** critical-hit events SHALL identify the destroyed leg slots
- **AND** the unit SHALL retain installed MASC state

#### Scenario: Failed Supercharger check applies engine-table damage

- **GIVEN** a BattleMech has active Supercharger and a pending `SuperchargerFailure` PSR
- **WHEN** runner PSR resolution fails that check and the Supercharger engine-damage roll is 12
- **THEN** the Supercharger critical slot SHALL be marked destroyed when present
- **AND** three center-torso engine critical slots SHALL be marked destroyed
- **AND** the unit SHALL be marked destroyed from engine destruction
- **AND** the PSR trigger catalog SHALL mark the core Supercharger failure trigger integrated because IndustrialMek/support-unit adjustments, separate first-step timing, and non-BattleMech motive-damage behavior live on the separate Supercharger side-path row

#### Scenario: Edge reroll suppresses movement-enhancement failure aftermath

- **GIVEN** a BattleMech has `edge_when_masc_fails`, one remaining Edge point, and a pending `MASCFailure` or `SuperchargerFailure` PSR
- **WHEN** the first failure check fails and the Edge reroll passes
- **THEN** one Edge point SHALL be spent
- **AND** the original failed PSR result SHALL be marked superseded
- **AND** the rerolled PSR result SHALL be marked as an Edge reroll
- **AND** the unit SHALL NOT fall or receive movement-enhancement failure aftermath

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

Physical to-hit validation SHALL apply MegaMek's Terrain Master: Frogman relief as a `-1` to-hit modifier only when the attacker has canonical `tm_frogman` or legacy `terrain-master-frogman`, the attacker is a Mek or ProtoMek, and the attacker occupies water deeper than level 1. Runner and event-sourced physical resolution SHALL derive or accept attacker water depth without using target-only water. Terrain Master source-backed variant coverage includes Frogman water-entry, Mountaineer rubble-entry plus movement-cost relief, Forest Ranger defender to-hit, Swamp Beast defender to-hit, and Swamp Beast bog-down relief. Generic Terrain Master movement and PSR behavior beyond those source-backed variant rows SHALL remain an explicit gap until separately source-backed.

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

### Requirement: Source-Backed Terrain Master Mountaineer Movement And Rubble-Entry PSR

Movement PSR validation SHALL apply MegaMek's Terrain Master: Mountaineer relief as a named `-1` SPA modifier only when the pending PSR is an entering-rubble PSR and the acting unit has canonical `tm_mountaineer` or legacy `terrain-master-mountaineer`. BattleMech movement pricing SHALL also apply Mountaineer rough/rubble terrain MP relief and upward-elevation MP relief when unit pilot abilities include `tm_mountaineer` or legacy `terrain-master-mountaineer`. Runner movement validation, interactive movement, P2P movement intent validation, pathfinding, and reachable movement previews SHALL consume the same movement-cost context so committed movement and previews agree.

#### Scenario: Mountaineer applies to entering-rubble PSR

- **GIVEN** a unit with `tm_mountaineer`
- **AND** the unit has a pending entering-rubble PSR
- **WHEN** the PSR target number is computed
- **THEN** the PSR target number SHALL include a `Mountaineer` SPA modifier of `-1`

#### Scenario: Mountaineer rubble-entry boundaries

- **GIVEN** a unit with `tm_mountaineer`
- **WHEN** the pending PSR reason is not entering rubble
- **THEN** no `Mountaineer` PSR modifier SHALL apply

#### Scenario: Mountaineer movement-cost relief

- **GIVEN** a unit with `tm_mountaineer`
- **WHEN** the unit validates ground movement into rough or rubble terrain
- **THEN** the terrain entry MP surcharge SHALL be reduced by 1 and never below 0
- **WHEN** the unit validates ground movement up 1 or 2 elevation levels
- **THEN** the upward-elevation MP surcharge SHALL be reduced by 1 and never below 0
- **AND** the normal impassable climb cap for upward elevation changes greater than 2 SHALL still apply
- **AND** runner movement, interactive movement, P2P movement validation, pathfinding, and reachable previews SHALL report the same reduced MP cost

### Requirement: Source-Backed Swamp Bog-Down Stuck State

Terrain PSR validation SHALL queue MegaMek's BattleMech swamp bog-down rule as a stuck-state PSR when a BattleMech-like unit enters swamp by ground movement. The catalog SHALL NOT model swamp bog-down as a normal failed-PSR fall. A failed swamp bog-down PSR SHALL emit `UnitStuck`, set `isStuck`, clear pending PSRs, and SHALL NOT emit `UnitFell` or pilot fall damage. Jumping into swamp SHALL mark BattleMech-like units stuck immediately without queueing a fall PSR. Terrain Master: Swamp Beast bog-down relief SHALL apply as `-1` to swamp bog-down PSRs. MegaMek mud bog-down SHALL remain excluded from BattleMech swamp bog-down coverage because biped and quad movement modes do not bog down in mud.

#### Scenario: Swamp bog-down queues stuck-state PSR

- **GIVEN** a BattleMech-like unit enters swamp by ground movement
- **WHEN** movement terrain PSRs are queued
- **THEN** a swamp bog-down PSR SHALL be queued with MegaMek source references
- **AND** a pilot with `tm_swamp_beast` SHALL receive a `-1` Swamp Beast bog-down modifier

#### Scenario: Failed swamp bog-down marks unit stuck

- **GIVEN** a BattleMech-like unit has a pending swamp bog-down PSR
- **WHEN** the PSR fails during runner or event-sourced PSR resolution
- **THEN** the unit SHALL be marked `isStuck`
- **AND** a `UnitStuck` event SHALL preserve the failed PSR reason and reason code
- **AND** no `UnitFell`, `PilotHit`, or fall-damage side effect SHALL be emitted for that failure

#### Scenario: Jumping into swamp marks unit stuck immediately

- **GIVEN** a BattleMech-like unit jumps into swamp
- **WHEN** the movement phase applies terrain PSR handling
- **THEN** the unit SHALL be marked `isStuck` immediately
- **AND** the terrain handling SHALL emit `UnitStuck` without queueing a normal fall PSR

#### Scenario: Mud is not promoted to a BattleMech bog-down gap

- **GIVEN** the terrain PSR support catalog is generated
- **WHEN** mud terrain support is inspected
- **THEN** mud SHALL remain integrated for the existing BattleMech movement-cost and terrain-modifier coverage

### Requirement: Source-Backed Cross-Country Scope Split

Pilot modifier validation SHALL keep MegaMek's Cross-Country SPA visible as an explicit non-BattleMech combat-vehicle movement/passability scope split. The BattleMech combat matrix SHALL NOT represent Cross-Country as a terrain PSR modifier unless a future source-backed BattleMech rule is identified. Cross-Country SHALL stay in the `out-of-scope` audit inventory until vehicle movement/passability coverage consumes it.

#### Scenario: Cross-Country is cataloged outside BattleMech PSRs

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Cross-Country support is inspected
- **THEN** the SPA SHALL be out-of-scope with MegaMek source references to combat-vehicle terrain movement-cost and passability behavior
- **AND** the BattleMech movement resolver family SHALL NOT assign Cross-Country while it remains vehicle-scoped
- **AND** a vehicle movement resolver family SHALL assign Cross-Country as out-of-scope audit coverage
- **AND** the PSR resolver family SHALL NOT assign Cross-Country

### Requirement: Source-Backed Heavy Lifter Carry/Throw Gap

Pilot modifier validation SHALL keep MegaMek's Heavy Lifter SPA visible as helper-only lift-capacity coverage plus an unsupported carry/throw-object action gap. The source-backed BattleMech helper behavior SHALL calculate `5%` of unit tonnage per available hand, apply the `1.5x` Heavy Lifter multiplier for canonical `hvy_lifter` and legacy `heavy-lifter` ids, and then apply the active TSM pickup multiplier. MekStation SHALL still report missing object carry/throw physical action declarations and resolution through the movement/application gap.

#### Scenario: Heavy Lifter is cataloged as lift capacity without action support

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Heavy Lifter support is inspected
- **THEN** the SPA SHALL be helper-only with MegaMek source references to BattleMech lift-capacity behavior and MekStation helper/test anchors
- **AND** the movement resolver family SHALL own the visible unsupported carry/throw action gap
- **AND** Heavy Lifter SHALL NOT be represented as a physical damage or to-hit modifier

### Requirement: Source-Backed Shaky Stick Ground-To-Air To-Hit

Pilot modifier validation SHALL integrate MegaMek's Shaky Stick SPA as a ground-to-air defender to-hit modifier. The ranged to-hit pipeline SHALL apply a `+1` defender modifier only when a target with Shaky Stick is airborne and the attacker is not airborne, and SHALL NOT apply Shaky Stick to air-to-air attacks, grounded targets, generic target movement, terrain, or PSR checks. VTOL/WIGE-specific airborne subtype parity SHALL remain outside this BattleMech matrix until richer airborne movement-state hydration exists.

#### Scenario: Shaky Stick applies only to ground-to-air attacks

- **GIVEN** a ranged attack against an airborne target with Shaky Stick
- **WHEN** the attacker is not airborne
- **THEN** the attack to-hit number SHALL include a `+1` Shaky Stick modifier with MegaMek source references
- **AND** the SPA support row and pilot modifier resolver rows SHALL be integrated
- **AND** Shaky Stick SHALL NOT be represented as a generic BattleMech target movement, terrain, or PSR modifier

### Requirement: Source-Backed Weapon Quirk To-Hit Modifiers

Ranged to-hit validation SHALL keep combat-active quirk to-hit rows tied to MegaMek attacker quirk processing before treating them as integrated coverage. Sensor Ghosts SHALL apply as a `+1` attacker to-hit penalty. Accurate, Inaccurate, and Stable Weapon SHALL apply as weapon-specific to-hit modifiers where Stable Weapon applies only when the attacker ran. The support catalog and pilot modifier resolver rows SHALL expose commit-pinned MegaMek source references for those rows.

#### Scenario: Attacker quirk rows cite MegaMek to-hit source truth

- **GIVEN** the BattleMech quirk and pilot modifier resolver catalogs are generated
- **WHEN** Sensor Ghosts or weapon to-hit quirk support is inspected
- **THEN** `sensor_ghosts`, `accurate`, `inaccurate`, and `stable_weapon` SHALL be integrated with structured MegaMek source references
- **AND** the ranged to-hit and weapon-to-hit-quirk resolver rows SHALL cite the same relevant MegaMek attacker quirk anchors
- **AND** those source references SHALL be commit-pinned URLs with line anchors

### Requirement: Source-Backed Range Targeting Quirk Aliases

Ranged to-hit validation SHALL keep Improved Targeting and Poor Targeting rows source-backed while preserving MekStation's current local alias ids. MegaMek `imp_target_short`, `imp_target_med`, `imp_target_long`, `poor_target_short`, `poor_target_med`, and `poor_target_long` SHALL be the source-backed behavior family. MekStation `improved_targeting_*` and `poor_targeting_*` ids SHALL remain visible as local aliases until the catalog is normalized or an import compatibility layer maps the MegaMek ids directly.

#### Scenario: Targeting quirk aliases cite both source and local boundary

- **GIVEN** the BattleMech quirk and pilot modifier resolver catalogs are generated
- **WHEN** Improved Targeting or Poor Targeting support is inspected
- **THEN** every range-specific targeting quirk row SHALL be integrated with structured MegaMek source references for the range modifier behavior
- **AND** every row SHALL cite the MekStation alias boundary for the local `improved_targeting_*` and `poor_targeting_*` ids
- **AND** the ranged to-hit resolver row SHALL cite the MegaMek targeting quirk behavior without hiding the alias boundary on each quirk support row

### Requirement: Source-Backed Multi-Tasker Secondary Target Relief

Ranged to-hit validation SHALL keep MegaMek's Multi-Tasker SPA distinct from MekStation's legacy local Multi-Target row. The `multi-tasker` SPA row SHALL stay integrated for source-backed `multi_tasker` behavior that reduces secondary-target penalties through ranged to-hit calculation. The `multi-target-penalty-application` resolver row SHALL stay integrated only for source-backed secondary-target penalty application and Multi-Tasker relief. The local `multi-target` SPA row SHALL remain unsupported and unconsumed by the integrated resolver unless an independent source-backed combat authority is identified.

#### Scenario: Multi-Tasker application stays separate from local Multi-Target

- **GIVEN** the BattleMech SPA and pilot modifier resolver catalogs are generated
- **WHEN** secondary-target penalty support is inspected
- **THEN** `multi-tasker` SHALL be integrated with structured MegaMek source references
- **AND** `multi-target-penalty-application` SHALL be integrated with the same source-backed Multi-Tasker references
- **AND** the resolver assignment SHALL include `multi-tasker` and SHALL NOT include local `multi-target`
- **AND** `multi-target` SHALL remain unsupported as a local SPA source-boundary

### Requirement: Source-Backed Multi-Trac Secondary Target Relief

Ranged to-hit validation SHALL keep Multi-Trac source-backed as secondary-target penalty relief. The `multi_trac` quirk row SHALL cite MegaMek `Compute.getSecondaryTargetMod` and option-id anchors, and the ranged to-hit resolver row SHALL expose the same source-backed modifier family before claiming complete quirk to-hit coverage.

#### Scenario: Multi-Trac cites secondary-target source truth

- **GIVEN** the BattleMech quirk and pilot modifier resolver catalogs are generated
- **WHEN** Multi-Trac support is inspected
- **THEN** `multi_trac` SHALL be integrated with structured MegaMek source references for secondary-target modifier suppression
- **AND** the ranged to-hit resolver row SHALL cite the same Multi-Trac secondary-target anchors
- **AND** the source references SHALL be commit-pinned URLs with line anchors

### Requirement: Source-Backed Defensive Quirk Boundary

Ranged to-hit validation SHALL NOT count legacy defensive quirk to-hit helpers as source-backed integrated coverage when the source authority does not match the local helper behavior. `Distracting` SHALL remain helper-only until a combat resolver authority is identified. `Low Profile` SHALL remain helper-only until MekStation implements the source-backed glancing-blow behavior rather than treating it as a normal target to-hit modifier.

#### Scenario: Defensive quirk helpers expose source mismatch instead of hiding it

- **GIVEN** the BattleMech quirk and pilot modifier resolver catalogs are generated
- **WHEN** `distracting` and `low_profile` support is inspected
- **THEN** both rows SHALL be helper-only with structured MegaMek source references and MekStation deviation references
- **AND** the helper-only resolver row SHALL own the local `+1` target to-hit helper boundary
- **AND** the source-backed ranged to-hit resolver row SHALL NOT count those two defensive quirk helpers as integrated quirk to-hit coverage

### Requirement: Source-Backed Initiative Quirk Bonuses

Initiative validation SHALL apply MegaMek's Command Mech and Battle Computer force initiative bonuses from active conscious units. Battle Computer SHALL provide `+2`, Command Mech SHALL provide `+1`, and the bonuses SHALL NOT stack. Explicit HQ initiative equipment bonuses SHALL be treated as the same best-of force turn bonus as initiative quirks, while explicit command initiative equipment bonuses SHALL stack as a separate command bonus. Tactical Genius SHALL be modeled as a reroll request that replaces only the requested side's raw initiative roll when that side has an active conscious Tactical Genius unit, not as a flat modifier. Raw `2d6` initiative payload fields SHALL remain raw dice values for replay/RNG arbitration, with modifier and total fields carrying adjusted values. The Command Mech and Battle Computer quirk rows SHALL be integrated once their source-backed quirk behavior is covered; automatic command-console/HQ equipment hydration SHALL remain an explicit gap until equipment-derived command state is modeled. Automatic initiative equipment hydration SHALL fail closed unless source-kind/rules-profile, working/default-mode communications tonnage, active command-console crew, heavy-or-larger weight class, IndustrialMek, and advanced-fire-control eligibility context are represented.

#### Scenario: Battle Computer bonus remains non-cumulative with Command Mech

- **GIVEN** the player force has an active conscious unit with both `battle_computer` and `command_mech`
- **AND** raw initiative dice are lower than the opponent by 3
- **WHEN** initiative is rolled
- **THEN** the player receives only the source-backed `+2` bonus
- **AND** the opponent still wins
- **AND** the event payload retains raw `2d6` values plus modifier and total fields
- **AND** the `command_mech` and `battle_computer` quirk catalog rows SHALL be integrated while automatic HQ and command-console equipment hydration remains tracked under separate unsupported resolver rows

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

### Requirement: Local-Only SPA Gap Boundaries

Pilot modifier validation SHALL keep local-only SPA rows visible as MekStation deviation boundaries when a MegaMek combat SPA authority has not been identified. Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, and Antagonizer SHALL NOT be treated as MegaMek parity claims unless the catalog row carries source-backed implementation evidence. Those local-only rows SHALL remain out-of-scope audit evidence and SHALL cite the current MegaMek pilot option registry plus the MekStation SPA catalog row that introduced the local behavior.

#### Scenario: Local SPA rows stay source-boundary explicit

- **GIVEN** the combat catalog includes Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, or Antagonizer
- **WHEN** the support row is inspected
- **THEN** the row SHALL cite the MegaMek pilot option registry used for the source-truth cross-check
- **AND** the row SHALL cite the MekStation SPA catalog as a `mekstation-deviation`
- **AND** the row SHALL remain out-of-scope until source-backed combat authority exists
- **AND** no row SHALL be promoted to integrated until an implementation and source-backed combat authority exist

### Requirement: Canonical SPA Scope Source References

Pilot modifier validation SHALL treat every canonical SPA catalog row as source-checkable evidence. Each `canonicalPilotAbilityScope` row SHALL carry structured source references to the MekStation canonical SPA catalog plus the pinned MegaMek pilot option registry or category-specific source boundary that justifies the row's integrated, helper-only, unsupported, or out-of-BattleMech-matrix classification.

#### Scenario: Canonical SPA rows cannot inherit prose-only authority

- **GIVEN** the canonical SPA combat scope catalog is generated
- **WHEN** any canonical SPA row is inspected
- **THEN** the row SHALL carry at least one anchored `mekstation-deviation` reference to the canonical SPA catalog or category file
- **AND** the row SHALL carry anchored source references for MegaMek `PilotOptions` or `OptionsConstants` when the id is mirrored from the MegaMek pilot option registry
- **AND** helper-only, unsupported, or out-of-scope rows for infantry, ATOW, bioware, unofficial, legacy, and Edge partitions SHALL cite the specific partition authority that keeps the row out of integrated BattleMech combat coverage
- **AND** infantry-scoped SPAs, AToW/personnel-origin and aerospace-control SPAs, unofficial or legacy SPAs without explicit integrated support, and Aero Edge triggers SHALL remain `out-of-scope` audit evidence instead of unresolved official BattleMech blockers

### Requirement: Source-Backed Edge Trigger Boundary

Pilot modifier validation SHALL keep Mek Edge triggers as helper-only trigger-state coverage until combat resolvers consume each trigger-specific Edge behavior, while Aero Edge triggers SHALL be split out of the BattleMech matrix. Edge rows SHALL cite MegaMek's point-pool and trigger-option source anchors plus MekStation's local generic trigger helper. The `edge_when_masc_fails` trigger SHALL be counted as consumed by runner `MASCFailure` and `SuperchargerFailure` PSR rerolls only; TAC, head-hit, KO, explosion, attack, non-booster PSR, and consciousness resolvers SHALL NOT be treated as Edge-integrated until those trigger-specific reroll or prevention paths are wired.

#### Scenario: Edge helper rows cite source truth without claiming resolver parity

- **GIVEN** the BattleMech SPA and pilot modifier resolver catalogs are generated
- **WHEN** Edge, Edge application, or critical-prevention support is inspected
- **THEN** unresolved Mek Edge trigger rows SHALL remain helper-only with structured source references to MegaMek Edge trigger registration and point consumption
- **AND** `edge_when_masc_fails` SHALL be integrated only for source-backed runner `MASCFailure` and `SuperchargerFailure` rerolls that spend Edge and suppress failure aftermath when the reroll passes
- **AND** each Aero Edge trigger row SHALL remain out-of-scope with the same source references until an aerospace validation matrix exists
- **AND** each row SHALL cite the MekStation generic Edge helper or SPA catalog partition as a local deviation boundary
- **AND** no attack, non-booster PSR, consciousness, TAC, head-hit, or explosion resolver SHALL be counted as Edge-integrated until trigger-specific combat behavior exists

### Requirement: Source-Backed Terrain Master Defender To-Hit Variants

Ranged to-hit validation SHALL apply MegaMek's Terrain Master defender to-hit variants from target state and target terrain: Forest Ranger SHALL add a `+1` to-hit modifier only when the target has canonical `tm_forest_ranger` or legacy `terrain-master-forest-ranger`, the target moved by walking, and the target occupies wooded terrain; Swamp Beast SHALL add a `+1` to-hit modifier only when the target has canonical `tm_swamp_beast` or legacy `terrain-master-swamp-beast`, the target moved by running, and the target occupies mud or swamp. Runner ranged attacks SHALL hydrate target terrain features into to-hit state. Terrain Master source-backed variant coverage includes Frogman water-entry, Mountaineer rubble-entry plus movement-cost relief, Forest Ranger/Swamp Beast defender to-hit relief, and Swamp Beast bog-down relief. Generic Terrain Master movement and PSR behavior beyond those source-backed variant rows SHALL remain an explicit gap until separately source-backed.

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

Runner movement and PSR resolution SHALL apply MegaMek's movement-before-skid PSR distance table and subtract 1 for canonical Maneuvering Ace only when resolving skidding PSRs. The skidding distance modifier SHALL be queued as PSR trigger state, while Maneuvering Ace SHALL be applied during PSR resolution from hydrated pilot ability state so runner and interactive paths share the same target-number math. Maneuvering Ace lateral-shift movement allowance, QuadMek lateral-step MP relief, aerospace maneuver-thrust relief, controlled-sideslip relief, and out-of-control checks SHALL remain explicit catalog gaps until separately wired.

#### Scenario: Skidding PSRs consume distance and Maneuvering Ace modifiers

- **GIVEN** a running BattleMech turns on pavement or ice
- **WHEN** the movement phase queues a skidding PSR
- **THEN** the queued PSR SHALL carry the source-backed movement-before-skid distance modifier
- **WHEN** that PSR resolves for a pilot with `maneuvering_ace`
- **THEN** the target number SHALL include an additional `Maneuvering Ace` SPA modifier of `-1`
- **AND** non-skidding PSRs SHALL NOT receive the Maneuvering Ace skidding modifier

### Requirement: Source-Backed Animal Mimicry Quad-Mek PSR Relief

Runner and interactive PSR resolution SHALL apply MegaMek's source-backed Animal Mimicry `-1` piloting-roll modifier only for explicit quad BattleMech combat state. Both canonical `animal_mimic` and legacy `animal-mimicry` ids SHALL resolve through the SPA canonicalization layer, and the Animal Mimicry SPA and canonical scope rows SHALL be marked integrated once those runner and interactive PSR paths are covered.

#### Scenario: Quad Mek PSRs consume Animal Mimicry relief

- **GIVEN** a BattleMech has `isQuad: true` and the `animal_mimic` SPA
- **WHEN** runner or interactive pending PSRs resolve
- **THEN** the target number SHALL include an `Animal Mimicry` SPA modifier of `-1`
- **WHEN** runner or interactive stand-up PSRs resolve
- **THEN** the same `Animal Mimicry` SPA modifier SHALL apply
- **AND** non-quad units SHALL NOT receive the Animal Mimicry PSR modifier

### Requirement: Source-Backed Heat Rule Catalog Anchors

Heat rule support rows SHALL carry source references before they are treated as integrated validation coverage. Weapon heat, movement/jump heat, engine critical heat, dissipation, heat-sink damage, threshold effects, water cooling, fire heat, external-temperature heat, startup, shutdown, ammo-explosion risk, heat-induced ammo explosion, pilot heat damage, and optional MaxTech heat damage SHALL be pinned to MegaMek source references with commit-pinned URLs and line anchors. MekStation-only atmosphere heat adjustment SHALL be marked as a MekStation deviation source instead of being attributed to MegaMek. Any future heat profile, optional TacOps heat, equipment-mode, crew modifier, atmosphere, terrain, or environmental expansion SHALL update those source references or add explicit gap/deviation rows instead of relying on prose.

#### Scenario: Heat rule support rows expose source truth

- **GIVEN** the BattleMech heat rule support catalog is generated
- **WHEN** any heat rule support row is inspected
- **THEN** each row SHALL expose structured source references
- **AND** MegaMek-backed heat rows SHALL use commit-pinned MegaMek URLs with line anchors
- **AND** local atmosphere heat adjustment SHALL use a MekStation deviation source reference
- **AND** the heat rule catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Terrain Environment Catalog Anchors

Terrain/environment support rows SHALL carry source references before they are treated as validation coverage. Terrain movement costs, direct terrain LOS blocking, cumulative woods/smoke LOS density, land-to-depth-2+ water endpoint LOS blocking, partial cover, terrain to-hit features, water cooling, fire heat, smoke to-hit, fog, night, wind, blowing-sand dust, and extreme-temperature rows SHALL be pinned to MegaMek source references with commit-pinned URLs and line anchors when they claim comparable source-backed behavior. The terrain LOS blocking row SHALL be integrated for MekStation direct blockers, cumulative woods/smoke density, and land-to-depth-2+ water endpoint blocking, while a separate terrain LOS side-path row SHALL remain helper-only for divided/diagram LOS, richer underwater-combat sightline tracing, and richer building-level handling. MekStation-only water walk/run rejection and atmosphere heat adjustment SHALL be marked as MekStation deviation sources instead of being attributed to MegaMek. Dust SHALL be represented as explicit environmental `blowingSand` state that applies the source-backed +1 to-hit modifier only to energy-weapon attacks; minefields SHALL remain helper-only until first-class minefield movement-damage resolution exists, and the mine gap row SHALL carry both source-truth and local absence references.

#### Scenario: Terrain environment rows expose source truth

- **GIVEN** the BattleMech terrain/environment support catalog is generated
- **WHEN** any terrain/environment support row is inspected
- **THEN** each integrated or helper-only row SHALL expose structured source references
- **AND** MegaMek-backed terrain/environment rows SHALL use commit-pinned MegaMek URLs with line anchors
- **AND** MekStation-only water ground-disallow, terrain LOS side-path, atmosphere, blowing-sand state, and mines boundaries SHALL use MekStation deviation source references where the behavior or absence is local
- **AND** the terrain/environment catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType Movement Catalog Anchors

Every TerrainType movement support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Terrain rows with comparable MegaMek movement-cost behavior SHALL cite commit-pinned MegaMek source URLs with line anchors and the local `TERRAIN_PROPERTIES` row consumed by `getHexMovementCost`. Pavement, road, and bridge rows SHALL cite MegaMek pavement movement handling. MekStation-only water walk/run rejection and flat building movement cost SHALL be marked as MekStation deviation source references instead of being attributed to MegaMek parity. Any future TerrainType movement expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType movement rows expose source truth

- **GIVEN** the BattleMech terrain type movement support catalog is generated
- **WHEN** any TerrainType movement row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** MegaMek-backed rows SHALL use commit-pinned MegaMek source references
- **AND** local-only water and building movement rows SHALL use MekStation deviation source references
- **AND** the terrainTypeMovement catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType LOS Catalog Anchors

Every TerrainType LOS support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Every row SHALL cite the local `TERRAIN_PROPERTIES`, `calculateLOS`, and runner attack LOS validation paths. Building SHALL be marked as MekStation direct blocking behavior rather than full MegaMek building-level parity. Heavy woods, light woods, and smoke SHALL be marked integrated only when `calculateLOS` accumulates intervening density and blocks LOS once woods/smoke density exceeds 2. Water SHALL be marked integrated only when `calculateLOS` blocks land-to-depth-2+ water endpoint sightlines in both directions while preserving non-endpoint water as non-blocking local terrain. The separate terrain LOS side-path row SHALL remain helper-only for divided/diagram LOS behavior, richer underwater-combat sightline tracing, and richer building-level handling. Terrain rows with no LOS blocking behavior SHALL remain source-checked through local no-op source references instead of inheriting generic terrain authority. Any future TerrainType LOS expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType LOS rows expose source truth

- **GIVEN** the BattleMech terrain type LOS support catalog is generated
- **WHEN** any TerrainType LOS row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** building, heavy woods, light woods, smoke, and water rows SHALL include commit-pinned MegaMek LOS comparison references
- **AND** heavy woods, light woods, and smoke rows SHALL be integrated only when cumulative density blocking over 2 is implemented and covered by behavior tests
- **AND** water SHALL be integrated only when land-to-depth-2+ endpoint LOS blocking is covered by behavior tests
- **AND** divided/diagram LOS and richer underwater-combat sightline tracing SHALL remain explicit helper-only side-path gaps until implemented
- **AND** local no-LOS-effect terrain rows SHALL use MekStation deviation source references for the local no-op mapping
- **AND** the terrainTypeLos catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType Attack Modifier Catalog Anchors

Every TerrainType attack modifier support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Woods, smoke, and building rows SHALL cite commit-pinned MegaMek terrain/LOS to-hit source URLs with line anchors, plus the local `TERRAIN_PROPERTIES`, to-hit utility, terrain helper, and runner attack-phase paths. MekStation-only water and swamp target-in modifiers, plus terrain rows with no attack modifier, SHALL be marked with local source references instead of inheriting generic terrain authority. Any future terrain attack modifier expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType attack modifier rows expose source truth

- **GIVEN** the BattleMech terrain type attack modifier support catalog is generated
- **WHEN** any TerrainType attack modifier row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** woods, smoke, and building modifier rows SHALL use commit-pinned MegaMek source references
- **AND** local-only water, swamp, and no-modifier rows SHALL use MekStation deviation source references for the local mapping
- **AND** the terrainTypeAttackModifiers catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType Heat Catalog Anchors

Every TerrainType heat support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Water and fire rows SHALL cite commit-pinned MegaMek source URLs with line anchors for water cooling, heat dissipation, fire heat, and external heat/cooling caps, plus the local `TERRAIN_PROPERTIES`, heat utility, and runner heat-phase paths. Terrain rows with no heat effect SHALL remain source-checked through local no-op source references instead of inheriting a generic terrain authority. Any future terrain heat expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType heat rows expose source truth

- **GIVEN** the BattleMech terrain type heat support catalog is generated
- **WHEN** any TerrainType heat row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** water and fire rows SHALL use commit-pinned MegaMek source references
- **AND** no-heat terrain rows SHALL use MekStation deviation source references for the local no-op mapping
- **AND** the terrainTypeHeat catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed TerrainType PSR Catalog Anchors

Every TerrainType PSR support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Rubble, water, pavement, ice, swamp, and building rows SHALL cite commit-pinned MegaMek source URLs with line anchors for rubble-entry PSRs, water-entry PSRs, skidding PSRs, swamp bog-down, or building-collapse handling, plus local movement-runner, PSR factory, and PSR-resolution paths. Swamp SHALL be integrated only when movement queues swamp bog-down PSRs, jump-entry immediate stuck handling, Swamp Beast relief, and failed-PSR `UnitStuck` outcomes are covered. Building SHALL be integrated only when movement queues building-collapse PSRs from explicit BattleMech tonnage and Building constructionFactor overload checks; damage-triggered collapse, basement collapse, top-floor collapse, and WiGE flyover collapse SHALL remain explicit requirement-level gaps until those state branches are wired. Terrain rows with no terrain-entry PSR SHALL remain source-checked through local no-PSR references instead of inheriting a generic terrain authority. Any future TerrainType PSR expansion SHALL either add a MegaMek/MekHQ source reference or explicitly mark the row as a local deviation/gap.

#### Scenario: TerrainType PSR rows expose source truth

- **GIVEN** the BattleMech terrain type PSR support catalog is generated
- **WHEN** any TerrainType PSR row is inspected
- **THEN** the row SHALL expose structured source references with line anchors
- **AND** rubble, water, pavement, ice, swamp, and building rows SHALL include commit-pinned MegaMek comparison references
- **AND** swamp SHALL remain integrated only while the stuck-state PSR lifecycle stays covered by behavior tests
- **AND** building rows SHALL remain helper-only until building-collapse runtime wiring exists
- **AND** local no-PSR terrain rows SHALL use MekStation deviation source references for the local no-op mapping
- **AND** the terrainTypePsr catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Action Eligibility Catalog Anchors

Every action eligibility support row SHALL expose structured source references before lifecycle action removal is treated as validation coverage. Turn-rotation rows SHALL cite MekStation active-unit/action-queue predicates, interactive action queries, and runner movement/weapon/physical phase actor gates. Targetability rows SHALL cite interactive and ranged/physical target filters, keeping shutdown targetability distinct from retreated/ejected target removal. Ejection damage-preservation rows SHALL cite the local ejection command/reducer path that preserves existing mech damage, and ejected/retreated target-removal rows SHALL also cite the MegaMek original-unit removal boundary where applicable. Survivor-count rows SHALL cite victory, objective, runner terminal, and terminal-event predicates.

#### Scenario: Action eligibility rows expose source truth

- **GIVEN** the BattleMech action eligibility support catalog is generated
- **WHEN** any integrated action eligibility row is inspected
- **THEN** the row SHALL include structured source references with line-anchored source URLs
- **AND** shutdown-targetability rows SHALL cite the local target filter that leaves shutdown enemies targetable
- **AND** ejected target-removal rows SHALL include MegaMek source anchors for original-unit ejection removal
- **AND** the actionEligibility catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Representative Integration Scenario Anchors

Every representative integration scenario support row SHALL expose structured source references before lifecycle, objective, PSR-queue, ejection, terminal-state, or runner/interactive parity claims treat it as validation coverage. Turn-rotation and actor-removal rows SHALL cite active-unit/action-query predicates and runner phase gates. Targetability rows SHALL cite shutdown, retreated, and ejected target filters. Ejection rows SHALL cite the command/intent/wire integration test plus local ejection reducer behavior. Objective rows SHALL cite objective-control occupancy, objective-outcome precedence, runner state, and game-outcome calculator paths. PSR-queue lifecycle rows SHALL cite phase-management state transitions and regression tests. Terminal rows SHALL cite `endGame`, interactive finalization, runner terminal summary, and runner `GameEnded` emission.

#### Scenario: Representative integration rows expose source truth

- **GIVEN** the BattleMech representative integration support catalog is generated
- **WHEN** any integrated representative integration row is inspected
- **THEN** the row SHALL expose at least one structured source reference with a line anchor
- **AND** every row SHALL include a MekStation source reference for the executable integration path it claims
- **AND** ejection, PSR-queue, objective-outcome, and runner-terminal rows SHALL cite their focused behavior or integration tests where those tests are the executable scenario boundary

#### Scenario: Closed ejection lifecycle coverage stays out of unresolved inventory

- **GIVEN** the aggregate BattleMech combat-validation gap inventory is generated
- **WHEN** ejection lifecycle coverage rows are inspected across tactical commands, game intents, wire intents, P2P intents, invalid target states, event stream, action eligibility, representative scenarios, and objective requirements
- **THEN** those ejection coverage rows SHALL remain integrated
- **AND** no ejection or ejected row SHALL appear as helper-only or unsupported without reopening the ejection-lifecycle requirement as an explicit gap

### Requirement: Source-Backed Runner-Interactive Parity Anchors

Every runner-vs-interactive parity support row SHALL expose structured MekStation source references before the row is treated as validation coverage. Movement parity rows SHALL cite runner and interactive movement validation/event-path paths. Weapon parity rows SHALL cite target validation, to-hit calculation, indirect-fire context, and damage/critical resolution paths. Physical parity rows SHALL cite runner, interactive, shared physical resolution, and grid-occupancy refresh paths. Heat and PSR parity rows SHALL cite both quick-sim runner phases and event-sourced interactive/session resolvers. Objective and terminal parity rows SHALL cite the same representative objective and GameEnded source anchors used by integration coverage.

#### Scenario: Runner-interactive parity rows expose source truth

- **GIVEN** the BattleMech runner-interactive parity support catalog is generated
- **WHEN** any integrated parity row is inspected
- **THEN** the row SHALL expose at least one structured MekStation source reference with a line anchor
- **AND** movement, weapon, physical, heat, PSR, objective, and terminal parity rows SHALL cite their executable runner and/or interactive paths
- **AND** the parityAndIntegration catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed PSR Resolution Catalog Anchors

Every PSR resolution support row SHALL expose structured source references before the map is treated as source-backed validation coverage. Queued PSR resolution rows SHALL cite MegaMek pending-PSR storage/resolution anchors plus MekStation runner, interactive/session, and core resolver paths. Failed-fall rows SHALL cite MegaMek failed-piloting-roll fall and pilot fall-damage handling plus MekStation `UnitFell`, fall-sourced `PilotHit`, pilot wound/death, and pending-queue clearing paths. Reason-code rows SHALL cite the local reducer and shutdown-PSR queueing paths that preserve canonical reason codes.

#### Scenario: PSR resolution rows expose source truth

- **GIVEN** the BattleMech PSR resolution support catalog is generated
- **WHEN** any integrated PSR resolution row is inspected
- **THEN** the row SHALL include structured source references with line-anchored source URLs
- **AND** failed-fall rows SHALL include MegaMek source anchors for failed piloting checks and fall pilot damage
- **AND** the psrResolution catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Damage And Critical PSR Trigger Catalog Anchors

Damage and critical-component PSR trigger rows SHALL expose structured source references before they are treated as validation coverage. Phase-damage rows SHALL cite MegaMek phase-end 20+ damage PSR checks plus MekStation damage-threshold queueing and factory paths. Hip, leg/foot actuator, and gyro critical rows SHALL cite MegaMek critical-hit PSR branches plus MekStation critical-event bridge and factory paths. EngineHit and leg-structure PSR rows SHALL remain source-visible MekStation deviations where the local trigger is broader or different than the MegaMek source branch.

#### Scenario: Damage and critical PSR trigger rows expose source truth

- **GIVEN** the BattleMech runner PSR trigger support catalog is generated
- **WHEN** the phase-damage, leg-structure, actuator-critical, gyro-critical, or engine-critical trigger rows are inspected
- **THEN** every such row SHALL carry structured source references with line anchors
- **AND** actuator and gyro critical rows SHALL include MegaMek source anchors for queued critical-hit PSRs
- **AND** the EngineHit row SHALL identify its MekStation deviation because MegaMek engine critical handling counts engine hits, heat/destruction, and explosion checks without queuing a normal fall PSR

### Requirement: Source-Backed Terrain PSR Trigger Catalog Anchors

Terrain-origin runner PSR trigger rows SHALL expose structured source references before they are treated as validation coverage. Rubble entry, water entry, skidding, and building collapse SHALL cite their corresponding MegaMek terrain PSR or collapse anchors plus MekStation movement-runner, factory, and resolver paths. Running rough terrain, moving on ice, and exiting water SHALL remain source-visible MekStation rows unless a matching MegaMek parity branch is identified.

#### Scenario: Terrain PSR trigger rows expose source truth

- **GIVEN** the BattleMech runner PSR trigger support catalog is generated
- **WHEN** terrain or building-collapse trigger rows are inspected
- **THEN** every such row SHALL carry structured source references with line anchors
- **AND** rubble, water-entry, skidding, and building-collapse rows SHALL include MegaMek source anchors where comparable
- **AND** running-rough, moving-on-ice, and exiting-water rows SHALL be marked by MekStation source references rather than inferred from unrelated MegaMek terrain behavior

### Requirement: Heat and Movement PSR Trigger Rows Expose Source Truth

Heat and movement runner PSR trigger rows SHALL expose structured source references before they are treated as validation coverage. Reactor shutdown rows SHALL cite MegaMek heat-shutdown PSR queueing plus MekStation shutdown PSR queueing/factory paths. Standing-up rows SHALL cite MegaMek `checkGetUp` and in-place stand-up skill resolution plus MekStation runner/factory paths, and SHALL keep the current failed-stand-up fall-damage difference visible as a local boundary. Running-with-damage rows SHALL cite MegaMek's combined damaged-hip-or-gyro running PSR branch plus MekStation's separate `RunningDamagedHip` and `RunningDamagedGyro` queueing/factory paths.

#### Scenario: Heat and movement PSR trigger rows expose source truth

- **GIVEN** the BattleMech runner PSR trigger support catalog is generated
- **WHEN** shutdown, standing-up, running-damaged-hip, or running-damaged-gyro rows are inspected
- **THEN** each row SHALL expose structured source references
- **AND** MegaMek-backed rows SHALL use commit-pinned MegaMek URLs with line anchors
- **AND** MekStation-specific ordering or reason-code differences SHALL carry MekStation deviation source references instead of being described as complete MegaMek parity

### Requirement: Source-Backed Heat SPA Boundary

Heat-driven pilot ability rows SHALL distinguish source-backed MegaMek behavior from local helper behavior before claiming parity. Some Like It Hot SHALL carry MegaMek source references for reducing positive heat firing modifiers by 1. Hot Dog startup, shutdown, heat-induced ammo-explosion, opt-in MaxTech pilot heat-damage, and opt-in MaxTech critical-damage checks SHALL apply MegaMek's `hotDogMod = 1` target-number relief without shifting heat thresholds. Default life-support heat damage SHALL remain threshold-based at heat 15/25+ because MegaMek does not apply `hotDogMod` to that path. Hot Dog SHALL be integrated for BattleMech heat lifecycle resolution once those source-backed paths are executable in runner and interactive heat resolution. Cool Under Fire SHALL remain out-of-scope local helper evidence and SHALL NOT be consumed by the BattleMech heat resolver until a source authority for generated-heat relief is identified.

#### Scenario: Heat SPA support rows expose source truth

- **GIVEN** the BattleMech SPA and pilot modifier catalogs are generated
- **WHEN** Hot Dog, Cool Under Fire, Some Like It Hot, and the heat-application resolver row are inspected
- **THEN** Some Like It Hot SHALL be integrated with structured MegaMek source references
- **AND** Hot Dog SHALL be integrated with structured MegaMek source references and executable startup, shutdown, ammo-explosion, optional MaxTech pilot heat-damage, and optional MaxTech critical-damage target-number coverage
- **AND** Cool Under Fire SHALL be out-of-scope with the unresolved source authority recorded as local helper evidence
- **AND** the heat-application resolver SHALL be integrated for source-backed Hot Dog, Some Like It Hot, and weapon cooling behavior while leaving Cool Under Fire unconsumed

#### Scenario: Heat-driven modifiers remain separate from core heat lifecycle completeness

- **GIVEN** core heat generation, dissipation, and lifecycle rows are integrated
- **WHEN** the BattleMech validation requirement crosswalk is inspected
- **THEN** heat-driven pilot ability and quirk modifiers SHALL have their own `heat-driven-modifiers` requirement
- **AND** that requirement SHALL reference Hot Dog, Some Like It Hot, Improved Cooling, Poor Cooling, No Cooling, and the heat-application resolver row while Cool Under Fire remains visible through the out-of-scope audit inventory
- **AND** the requirement SHALL be integrated for source-backed official heat modifiers while Cool Under Fire remains out-of-scope and unconsumed
- **AND** the integrated `heat-lifecycle` requirement SHALL NOT imply complete heat-driven modifier parity

### Requirement: Source-Backed Pilot Skill Use Rows

Pilot skill use support rows SHALL expose structured row-level source references before the map is treated as validation coverage. Ranged gunnery rows SHALL cite MegaMek ranged attack gunnery anchors plus MekStation runner/session to-hit hydration. Physical piloting rows SHALL cite MegaMek physical attack piloting baselines plus MekStation runner/session physical to-hit paths. PSR and stand-up rows SHALL cite MegaMek base piloting roll, PSR resolution, and stand-up anchors plus MekStation runner/session resolution paths. Initiative rows SHALL cite source-backed Command Mech, Battle Computer, HQ/command equipment, and Tactical Genius anchors while preserving helper-only gaps for automatic equipment hydration. MekStation-local pilot wound penalties and PSR event skill stamping SHALL be marked as explicit MekStation deviation refs rather than inferred MegaMek parity.

#### Scenario: Pilot skill use rows expose source truth

- **GIVEN** the BattleMech pilot skill support catalog is generated
- **WHEN** any `pilotSkillUse` row is inspected
- **THEN** the row SHALL carry at least one structured source reference with a line anchor
- **AND** MegaMek references SHALL be commit-pinned to the local source snapshot
- **AND** MekStation-local wound and event-stamp rows SHALL identify their executable local anchors
- **AND** the `pilotSkillUse` catalog triad SHALL enforce row-level source references before PR approval

### Requirement: Source-Backed Legacy Pilot Ability Support Rows

Legacy `pilotAbilities` support rows SHALL expose structured row-level source references before the map is treated as validation coverage. Weapon Specialist, Gunnery Specialist, Blood Stalker, Cluster Hitter, Range Master, Sniper, Oblique Attacker, and Forward Observer rows SHALL cite pinned MegaMek behavior plus MekStation helper or runner paths. Called-shot application SHALL be integrated only for the MegaMek-backed TacOps +3 called-shot penalty, and runner/event-sourced BattleMech attack declarations SHALL NOT apply local Marksman or legacy Sharpshooter called-shot reductions to that source-backed path. Marksman and Sharpshooter SHALL remain out-of-scope audit rows because MegaMek source backs TacOps called-shot penalties but does not validate those local reductions. Melee Specialist SHALL apply both source-backed physical to-hit relief and +1 physical damage. Melee Master SHALL enforce the source-backed two-allowed-physical-attacks rule and SHALL NOT be treated as a flat physical damage bonus. Generic Terrain Master SHALL remain an unsupported variant-split row while source-backed Terrain Master variants are tracked separately.

#### Scenario: Legacy pilot ability rows expose source truth

- **GIVEN** the BattleMech SPA support catalog is generated
- **WHEN** any `pilotAbilities` support row is inspected
- **THEN** the row SHALL carry at least one structured source reference with a line anchor
- **AND** the `pilotAbilities` catalog triad SHALL enforce row-level source references before PR approval
- **AND** called-shot application SHALL remain integrated only when runner and event-sourced BattleMech attack declarations apply the +3 TacOps called-shot penalty without consuming Marksman or legacy Sharpshooter reductions
- **AND** Melee Specialist rows SHALL be integrated only when both physical to-hit and +1 physical damage behavior are wired
- **AND** Melee Master rows SHALL be integrated only when event-sourced declarations, P2P translation, UI planning, and catalog evidence enforce one physical attack for normal pilots, two physical attacks for Melee Master pilots, independent same-limb reuse rejection, and no flat physical damage behavior

### Requirement: Source-Backed Legacy Mech Quirk Support Rows

Legacy `mechQuirks` support rows SHALL expose structured row-level source references before the map is treated as validation coverage. PSR quirks SHALL cite MegaMek PSR behavior and preserve helper-only gaps where MekStation local semantics differ: Easy Pilot SHALL apply only through MegaMek's base-piloting gate for BattleMech difficult-terrain and 20+ phase-damage PSRs before being treated as integrated, Cramped Cockpit SHALL apply only when the pilot lacks MegaMek's `small_pilot` ability before being treated as integrated, Stable SHALL apply only to source-backed Kick/Push PSRs before being treated as integrated, and No Arms SHALL apply only to MegaMek's stand-up PSR branch before its PSR behavior is treated as integrated. Physical quirk rows SHALL cite MegaMek punch/arm/stand-up or local resolver anchors. Battle Fists SHALL apply source-backed matching-arm punch to-hit relief when the hand actuator is working and SHALL NOT be treated as flat punch damage. No Arms physical restrictions SHALL cover punch, push, and arm-mounted melee restrictions before being treated as integrated. Low Arms SHALL remain unsupported registry-only behavior unless a pinned MegaMek or MekHQ authority exposes combat resolver semantics; local elevation gates SHALL NOT be treated as covered behavior. Rugged SHALL cite MekHQ maintenance behavior and stay in the `out-of-scope` audit inventory because campaign maintenance-cycle behavior is outside BattleMech combat runner validation scope. Protected/Exposed Actuators SHALL cite MegaMek anti-Mek target-number behavior and stay in the `out-of-scope` audit inventory because Leg/Swarm anti-Mek attacks belong to the battle-armor/infantry combat matrix.

#### Scenario: Legacy quirk rows expose source truth

- **GIVEN** the BattleMech quirk support catalog is generated
- **WHEN** any `mechQuirks` support row is inspected
- **THEN** the row SHALL carry at least one structured source reference with a line anchor
- **AND** Battle Fists SHALL be integrated only when helper, runner, and catalog coverage apply matching-arm punch to-hit relief without punch damage side effects
- **AND** Stable SHALL be integrated only when damage/terrain/recovery PSRs no longer receive Stable relief and kick/push PSRs still do
- **AND** Easy Pilot SHALL be integrated only when both terrain and 20+ phase-damage PSRs consume the MegaMek piloting-skill gate
- **AND** Cramped Cockpit SHALL be integrated only when Small Pilot suppresses the PSR penalty
- **AND** No Arms SHALL be integrated only when punch, push, arm-mounted melee, runner stand-up PSRs, and interactive stand-up PSRs all consume the MegaMek No/Minimal Arms branches
- **AND** Low Arms SHALL stay unsupported and no-op until a pinned MegaMek or MekHQ authority exposes combat resolver semantics
- **AND** Protected/Exposed Actuators SHALL stay out-of-scope for the BattleMech runner matrix while anti-Mek Leg/Swarm actions remain owned by the battle-armor/infantry combat matrix
- **AND** the physical-restriction resolver row SHALL NOT assign Low Arms while the quirk remains unsupported registry-only behavior

### Requirement: Source-Backed Consciousness Toughness Boundary

Consciousness-related pilot ability rows SHALL distinguish MegaMek RPG Toughness, Pain Resistance, and Iron Man semantics from MekStation legacy aliases before claiming parity. RPG Toughness SHALL be treated as a game-option-gated numeric crew toughness target-number reduction, not as the Pain Resistance SPA. Pain Resistance SHALL be source-backed as +1 consciousness and wake-up rolls plus ammunition-explosion pilot-damage reduction, not ranged to-hit wound-penalty relief. Iron Man SHALL be source-backed as ammunition-explosion pilot-hit reduction, not generic consciousness target-number relief. MekStation local Iron Will and Toughness aliases SHALL remain unsupported until source-backed ids or explicit migration behavior are represented.

#### Scenario: Consciousness toughness rows expose source truth

- **GIVEN** the BattleMech SPA and pilot modifier resolver catalogs are generated
- **WHEN** Iron Man, Pain Resistance, Toughness, Iron Will, consciousness application, or local Pain Resistance to-hit application rows are inspected
- **THEN** each row SHALL expose structured MegaMek and MekStation deviation source references
- **AND** Iron Man SHALL be integrated only as source-backed ammunition-explosion pilot-damage reduction
- **AND** Pain Resistance SHALL remain helper-only until wake-up roll behavior is modeled, even though source-backed consciousness and ammo-explosion reduction paths are wired
- **AND** Toughness and Iron Will SHALL remain unsupported/no-op instead of using local alias behavior
- **AND** the legacy Pain Resistance ranged to-hit row SHALL be integrated as a source-backed non-application only when runner and event-sourced ranged attacks preserve raw pilot wound penalties
- **AND** consciousness application SHALL remain helper-only while RPG Toughness numeric crew state and Pain Resistance wake-up rolls remain absent
- **AND** integrated ranged to-hit resolver rows SHALL NOT list Pain Resistance as source-backed ranged to-hit support

### Requirement: Source-Backed Weapon Cooling Quirk Heat

Weapon cooling quirk validation SHALL use MegaMek weapon heat semantics before counting cooling quirk rows as integrated. Improved Cooling SHALL reduce final weapon heat by 1 but never below 1. Poor Cooling SHALL add 1 heat. No Cooling SHALL add 2 heat, not double the base weapon heat. The support catalog and heat resolver row SHALL expose commit-pinned MegaMek source references for the heat calculation and quirk eligibility boundary.

#### Scenario: Weapon cooling quirks use source-backed heat values

- **GIVEN** the BattleMech quirk and heat resolver catalogs are generated
- **WHEN** Improved Cooling, Poor Cooling, or No Cooling support is inspected
- **THEN** each row SHALL be integrated with structured MegaMek source references for weapon heat calculation and quirk registration
- **AND** focused helper and heat-phase tests SHALL prove Improved Cooling flooring, Poor Cooling `+1`, and No Cooling `+2`
- **AND** the heat-application resolver SHALL cite the same weapon cooling source references while remaining integrated only for source-backed Hot Dog, Some Like It Hot, and weapon cooling behavior

### Requirement: Source-Truth Cross-Check Discipline

Combat feature work SHALL update OpenSpec, the validation catalog, and executable tests together. Before marking a mechanic integrated, the implementation SHALL be cross-checked against official rules or MegaMek / MekHQ behavior notes, with gaps recorded as partial or unsupported rather than inferred as complete.

#### Scenario: Feature headway updates specs and evidence together

- **GIVEN** a developer adds or changes BattleMech combat logic
- **WHEN** the work changes action availability, modifiers, turn lifecycle, damage, heat, movement, targetability, or resolution outcomes
- **THEN** the active OpenSpec change SHALL be updated in the same slice
- **AND** the validation catalog SHALL be updated in the same slice
- **AND** focused tests SHALL prove the updated rule path
- **AND** the aggregate catalog triad evidence SHALL be updated when the work creates or changes a support map's source authority boundary or executable test surface
