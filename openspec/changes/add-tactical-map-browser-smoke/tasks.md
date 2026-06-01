# Tasks: Add Tactical Map Browser Smoke

## 1. Browser Fixture

- [x] 1.1 Add a dev/test-only tactical map E2E harness route.
- [x] 1.2 Include represented top-down terrain/elevation, movement, combat, and
  isometric occluder inputs in the fixture.

## 2. Browser Verification

- [x] 2.1 Add Playwright smoke coverage for top-down label/metadata rendering.
- [x] 2.2 Add Playwright smoke coverage for isometric stack, occlusion, and
  camera rotation metadata.
- [x] 2.3 Add a nonblank rendered-pixel check for top-down and isometric map
  output.
- [x] 2.4 Add browser coverage proving camera rotation moves the active
  occluder highlight between opposing tall elevation stacks.
- [x] 2.5 Add browser coverage proving a highlighted movement hex exposes
  walk, run, and jump option metadata together.
- [x] 2.6 Add browser coverage proving blocked movement destinations expose
  engine-style rejection metadata and an invalid badge.
- [x] 2.7 Add browser coverage proving a LOS-blocked combat target exposes
  blocker metadata and an invalid combat badge.
- [x] 2.8 Add browser coverage proving a reachable movement hex can expose a
  blocked movement-mode option with a separate non-color blocked-options badge.
- [x] 2.9 Add browser coverage proving a target at medium weapon range exposes
  distance, range-band, and available weapon option metadata.
- [x] 2.10 Add browser coverage proving a target in represented partial cover
  exposes cover modifier, to-hit modifier, reason, and cover badge metadata.
- [x] 2.11 Add browser coverage proving hidden-only and last-known fog contacts
  expose non-attackable visibility metadata plus isometric fog-rule markers.
- [x] 2.12 Add browser coverage proving mixed selected-weapon range
  availability keeps the target legal while exposing blocked weapon metadata.
- [x] 2.13 Add browser coverage proving represented minimum-range penalties
  expose affected weapon ids, to-hit modifier metadata, and a non-color badge.
- [x] 2.14 Add browser coverage proving represented extreme-range cutoffs keep
  selected weapons available at extreme range.
- [x] 2.15 Add browser coverage proving all-selected-weapons-out-of-range
  targets remain non-attackable while exposing blocked weapon metadata.
- [x] 2.16 Add browser coverage proving jump elevation changes expose zero
  elevation MP cost instead of hiding the cost breakdown.
- [x] 2.17 Add browser coverage proving VTOL-style elevation changes expose
  zero elevation MP cost and unit-type movement metadata.
- [x] 2.18 Route the VTOL-style browser scenario through the shared movement
  destination projection instead of a hand-authored highlight row.
- [x] 2.19 Add fixture-level parity coverage proving the VTOL browser
  projection is accepted by movement commit validation with matching MP, heat,
  and path.
- [x] 2.20 Add fixture-level parity coverage proving the all-selected-weapons
  out-of-range browser projection is rejected by attack commit validation with
  matching reason and details.
- [x] 2.21 Add fixture-level parity coverage proving the legal mixed-weapon
  browser projection is accepted by attack commit validation with matching
  usable weapons, range bracket, and to-hit number.
- [x] 2.22 Add fixture-level parity coverage proving the minimum-range browser
  projection is accepted by attack commit validation with a matching minimum
  range to-hit modifier.
- [x] 2.23 Route the jump elevation browser scenario through the shared
  movement destination projection and prove commit validation accepts it with
  matching MP, heat, elevation delta, and path.
- [x] 2.24 Add a coherent biped walk/run/jump browser scenario backed by shared
  movement destination projections and commit-validation parity.
- [x] 2.25 Add browser coverage proving target-hex light woods applies a
  `Target Terrain +1` to-hit modifier without rendering a partial-cover badge.
- [x] 2.26 Add browser coverage proving mixed visible/hidden/last-known
  same-hex contacts keep the visible target attackable while exposing obscured
  contacts separately.
- [x] 2.27 Add browser coverage proving runtime unit-height bridge-clearance
  movement projection renders the same blocked reason commit validation uses.
- [x] 2.28 Add browser coverage proving LOS blocker target hexes and blocker
  hex badges expose the same terrain blocker reason and metadata used by attack
  commit validation.
- [x] 2.29 Render bridge-clearance movement failures with a specific non-color
  movement invalid badge instead of the generic terrain badge.
