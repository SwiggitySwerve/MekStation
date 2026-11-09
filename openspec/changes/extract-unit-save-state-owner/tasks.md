## Implementation

- [x] Capture literal main persisted drafts and fingerprint bytes before editing production code.
- [x] Record a red run for the pure save-state owner and fingerprint-extension contract.
- [x] Extract the existing fingerprint primitives and receipt type with stable facade exports.
- [x] Delegate existing mech receipt and dirty comparisons to the shared owner.
- [x] Document optional-field compatibility and staged adoption.

## Verification

- [x] Run old-shape hydration, literal fingerprint, undo/redo, registry/reset, and transition tests.
- [x] Deliberately break fingerprint normalization; record the failing compatibility test and restore it.
- [x] Run full affected store test directories and integration tests, both TypeScript configurations, lint, unit lint and its Jest suite, formatting, OpenSpec validation, and the CI budget check.
- [x] Fetch and merge main before pushing; preserve any concurrent UnitActions changes and verify the final tree.
