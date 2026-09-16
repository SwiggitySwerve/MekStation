# customizer-recovery-20260910 — distilled evidence

## 1. Purpose

Evidence root for the `add-customizer-edit-recovery` OpenSpec change (undo/redo, save/library, and version-history recovery in the unit customizer). Cited directly in the shipped audit doc:

> "Evidence root: `.sisyphus/customizer-recovery-20260910`." (`docs/audits/2026-09-10-customizer-edit-recovery.md:16`)

The folder holds parallel-worker driver logs/status JSON for many named checks (lint, types, build, focused/`-corrected` test reruns, browser Playwright runs at several checkpoints: `first-paint-before/after`, `save-open-before`, `repeated-save-after`, `restored-ids-before/after`, `recovery-boundaries-before/after`, `reopen-*`, `grok-reopen`, `production*`), plus three sub-review lanes:

- `status-history/` — implementation lane for the visible draft/library status + saved-history UI (`status-history/prompt.md`: "Implement the visible draft/library status and safe saved-history integration for openspec/changes/add-customizer-edit-recovery.").
- `undo-review/` — a read-only reviewer pass (`RESULT.md`, then `RECHECK.md`) on the undo/history store and `UnitEditControls` keyboard shortcut, finding and then confirming the fix for (1) undo reapplying a stale full snapshot that wiped a just-applied save identity, and (2) Ctrl/Cmd+Z being swallowed while a native `<select>` was focused.
- `integration-review/` — a read-only reviewer pass (`RESULT.md`, `PARENT-RECHECK.md`, `REOPEN-RECHECK.md`) on save/library/restore boundaries, finding no actionable defects in the original scope, then confirming a parent-side fix for a stale-enabled-Save-on-reopen defect in `SaveUnitDialog` and a server-vs-IndexedDB name-conflict authority mismatch in `UnitNameValidator`.

`parent-review-pending.md` records the parent's own working notes/TODOs for the final integration pass (fingerprint comparisons, restore cancellation guards, browser-storage-failure reporting, receipt cleanup, `UnitEditControls` placement, and controller-integration de-duplication).

Date range (file mtimes): 2026-09-10 10:28 to 2026-09-10 12:06.

## 2. Cited by

`git grep -n -F ".sisyphus/customizer-recovery-20260910"` (excluding the roadmap-completion planning dir) and the same string search in `openspec/planning/2026-09-12-roadmap-completion` and `docs` both return exactly one hit, identical in both searches:

```
docs/audits/2026-09-10-customizer-edit-recovery.md:16:Evidence root: `.sisyphus/customizer-recovery-20260910`.
```

This is a plain prose reference (not a relative link) to the folder as the evidence root. After deletion, this line in the audit doc will describe a path that no longer exists on disk — it should be read as "evidence was collected here and has since been pruned," not as a live pointer.

## 3. Key results

