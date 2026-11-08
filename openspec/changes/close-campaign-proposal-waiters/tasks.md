## 1. Identity and lifecycle
- [x] Record failing tests for duplicates, original waiter ownership, closure, reconnect, and cleanup.
- [x] Implement arbiter ID ownership and closure settlement, preserving the market-reader seam.
- [x] Implement local runtime admission-race handling and closure settlement.
- [x] Implement socket closure notifications and adapter listener cleanup.
- [x] Kill deliberate duplicate, closure, admission-race, and cleanup mutants.

## 2. Validation
- [x] Run whole touched test directories, src/lib/multiplayer, and integration with Node 22.
- [x] Run both TypeScript configs, lint at most 63 warnings, lint:units and its Jest suite, oxfmt, and budget-check.
- [x] Confirm the new helper test is keyable without a repo-wide key.
- [x] Validate this OpenSpec change.
- [ ] Publish the draft PR for Root; hosted CI remains pending.
