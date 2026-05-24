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
