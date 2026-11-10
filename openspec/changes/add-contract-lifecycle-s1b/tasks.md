## 1. Reader floor and gate

- [x] 1.1 Reader constant, header parse, refusal body and gate on GET/PUT `[id]`, adopt, redeem, commands.
- [x] 1.2 Client header on every gated request, 426/422 refusal handling, Reload action.
- [x] 1.3 `Vary` on campaign GETs; the shipped worker is proven not to replay across reader levels (no worker change).
- [x] 1.4 Desktop wording for the 426 (update the app, no Reload button) and the quoted unreadable backup version.

## 2. Local storage

- [x] 2.1 `.lifecycle` slot, tombstone, slot-wins recovery, orphans kept.
- [x] 2.2 Outdated-tab notice shown to the user, naming the campaign.

## 3. Inert contracts and co-op

- [x] 3.1 One inert predicate; every contract reader uses it (census); read-only display.
- [x] 3.2 Co-op session start refused on a campaign holding version 2.

## 4. Desktop

- [x] 4.1 Restore refuses a newer backup; startup refuses a newer database.
- [x] 4.2 S7 marker migration designed and stubbed, inactive.

## 5. Proof

- [x] 5.1 Focused tests, 18 mutants killed and restored, typecheck, format, lint, strict OpenSpec validation.
- [x] 5.2 Frozen-client witnesses written and run (server and local storage); the Playwright service-worker spec is written and listed, not run.