- `acceptance.json` (final gate, `acceptedAt: 2026-09-10T18:05:20Z`, `head: 45a94017a449519491726c52083abc1c7bd1e7e3`):
  - `build`: `{name: "build", code: 0, ms: 235885}`, `{name: "hydrate", code: 0, ms: 5461}`; `success: true`, `build: "1789063045257"`.
  - `checks`: `restore-final-types: 0`, `restore-final-lint: 0`, `unit-acceptance: 0`, `browser-final: 0` (all zero exit codes).
  - `unit`: `{passed: 307, suites: 20, pending: 0}`.
  - `browser`: `{expected: 2, skipped: 0, unexpected: 0, flaky: 0}` over `10681.5`ms.
  - `unchangedProductFingerprints: 23`.
  - `formatting`: owned files `"passed"`; whole-repo formatting exit code `1` against 13 pre-existing unrelated files under `docs/audits/2026-09-09-printable-model-library/` and `docs/audits/2026-09-10-chassis-index/` (not this change's files).
  - `preview`/`previewVerification`: server on port 3611, `status: 200` at `2026-09-10T18:06:10Z`.
- `undo-review/RESULT.md` → `RECHECK.md`: both of the two filed findings (stale full-snapshot undo wiping save identity; Ctrl/Cmd+Z ignored on focused native `<select>`) are marked **Resolved** in `RECHECK.md`, each backed by a named regression test (`unitEditHistory.test.ts:196-207`, `UnitEditControls.test.tsx:66-74`) and an e2e case pending "MultiUnitTabs integration" (not yet run at review time).
- `integration-review/RESULT.md`: "No concrete actionable defects" in the original six-file/boundary review scope.
- `integration-review/REOPEN-RECHECK.md`: confirms both browser-discovered defects were fixed — `SaveUnitDialog` now resets `status`/`validationResult` to idle on close so a reopen does not paint with a stale enabled Save; `UnitNameValidator.checkCustomConflict` now goes through `customUnitApiService.list()` (server-authoritative) instead of IndexedDB, rethrowing on failure instead of declaring a name available.
- `save-final-tests.log` / `save-final-tests-status.json`, `restore-final-lint.log`, `restore-final-types.log`, and the many `*-status.json` driver files each record a `code` field for their respective check; `acceptance.json`'s `checks` block is the parent's own rollup of the terminal ones (all `0`).

## 4. Inventory

246 files, 10,912,820 bytes total.

```
c5bc70aa8b7266f11610ba58b2b569fc957b39b0a5ebf676cdaf69aa2f030382  .sisyphus/customizer-recovery-20260910/acceptance.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/boundary-additions-driver.log
ebccbe060ee85e96e16a6e25cf3fd080465e4770ee90ad9be3f6f2059e3bb766  .sisyphus/customizer-recovery-20260910/boundary-additions-status.json
02fe995bcbaa8e3b3de6bf5f0ea0977a0c1f5506aeb6cea46d545b4c2276d27e  .sisyphus/customizer-recovery-20260910/boundary-additions.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/broader-stores-driver.log
9593c2aa9f464b1004b5c95bbcd4b56446c0e5fe0c19e4ff85447263a105769d  .sisyphus/customizer-recovery-20260910/broader-stores-status.json
f437cf9402b1df8c16cf334e34645a4e1caa43a7aebac2167a2a9ed3aee38fd8  .sisyphus/customizer-recovery-20260910/broader-stores.log
cd5fb3429940105cbea9d55014dacd8c37374333d55f974f8684decfb720af61  .sisyphus/customizer-recovery-20260910/browser-artifacts/.last-run.json
bf825eeb82843299a0e9040cbd0d5c574eb90a77f24b3fa7fdf2f82434d599db  .sisyphus/customizer-recovery-20260910/browser-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/error-context.md
ec341187730cd613e28130745f4870f85b8068913b7bf3b3d13d8a32d33e10cf  .sisyphus/customizer-recovery-20260910/browser-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/trace.zip
adf97d5aadf8b478ab3ed620e929288f3469f9ac5d99efe6cd9648ecf4101aea  .sisyphus/customizer-recovery-20260910/browser-artifacts/customizer-edit-recovery-u-4b397-independent-tabs-customizer/edit-recovery-mobile.png
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/browser-driver.log
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  .sisyphus/customizer-recovery-20260910/browser-final-artifacts/.last-run.json
f678332e651b9f38ceebf7eb83df4395c4efc8d35d37c3267de276632d223fc7  .sisyphus/customizer-recovery-20260910/browser-final-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/library-recovery-mobile.png
be53d1ced32ed9fa0992fd13df87914215839b9eda6b9a29d59506703eb9c724  .sisyphus/customizer-recovery-20260910/browser-final-artifacts/customizer-edit-recovery-u-4b397-independent-tabs-customizer/edit-recovery-mobile.png
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/browser-final-driver.log
8420ca134c25ae379a05731378a1b9b1bed3e964708f5052e0f03e09b2124d84  .sisyphus/customizer-recovery-20260910/browser-final-results.json
0e93854bf7a6b7665994b998c27edbce8cd02f6b7ca5f22192703098c1e4880e  .sisyphus/customizer-recovery-20260910/browser-final-status.json
61eb4bb684f6ba6f3df2b7f246e306078e03d7783ed51cf1b279a474cbf603e8  .sisyphus/customizer-recovery-20260910/browser-final.config.cjs
c76a157976bd47a99405187038f6ba9c38469d1d54f3e60fcfcbd2667c496c4d  .sisyphus/customizer-recovery-20260910/browser-final.log
e254b3aa6ca1ca00f0fcd8c02cac9233e4973a8999e85cd9e1f7660b2243d24e  .sisyphus/customizer-recovery-20260910/browser-reopen-artifacts/.last-run.json
5ff9844102068377a9e5c2dbe032912dc946229e216b48556f1019ef483aceee  .sisyphus/customizer-recovery-20260910/browser-reopen-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/library-recovery-mobile.png
9b7114870e57151839633b81cab1009bdf5b51c2dbe1518f3bb17194da4ea0d4  .sisyphus/customizer-recovery-20260910/browser-reopen-artifacts/customizer-edit-recovery-u-4b397-independent-tabs-customizer/trace.zip
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/browser-reopen-driver.log
77049bcbf0afef42fd10bd1f0987bec5d13bb9cabffcaf8c01280815105d5d6b  .sisyphus/customizer-recovery-20260910/browser-reopen-results.json
20ec2d182477034f94025f37e7f88b436411f69449a705c43805a0cce3ca0f59  .sisyphus/customizer-recovery-20260910/browser-reopen-status.json
ad4f42cd9ff8f61ac16c2afd141f8b3d9c17352c9d5753633754bc370a62c47c  .sisyphus/customizer-recovery-20260910/browser-reopen.config.cjs
94cd38b74e7fe251ad7c5fe3b04784d564a90029da5437062961bb4e340c189f  .sisyphus/customizer-recovery-20260910/browser-reopen.log
ffb6c46368370d2da425979316dd131f0031e312f109642b182573f358992716  .sisyphus/customizer-recovery-20260910/browser-results.json
acfefc650956fcbe7f029870b4e0927c69afc49b33daceb7c7ad8c6383170da5  .sisyphus/customizer-recovery-20260910/browser-status.json
a3a154a549337d79481c2827b8b976a8807205cd5a2c61330f8c300750c0e862  .sisyphus/customizer-recovery-20260910/browser.config.cjs
2e6966ef87c5126d0502aec5dde89efb352c7746edd50c7caa2c5fa6fa1813a3  .sisyphus/customizer-recovery-20260910/browser.log
a07663c339a7b0b71a806b85fd06baa00b21931ddef24e82349d7e31e01fc80b  .sisyphus/customizer-recovery-20260910/build-verification.json
20ddede78cfca038b35dcd0e921511430b2cca9641ac1416532dc85d56603f71  .sisyphus/customizer-recovery-20260910/build.cjs
d64f9d5fc7b0395f64003c5b54e5979d02ec7a8cf2a2cc4e129cb289243511d4  .sisyphus/customizer-recovery-20260910/build.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/controller-integration-driver.log
4c0ae4434760dc65d9ce6265f97250209ce8c71cd367af2aa0e70f264b7cccbc  .sisyphus/customizer-recovery-20260910/controller-integration-status.json
00cd4016be006dd7b9b6c1652f8c3fdfe1b3cc6f3ef1360e3786d7db9b3d2200  .sisyphus/customizer-recovery-20260910/controller-integration.log
f9ca2bf4b2c635ab32f02d1744c82bf8ac941650d4e23f294d83f0d9e502867c  .sisyphus/customizer-recovery-20260910/cursor-runner.cjs
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/diff-check.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/draft-library-comparison-driver.log
218914a3fd7c781e2c448a542e4e2c21771f4dbb99f1cbffa62546b88d9b5546  .sisyphus/customizer-recovery-20260910/draft-library-comparison-status.json
fda29a8c8a87da6d66502efbe9300c0cbe1fcce8f52a3f2c2f1d5fd878d00ef2  .sisyphus/customizer-recovery-20260910/draft-library-comparison.log
2ade8698804fcd2fe29c4811d23e5e6749a8e93ec749d838a3552ecf763ed14f  .sisyphus/customizer-recovery-20260910/failed-browser-cleanup.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/final-lint-driver.log
d03329684dfc908dc64b316231542c60a1e31c195fb4828d2978457b4903d9fa  .sisyphus/customizer-recovery-20260910/final-lint-status.json
bf705908e56ad3b034ad35760641b25dae63f2523bcd6d8a3cb40e1bb353b230  .sisyphus/customizer-recovery-20260910/final-lint.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/final-types-driver.log
b45ed89adea264f45e7bbe758a2d6425d89fc44f1fee9be1631cba8847d6b1eb  .sisyphus/customizer-recovery-20260910/final-types-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/final-types.log
8949eea91dab4fb6f7cbfe2650da952dc6e38e90a1ecab8605a51be176e4580e  .sisyphus/customizer-recovery-20260910/finish-dialog.py
4ddbfb3987dc589d6620e892f890621a8a1ed87758e1bfbc5d7ab8fc26706e76  .sisyphus/customizer-recovery-20260910/finish-integration.py
f1f5fec138b7d50ee3751b2b0cd206d54bf47f726561d4c8cd60819bb202b4e8  .sisyphus/customizer-recovery-20260910/finish-save.py
9df95ee4b6d8ffcd801c382cd9feeac61c8ce7a76b904f358d0a63a49856c10a  .sisyphus/customizer-recovery-20260910/finish-worker.ps1
c276b6021fa2d9fd781328f9f5d8683634711194503b9b2130d923433626f6ee  .sisyphus/customizer-recovery-20260910/first-build-verification.json
d75ef24dbd591eb6d0d7264c3e3b012749c644185a2063c224ce9ad28f8e1eb5  .sisyphus/customizer-recovery-20260910/first-build.log
440b61a33c9099385a826c2e28f12f7729dc1535a21e2e81aad6bfca0b427c85  .sisyphus/customizer-recovery-20260910/first-hydrate.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/first-paint-after-driver.log
9cc1908198f326367ee3561b8a92158c6ea7c8f48a7108c65f2f0c2ebd11ac13  .sisyphus/customizer-recovery-20260910/first-paint-after-status.json
4ef54a8094585fddd2af2c9421a1528a8a241bcb2aac2df101dd61f92b505dc4  .sisyphus/customizer-recovery-20260910/first-paint-after.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/first-paint-before-driver.log
15a10034430db1557e4c47b4c453e1f882e7cc4d734a04cdae1b5d8728011b40  .sisyphus/customizer-recovery-20260910/first-paint-before-status.json
14748ff2832b36b92557a610ccecb7ddfdc0b7f3c23401355013909179ee5f8e  .sisyphus/customizer-recovery-20260910/first-paint-before.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/focused-final-driver.log
3af01c87c26f3831fdb24786382ca464c00dd80795ebab59c144c88b466deffd  .sisyphus/customizer-recovery-20260910/focused-final-status.json
a5b2bbec2ca19d68ac038305cfe86e21895ce0e7d67967ec0e161562f8259c10  .sisyphus/customizer-recovery-20260910/focused-final.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/focused-stores-corrected-driver.log
49d9aacae4b27be711d9724496beb72e3f6c518301612974bfa0ff022c25e9e0  .sisyphus/customizer-recovery-20260910/focused-stores-corrected-status.json
e16c8b90f83ef65298a88fccbf9b7ca5cffb61f6db551b0965d4fe199a851a8b  .sisyphus/customizer-recovery-20260910/focused-stores-corrected.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/focused-stores-driver.log
33b7ac9a6cd9170d92e665e37d155cc8237856ad84ee799c8ea2450a7f4f3e42  .sisyphus/customizer-recovery-20260910/focused-stores-status.json
39afc912fa05827b6b9d4f45882a65e3d5c15d2b9e2ecd33166303db082b9ab8  .sisyphus/customizer-recovery-20260910/focused-stores.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/format-final-driver.log
72929118949f75b450e3c62f3f4f862424b57bd8df4bc2413cbdc1a8216ba76f  .sisyphus/customizer-recovery-20260910/format-final-status.json
3e5567b29bb4032151d865195a0f8738adb488e516703df44135c425c25c6f25  .sisyphus/customizer-recovery-20260910/format-final.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/grok-integration-driver.log
53909a1059ddf070c3920f14564504f1f95d3ab5cbac49b0822bef35784c6550  .sisyphus/customizer-recovery-20260910/grok-integration-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/grok-integration.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/grok-reopen-driver.log
33b1233120c0dbd5f9d46686a5929513118f3467df5de3c081a6fe39404597d1  .sisyphus/customizer-recovery-20260910/grok-reopen-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/grok-reopen.log
440b61a33c9099385a826c2e28f12f7729dc1535a21e2e81aad6bfca0b427c85  .sisyphus/customizer-recovery-20260910/hydrate.log
fe3ab85e2fcf0924a5c16491b11cd040fa294aea82855752acb7c53dfb3eb38e  .sisyphus/customizer-recovery-20260910/integration-review/PARENT-RECHECK.md
6caf29885f8125970c992841c2221d49debafe03da022fc6b46ea858ae821a8a  .sisyphus/customizer-recovery-20260910/integration-review/REOPEN-RECHECK.md
d47096a42c04d7a96a585ee0f308ebc6ce51b676a39351ba373f33a0dbfd9b4a  .sisyphus/customizer-recovery-20260910/integration-review/RESULT.md
9b373c51e676ec2f8acf4ce68ec76538f4e5923be2809eb8707a290e6b9f446a  .sisyphus/customizer-recovery-20260910/integration-review/events.ndjson
1ab3b3c1b4b7f811bdb8bc3214e7b2c50bee6a8088de83e2c2d14ad410b3146e  .sisyphus/customizer-recovery-20260910/integration-review/prompt.md
370db6285f6392ac7577c4c8c2e089a031a7e503ba04ed9fcc85b1fd1c584c30  .sisyphus/customizer-recovery-20260910/integration-review/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/integration-review/stderr.log
642610efd2b9501b7e3afa46c5d49cf3584aac6c958d98c2a76809635785e33f  .sisyphus/customizer-recovery-20260910/launch-check.cjs
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/library-comparison-driver.log
f2579078e95869e270fe5de4d50b17787468e93c8295aa44e175889ada275a7a  .sisyphus/customizer-recovery-20260910/library-comparison-status.json
c5bc8e7a7a51e1e848018d61816805eff7e9502a29c99a3ba0b970c5e7f8df82  .sisyphus/customizer-recovery-20260910/library-comparison.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/lint-final-driver.log
09fb690ccc30e722c3e2c292e771c52363aeccd2b7ea866d97c52a327ab04107  .sisyphus/customizer-recovery-20260910/lint-final-status.json
0db713cc07b45834d26b73cf9f90eeefa4b6c3d2b81a1408e290fd6c0320ba76  .sisyphus/customizer-recovery-20260910/lint-final.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/lint-initial-driver.log
1eb16c19043fb5e4be1044c3b97e6b054640719cde4cd266104e5967b489f8c2  .sisyphus/customizer-recovery-20260910/lint-initial-status.json
cd1e0962e1de479242f15aa268dae351b472d3b40e403b00266e134b6a5f11df  .sisyphus/customizer-recovery-20260910/lint-initial.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/name-authority-before-driver.log
cadad2f2168fc2c6ffeaa37586b254dfcb71a854afb9392d6ea522fa0b8276d9  .sisyphus/customizer-recovery-20260910/name-authority-before-status.json
fa3c959e38c5d3a4e4a743776bf797a1a3c58e60d592b4191fb65c052eba484e  .sisyphus/customizer-recovery-20260910/name-authority-before.log
73276253e10fa361bfc5e7dbf5468ec641c62f314b9c5225bfecf4fbea8c4911  .sisyphus/customizer-recovery-20260910/owned-files.json
d9badf82d2366030239a5cbe0962647a3a5ebeb66f193270250304e56cb6b185  .sisyphus/customizer-recovery-20260910/owned-format-check.log
05219ef5e852734ee23da4ab24946ee16c1599f5b0725c944fe2e0a60da54439  .sisyphus/customizer-recovery-20260910/parent-review-pending.md
2c8211ada6eb03a2b1b61d688b8e6183fbd7ed08d1f9963c5e7aebee9073ec97  .sisyphus/customizer-recovery-20260910/preview-server.json
858d0a416c95bddc090a2b90c95a436b998966205540ecc8cf1a3caa3c7405b1  .sisyphus/customizer-recovery-20260910/preview-server.log
554c90264e3b873b24f689e2c93c99ae7a9976974057fe332bdc4d565fefe82d  .sisyphus/customizer-recovery-20260910/preview-verification.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/production-driver.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/production-final-driver.log
99a0e05213f99e4a288b84105c01142ba82f989331395b897025d15397940553  .sisyphus/customizer-recovery-20260910/production-final-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/production-final.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/production-reopen-driver.log
59da7f642e6395ce1073a01c89268844523dd5d8eccb7a186679b90c7fe594cc  .sisyphus/customizer-recovery-20260910/production-reopen-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/production-reopen.log
7bcbd13d1226053b33a0769cfb1ef9813f4e32aafb5033f2279477ab699ad64b  .sisyphus/customizer-recovery-20260910/production-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/production.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/recovery-boundaries-after-driver.log
4eeeb54778c938ecc5dcd5a712d897e70de9c33d9899ed1c7f8b22954dc7fc91  .sisyphus/customizer-recovery-20260910/recovery-boundaries-after-status.json
e181cd30ac950b4e439f4d81e1137fd83aeb0683eb28bd545b261f30168acca8  .sisyphus/customizer-recovery-20260910/recovery-boundaries-after.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/recovery-boundaries-before-driver.log
4864e4167586848340b4455af1240228c4f4e98b4d31ac90acba9701dd8db1a1  .sisyphus/customizer-recovery-20260910/recovery-boundaries-before-status.json
b1729c969ddb4a2b0dfe193bc5691edde1afc4e786cb4157aee915bf5daaa701  .sisyphus/customizer-recovery-20260910/recovery-boundaries-before.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/recovery-focused-corrected-driver.log
62437a73afe5c6567add8b6e0d4a1900f17d323151566d7f34d4b511b024cc38  .sisyphus/customizer-recovery-20260910/recovery-focused-corrected-status.json
bbe64698387ceec4a89bc610ad05ef00c215be0dfd1fa8ac77e03e3c4b5d5c79  .sisyphus/customizer-recovery-20260910/recovery-focused-corrected.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/recovery-focused-driver.log
3f18067400ed4c5943a27d86697d7b4f410b6c4fd109e2f101e02c8826b0d17b  .sisyphus/customizer-recovery-20260910/recovery-focused-status.json
ba9e723b0882ca5eabbac1a496251ecfe80448e0a05f44ca2ebf837c14e07cff  .sisyphus/customizer-recovery-20260910/recovery-focused.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/reopen-lint-driver.log
867ee10eb21637030e8608a2ef7b3403403febdd50924830c563cc0b48c3aa87  .sisyphus/customizer-recovery-20260910/reopen-lint-status.json
9bf6391c1793c4d44eca57abc0abf0805cfbf09a7d4037c306705bcfa3e5d8d2  .sisyphus/customizer-recovery-20260910/reopen-lint.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/reopen-types-corrected-driver.log
c8613efd6c377f5df1c8919d66c912b02262d152f8df0196f1f9d73833f556f4  .sisyphus/customizer-recovery-20260910/reopen-types-corrected-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/reopen-types-corrected.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/reopen-types-driver.log
352f4810882bd55fc4f01768e2f7d7252bc67ecebe122f9dd8f1c43328aa351c  .sisyphus/customizer-recovery-20260910/reopen-types-status.json
bbd22142fbf8c2b3a1e14b62e09611590fcd5d2f45314e81da134095ee2ad12d  .sisyphus/customizer-recovery-20260910/reopen-types.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/repeated-save-after-driver.log
566eb82b266b12e05f65291a030b16833bdafe776270240c5e6ccadb9cdcb516  .sisyphus/customizer-recovery-20260910/repeated-save-after-status.json
e40d5a02e5bdd9b8238d11ba01f5d6c5c533671bf22d570c3c7c577c4953ef32  .sisyphus/customizer-recovery-20260910/repeated-save-after.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/repository-format-final-driver.log
84eba2b58ce06d81dded4e830be53bcf30bbd1c7ff39fd1cd2ad7e63edab378e  .sisyphus/customizer-recovery-20260910/repository-format-final-status.json
0faa4ff76ed06980ccfd2c819ca5ed805c2bc113e47650f9f22812afe8bf9921  .sisyphus/customizer-recovery-20260910/repository-format-final.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/restore-final-lint-driver.log
51eed93d11cf8a473c09226cc513a0327029d13c6b90f1250a9bdb43ac2e8169  .sisyphus/customizer-recovery-20260910/restore-final-lint-status.json
b1f9ab5ecdcf5d58da07f1fb006a301928eca1000c196c916724c560003d2328  .sisyphus/customizer-recovery-20260910/restore-final-lint.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/restore-final-types-driver.log
08b2d1a96fd115ff4d6bb9e0e571f1ce69c353c1f2fef4c6e7a67d15e8d7e384  .sisyphus/customizer-recovery-20260910/restore-final-types-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/restore-final-types.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/restored-ids-after-driver.log
eb2d9bcb171a3d91ea081454b71751ed260ba35239234a0f2dc6c3160008b73d  .sisyphus/customizer-recovery-20260910/restored-ids-after-status.json
901817c1efe4a0b50b0c15f4fa5b19fde42193dfd4ea31cb519e0753e0dbef03  .sisyphus/customizer-recovery-20260910/restored-ids-after.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/restored-ids-before-driver.log
6544d2e9164bcba3df93e2a40d85a8db150055b3f591354035532f5656618634  .sisyphus/customizer-recovery-20260910/restored-ids-before-status.json
4c1022110599760d43b780cb8e8d17abfb3fa71d386356c607475381f2efae0f  .sisyphus/customizer-recovery-20260910/restored-ids-before.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/review-regressions-driver.log
807e46974fe7ef3da6b5f9248b6dc5837a5dfc52584af74f55a722e165b3ba81  .sisyphus/customizer-recovery-20260910/review-regressions-status.json
bd7c4f66f9c3cbb20a77974d1f7be41ff4c0c7f98b499cb08d2a70923a2cb73b  .sisyphus/customizer-recovery-20260910/review-regressions.log
431057dfc25d5b46109f779da2bd93a571222f5afa91fd5a5ffe01602921d789  .sisyphus/customizer-recovery-20260910/run-check.cjs
97f35fbbf6d5372121f0d1e8856c79d3840fd2924d498c269f3ed84c8477fcee  .sisyphus/customizer-recovery-20260910/runtime-inventory.ps1
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  .sisyphus/customizer-recovery-20260910/runtime-tests/mekstation.db
fc0e704230aeeabf25345f817b4e25d70021343e02df9a911e789f64608e1d7f  .sisyphus/customizer-recovery-20260910/runtime-tests/mekstation.db-shm
a149f9478bc46b8bed59357d63f7adf5380af8f81905941c683fc1009da3de7b  .sisyphus/customizer-recovery-20260910/runtime-tests/mekstation.db-wal
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  .sisyphus/customizer-recovery-20260910/runtime-tests/multiplayer.db
8820d77803a4907890b702d4f87ccefe63ed25642bbf209d3f1114cd2c63d11d  .sisyphus/customizer-recovery-20260910/runtime-tests/multiplayer.db-shm
7206da7b1e8abf58005d1f27dcab16941e9016ac81abc49d90e9793dc3ef5da2  .sisyphus/customizer-recovery-20260910/runtime-tests/multiplayer.db-wal
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/save-final-lint-driver.log
2adf752b105f3f6428f32277b24ad65928ef7c08fd22afafc656bc22b7c4afab  .sisyphus/customizer-recovery-20260910/save-final-lint-status.json
0f1937e3e383f83b7b43ea6db32088bdeb28e20538c642d8697a368dd44c2f29  .sisyphus/customizer-recovery-20260910/save-final-lint.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/save-final-tests-driver.log
65af9c6fdf50817c11ea2405f602d16c85cc86bab36e1fbe8d376c199224b7ea  .sisyphus/customizer-recovery-20260910/save-final-tests-status.json
02b8f734529ab7b1ad21c77d0a3f7e0296d515727394b46e3bfa5968c01754ef  .sisyphus/customizer-recovery-20260910/save-final-tests.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/save-final-types-driver.log
92908f2c7a59030a2321763d956048b4809a4d16c6d6ed8b6bd8042741085323  .sisyphus/customizer-recovery-20260910/save-final-types-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/save-final-types.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/save-open-before-driver.log
c8dc78275cbea5563e1626524380addb567c8f9f4f47905dc452951ad3385875  .sisyphus/customizer-recovery-20260910/save-open-before-status.json
bf8de0d27d0953b89a26396785cff88609332fd554fc6aff6e31544df6da784b  .sisyphus/customizer-recovery-20260910/save-open-before.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/save-race-tests-driver.log
0d0a0d6bbd9106f917b47785ce0368ca32deeb80c4b02923a4252a195f1ed454  .sisyphus/customizer-recovery-20260910/save-race-tests-status.json
5207ce7563ccae4bd8d0df1cf97296dc1fed3001a691ff18585aaaf6081d8364  .sisyphus/customizer-recovery-20260910/save-race-tests.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/save-receipts-tests-driver.log
ab041d74123fce6a96cf0319630dfa609456e6615534fe68bb0a627aa20d4771  .sisyphus/customizer-recovery-20260910/save-receipts-tests-status.json
58b45c71ce3b793846a8896fcd07790a8ef576bf2626ab1b43b43d4afd0b8c64  .sisyphus/customizer-recovery-20260910/save-receipts-tests.log
a640ffb68b8406ddebf68d4cc75e323ab6c3e15270d8a61ef48d5d12a5a8ae51  .sisyphus/customizer-recovery-20260910/second-build-verification.json
2ff9d6b0e0e7e8ed03d391d16f111cb928560a27aa4bfbfd12f19d889fd436ef  .sisyphus/customizer-recovery-20260910/second-build.log
440b61a33c9099385a826c2e28f12f7729dc1535a21e2e81aad6bfca0b427c85  .sisyphus/customizer-recovery-20260910/second-hydrate.log
09f9a9422c61bcc3957166d1645f145c1009f362e08c9c2ced55282b3916500a  .sisyphus/customizer-recovery-20260910/server-rebuild-stop.json
356cac62008eb459c2c8ce98faffa83b52239af1d25f722fef5921f084858276  .sisyphus/customizer-recovery-20260910/servers-ready.json
b96b70232e0369c6f97f1c37bb7995ee7333913be62a5e8557544d94509f770f  .sisyphus/customizer-recovery-20260910/source-fingerprints-final.json
22462a3c59af6eafd11cc69c32916ac34ba80b50c879c456b0714e98eb32e5f2  .sisyphus/customizer-recovery-20260910/source-fingerprints.json
995953a06597b77e6e5a9ae023835cf28b297681af38decb192157aa18d64185  .sisyphus/customizer-recovery-20260910/spec-validate-final.log
ebb3ab939fcd90a00765cab1860ed82cd767473a3b343ba429a2a0ccf14fe19e  .sisyphus/customizer-recovery-20260910/start-servers.cjs
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/status-history-driver.log
ac6e97d203218a34b603d3affad0601406c425797ed3529eb0223f0e22bea023  .sisyphus/customizer-recovery-20260910/status-history/events.ndjson
d7901eb6bc83ce1510f3bd718610e5453be816328788341eb2d92edd84f59790  .sisyphus/customizer-recovery-20260910/status-history/prompt.md
61c4c67edb4687faed0652dd00896532c3395f25f787b16f956450ee86c9f58c  .sisyphus/customizer-recovery-20260910/status-history/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/status-history/stderr.log
3be227ac6c302affbefd5c88ce6c5d9ffdb718993cb572bc95ddd245d1aa42fe  .sisyphus/customizer-recovery-20260910/stop-check.ps1
a00b86a25ac7edbf8d6810eac3594aa2bf3517b2533dfb7ff0120f8be7a5b8de  .sisyphus/customizer-recovery-20260910/stop-servers.ps1
20ee37b4c1eb18678b33443ecb4417ec8173ab5e66bd0cb03f0278a610304b74  .sisyphus/customizer-recovery-20260910/stop-test-server.ps1
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/store-failure-proof-driver.log
e381cf4feec424832908f77a3a23da68d0dc1c4b46a3b4023f2826e7c9cd4a00  .sisyphus/customizer-recovery-20260910/store-failure-proof-status.json
befdd514b14526372a11ebf0f770dd10ed88554c8b4413de4cc33d3aded70d32  .sisyphus/customizer-recovery-20260910/store-failure-proof.log
59782fea29f10833f92f824a6dc8f639df74235032438a98ab9083fc0b58149d  .sisyphus/customizer-recovery-20260910/store-tests-status.json
8b3d1ad9e7177a73b582c43eb0b43ccdd23a5845e26d35652ef168de490cfdb9  .sisyphus/customizer-recovery-20260910/store-tests.log
0765d323b2965f5d9efe1da427f26c61ffa46c9481a85556fe8134e0fe8a7a37  .sisyphus/customizer-recovery-20260910/test-library-clean.json
da3994e1b1f3878a8caad42774d2a54b2f789983781443ffc0e8014595f2e12e  .sisyphus/customizer-recovery-20260910/test-server-cleanup.json
54f692ed6fb35c2ca71e17d54fc3c822532517e7cd42ae940e445cf6c2765af8  .sisyphus/customizer-recovery-20260910/test-server.json
32bd51ed8a1428ecb0b5baa053e1c2c6d36e520d3f1bc0a40744c6cb91c4086d  .sisyphus/customizer-recovery-20260910/test-server.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-browser-tests-driver.log
ee655abc85b15221e954f6ce3859413b6f22e69c0950ba7848942ac4bc4e1620  .sisyphus/customizer-recovery-20260910/typecheck-browser-tests-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-browser-tests.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-final-driver.log
569fc82bc93f08d86f5664de6a6168eb34124978bfb475e537b6cf13e87395de  .sisyphus/customizer-recovery-20260910/typecheck-final-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-final.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-initial-driver.log
43b60fef7ee639c4705499d9d4517b6785fa1218c6198dcef08e44dc4a88f516  .sisyphus/customizer-recovery-20260910/typecheck-initial-status.json
ad86ff8b917412d84e5b974c921333bfd3a1dd3d148b43b42a9144e407a70eaa  .sisyphus/customizer-recovery-20260910/typecheck-initial.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-integration-driver.log
8a8706d648060dbcb36e367f84ffc0408adaf4552696d53dd90e72dab9f32859  .sisyphus/customizer-recovery-20260910/typecheck-integration-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-integration.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-second-driver.log
e8373384051ab62c2c836b4481f5585d431cdaf3e5352c2c044eb18d7ff1f8fb  .sisyphus/customizer-recovery-20260910/typecheck-second-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-second.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-third-driver.log
856ac45b7b276b3c5b5a50e124d5401b94caa2f960c9aa1d4f83b2d502865b89  .sisyphus/customizer-recovery-20260910/typecheck-third-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/typecheck-third.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/undo-recheck-driver.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/undo-review-driver.log
51dc32b53893e0296014c4c20f6865aa0b5b56414c847b5ee25a1edc8ddf710e  .sisyphus/customizer-recovery-20260910/undo-review/RECHECK.md
bc6871d2594a81867e0b0d69dfb7722453dafffe700baef694cac23f5f2b4132  .sisyphus/customizer-recovery-20260910/undo-review/RESULT.md
3548ade31a7263d8e0bba843a8599dbfca327605e91daf4e71627a9ca8d8bf3b  .sisyphus/customizer-recovery-20260910/undo-review/events.ndjson
aed6582631cd3dfa0c9d54e38ca73df40086fbf7bcf969125d377a555fc8d138  .sisyphus/customizer-recovery-20260910/undo-review/prompt.md
adaff9558f414216616c48838fd0d3f46741096b65bf39fe8f63e83ef9c447de  .sisyphus/customizer-recovery-20260910/undo-review/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/undo-review/stderr.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/unit-acceptance-driver.log
7281e0744859538aaaf87e8e0d782a95619be06794b03bcea49ece28002c5273  .sisyphus/customizer-recovery-20260910/unit-acceptance-status.json
069c2af962c84764b75449f5a1ab8e045373f62e94437c4cabd879c43baa74b2  .sisyphus/customizer-recovery-20260910/unit-acceptance.json
d455b21dad285c8db5f05993aa17c23eeb0af778e119e42e2d3231518beeb2fb  .sisyphus/customizer-recovery-20260910/unit-acceptance.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/customizer-recovery-20260910/unit-final-driver.log
9b07ffcec7b19b63c22b89718bf140f0ab4c129af4d8baca8de3e0eeea4a24b8  .sisyphus/customizer-recovery-20260910/unit-final-status.json
25fab9bcc2a48f23df20a81765ce21a96721bb55fe7bc86075a37503e33a8d92  .sisyphus/customizer-recovery-20260910/unit-final.json
d5994afe0bfe1e116d1af7c8a03f747a66925faf7dab47d435a54df4ce8097ae  .sisyphus/customizer-recovery-20260910/unit-final.log
2adfecb69721fd33609196258aef6a013360dd62f1e30247fd7d1639dd3af9ab  .sisyphus/customizer-recovery-20260910/wait-ready.cjs
```

## 5. Safe to delete

Not reconstructible from git: the 6 Playwright artifacts under `browser-artifacts/`, `browser-final-artifacts/`, and `browser-reopen-artifacts/` (4 screenshots, 2 `trace.zip`, matching a "selected draft" and "independent tabs" scenario) are the only binary/browser-trace evidence in this folder and are not duplicated elsewhere in the repo; everything else (logs, `-status.json` driver records, `.cjs`/`.py`/`.ps1` worker scripts, and the markdown review lanes) is plain text captured nowhere else in git either, but is reconstructible in substance from the shipped audit doc `docs/audits/2026-09-10-customizer-edit-recovery.md` and the merged `add-customizer-edit-recovery` OpenSpec change/spec files, which record the same pass/fail outcomes.
