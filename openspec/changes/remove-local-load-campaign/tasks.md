## Implementation

- [x] Record the failing test first (the store has no `loadCampaign`: runtime assertion and a compile-time assertion, both red before the removal).
- [x] Remove the action, the type member and the unused imports.
- [x] Port the 23 test call sites to the production load paths; delete the two reader-only cases; make the legacy-shape case a direct `deserializeCampaign` assertion.
- [x] Add the permanent crash-window test on the live reload path and kill the split-state mutant.
- [x] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt and the budget check. (Lint 62 warnings, ceiling 63; `lint:units` src-tests 16,968 of 16,969; budget 57 unkeyable, unchanged; types, stores, lib campaign, scenario packs/replay, API and integration green.)

## Follow-up outside this change

- [ ] Decide whether the `campaign-<id>` writes (`persistCampaignRecord`) are still needed (K4).
- [ ] Decide whether the live-map branch of `mergeSerializedMissionMap` should go.
