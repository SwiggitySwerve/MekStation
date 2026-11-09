## Implementation

- [x] Record a failing component test for the disabled Standard market and a hidden-hint case for enabled resolved options.
- [x] Add the conditional hint beside the defaults notice using the preset service.
- [x] Kill the inverted-condition mutant and verify the restored implementation.
- [x] Run full campaign page-module, campaign-page caller, campaign-store, and integration test directories, plus the lint-units Jest suite.
- [x] Run both TypeScript configs, root lint, lint-units, formatting, OpenSpec validation/accounting, and repository budgets without raising ceilings.
- [ ] Open a draft PR and mark it ready only after hosted CI is green.

## Caller inventory

The sole production caller is `src/pages/gameplay/campaigns/index.tsx`. The panel hosts both create and join entry points; the hint describes host creation defaults. Creation continues through the campaign store, persistence save, and match POST. Guest join, multiplayer dispatch/journal authority, P2P translation, interactive sessions, GameEngine phases and runToCompletion callers, AI, and standalone simulation do not consume the hint.

## Evidence

Local gate logs are recorded outside the repository at `E:/Projects/Personal/_scratch/sm-audit-reports/d10-hint/`.

- Clean red run (`red-final.log`): 1 failed, 157 passed. Only the new disabled-market hint assertion failed.
- Initial green (`green.log`): all 9 page-module suites and 158 tests passed.
- Inverted-condition mutant (`mutant.log`): both new visibility tests failed; 156 tests passed. The correct condition was restored before final gates.
- Final whole-directory run (`tests-final.log`): 106 suites passed, 1,418 tests passed, 32 skipped. Includes the page-module directory, campaign-page callers, campaign store (including D-5 market seeding), integration, and lint-units Jest suite. K-L7 creation cleanup tests remain unchanged and pass.
- Both TypeScript configs passed. Root lint: 63 warnings, 0 errors. Unit lint: 17,079 findings within the 17,085 ceiling; no ceilings changed.
- Whole-repository formatting passed (9,235 files). Strict OpenSpec validation: 310 passed, 0 failed. OpenSpec CI accounting: 89 active changes accounted, 0 errors.
- Repository budget passed: 3,130 test files, 57 unkeyable, 92 repo-wide keys; no budgets changed.
- Validation used Node 22.22.0 with the main checkout's installed dependencies after confirming identical lockfile hashes. Initial Node 24 execution exposed the shared SQLite binary's Node 22 ABI requirement; no native dependencies were rebuilt.
- Browser screenshots could not be captured: local Next.js failed to resolve the cross-drive dependency path `./E:/Projects/Personal/MekStation/node_modules/next/dist/client/next-dev.js`. Capture attempts and their development servers were stopped. No browser or visual acceptance claim is made.
