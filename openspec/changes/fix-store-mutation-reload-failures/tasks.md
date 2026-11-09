## 1. Regression coverage

- [x] 1.1 Extend encounter store tests for every mutation and successful, HTTP-failed, network-failed, and JSON-failed list reloads; record the failing run.
- [x] 1.2 Extend pilot store tests for every persisted mutation, saved-but-unrefreshed creation wording, and unchanged selection on failed reload; record the failing run.

## 2. Store behavior

- [x] 2.1 Implement Encounter Mutation Refresh Outcome in useEncounterStore.apiActions.ts without changing public loader contracts.
- [x] 2.2 Implement Pilot Mutation Refresh Outcome in usePilotStore.api.ts and usePilotStore.skills.ts without changing public loader contracts.
- [x] 2.3 Deliberately restore unconditional success in each store, record that tests fail, and restore the implementation.

## 3. Verification

- [x] 3.1 Run whole store test directories and src/__tests__/integration, both TypeScript projects, root lint, unit lint and its Jest suite, formatting, OpenSpec validation, and the CI budget check.
- [ ] 3.2 Open one draft PR and mark ready only after hosted CI is green; Root owns merging.
