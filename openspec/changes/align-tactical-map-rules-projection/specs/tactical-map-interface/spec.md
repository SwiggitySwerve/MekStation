# Spec Delta: Tactical Map Interface - Rules Projection Alignment

## ADDED Requirements

### Requirement: Rules-Backed Tactical Projection Contract

The tactical map interface SHALL render movement, combat, terrain/elevation, fog, LOS, cover, and firing-arc highlights from shared rules projections rather than from view-local legality calculations.

Every projection that affects action legality SHALL identify the rule source it is pinned to, using this source order: official BattleTech rules where citable, MegaMek tactical behavior as practical oracle for tactical ambiguity, MekHQ only for campaign/scenario context, then local OpenSpec/Jest fixtures as the project acceptance contract.

#### Scenario: Highlight legality matches commit legality

- **GIVEN** a selected unit, current tactical grid, current phase, and a highlighted destination or target
- **WHEN** the player commits that highlighted action without changing state
- **THEN** engine validation SHALL accept the action
- **AND** if validation rejects the action, the preview SHALL have already exposed the same rejection reason before commit

#### Scenario: UI-local legality is prohibited

- **GIVEN** a map component renders a movement or combat highlight
- **WHEN** the highlight determines whether a hex is legal, costly, or blocked
- **THEN** that determination SHALL come from a shared rules/projection utility
- **AND** the component SHALL NOT duplicate movement cost, weapon range, firing arc, LOS, fog targetability, or elevation legality rules inline

### Requirement: Movement Projection Explanation

Movement highlights SHALL expose the BattleTech movement facts required to understand walk, run, jump, and unit-type-specific movement legality.

For each projected movement hex, the map SHALL expose at least movement mode, cumulative MP cost, terrain cost, elevation delta/cost, heat impact where applicable, path/facing preview where applicable, and invalid reason when blocked.

#### Scenario: Walk/run/jump ranges explain costs

- **GIVEN** a unit is selected during the Movement phase
- **WHEN** walk, run, or jump range highlights render
- **THEN** each reachable hex SHALL display or expose its cumulative MP cost
- **AND** each reachable hex SHALL expose the movement mode by which it is reachable
- **AND** each reachable hex SHALL expose terrain and elevation contributors to that cost

#### Scenario: Blocked movement explains reason

- **GIVEN** a destination is blocked by terrain, elevation, unit type, heat-reduced MP, prone state, or jump landing restrictions
- **WHEN** the player hovers or attempts to preview that hex
- **THEN** the map SHALL avoid presenting it as a legal destination
- **AND** the UI SHALL expose the specific invalid reason from movement validation

#### Scenario: Prone movement reserves stand-up MP

- **GIVEN** a prone unit previews ground movement
- **WHEN** the map projects walk or run destinations
- **THEN** the projection SHALL reserve normal stand-up MP before path MP
- **AND** the projected hex metadata SHALL expose stand-up cost, PSR target/modifiers when represented, and impossible stand-up reasons
- **AND** jump destinations SHALL be blocked until the unit stands

#### Scenario: Playtest2 trying-to-stand bonus agrees between map and commit

- **GIVEN** a prone unit attempts to stand while the represented `playtest_2` optional rule is enabled
- **WHEN** the map projects the stand-up PSR and committed movement resolves the stand-up attempt
- **THEN** both projection and resolution SHALL include the `Trying to stand -1` PSR modifier
- **AND** the projected target number SHALL match the committed PSR target number

#### Scenario: Careful stand consumes the movement turn

- **GIVEN** a prone unit chooses TacOps careful stand
- **WHEN** movement projection or commit validation evaluates a non-origin destination
- **THEN** the destination SHALL be rejected with the same invalid reason before commit and at commit time
- **AND** a standalone careful stand SHALL spend walking MP when walk MP is above 2
- **AND** the stand-up PSR projection and resolution SHALL include the careful-stand -2 modifier
- **AND** movement events SHALL identify the stand-up mode as `careful`

#### Scenario: Non-Mek movement does not inherit Mek heat

- **GIVEN** a represented non-Mek unit uses walk-like pathing for terrain and elevation costs
- **WHEN** the map projects walk, run, or jump destinations for that unit
- **THEN** movement heat SHALL come from the unit's movement heat profile rather than the pathing mode alone
- **AND** previewed movement heat SHALL match committed movement events

#### Scenario: Infantry terrain profile adjusts movement costs

- **GIVEN** a represented non-mechanized infantry or battle armor unit previews ground movement
- **WHEN** the destination includes woods or an upward elevation change
- **THEN** the movement projection SHALL apply the represented infantry terrain-cost profile
- **AND** committed movement SHALL spend the same MP cost that the preview exposed

#### Scenario: TacOps infantry pavement bonus is optional-rule gated

