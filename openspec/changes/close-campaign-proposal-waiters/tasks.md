## 1. Identity and lifecycle
- [ ] Record failing tests for duplicates, original waiter ownership, closure, reconnect, and cleanup.
- [ ] Implement arbiter ID ownership and closure settlement, preserving the market-reader seam.
- [ ] Implement local runtime admission-race handling and closure settlement.
- [ ] Implement socket closure notifications and adapter listener cleanup.
- [ ] Kill deliberate duplicate, closure, admission-race, and cleanup mutants.

## 2. Validation
- [ ] Run whole touched test directories, src/lib/multiplayer, and integration with Node 22.
- [ ] Run both TypeScript configs, lint at most 63 warnings, lint:units and its Jest suite, oxfmt, and budget-check.
- [ ] Confirm the new helper test is keyable without a repo-wide key.
- [ ] Validate this OpenSpec change and publish a draft PR for Root.
