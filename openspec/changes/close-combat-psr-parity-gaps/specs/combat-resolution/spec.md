## MODIFIED Requirements

### Requirement: Source-Backed Maneuvering Ace Skidding PSR and Lateral Movement

Runner movement and PSR resolution SHALL apply MegaMek's movement-before-skid PSR distance table and subtract 1 for canonical Maneuvering Ace only when resolving skidding PSRs. The skidding distance modifier SHALL be queued as PSR trigger state, while Maneuvering Ace SHALL be applied during PSR resolution from hydrated pilot ability state so runner and interactive paths share the same target-number math. Represented pending out-of-control PSRs SHALL also subtract 1 for canonical Maneuvering Ace during runner PSR resolution, without treating recovery rolls as out-of-control rolls. BattleMech movement validation, movement-step decomposition, and runner movement commits SHALL also consume Maneuvering Ace for source-backed biped lateral shifts and QuadMek lateral-step MP relief. A BattleMech lateral shift or run that turns after moving SHALL NOT queue a controlled-sideslip or flanking-and-turning PSR, because MegaMek 48fcb2f64 calls `Entity.checkSideSlip` only for VTOL, hover and WiGE movement (`MovePathHandler.java:3715-3727`); the `controlled_sideslip` and `flanking_and_turning` reason codes and factories SHALL remain valid for older replays. Aerospace maneuver-thrust relief and producer-side out-of-control control-roll creation for aerospace/airborne LAM units SHALL remain out-of-scope aerospace catalog gaps, and the Maneuvering Ace controlled-sideslip and flanking-and-turning producer rows SHALL be out-of-scope rows for the separate vehicle combat matrix. Heavy Lifter pickup/drop carried-object lifecycle SHALL be represented separately from the remaining helper-only throw-object leaf gap.

#### Scenario: Skidding PSRs consume distance and Maneuvering Ace modifiers

- **GIVEN** a running BattleMech turns on pavement or ice
- **WHEN** the movement phase queues a skidding PSR
- **THEN** the queued PSR SHALL carry the source-backed movement-before-skid distance modifier
- **WHEN** that PSR resolves for a pilot with `maneuvering_ace`
- **THEN** the target number SHALL include an additional `Maneuvering Ace` SPA modifier of `-1`
- **AND** non-skidding PSRs SHALL NOT receive the Maneuvering Ace skidding modifier

#### Scenario: Represented out-of-control PSRs consume Maneuvering Ace modifiers

- **GIVEN** a BattleMech with canonical Maneuvering Ace enters the PSR phase with a represented out-of-control pending PSR
- **WHEN** the runner resolves the pending PSR
- **THEN** the target number SHALL include a `Maneuvering Ace` SPA modifier of `-1`
- **AND** the emitted `PSRResolved` event SHALL carry an `out_of_control` reason code
- **AND** recovery rolls SHALL NOT receive the out-of-control Maneuvering Ace modifier

#### Scenario: Maneuvering Ace lateral movement uses BattleMech chassis-specific costs

- **GIVEN** a biped BattleMech with canonical Maneuvering Ace
- **WHEN** movement validation or runner movement commits a legal lateral shift
- **THEN** the lateral shift SHALL preserve facing and SHALL charge the side-step cost as source-backed biped BattleMech movement
- **GIVEN** a QuadMek with canonical Maneuvering Ace
- **WHEN** movement validation or runner movement commits a legal lateral step
- **THEN** the lateral step SHALL preserve facing and SHALL use the destination entry cost without the normal side-step surcharge
- **AND** non-Maneuvering-Ace biped lateral shifts SHALL keep the normal side-step surcharge

#### Scenario: Maneuvering Ace lateral shifts and turns queue no sideslip PSR

- **GIVEN** a BattleMech with canonical Maneuvering Ace
- **WHEN** runner movement commits a walking or a running lateral shift
- **THEN** no controlled-sideslip PSR SHALL be queued
- **WHEN** runner movement commits a run or sprint that changes facing after moving more than one hex
- **THEN** no flanking-and-turning PSR SHALL be queued
- **AND** the `pilotSkills.pilotModifierResolvers.maneuvering-ace-controlled-sideslip-producer-application` and `pilotSkills.pilotModifierResolvers.maneuvering-ace-flanking-turning-producer-application` rows SHALL be out of scope