- [x] 2.30 Add browser coverage proving selected weapons that cannot cover a
  target's firing arc expose `OutOfArc` rejection metadata, per-weapon arc
  blocker details, and a non-color arc invalid badge.
- [x] 2.31 Add browser coverage proving normal weapon attacks against same-hex
  targets expose `SameHex` rejection metadata and a non-color invalid badge
  even when the selected weapon is otherwise in range.
- [x] 2.32 Add browser coverage proving a Run-selected water destination can
  render the reachable Walk fallback as the primary movement projection while
  preserving the blocked Run option reason and non-color blocked-options badge.
- [x] 2.33 Add browser coverage proving a tracked vehicle abrupt elevation
  climb renders as blocked with the same terrain-blocked elevation reason the
  movement commit validator uses.
- [x] 2.34 Add browser coverage proving a hover vehicle can cross deep water
  with zero terrain/elevation surcharge while preserving water/smoke terrain
  metadata.
- [x] 2.35 Add browser coverage proving a naval vehicle cannot leave water for
  a clear land hex and renders the same water-required blocker used by commit
  validation.
- [x] 2.36 Add browser coverage proving elevation-blocked line of sight renders
  the shared NoLineOfSight reason, blocker metadata, and non-color badges.
- [x] 2.37 Add browser coverage proving biped swim movement through deep water
  renders the shared projection cost, elevation delta, heat, and terrain
  metadata.
- [x] 2.38 Add browser coverage proving Frogman deep-water movement renders the
  shared reduced terrain cost, heat, and water terrain metadata.
- [x] 2.39 Add browser coverage proving prone stand-up movement renders the
  shared stand-up MP cost, PSR target, heat, and movement metadata.
- [x] 2.40 Add browser coverage proving prone attacker/target combat renders
  the shared to-hit modifier metadata, target number, badge, and tooltip rows.
- [x] 2.41 Add browser coverage proving a shutdown target renders the shared
  target-immobile to-hit modifier metadata, target number, badge, and tooltip
  rows.
- [x] 2.42 Add browser coverage proving a hot attacker renders the shared heat
  to-hit modifier metadata, target number, badge, and tooltip rows.
- [x] 2.43 Add browser coverage proving represented attacker movement and target
  movement render separate shared to-hit modifier metadata, target number,
  badge, and tooltip rows.
- [x] 2.44 Add browser coverage proving represented jump movement renders the
  attacker jump penalty, target jump TMM bonus, target number, badge, and
  tooltip rows.
- [x] 2.45 Add browser coverage proving represented walk movement renders the
  attacker walk penalty, target walk TMM, target number, badge, and tooltip
  rows.
- [x] 2.46 Add browser coverage proving cumulative intervening heavy woods
  renders the shared `NoLineOfSight` blocker reason, woods terrain metadata,
  and non-color invalid/blocker badges.
- [x] 2.47 Add browser coverage proving smoke and woods stacked in one
  intervening hex render the shared combined blocker reason, terrain layers,
  and non-color invalid/blocker badges.
- [x] 2.48 Add browser coverage proving grid-derived fog visibility
  recalculates through LOS terrain blockers, renders a last-known target as
  non-attackable, and exposes the matching visibility/invalid metadata.
- [x] 2.49 Add browser coverage proving TacOps battlefield-wreck conversion
  renders as rough terrain with the shared movement terrain surcharge.
- [x] 2.50 Add browser coverage proving C3 spotter range benefit renders the
  improved effective range and C3 context metadata.
- [x] 2.51 Add browser coverage proving LOS-spotter indirect fire keeps a
  blocked LRM target attackable with indirect basis, spotter, and penalty
  metadata.
- [x] 2.52 Add browser coverage proving Forward Observer cancellation keeps the
  blocked LRM target attackable while exposing the represented cancellation
  flag and cancelled penalty metadata.
- [x] 2.53 Add browser coverage proving NARC beacon indirect fire keeps a
  blocked LRM target attackable without a represented spotter while exposing
  beacon basis and penalty metadata.
- [x] 2.54 Add browser coverage proving iNarc beacon indirect fire keeps a
  blocked LRM target attackable without a represented spotter while exposing
  beacon basis and penalty metadata.
- [x] 2.55 Add browser coverage proving semi-guided TAG indirect fire keeps a
  blocked LRM target attackable without a represented spotter while exposing
  TAG basis and zero-penalty metadata.
- [x] 2.56 Add browser coverage proving ECM-nullified TAG keeps a blocked
  semi-guided LRM target rejected without indirect-fire basis or badge metadata.
