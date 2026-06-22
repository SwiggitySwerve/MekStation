## 1. Types and Projection Shape

- [x] 1.1 Extend GM combat correction family/types with attack-resolution and objective-state correction inputs.
- [x] 1.2 Extend GM combat projected effect types with replayable attack-resolution and objective-state effects.
- [x] 1.3 Add correction storage fields to GM combat intervention state without changing base game session contracts.

## 2. Preview and Apply

- [x] 2.1 Build attack-resolution preview effects with unit existence validation and public changed-state refs.
- [x] 2.2 Build objective-state preview effects with marker lookup/addition validation and public changed-state refs.
- [x] 2.3 Apply attack-resolution and objective projected effects through the existing combat projection reducer.
- [x] 2.4 Accept the new correction families in the combat intervention implementer payload guard.

## 3. Tests and Validation

- [x] 3.1 Add focused unit tests for attack-resolution preview/apply/replay/redaction and unknown-unit rejection.
- [x] 3.2 Add focused unit tests for objective patch/add/replay/redaction and unidentifiable-marker rejection.
- [x] 3.3 Run focused Jest tests for GM combat interventions.
- [x] 3.4 Run typecheck, format check, OpenSpec strict validation, QC verification, and full verification before PR.
