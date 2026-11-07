## 1. Remove the legacy campaign overview stack and unmounted UI

- [x] 1.1 Prove each target has no production importer on fresh origin/main
      (static, dynamic, barrel, story, e2e, jest lists, QC registries).
- [x] 1.2 Move `DeleteCampaignDialog` verbatim, delete the stack, trim the
      legacy campaign types to the `CampaignPilotStatus` re-export and keep its
      value-pinning test.
- [x] 1.3 Delete `ContextPanel*`, `RefitLaunchPanel` and `ImportUnitDialog`.
- [x] 1.4 Record the REMOVED requirement delta for `campaign-hud`.
- [ ] 1.5 Run both tsc configs, lint:units, root lint, oxfmt and openspec
      validate; obtain hosted green.
