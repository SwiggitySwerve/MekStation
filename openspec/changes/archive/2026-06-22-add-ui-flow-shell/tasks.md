## 1. UI Flow Registry

- [x] 1.1 Add a typed gameplay UI flow registry covering all required journey QC IDs.
- [x] 1.2 Add route checkpoint metadata for player-visible and GM inspection phases.

## 2. Gameplay Hub Shell

- [x] 2.1 Add a compact gameplay flow shell component that renders journey ID, module, action route, checkpoints, QC command, and role intent.
- [x] 2.2 Mount the flow shell on `/gameplay` without removing existing gameplay navigation cards.
- [x] 2.3 Add React tests for required journey rendering and route/checkpoint visibility.

## 3. QC Drift Validation

- [x] 3.1 Extend journey QC validation to load and validate UI flow mappings.
- [x] 3.2 Validate required journey coverage, unknown UI journey IDs, graph node coverage, and route template coverage.
- [x] 3.3 Add script tests for UI flow validation failure modes.

## 4. Documentation And Verification

- [x] 4.1 Document the UI flow shell in journey QC docs.
- [x] 4.2 Run focused tests, OpenSpec validation, typecheck, and QC validation.
