# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Top-Down and Isometric Tactical Map Rendering

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable.

Isometric mode SHALL render terrain/elevation stacks, unit tokens, occluder
highlights, and camera rotation metadata from the same projection data used by
the top-down map.

#### Scenario: Browser smoke covers top-down and isometric tactical context

- **GIVEN** the development/test tactical map browser harness renders a map
  with terrain, elevation, movement, combat, and an isometric occluder case
- **WHEN** browser automation inspects the top-down map
- **THEN** terrain labels, elevation labels, movement badges, and combat badges
  SHALL expose the expected projection metadata
- **AND** a movement-highlighted hex with multiple legal movement modes SHALL
  expose the walk, run, and jump option costs, terrain costs, elevation costs,
  and heat metadata together
- **AND** a reachable movement-highlighted hex with a blocked movement mode
  SHALL expose legal option states, blocked option reason metadata, and a
  separate blocked-options badge that does not rely on color alone
- **AND** each rendered hex SHALL keep its base shape pointer-targetable even
  when the terrain fill is transparent, so hover/click tactical details remain
  reachable on clear terrain
- **AND** when the Run overlay contains a destination whose Run path is blocked
  but a Walk path is legal, the map SHALL render the reachable Walk projection
  as primary while retaining the blocked Run option metadata
- **AND** a tracked vehicle destination with an over-limit elevation change
  SHALL expose the terrain-blocked elevation reason, elevation delta/cost, and
  a non-color invalid badge
- **AND** a hover vehicle destination over represented deep water SHALL expose
  reachable movement, zero terrain/elevation surcharge, motive metadata, and
  the water/smoke terrain layers
- **AND** a naval vehicle destination on represented clear land SHALL expose
  the water-required terrain blocker, zero heat, motive metadata, and a
  non-color invalid badge
- **AND** a biped swim destination through represented deep water SHALL expose
  reachable movement, zero water/elevation surcharge, swim heat, elevation
  delta, and water terrain metadata
- **AND** a Frogman destination into represented deep water SHALL expose
  reachable movement, the reduced terrain surcharge, heat, and water terrain
  metadata
- **AND** a TacOps battlefield-wreck destination converted into represented
  rough terrain SHALL expose reachable movement, rough terrain metadata, the
  shared terrain surcharge, heat, and non-color cost badge metadata
- **AND** a prone unit's represented stand-up movement destination SHALL expose
  the stand-up MP cost, PSR target metadata, heat, and stand-up badge metadata
- **AND** a movement-blocked hex SHALL expose the engine-aligned rejection
  reason and render an invalid badge that does not rely on color alone
- **AND** a LOS-blocked combat target SHALL expose the blocked target id,
  NoLineOfSight rejection, blocker hex metadata, and an invalid combat badge
- **AND** an elevation-LOS-blocked combat target SHALL expose the elevation
  blocker reason, blocker hex metadata, elevation label, and non-color invalid
  and blocker badges
- **AND** a combat target blocked by cumulative intervening heavy woods SHALL
  expose the shared `NoLineOfSight` rejection, woods blocker reason, woods
  terrain metadata, and non-color invalid and blocker badges
- **AND** a combat target blocked by stacked intervening smoke and woods SHALL
  expose the shared combined `NoLineOfSight` blocker reason, terrain-layer
  metadata for both effects, and non-color invalid and blocker badges
- **AND** a combat target hidden by fog visibility recalculated through
  represented LOS terrain blockers SHALL render as a last-known contact,
  expose obscured target ids, `TargetNotVisible` metadata, terrain blocker
  context, and non-color visibility/invalid badges
- **AND** a medium-range combat target SHALL expose the target id, distance,
  range band, available weapon ids, and per-weapon range option metadata
- **AND** a combat target whose represented C3 spotter improves the effective
  range SHALL expose the improved range band, spotter id, spotter range,
  to-hit metadata, and C3 accessible context
- **AND** a LOS-blocked LRM target with a represented friendly spotter SHALL
  remain attackable and expose indirect-fire basis, spotter id, penalty,
  to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked LRM target whose elected spotter has a represented
  gunnery penalty SHALL expose the net indirect-fire penalty, spotter gunnery,
  skill modifier, to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked LRM target whose represented walked spotter has Forward
  Observer SHALL expose indirect-fire penalty, cancellation metadata, the
  Forward Observer flag, to-hit metadata, and non-color indirect-fire badge
  context
- **AND** a LOS-blocked NARC-marked LRM target with no represented spotter SHALL
  remain attackable and expose beacon basis, no-spotter metadata, penalty,
  to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked iNarc-marked LRM target with no represented spotter
  SHALL remain attackable and expose beacon basis, no-spotter metadata,
  penalty, to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked TAG-designated target attacked by semi-guided LRM fire
  SHALL remain attackable and expose no-spotter TAG basis, zero indirect
  penalty, to-hit metadata, and non-color indirect-fire badge context
- **AND** a LOS-blocked ECM-protected TAG-designated target attacked by
  semi-guided LRM fire SHALL remain blocked and expose the no-line-of-sight
  rejection without indirect-fire basis or badge metadata
- **AND** a combat target outside the selected weapon's firing arc SHALL expose
  `OutOfArc` rejection metadata, per-weapon arc blocker details, and a combat
  invalid badge that does not rely on color alone
- **AND** combat targets inside represented left- and right-sponson vehicle
  weapon front-plus-side coverage SHALL remain attackable and expose in-arc
  per-weapon availability metadata
- **AND** a combat target outside a represented locked vehicle turret's
  front-only coverage SHALL expose `OutOfArc` rejection metadata and per-weapon
  arc blocker details
- **AND** a same-hex combat target SHALL expose `SameHex` rejection metadata
  and a combat invalid badge that does not rely on color alone, even when the
  selected weapon is otherwise in range
- **AND** a combat target in represented partial cover SHALL expose the cover
  level, modifier, to-hit modifier, reason, and a cover badge that does not rely
  on color alone
- **AND** a combat target involving represented prone attacker and target state
  SHALL expose the attacker-prone and target-prone to-hit modifiers, final
  target number, badge, and tooltip rows
- **AND** a combat target with represented shutdown immobility SHALL expose the
  target-immobile to-hit modifier, final target number, badge, and tooltip rows
- **AND** a combat target fired by a represented hot attacker SHALL expose the
  heat to-hit modifier, final target number, badge, and tooltip rows
- **AND** a combat target involving represented attacker movement and target
  movement SHALL expose the attacker movement and target TMM to-hit modifiers,
  final target number, badge, and tooltip rows
- **AND** a combat target involving represented jump movement SHALL expose the
  attacker jump penalty, the jumped target TMM bonus, final target number,
  badge, and tooltip rows
- **AND** a combat target involving represented walk movement SHALL expose the
  attacker walk penalty, target walk TMM, final target number, badge, and
  tooltip rows
- **WHEN** browser automation switches to isometric mode and rotates the camera
- **THEN** isometric stack, occluder, visibility, rotation, and depth metadata
  SHALL update in the rendered DOM
- **AND** rotating the camera SHALL move the active occluder metadata and
  highlight to the tall elevation stack that is actually in front for that
  camera angle
- **AND** pointer and touch camera interactions SHALL pan, pinch-zoom, or
  rotate the isometric view while preserving the same shared projection-layer
  mode, occluder metadata, and presentation-only camera control provenance
- **AND** the rendered map output SHALL contain nonblank top-down and isometric
  pixels
