## 1. Reader floor and gate

- [x] 1.1 Reader constant, header parse, refusal body and gate on GET/PUT `[id]`, adopt, redeem, commands.
- [x] 1.2 Client header on every gated request, 426/422 refusal handling, Reload action.
- [ ] 1.3 `Vary` on campaign GETs and the service worker keyed on it.

## 2. Local storage

- [x] 2.1 `.lifecycle` slot, tombstone, slot-wins recovery, orphans kept.
- [ ] 2.2 Outdated-tab notice shown to the user.

## 3. Inert contracts and co-op

- [ ] 3.1 One inert predicate; every contract reader uses it; read-only display.
- [ ] 3.2 Co-op session start refused on a campaign holding version 2.

## 4. Desktop

- [ ] 4.1 Restore refuses a newer backup; startup refuses a newer database.
- [ ] 4.2 S7 marker migration designed and stubbed, inactive.

## 5. Proof

- [ ] 5.1 Focused tests, mutants, typecheck, format, lint, strict OpenSpec validation.
- [ ] 5.2 Frozen-client witness harness written; run left to the coordinator.