- **GIVEN** a represented motorized, tracked, wheeled, or hover infantry unit previews pavement or paved-road movement
- **WHEN** the TacOps infantry pavement bonus optional rule is disabled
- **THEN** the movement projection SHALL NOT grant the vehicle-style +1 pavement/road MP bonus
- **WHEN** the same session enables the represented TacOps infantry pavement bonus optional rule
- **THEN** the movement projection SHALL allow the +1 MP pavement/road bonus for that eligible infantry unit
- **AND** committed movement SHALL accept the same destination, MP cost, heat, and path that the preview exposed

#### Scenario: UMU and swim movement match represented water movement

- **GIVEN** a represented UMU, biped-swim, or quad-swim movement mode enters water terrain
- **WHEN** movement projection computes the destination MP cost
- **THEN** the water-depth surcharge SHALL NOT be added for that movement mode
- **AND** UMU run movement SHALL remain legal when entering water after the first step
- **AND** biped-swim and quad-swim destinations SHALL require represented water terrain
- **AND** biped-swim and quad-swim movement SHALL NOT add represented ground-elevation rise cost while swimming underwater
- **AND** biped-swim and quad-swim movement SHALL expose the represented flat UMU heat generated by swim movement
- **AND** committed movement SHALL spend the same MP cost and heat that the preview exposed

#### Scenario: Represented Frogman reduces deep-water movement cost

- **GIVEN** a represented Frogman movement capability enters depth-2 or deeper water terrain
- **WHEN** movement projection computes the destination MP cost
- **THEN** the deep-water surcharge SHALL use the represented Frogman +2 MP adjustment
- **AND** committed movement SHALL spend the same MP cost and heat that the preview exposed
- **AND** units without the represented Frogman capability SHALL continue to use the normal deep-water movement cost

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose weapon-backed attack legality, range, firing arc, LOS, cover, visibility, heat, ammo, and disabled reasons.

When a selected unit has a configured weapon list, the map SHALL derive attack-range highlighting from the weapon-backed combat projection. Legacy raw `attackRange` props MAY be used only when no configured weapon list exists.

#### Scenario: Weapon-backed range overrides legacy attackRange

- **GIVEN** a selected unit has configured weapons
- **AND** the view receives a stale raw `attackRange` prop
- **WHEN** attack range highlighting renders
- **THEN** highlighted attack hexes SHALL come from the weapon-backed combat projection
- **AND** stale raw `attackRange` data SHALL NOT mark additional targets as valid

#### Scenario: Range brackets and minimum range match committed attacks

- **GIVEN** a selected unit has weapons with represented minimum, short, medium, long, and extreme ranges
- **WHEN** the map previews attacks at those distances
- **THEN** the combat projection SHALL expose the same range bracket the committed attack will declare
- **AND** represented extreme range SHALL remain attackable when the weapon carries an extreme cutoff
- **AND** minimum-range penalties SHALL be exposed in preview and committed to-hit modifiers for represented ground-to-ground attacks
- **AND** represented airborne/aerospace targets SHALL not receive ground-to-ground minimum-range penalties

#### Scenario: Underwater and torpedo legality matches committed attacks

- **GIVEN** a selected unit previews attacks against represented depth-2 water targets or with represented torpedo weapons
- **WHEN** the target is underwater, the target is not in water, or the torpedo line leaves water
- **THEN** the combat projection SHALL filter illegal weapons and expose the same invalid reason a committed attack will emit
- **AND** non-torpedo weapons SHALL NOT be highlighted as valid against represented underwater targets
- **AND** torpedo weapons SHALL be highlighted as valid only when the target is in water and every represented line hex has water depth at least 1

#### Scenario: C3 spotter range improves projected and committed brackets

- **GIVEN** a selected unit is represented in an operational C3 network
- **AND** a networked spotter has a better weapon range bracket to the target than the attacker
- **WHEN** the map previews a direct weapon attack
- **THEN** the combat projection SHALL expose the C3-improved range bracket and spotter identity
- **AND** the committed `AttackDeclared` event SHALL use the same C3-improved range bracket and to-hit number
- **AND** indirect fire SHALL continue to use its indirect-fire resolution instead of C3 range improvement

#### Scenario: Indirect-fire spotter movement penalty matches commit

- **GIVEN** a selected unit has no direct LOS to a target
- **AND** an indirect-fire-capable weapon is selected
- **AND** a friendly represented spotter has LOS to the target after walking, running, or jumping
- **WHEN** the map previews the attack
- **THEN** the target hex SHALL remain attackable via indirect fire
- **AND** the combat projection SHALL expose the elected spotter and the total indirect-fire penalty including represented spotter movement
- **AND** the committed `AttackDeclared` event SHALL apply the same indirect-fire penalty
- **AND** represented infantry or battle armor spotters SHALL not receive a spotter movement penalty

