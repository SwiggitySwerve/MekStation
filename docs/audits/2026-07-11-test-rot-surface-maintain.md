# Maintenance Report — test rot + surface fixes — 2026-07-11

Scope: MekStation test suite (`e2e/`, `src/**/__tests__`). Targeted maintain
sweep for skip/fixme rot, stale comments, and safe surface cleanups. Full 11
scanner sweep deferred; lint lane sampled (`npm run lint -- --quiet` → 0
errors / 1935 pre-existing warnings, none concentrated in touched tests).

Open Brain was not used (MekStation policy).

## Summary (Actionable Only)

| Category                  | Critical | High      | Medium      | Low     | Info   |
| ------------------------- | -------- | --------- | ----------- | ------- | ------ |
| Dead skips / obsolete e2e | -        | 2 fixed   | 1 clarified | -       | -      |
| Stale comments            | -        | -         | 2 fixed     | 1 fixed | -      |
| Intentional gates         | -        | -         | -           | -       | 8 kept |
| Screenshot baselines      | -        | 4 pending | -           | -       | -      |
| Twin mock duplication     | -        | -         | flagged     | -       | -      |
| Lint (tests)              | -        | -         | -           | -       | clean  |

## Applied this round (surface)

1. **Removed** empty `test.skip` shell in `e2e/encounter.spec.ts` (clone UI
   never shipped; API exists separately).
2. **Retired** three mission-tree skips in `e2e/campaign.spec.ts` — default
   campaign detail route mounts command-center `CampaignDashboard`, not
   `MissionTreeView` (legacy `/overview` only). Same RETIRED pattern as the
   audit-timeline block in that file.
3. **Corrected** stale “still `it.skip`'d” comments in
   `scenario-atlas-mirror.test.ts` (determinism suite is active again).
4. **Re-documented** `e2e/game.spec.ts` replay skips — gap is match-log
   seeding for `/api/matches/:id`, not missing demo genesis events.
5. **Consolidated** `e2e/p2p-sync.spec.ts` empty `test.fixme` ×3 into
   `test.describe.fixme` with Wave 2 ownership note.
6. **Linked** `mm-data-assets.integration.test.ts` asset skip to
   `pr-checks.yml` / `release.yml` fetch-assets steps.

## Deferred (needs decision / fixtures)

| #   | Item                                                               | Why deferred                                                                 |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | `e2e/audit-capture.spec.ts` fixme ×4 (contacts/shared screenshots) | APIs exist (T2-F1); still blocked on **linux screenshot baseline ownership** |
| 2   | `e2e/game.spec.ts` replay control skips ×4                         | Needs match-log seed helper before unpin                                     |
| 3   | `contacts.chunk*.test.tsx` / `AnalysisBugs.chunk*` shared mocks    | Large twin extraction; low CI pain                                           |
| 4   | Full 11-scanner maintain sweep                                     | Out of this “test rot + surface” round                                       |

## Keep / intentional gates

- Env filters: `flow-audits`, `scenario-pack-minting`, mint fast-forward pack
- Browser gate: tactical-map touch smoke (Chromium-only)
- Statistical / perf: `simulation.test.ts`, `swarm-pilot-skills-batch`, combat
  chunk helpers (PR small-N → nightly full)
- Asset / corpus presence gates: `mm-data-assets`, `unit.contract.test.ts`

## Structural Referral

Not triggered (no critical file-bloat / god-class / 4+ duplicate copies from
this targeted run).

## Next options

- `baselines` — unpin audit-capture ×4 on linux nightly and capture screenshots
- `replay` — seed match-log for demo/replay and unpin game.spec controls
- `twins` — extract shared mocks from contacts.chunk\* (12 files)
- `full` — run all 11 maintain scanners repo-wide
- `skip` — stop after this surface batch