- [x] 2.57 Add browser coverage proving represented spotter gunnery changes the
  indirect-fire penalty and exposes gunnery/skill-modifier metadata.
- [x] 2.58 Add browser coverage proving represented vehicle sponson multi-arc
  coverage keeps a left-arc target attackable with in-arc weapon metadata.
- [x] 2.59 Add browser coverage proving represented locked vehicle turret
  coverage blocks a side-arc target with out-of-arc weapon metadata.
- [x] 2.60 Add browser coverage proving represented right-sponson multi-arc
  coverage mirrors the left-sponson target with in-arc weapon metadata.

## 3. Validation

- [x] 3.1 Focused Playwright smoke passes.
- [x] 3.2 OpenSpec strict validation passes.
- [x] 3.3 Standard format/lint/type/build gates pass.
- [x] 3.4 Focused Playwright smoke passes with the rotated occluder handoff
  case.
- [x] 3.5 Focused Playwright smoke passes with same-hex walk/run/jump movement
  option metadata.
- [x] 3.6 Focused Playwright smoke passes with blocked movement destination
  metadata.
- [x] 3.7 Focused Playwright smoke passes with LOS-blocked combat target
  metadata.
- [x] 3.8 Focused Playwright smoke passes with mixed reachable/blocked movement
  option metadata.
- [x] 3.9 Focused Playwright smoke passes with medium-range combat target
  metadata.
- [x] 3.10 Focused Playwright smoke passes with partial-cover combat target
  metadata.
- [x] 3.11 Focused Playwright smoke passes with hidden and last-known fog
  contact visibility metadata.
- [x] 3.12 Focused Playwright smoke passes with mixed selected-weapon range
  availability metadata.
- [x] 3.13 Focused Playwright smoke passes with represented minimum-range
  penalty metadata.
- [x] 3.14 Focused Playwright smoke passes with represented extreme-range
  availability metadata.
- [x] 3.15 Focused Playwright smoke passes with
  all-selected-weapons-out-of-range rejection metadata.
- [x] 3.16 Focused Playwright smoke passes with jump zero-cost elevation
  movement metadata.
- [x] 3.17 Focused Playwright smoke passes with VTOL-style zero-cost elevation
  movement metadata.
- [x] 3.18 Focused typecheck and browser smoke prove the VTOL browser fixture is
  still valid after switching to generated movement projection data.
- [x] 3.19 Focused Jest parity test passes for the VTOL browser projection and
  commit validator handoff.
- [x] 3.20 Focused Jest parity test passes for the all-selected-weapons
  out-of-range browser projection and attack commit validator handoff.
- [x] 3.21 Focused Jest parity test passes for the legal mixed-weapon browser
  projection and attack commit validator handoff.
- [x] 3.22 Focused Jest parity test passes for the minimum-range browser
  projection and attack commit validator handoff.
- [x] 3.23 Focused Jest parity test passes for the jump elevation browser
  projection and movement commit validator handoff.
- [x] 3.24 Focused Jest parity and Playwright smoke pass for the biped
  walk/run/jump projection-backed browser scenario.
- [x] 3.25 Focused Jest parity and Playwright smoke pass for target-hex terrain
  modifier projection, committed attack modifiers, and browser tooltip rows.
- [x] 3.26 Focused Jest parity and Playwright smoke pass for mixed same-hex
  visibility projection, valid-target id metadata, and browser tooltip rows.
- [x] 3.27 Focused Jest parity and Playwright smoke pass for runtime
  unit-height bridge-clearance projection, terrain metadata, and invalid badge
  rows.
- [x] 3.28 Focused Jest parity and Playwright smoke pass for terrain LOS blocker
  projection, attack rejection details, invalid badge rows, and blocker badge
  rows.
- [x] 3.29 Focused HexMapDisplay unit coverage and Playwright smoke pass for
  bridge-clearance movement invalid badge labeling.
- [x] 3.30 Focused Jest parity and Playwright smoke pass for selected-weapon
  firing-arc rejection metadata and invalid badge labeling.
- [x] 3.31 Focused Jest parity and Playwright smoke pass for same-hex
  weapon-attack rejection metadata and invalid badge labeling.
- [x] 3.32 Focused Jest parity and Playwright smoke pass for Run-selected
  water fallback movement projection and blocked Run option labeling.
- [x] 3.33 Focused Jest parity and Playwright smoke pass for tracked vehicle
  abrupt elevation blocking, top-down elevation label, and invalid badge
  labeling.
- [x] 3.34 Focused Jest parity and Playwright smoke pass for hover deep-water
  crossing legality, cost metadata, and terrain layer labeling.
