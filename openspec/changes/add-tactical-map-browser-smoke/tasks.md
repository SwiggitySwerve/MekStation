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