#### Scenario: Selected weapon constrains visible firing arcs

- **GIVEN** the selected unit has operational weapons with known mounted arcs
- **WHEN** the player selects or previews a weapon attack
- **THEN** firing-arc shading SHALL render only arcs compatible with those operational mounted weapons
- **AND** rear-mounted weapons SHALL not shade front arcs as if they were front-mounted

#### Scenario: Unknown or all-arc weapons keep broad overlay

- **GIVEN** at least one operational selected weapon has all-arc, turret, or unknown mounting semantics
- **WHEN** firing-arc shading renders
- **THEN** the overlay SHALL avoid claiming a narrower arc than the rules projection can justify
- **AND** target validation SHALL remain the authority for final legality

#### Scenario: Physical attack elevation legality matches commit

- **GIVEN** a unit previews punch or kick options against an adjacent target on a different elevation
- **WHEN** the target's vertical span is outside the represented attacker's punch arm height or kick base elevation
- **THEN** the physical attack option SHALL be disabled with a target-elevation invalid reason
- **AND** a direct commit of that same punch or kick SHALL reject with the same typed reason
- **AND** the command preview SHALL preserve the restriction instead of showing the row as legal

#### Scenario: Physical push legality matches commit

- **GIVEN** a unit previews a push option against an adjacent represented target
- **WHEN** the target is not a Mek, is prone or airborne, is not directly ahead of the attacker, is not at the attacker's base elevation, either attacker arm is destroyed, or the target occupies a represented building hex while the attacker is outside
- **THEN** the push option SHALL be disabled with the matching typed reason
- **AND** a direct commit of that same push SHALL reject with the same typed reason
- **AND** the command preview SHALL preserve the restriction instead of showing push as legal

### Requirement: Fog-Aware Target Projection

Fog targetability in the tactical map SHALL consume the same grid, LOS, and visibility inputs as combat validation.

Hidden or last-known enemy contacts MAY render as intelligence markers, but they SHALL NOT remain selected as active valid attack targets unless the combat projection says the current viewer can legally target them.

#### Scenario: Blocked LOS clears valid target state

- **GIVEN** fog-of-war is enabled
- **AND** a previously visible enemy becomes hidden or last-known because LOS is blocked on the current combat grid
- **WHEN** the map recomputes target projection
- **THEN** the enemy token SHALL NOT be marked as a valid active target
- **AND** any active target state for that unit SHALL clear or become invalid with an explanatory reason

#### Scenario: Clear LOS restores targetability

- **GIVEN** fog-of-war is enabled
- **AND** an enemy unit has clear LOS from the current viewer on the current combat grid
- **WHEN** the map recomputes target projection during a legal attack phase
- **THEN** the enemy token MAY be marked targetable according to combat projection
- **AND** the same grid SHALL be used by visibility, LOS display, and attack validation

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present a clear board-game hex view where terrain type and elevation are easy to reference during movement and combat planning.

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable.

#### Scenario: Terrain and elevation visible in top-down mode

- **GIVEN** a top-down tactical map with mixed terrain and elevations
- **WHEN** the map renders at normal playable zoom
- **THEN** each visible hex SHALL communicate its terrain type
- **AND** each visible hex SHALL show or expose its elevation number
- **AND** movement/combat overlays SHALL NOT obscure all elevation information needed for tactical decisions

### Requirement: Isometric Projection Parity And Occlusion Tools

Isometric mode SHALL be presentation state only and SHALL consume the same terrain, elevation, movement, combat, LOS, fog, cover, and firing-arc projection data as top-down mode.

Isometric mode SHALL make stacked elevation layers readable, support battlefield rotation, and provide interaction aids for units obscured by high terrain or tall stacks.

#### Scenario: Isometric uses same rules projection as top-down

- **GIVEN** the same tactical state is rendered in top-down and isometric modes
- **WHEN** movement and combat projections are computed
- **THEN** both modes SHALL expose the same legal destinations, targets, costs, range bands, LOS results, cover states, and firing arcs
- **AND** no legality SHALL be derived from isometric screen coordinates

#### Scenario: Isometric rotation preserves selection

- **GIVEN** the map is in isometric mode
- **AND** a unit or hex is selected
- **WHEN** the player rotates the camera around the battlefield
- **THEN** the selected axial coordinate SHALL remain selected
- **AND** movement/combat highlights SHALL rotate visually without changing rules meaning

#### Scenario: Obscured units remain inspectable

- **GIVEN** a unit is behind or below a large elevation stack in isometric mode
- **WHEN** the player hovers, cycles, slices layers, rotates, or uses another occlusion aid
- **THEN** the hidden unit SHALL be highlightable and selectable if visibility rules allow it
- **AND** the map SHALL communicate when fog or visibility rules, rather than terrain occlusion, prevent inspection
