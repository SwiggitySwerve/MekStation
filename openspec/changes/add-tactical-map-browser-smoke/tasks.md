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

## 3. Validation

- [x] 3.1 Focused Playwright smoke passes.
- [x] 3.2 OpenSpec strict validation passes.
- [x] 3.3 Standard format/lint/type/build gates pass.
- [x] 3.4 Focused Playwright smoke passes with the rotated occluder handoff
  case.