- [x] 3.35 Focused Jest parity and Playwright smoke pass for naval landfall
  movement blocking, water/clear terrain metadata, and invalid badge labeling.
- [x] 3.36 Focused Jest parity and Playwright smoke pass for elevation LOS
  blocking, elevation label metadata, and blocker badge labeling.
- [x] 3.37 Focused Jest parity and Playwright smoke pass for biped swim water
  elevation movement, top-down elevation label metadata, and cost badge
  labeling.
- [x] 3.38 Focused Jest parity and Playwright smoke pass for Frogman deep-water
  movement reduced terrain cost and top-down cost badge labeling.
- [x] 3.39 Focused Jest parity and Playwright smoke pass for prone stand-up
  movement cost, PSR metadata, and top-down stand-up badge labeling.
- [x] 3.40 Focused Jest parity and Playwright smoke pass for prone combat
  to-hit modifier metadata and badge labeling.
- [x] 3.41 Focused Jest parity and Playwright smoke pass for shutdown target
  immobile to-hit modifier metadata and badge labeling.
- [x] 3.42 Focused Jest parity and Playwright smoke pass for hot-attacker heat
  to-hit modifier metadata and badge labeling.
- [x] 3.43 Focused Jest parity and Playwright smoke pass for attacker movement
  and target TMM to-hit modifier metadata and badge labeling.
- [x] 3.44 Focused Jest parity and Playwright smoke pass for jumped attacker
  movement and jumped target TMM bonus metadata and badge labeling.
- [x] 3.45 Focused Jest parity and Playwright smoke pass for walked attacker
  movement and walked target TMM metadata and badge labeling.
- [x] 3.46 Focused Jest parity and Playwright smoke pass for cumulative woods
  LOS blocking, woods terrain metadata, and blocker badge labeling.
- [x] 3.47 Focused Jest parity and Playwright smoke pass for stacked smoke plus
  woods LOS blocking, terrain-layer metadata, and blocker badge labeling.
- [x] 3.48 Focused Jest parity and Playwright smoke pass for grid-derived fog
  LOS blocking, last-known target metadata, and `TargetNotVisible` attack
  rejection.
- [x] 3.49 Focused Jest parity and Playwright smoke pass for TacOps
  battlefield-wreck rough terrain conversion, map terrain metadata, and
  movement-cost badge labeling.
- [x] 3.50 Focused Jest parity and Playwright smoke pass for C3 range-benefit
  projection, committed attack range, and browser accessible metadata.
- [x] 3.51 Focused Jest parity and Playwright smoke pass for LOS-spotter
  indirect-fire projection, committed attack event, and browser badge metadata.
- [x] 3.52 Focused Jest parity and Playwright smoke pass for Forward Observer
  indirect-fire cancellation projection, committed attack event, and browser
  badge metadata.
- [x] 3.53 Focused Jest parity and Playwright smoke pass for NARC beacon
  indirect-fire projection, committed override event, and browser badge
  metadata.
- [x] 3.54 Focused Jest parity and Playwright smoke pass for iNarc beacon
  indirect-fire projection, committed override event, and browser badge
  metadata.
- [x] 3.55 Focused Jest parity and Playwright smoke pass for semi-guided TAG
  indirect-fire projection, committed attack event, and browser badge metadata.
- [x] 3.56 Focused Jest parity and Playwright smoke pass for ECM-nullified TAG
  projection, committed rejection event, and browser invalid-badge metadata.
- [x] 3.57 Focused Jest parity and Playwright smoke pass for spotter-gunnery
  indirect-fire projection, committed event, and browser badge metadata.
- [x] 3.58 Focused Jest parity and Playwright smoke pass for vehicle sponson
  multi-arc projection, committed attack, and browser badge metadata.
- [x] 3.59 Focused Jest parity and Playwright smoke pass for locked vehicle
  turret projection, committed rejection, and browser invalid-badge metadata.
- [x] 3.60 Focused Jest parity and Playwright smoke pass for right-sponson
  multi-arc projection, committed attack, and browser badge metadata.
- [x] 3.61 Clear-terrain base hex shapes remain pointer-targetable, and the
  full tactical-map Playwright smoke file is serialized and passes under the
  default smoke project worker settings across all 57 map scenarios.
- [x] 3.62 Isometric pointer/mobile smoke proves mouse pan, touch pan,
  pinch-zoom, and touch rotation preserve shared projection-layer mode,
  occluder metadata, and presentation-only camera control provenance.
