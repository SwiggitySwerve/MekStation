## 1. Projection Source Detail

- [x] Include per-option movement state, MP, terrain/elevation cost, heat, and
      blocked detail in shared movement projection source references.
- [x] Preserve the existing `movement:megamek` channel and rule references for
      existing top-down/isometric consumers.

## 2. Tests

- [x] Update tactical map projection tests for the expanded single-option
      source detail.
- [x] Add mixed walk/run/jump source-reference coverage for same-hex movement
      options.
