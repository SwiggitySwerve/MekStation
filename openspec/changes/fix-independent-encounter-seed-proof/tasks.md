## 1. Contract and baseline

- [x] 1.1 Record the original seed E2E failure on a production build of fetched main, with port 3615 and an isolated G5 durable store.
- [x] 1.2 Amend the active restart clause and define the launch-seed delta; preserve archive history and the manual Launched restart contract.

## 2. Independent encounter proof

- [x] 2.1 Create both fresh encounters before either launch from one battle-input definition using existing fixtures.
- [x] 2.2 Assert separate encounter/session identities, equal persisted seed and gameplay inputs, equal winner/turn/event counts, and unchanged first Completed row/history.
- [x] 2.3 Correct stale E2E specification references and synchronize the accepted delta into live specs after verification.

## 3. Verification and delivery

- [x] 3.1 Pass the seed spec twice on the production build with retries off; pass the unchanged manual restart/refusal spec and encounter lifecycle tests.
- [x] 3.2 Run the lane integration, typecheck, lint, lint-units, formatting, budget, OpenSpec quality and strict validation gates; record exact results.
- [x] 3.3 Prepare the draft PR description with exact amended requirements and validation evidence for Coordinator 4 and C5; leave merging to Coordinator 4.
