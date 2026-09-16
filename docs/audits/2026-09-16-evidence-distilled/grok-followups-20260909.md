# grok-followups-20260909

## 1. Purpose

Workspace for a Codex-supervised wave of non-3D follow-up repairs on the customizer/combat surfaces, executed by four "Grok 4.6 High" repair agents (via Cursor Agent, `cursor-grok-4.6-high`) working in lanes on the shared checkout at baseline `main 45a94017`. From `COMMON.md`:

> "You are one Grok 4.6 High repair agent supervised by the parent Codex agent. The user explicitly requested parallel repairs through Cursor Agent. Work in E:/Projects/MekStation, baseline main 45a94017."

From `COORDINATION.md`:

> "Parent: Codex. Delegated execution: Cursor Agent, `cursor-grok-4.6-high`, live init verified. ... Shared main checkout; no commit or push requested."

The coordination log lists five completed lanes: browser harness repairs (customizer test cases), small regressions (ActionBar keyboard contract + a service-worker/production-callback identity bug), simulation timeline (react-window update loop via a memoized unit-name resolver), unit navigation (a production routing regression), and saved custom combat (server-saved biped BattleMech admission, immutable `GameCreated` construction, SQLite recovery, replay/fog-privacy). A sixth output, `docs/audits/2026-09-09-customizer-functionality-review.md`, is a read-only customizer functionality review. This folder's work fed `openspec/changes/enable-saved-custom-unit-combat/REPORT.md` and two audit docs (see Cited by).

Date range (file mtimes): 2026-09-10T03:26:37Z to 2026-09-10T06:08:05Z. (The folder is named `-20260909` but every file mtime observed falls on 2026-09-10 UTC.)

## 2. Cited by

`git grep -n -F ".sisyphus/grok-followups-20260909" -- ':!openspec/planning/2026-09-12-roadmap-completion'` and `grep -rn -F ".sisyphus/grok-followups-20260909" openspec/planning/2026-09-12-roadmap-completion docs` together found these citing files (the same lines appear from both commands since none are under `openspec/planning/2026-09-12-roadmap-completion`):

- `docs/audits/2026-09-09-customizer-functionality-review.md:17` — "Browser evidence: [read-only review ledger](../../.sisyphus/grok-followups-20260909/customizer-review/readonly-review.json), [desktop overview](../../.sisyphus/grok-followups-20260909/customizer-review/overview.png), [equipment details](../../.sisyphus/grok-followups-20260909/customizer-review/equipment-details.png), and [mobile equipment]..."
- `docs/audits/2026-09-10-non-3d-followups.md:18` — "All **21 browser scenarios passed**, with no skips or retries: [browser results](../../.sisyphus/grok-followups-20260909/final-browser-results.json)."
- `docs/audits/2026-09-10-non-3d-followups.md:23` — "Complete stable suite: **35,061 passed, 16 skipped, 1 failed** across 2,651 suites (2,650 passed). ... [Exact totals and failing assertion](../../.sisyphus/grok-followups-20260909/final-stable-summary.json)."
- `docs/audits/2026-09-10-non-3d-followups.md:25` — "Detailed local evidence: [acceptance ledger](../../.sisyphus/grok-followups-20260909/COORDINATION.md), [unmodified-production navigation proof](../../.sisyphus/grok-followups-20260909/final-navigation-proof.json), [build verification](../../.sisyphus/grok-followups-20260909/final-build-verification.json), and [durable recovery output]..."
- `openspec/changes/enable-saved-custom-unit-combat/REPORT.md:16` — "The [follow-up audit](../../../docs/audits/2026-09-10-non-3d-followups.md) records the complete stable-suite result... Original worker reports and execution evidence remain in the local `.sisyphus/grok-followups-20260909` directory."

**All five links above will dangle once this folder is deleted.** Both citing audit docs already state the `.sisyphus` directory is local/git-ignored, so the loss is expected by their own authors — but the links themselves are not fixed up.

## 3. Key results

From `FINAL-ACCEPTANCE.json` / `final-stable-summary.json` (identical figures):

- Stable Jest suite: **35,078 total tests, 35,061 passed, 1 failed, 16 pending**, across **2,651 suites (2,650 passed, 1 failed)**. `success: false` — the sole failure is `scripts/__tests__/qc-registry.test.ts`, assertion "QC registry validator reports app-shell route coverage as an on-demand QC slice", attributed to an unrelated concurrent task's new `/compendium/chassis` route.
- Browser (`final-browser-results.json` / `FINAL-ACCEPTANCE.json`): **21 passed, 0 failed, 0 skipped**, build `1789018854161`.
- Focused Jest (`final-focused-jest.log`): **88 assertions passing in 17 suites**.
- Static gates: typecheck pass (required 8GB Node heap — the default 4GB run in `final-typecheck.log` exhausted memory and produced no result), production build pass, lint pass (81 pre-existing warnings, 0 errors), owned-file formatting pass, strict OpenSpec pass. Global formatting reported only 13 other-task model/chassis audit files as unformatted (explicitly excluded from this lane's scope).
- Sub-suite logs cited in `COORDINATION.md`: `combat-privacy-fixed.log` 16 tests/2 suites pass; `combat-replay-jest.log` 35 tests/3 suites pass; `combat-launch-fixtures-jest.log` 8 tests pass after a fixture fix; `final-durable-proof-jest.log` — non-stock armor, full weapon data, library deletion, second-database reopen/recovery all pass.
- `final-navigation-proof.json`: unmodified production bundle selects Atlas after Locust, 1 service-worker registration, 43 React commits, 0 pending lanes — proof the routing fix needed no response patches or dependency mutations.
- `productionSourceChangedAfterBuild: false`, `otherTaskFilesUntouched: true` — self-attested non-interference with the concurrent 3D/model-library task sharing the same checkout.

## 4. Inventory

395 files, 91,073,256 bytes total.

```
5fa7d95476989ad1154165af267c0c2fa3ca4ed32d0add6010cee31a4f2d6b2d  2518  .sisyphus/grok-followups-20260909/COMMON.md
fba77109c8a142d8290031289994ed77cf2e0132d79c4f9c41c13fe7abcbb6c8  5978  .sisyphus/grok-followups-20260909/COORDINATION.md
d9dd04f86c0f65c6796fb60675fc6236f98b548e27ae1d9845dee706a7f732ad  1111  .sisyphus/grok-followups-20260909/FINAL-ACCEPTANCE.json
a9f5ac9574474244a2621380249690cffcc36b157e1fcd1d5c0939fac3f3a50f  3689  .sisyphus/grok-followups-20260909/accepted-files.json
724898040d6cb5572ea8ba9c9872a25eded92440e0bb3db7bb2d933207d3a808  145  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/.last-run.json
9e7cfd298038b0e6a14cb5b9453484e1d84c29d275c92cf8066528419dc49636  792  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/error-context.md
80c90119d18e0a9c10573fbe2ecee1e6ce2511ba3bbc283003705aafce44f828  65364  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-dashboard.png
9b7b1b3533ec1ddad3373a8639c8fec214746118e972c3bdcc7b12daebb894a6  1448958  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/trace.zip
bace2d49190c924870bf1f4cf6a4ac75f0a5e40302b8ed3810606769bacc4e26  792  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/error-context.md
a8bc849e58927a2746b43a63424e2d90b73225d21b8d0ad4664298b5c3bc45ac  65854  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-dashboard.png
9d918875d05f3f056b1b18eb4f45054b9704848188e808ef80a142c6a9fd5110  2254330  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/trace.zip
e508a32f6ec13c8f737d6e994f2589e55f915e68cccbacd0224b15edf01042e8  41679  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-add-unit-Add-un-da4ff-ings-in-one-flow-customizer/add-unit-catalog.png
ac294b4eed8d1228e7e657a8b2ede8fd0f8fa8fa139840bb9e1561b465b8eddd  42275  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-add-unit-Add-un-da4ff-ings-in-one-flow-customizer/add-unit-phone.png
0281d351382ee5aed7a98c9ea56e999244a6c6c1012b91aa6af64a83c770a003  27440  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-add-unit-blank--133d5-h-catalog-failed-customizer/add-unit-failed.png
e14ad13d3217157b6324b9383624617c41489ab285501fd8a8b6275289527d1f  25066  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-add-unit-blank--3ffd1--catalog-loading-customizer/add-unit-loading.png
c2167c238d0d11a5a08c433693685f00685c45b412b8263b47d373e79ec87a0d  9034287  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/customizer-quad.pdf
5aafe97e4112bf405af0fb203e7c747d33158cf39353443610ec43f0661748d2  71635  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/overview-desktop.png
3a54e9aea507f09f37e378fbba1aab2b9398c59d9c7ccb5676a87f011856e72b  48959  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/structure-mobile.png
e0d0cb5eeb42ca20ec540445e0172c130177d79fe50a5ef334fb9898043262ac  9745  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-data-flow-fixed-ceadc-inline-inspector-customizer/fixed-omni-inspector.png
f3f9dd9886a24ce904afddd9e8d97b0ead8d0f8d5fca982063ad38f260d82072  83652  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-data-flow-libra-5e495--the-same-design-customizer/fluff-desktop.png
558956549a2738ba6b1f3fff6aa7319c1ca7b7155ae2d4583de68b10cf79b095  116202  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/armor-desktop.png
e7aa736391c5d7ed636d320e9ef5ce606f0cec36779e365e41093358aa186daa  128627  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/critical-slots-desktop.png
f78c06082189b8febee3f081bffcd197df8ce8e9d6d530293c9e13c7f04014b4  99727  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/equipment-desktop.png
5813baeb0d86ffb7be7e227e19cfd6be20c96e191f70455dbfb7da1039fa3d9b  82375  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/fluff-desktop.png
21a0aa56b2902d67a3923b0da78a7400ebc1f84e16c3075d81ef2ae17eec9f9b  72195  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/overview-desktop.png
ea9ac370ae400d6d9884cbdb7fc6797cc8271b7838255c460a23cd0dc1627450  122341  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/preview-desktop.png
6edbfeabf192652d3359711c8e00e717fcc4427692b5771fcdf01c811a38f62b  105037  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/structure-desktop.png
8fafa62108ec40351592f12f5ca5042a59860e4b6841e12eef16c39570d8bdf1  60372  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/armor-mobile.png
1ee76a0734cb0e30f1569977a2e239435f5bdc8c3dfad0d201568a197e45538e  34807  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/critical-slots-mobile.png
8d163bd03e8ea2a200cefbc538f644e4a95c69b1a9b9ff04b80e1b0a658924f0  48361  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/equipment-mobile.png
f0ea6b8f64be5c9d179ba071b257c4c61ab922870fd6d7f629d0e97936e47b89  40330  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/fluff-mobile.png
874a5bf6d315a54a42e4eb262288d2eaec1574230f960d8360c2f5b88cf147ed  31075  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/overview-mobile.png
4f0000e3ff00a76bf78c8715e5b58a73c8589f7c34801681a8c695496999b3e6  43626  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/preview-mobile.png
36cbeeacbc28099ffe6d98505f5e952b34791e5ab89e8c93e0c50dd7ef8c3aea  41795  .sisyphus/grok-followups-20260909/browser-baseline-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/structure-mobile.png
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/browser-baseline-driver.log
a824675f7d888c4dbbb552be12fd1c86e7b601c97ef087ef55f3be91b026993d  52678  .sisyphus/grok-followups-20260909/browser-baseline-results.json
37d2a66ed6b2dff53db68bde252f960a48f322f954e29fb95779f1fa5a9eecc0  693  .sisyphus/grok-followups-20260909/browser-baseline-status.json
dbeb9a434dddf2f4afe5f4aa6bac0a4df9fea124acce53cb75d31628014c315d  666  .sisyphus/grok-followups-20260909/browser-baseline.config.cjs
bce513f36d5145f02a85c3e10001065e8b7f3ba08a3726e11b8ce81ec58c1959  6012  .sisyphus/grok-followups-20260909/browser-baseline.log
7ae4aaa36e6fa03f2b84b3e5b7af824e226bc4e21e924f13825d714c3362b315  1359  .sisyphus/grok-followups-20260909/browser-test-repairs/NEEDS-PARENT.md
c5acc54f107c06c1388ed16a507368c55333cb52a4d92db9ba159528fe237b6a  915  .sisyphus/grok-followups-20260909/browser-test-repairs/PARENT.md
8e98fd36292ca1e9c0773bb7248142440a1e6d9c4f4a679722f52b6c89336829  400  .sisyphus/grok-followups-20260909/browser-test-repairs/PROGRESS.md
4acb5237efe68d5f8001da5ce49f7452a50eced7efe5e1a53b3d1ec8341bb10a  3217  .sisyphus/grok-followups-20260909/browser-test-repairs/REPORT.md
b11dd340e1b07f33247b10cd430a7a303020d3b37d7e3f4ce2154a8eedbb0b43  2368  .sisyphus/grok-followups-20260909/browser-test-repairs/SELECTORS.md
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/browser-test-repairs/driver-resume.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/browser-test-repairs/driver.log
310b7ebf82d3b472531ed1a05055733b6790d20fa7a9f38b0b8835aab06812ff  638025  .sisyphus/grok-followups-20260909/browser-test-repairs/events.ndjson
61d8bf4d9df72b87ae49a7b96147f35e79066c00013d274cb6cff96ebec42481  1295  .sisyphus/grok-followups-20260909/browser-test-repairs/hash_compare.py
0a85b2837d6e0cfde212708b88bdb2a29fb3a205cbfa51e490be37727d11d6e8  945  .sisyphus/grok-followups-20260909/browser-test-repairs/playwright.config.ts
5204cf29b9533796b1c6801fdc14d91ffd01b68eb042bae0df7f71e2d54a9fc4  4146  .sisyphus/grok-followups-20260909/browser-test-repairs/prompt.md
4392cb162584d117624aba3a0de93b0da784872f7f4fd439f41ac7ba3e2d8bd1  233  .sisyphus/grok-followups-20260909/browser-test-repairs/run-tests.ps1
b5b36038c17d428592175436586e6b35e6b03479ec3943f751fe9300ef16456f  4030  .sisyphus/grok-followups-20260909/browser-test-repairs/saved/baseline-customizer-ui-test-repair-20260909.md
5c340a5d4e278ef5defff16ec5c06cc9368f2f7a01b5d7c94a50d8e83caed156  5607  .sisyphus/grok-followups-20260909/browser-test-repairs/saved/customizer-add-unit.spec.ts
2705d74586275c4ba638f9e5e0aa85956cdd88ad051b4ff3442c8a0d33f1cfa3  15954  .sisyphus/grok-followups-20260909/browser-test-repairs/saved/customizer-data-flow.spec.ts
e51b1b2c6e7e7ba42d26cf8297d72a5baecf99d9e49bd2c2ec0e1d7679f52bc7  5464  .sisyphus/grok-followups-20260909/browser-test-repairs/saved/customizer-design-revamp.spec.ts
a23fb695d62af0fb8850f2b6cd3b361d6923433ad1ae417a53f6f973eddf57d3  303  .sisyphus/grok-followups-20260909/browser-test-repairs/status.json
d2b36c2d28d9706015397cd23ea4ee5fd467acd7680c756de72ee0fa49a6c56f  133  .sisyphus/grok-followups-20260909/browser-test-repairs/stderr.log
6b7d9438edd0b51947134c38bf4416260aace940d3a5d66fe9d1f9ef1fd0694c  624  .sisyphus/grok-followups-20260909/combat-authority-jest-status.json
18864552eb5854194473a3cef0627dd5a186dd721bde150a499b8befa404938d  2192  .sisyphus/grok-followups-20260909/combat-authority-jest.log
10e7f7f4f315b5e4628e44cac2acc752f50cb584684378e31b864dc4df58c9ca  13718  .sisyphus/grok-followups-20260909/combat-backup/src/components/gameplay/pages/campaigns/create/CreateCampaignPage.RosterStep.tsx
53d0f68ae0074f9a6a721e1d79d3b8358860b3af38eafefbd69cc49b97b07aae  2160  .sisyphus/grok-followups-20260909/combat-backup/src/engine/InteractiveSession.recovery.ts
fff3a83c3732637bfa12f66611868266fb895c134f83eb0274dc0def2830caf6  10905  .sisyphus/grok-followups-20260909/combat-backup/src/engine/InteractiveSession.setup.ts
0df3e9be9cd0a17e224d978fc93e691429634dcabac459ed69c823b99d0fecf8  28227  .sisyphus/grok-followups-20260909/combat-backup/src/engine/InteractiveSession.ts
d2381f21f5e93b0395bffbc8ce80310326c39b24526ca341c692dcc5fd2817c7  14147  .sisyphus/grok-followups-20260909/combat-backup/src/hooks/gameplay/useUnitInspectorProjection.ts
e27d48acdfb3a894351ff552efbbffe907bd3532249119004886cc98566231d8  7732  .sisyphus/grok-followups-20260909/combat-backup/src/lib/campaign/readiness/canonicalCatalogAdmission.ts
0783009aabc5385f48ebc184f7c37184de287007b40fc3d9f53576123ca7e7e6  664  .sisyphus/grok-followups-20260909/combat-backup/src/lib/campaign/readiness/useCombatCatalog.ts
bbc9b00d083745f56626456c8d3d60a500e63d052caf34239c74dafc4e429118  5381  .sisyphus/grok-followups-20260909/combat-backup/src/lib/events/replay/CombatLifecycleBaselineSchemaPack.ts
613f202fc18922f7c7fa45d3eeba866afc6694d19fc39c283e156377fc9fab54  21772  .sisyphus/grok-followups-20260909/combat-backup/src/lib/events/replay/CombatLifecycleSharedSchemas.ts
929de94c2ab7b38aa549cc1f39ec4f668f9ec5b283373126fe76991148bfd4eb  12468  .sisyphus/grok-followups-20260909/combat-backup/src/lib/multiplayer/server/MatchRecovery.ts
ffd811149a0be2badec1b5be78a1a00364473dbb9dfdb0d9a86fafb8523aaceb  10227  .sisyphus/grok-followups-20260909/combat-backup/src/lib/multiplayer/server/ServerMatchHostRewindRebuild.ts
d1e569ed71810561149d76ccd05466104e23525c678828bccfa9a1d6b2dcbc0e  12196  .sisyphus/grok-followups-20260909/combat-backup/src/lib/multiplayer/server/__tests__/fogOfWar.test.ts
34995b8cfcf3099e2461b89c898aed1612449e5956ec86fc92b0a09335560b0f  11669  .sisyphus/grok-followups-20260909/combat-backup/src/lib/multiplayer/server/fogOfWar.ts
05461d3d18a82a1fdbd5a3fd711261da4740fa52bde8dde5e5acb52cbd2fcd69  5607  .sisyphus/grok-followups-20260909/combat-backup/src/lib/multiplayer/server/matchUnitBootstrap.ts
10f0582d1eab4ecb410c2bbc0ec7e81dc8eb2b119b337a23cefc2bbaa55ce17e  6975  .sisyphus/grok-followups-20260909/combat-backup/src/pages/gameplay/campaigns/[id]/mech-bay.tsx
815d1bb4c367f2dc6d7d6c67f44cd528ee33faaccbd34c8de9b143a19c0f259d  8986  .sisyphus/grok-followups-20260909/combat-backup/src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx
f651d1fff1210a3e9ec91252940080fd827332902da1dca99a477088518ddab7  16555  .sisyphus/grok-followups-20260909/combat-backup/src/pages/gameplay/campaigns/[id]/starmap.tsx
9f578bbe6d13677f3c10d1b5d3ea13f1b15672e55d8b4d28f786a2847553146a  18917  .sisyphus/grok-followups-20260909/combat-backup/src/services/encounter/EncounterService.ts
b6ed6e415a07e15d2c1f52a4d3ddc60087088f30747fbc6ea474cd3e1501f156  22100  .sisyphus/grok-followups-20260909/combat-backup/src/types/gameplay/GameSessionUnitTypes.ts
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-campaign-jest-driver.log
83ea754e1b29cf15d7c46584bdb615bd1cc7df8c31d258d4d43393dde526c390  869  .sisyphus/grok-followups-20260909/combat-campaign-jest-status.json
465d1c62ee4f74ca92313d3d710572023e9be035e54f536e155d99b7221944ae  47281  .sisyphus/grok-followups-20260909/combat-campaign-jest.log
983328ed905a9f111e216d1804355b78761dc0009231a07981a6347784c47813  2850  .sisyphus/grok-followups-20260909/combat-campaign/NEEDS-PARENT.md
f38ca8137432b59918b146993535b071d88efa9d55e78c36b97857ca9bfe784e  5519  .sisyphus/grok-followups-20260909/combat-campaign/REPORT.md
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-campaign/driver.log
587c69c5afad6cc8bee79007cb824754d0784a552bb8ca908829dc4ecdf25086  1517591  .sisyphus/grok-followups-20260909/combat-campaign/events.ndjson
f7c896a3303925800db978a941332fa41aefeb54e221acc06c83185d1e13b622  3426  .sisyphus/grok-followups-20260909/combat-campaign/prompt.md
316a416bb36cfd20dbb1d232ebe0416ae37bf3a7789fd2fa831ef57b92e0b8f0  298  .sisyphus/grok-followups-20260909/combat-campaign/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-campaign/stderr.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-core-jest-driver.log
df37a63af032bf2b2f1ebd29c26d2020a9648f128ff4e2283cc80f79f973a2bc  547  .sisyphus/grok-followups-20260909/combat-core-jest-status.json
81d00cabfec56d1a8b24e610b89170685fc516ca029292e357b69d5ed484b044  274  .sisyphus/grok-followups-20260909/combat-core-jest.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-integration-jest-driver.log
4842049e809e1f1432ca0b0481562fd6ed6450bf73d97fe2fd013570e0c622e7  638  .sisyphus/grok-followups-20260909/combat-integration-jest-status.json
d5d725a919c1a696902f54393256471984af4a06a99131882b04c24f24322650  1576  .sisyphus/grok-followups-20260909/combat-integration-jest.log
b4bd35a72640c3a4cf296a3f135dee4df39f46d69e146ddbc1b22b053f616883  496  .sisyphus/grok-followups-20260909/combat-launch-fixtures-jest-status.json
42015f7356b6ed123ead94d2f3feccecccca08c07ab816a74480ab328074baf3  224  .sisyphus/grok-followups-20260909/combat-launch-fixtures-jest.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-lifecycle/driver.log
1cd2bcae064359e433d8c54e873c1931e3610ccbaf15bf4bc7a76187582a9f53  2895933  .sisyphus/grok-followups-20260909/combat-lifecycle/events.ndjson
473561caba0a6cc9a9d796eb050120b1468d297790d74122e91ab8eff143e037  4131  .sisyphus/grok-followups-20260909/combat-lifecycle/prompt.md
59faaf41ba083f080ebc3df1c8c570115ffccf64c09849fb146dfd0c1709c999  300  .sisyphus/grok-followups-20260909/combat-lifecycle/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-lifecycle/stderr.log
bae0d6023b64ba05bfef5f316ca506412530c23c70c1ad7c343a64db3f7d93aa  2254  .sisyphus/grok-followups-20260909/combat-lifecycle/worker-NEEDS-PARENT.md
ca6187ae1daf52a74fd94372d86cbfce9584a6eafc57d83ee097e0b700ade81e  3338  .sisyphus/grok-followups-20260909/combat-lifecycle/worker-REPORT.md
681c44e02c741aeb08efa6a7a5533768599d9b6d730c2a998e0feca6d0021a18  475  .sisyphus/grok-followups-20260909/combat-prefix-before-jest-status.json
0ad3befa0178e382fea835dba9fc36151b9c851b1b35c9c32d437618a478dc19  2395  .sisyphus/grok-followups-20260909/combat-prefix-before-jest.log
5775213ee213f5d353ec1522fc0d542595fa3c01b6ef8194e748078d0f746bf4  499  .sisyphus/grok-followups-20260909/combat-privacy-baseline-status.json
854d52915b4a60ad7dd6847680f17ef3c4314b9dfa4a0d7b9b5bf9a8e3904357  4765  .sisyphus/grok-followups-20260909/combat-privacy-baseline.log
072e0be6313204b400e97c749c087223d233fb1ed4c1dad4684bfe4f08e6b9a5  506  .sisyphus/grok-followups-20260909/combat-privacy-characterization-status.json
818074f8a54ef814a2ab54729766a2dcec4fb63b162187e909f73cae0f513b56  20145  .sisyphus/grok-followups-20260909/combat-privacy-characterization.log
11c076435d928adcef83583735a44cc8ba0ba2f3443eb6ae57e98af4643e92d9  556  .sisyphus/grok-followups-20260909/combat-privacy-fixed-status.json
321f995fd36ca431e4f05b30db365ed6897624aa525531f5e1e157f17b84b510  281  .sisyphus/grok-followups-20260909/combat-privacy-fixed.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-replay-jest-driver.log
c5712f375689f60bd4cdf9c01723a3a6c1a3329c975667a646be802924604290  637  .sisyphus/grok-followups-20260909/combat-replay-jest-status.json
a601957bf14a5550618c78b251c7bf42d9eadd05be3795cb7c81f93f26f006a4  367  .sisyphus/grok-followups-20260909/combat-replay-jest.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-typecheck-initial-driver.log
7903b311c3edc29b62bafe7b310a1f05f26d301ed4f8ff860a4d9de06fc59d58  362  .sisyphus/grok-followups-20260909/combat-typecheck-initial-status.json
a80907fb6d21a305f98871db5feb35a46aa87a6f90986fae470e86e953255d1b  4110  .sisyphus/grok-followups-20260909/combat-typecheck-initial.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/combat-typecheck-second-driver.log
f9efb5da940d4b51a678b9620ac0dc408e5611253f88c75b1d85904ed57453ce  361  .sisyphus/grok-followups-20260909/combat-typecheck-second-status.json
81b89c1000af0b5554957278349dfbe3fab82d0dd76698f886c20b5b372e9d60  1941  .sisyphus/grok-followups-20260909/combat-typecheck-second.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/completed-format-driver.log
5a0b7f205e4181e43134bc28919dca3e0d7e5331c6c38a2937acf0901e89aec4  626  .sisyphus/grok-followups-20260909/completed-format-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/completed-format.log
0b91a5083924bd3a813ccf7797f79de6ec48ff7466e526844fb07a921496b191  310  .sisyphus/grok-followups-20260909/cursor-route-probe.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/cursor-route-probe.stderr
f9ca2bf4b2c635ab32f02d1744c82bf8ac941650d4e23f294d83f0d9e502867c  1447  .sisyphus/grok-followups-20260909/cursor-runner.cjs
8dbc5449abdbadb48dad6a8d077f7a911d856ae3812ad109d6799893966f0c20  3294  .sisyphus/grok-followups-20260909/custom-combat/CONTRACT.md
2d1a18d00c84e350afedd37f52225e50bbe32bb33be91063296f4bcfa101d8b7  823  .sisyphus/grok-followups-20260909/custom-combat/PARENT.md
4dad0eae51ead842744755d9aa4c2ff79b68a7c5e4a0fa6a95658648f4ce875c  19547  .sisyphus/grok-followups-20260909/custom-combat/PLAN.md
cd07008905a3750dfe055ec34d5e706effcd46390952eb45822cc02e93bca53a  1520  .sisyphus/grok-followups-20260909/custom-combat/REPORT.md
76cc9e32c2bdaf320f64d40c154aded737e6ed71f709ec92e3d7e420f67cbd8a  1722  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/manifest.json
a0134572f2b008416f2fb56a09546774bb0855c42097989fc8b99bbc64c12c56  6764  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/__tests__/integration/customCombatDefinition.integration.test.ts
1ba074f8f65f1692776c485f7e40e60961d605b525d0197df4808f50df9a8cec  5717  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/engine/adapters/CompendiumAdapter.ts
85f990231c74e18e2f94aa28d4b399fbf19c136a43f09aad03d0d35568b59ce2  1712  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/engine/adapters/__tests__/customCombatDefinition.test.ts
c3150b01e2b3674947ad31b865f95f25163935fb479135d2011e70c124102e3b  3710  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/engine/combatSeedDerivation.ts
81d8287699c6f652ddfb45550f96b20f86bff7fd19b7d557f5919cf4b623f0d0  5046  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/engine/types.ts
d7b553ad747950856f69f19f3b29c7e64ff0e27f9eac9dd8245d339c6ae2b2cd  717  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/pages/api/units/custom/combat-catalog.ts
c768f0dc7a50620524cab6f51eca68f03dac9807080fdad966c5bbc901691d57  1772  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/services/units/__tests__/listCampaignSavedDesigns.test.ts
23ef0ca37d98a24843fa7b142fadcf57c582231821997b29930db7d19a93ac67  724  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/services/units/customCombatDefinition.ts
5e298e9880077a6811ebeadffcf34ac4d5ff47637cc8b8db9663e41b5669324c  1219  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/services/units/listCampaignSavedDesigns.ts
bba9a5e3361e91bfcb6b52343d5df4f8d96485eb6a123955876e7de6e80eb5f0  923  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/services/units/serverCustomCombatDefinition.ts
1507be55aff186ceaf82978cd1e25a73209f8cbc3086ee6b060e3f17ec9a8ebe  1249  .sisyphus/grok-followups-20260909/custom-combat/backup-extract/src/types/contracts/CustomCombatSnapshot.ts
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/custom-combat/driver-resume.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/custom-combat/driver.log
9b742a25ab05f0341fd1619ed7f9537af3eade6c455db6b87df270160d6d9aef  2043649  .sisyphus/grok-followups-20260909/custom-combat/events.ndjson
802cd3d202c76422c613ee6788e1108e6c6a83b5c5c14a272a0617de5ff3b6fc  1293  .sisyphus/grok-followups-20260909/custom-combat/extract_selected.py
87aedcc6f641ef8b15a5fcdb0ea27c89727154733b05aaf7b33e81a0574cbe46  4874  .sisyphus/grok-followups-20260909/custom-combat/initial-prompt.md
e5f216f3fd13e774831dc571bf10a454fe113348822be6b2cd2bab9082fd5aeb  2084  .sisyphus/grok-followups-20260909/custom-combat/prompt.md
17d7e5c65839f69bc9392af0c64ac699383f666577445aa2e8db32e4eeac14c3  297  .sisyphus/grok-followups-20260909/custom-combat/status.json
d2b36c2d28d9706015397cd23ea4ee5fd467acd7680c756de72ee0fa49a6c56f  133  .sisyphus/grok-followups-20260909/custom-combat/stderr.log
188b768757bb0bb90e34ac35484b0f0a7f275dea2b69e394a06441be83b95198  101993  .sisyphus/grok-followups-20260909/customizer-review/armor.png
bf4c3205c6028f4dd88729bcbe045be04f2ca83ab200b1d951c75751ba94112c  131438  .sisyphus/grok-followups-20260909/customizer-review/critical-slots.png
a0d3b130737a7a8e0641ddbc2d6581070650ba34bed2ba9780b7df6c1a1693b0  9151  .sisyphus/grok-followups-20260909/customizer-review/empty-state.png
c599b6ac99ffae25b16f7ef95054c4b86d1f8522a8540b41e59c2c18e92a65e4  66052  .sisyphus/grok-followups-20260909/customizer-review/equipment-details.png
fec8c9486f70f16a562024f22797dc46fcd5b389ee5dcf226d13894cf7cbb3be  90453  .sisyphus/grok-followups-20260909/customizer-review/equipment.png
ece9b148eab2802a8454f8246d2ae86d4b80728555cbf2edfc11364402cd3695  77784  .sisyphus/grok-followups-20260909/customizer-review/fluff.png
b13b1060d0a60e1768112c87bb2c502a829ca9ee122df40a0f5398cb51fc58db  45227  .sisyphus/grok-followups-20260909/customizer-review/library-search.png
fd3b75e23e3952aea585e20eed692d4d27c8ab5750abef8b9771fbcae8f3fd9b  40624  .sisyphus/grok-followups-20260909/customizer-review/mobile-equipment.png
b10db1d6e516fe9142d0cb3c66e39480da54843e5da9aa34c128fda9ee4ccdfa  70242  .sisyphus/grok-followups-20260909/customizer-review/overview.png
e82786ecdae51610acaabd7cd77e69cf77c81ec9464b4e93c26fbfca8ebbfda4  56663  .sisyphus/grok-followups-20260909/customizer-review/preview.png
a06be30e7333a351259580a0d5828645bfd8ec21d0dac972227c917a7265232f  105319  .sisyphus/grok-followups-20260909/customizer-review/readonly-review.json
dab8da6f16cfca2d1f196d8fff2b87396f5ecb14d2056c6e6ec81ac6fbc2cb2b  99949  .sisyphus/grok-followups-20260909/customizer-review/structure.png
5f0fca472aea143e426ca9c6e1ca15fe97d068d9a264ee6566f4824677406aec  105073  .sisyphus/grok-followups-20260909/customizer-review/unit-actions.png
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  45  .sisyphus/grok-followups-20260909/final-browser-artifacts/.last-run.json
f8a071c9ffa2ea12c49936c0ba715ae0b13c34c6cd9b5cc454c0b38658e71197  73042  .sisyphus/grok-followups-20260909/final-browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-analysis.png
80c90119d18e0a9c10573fbe2ecee1e6ce2511ba3bbc283003705aafce44f828  65364  .sisyphus/grok-followups-20260909/final-browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-dashboard.png
08129d5fc17cea9d4a4d39e6ff9b874164194f13b3af936fb308159f9caac65f  425726  .sisyphus/grok-followups-20260909/final-browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/tactical-map.png
4858cda57c9019baeecc3f447068bc88d8593e7949d4dbe32516b5765602fed6  73389  .sisyphus/grok-followups-20260909/final-browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-analysis.png
5dcacf069d4fc0c066cd6446c0415d50bfeb777b8d53bf95e51ac6210ad0000b  65951  .sisyphus/grok-followups-20260909/final-browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-dashboard.png
2542940fa54b80487436472bcc94d4d2d47a992d6f4e39efaa056ed3463982e4  425856  .sisyphus/grok-followups-20260909/final-browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/tactical-map.png
e508a32f6ec13c8f737d6e994f2589e55f915e68cccbacd0224b15edf01042e8  41679  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-add-unit-Add-un-da4ff-ings-in-one-flow-customizer/add-unit-catalog.png
ac294b4eed8d1228e7e657a8b2ede8fd0f8fa8fa139840bb9e1561b465b8eddd  42275  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-add-unit-Add-un-da4ff-ings-in-one-flow-customizer/add-unit-phone.png
0281d351382ee5aed7a98c9ea56e999244a6c6c1012b91aa6af64a83c770a003  27440  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-add-unit-blank--133d5-h-catalog-failed-customizer/add-unit-failed.png
e14ad13d3217157b6324b9383624617c41489ab285501fd8a8b6275289527d1f  25066  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-add-unit-blank--3ffd1--catalog-loading-customizer/add-unit-loading.png
bc5e9600e39766b71114dc6025a6b93f518dbe2621d96b696e0bcdc8c1a570ff  115874  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/armor-desktop.png
3c9822f12074689c5c641ac2773a5118c14fe72c1ad8fd06f621504b26a6f429  36836  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/armor-mobile.png
4b0bed2c703a3e5c647c2bda18c7455e2a821f253dc4666ee7cedfe1428626be  9034287  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/customizer-quad.pdf
69ca3512cfd43bb749fd68581cc1ec01b5948757b9ad15650e9e641617f66197  71675  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/overview-desktop.png
91dea5abcf2ad25a9a423daec0104838150b938261d87a3e6a0a97ec416359cc  49031  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/structure-mobile.png
cb054a7b42008f02927885ef4315043c797bd3c3c84d7794213a0e566102ddcf  9689  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-data-flow-fixed-ceadc-inline-inspector-customizer/fixed-omni-inspector.png
c33a1caa7b3d996ccde320fefa1fa9336a424be2a51bcc8f8a55645fb96a3411  83610  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-data-flow-libra-5e495--the-same-design-customizer/fluff-desktop.png
558956549a2738ba6b1f3fff6aa7319c1ca7b7155ae2d4583de68b10cf79b095  116202  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/armor-desktop.png
e7aa736391c5d7ed636d320e9ef5ce606f0cec36779e365e41093358aa186daa  128627  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/critical-slots-desktop.png
f78c06082189b8febee3f081bffcd197df8ce8e9d6d530293c9e13c7f04014b4  99727  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/equipment-desktop.png
5813baeb0d86ffb7be7e227e19cfd6be20c96e191f70455dbfb7da1039fa3d9b  82375  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/fluff-desktop.png
21a0aa56b2902d67a3923b0da78a7400ebc1f84e16c3075d81ef2ae17eec9f9b  72195  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/overview-desktop.png
ea9ac370ae400d6d9884cbdb7fc6797cc8271b7838255c460a23cd0dc1627450  122341  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/preview-desktop.png
b2a73690461943486e41eaa6e841cf9f0b5c1960051d99cd39b1703735ca5235  105067  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/structure-desktop.png
8fafa62108ec40351592f12f5ca5042a59860e4b6841e12eef16c39570d8bdf1  60372  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/armor-mobile.png
1ee76a0734cb0e30f1569977a2e239435f5bdc8c3dfad0d201568a197e45538e  34807  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/critical-slots-mobile.png
8d163bd03e8ea2a200cefbc538f644e4a95c69b1a9b9ff04b80e1b0a658924f0  48361  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/equipment-mobile.png
f0ea6b8f64be5c9d179ba071b257c4c61ab922870fd6d7f629d0e97936e47b89  40330  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/fluff-mobile.png
874a5bf6d315a54a42e4eb262288d2eaec1574230f960d8360c2f5b88cf147ed  31075  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/overview-mobile.png
4f0000e3ff00a76bf78c8715e5b58a73c8589f7c34801681a8c695496999b3e6  43626  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/preview-mobile.png
36cbeeacbc28099ffe6d98505f5e952b34791e5ab89e8c93e0c50dd7ef8c3aea  41795  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/structure-mobile.png
20a4c4c65a703fbdf9d2dc8e308d42318e1cabbb5028138518220ef31a333b47  36055  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/criticals-mobile.png
c4901786af943b2ee6a873285e959a97b16f05c34eb04232cbdd659cc1ac040c  91574  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/equipment-desktop.png
22548bbc43cb535e9b4cca999d82bd6d6f3c34ad7bb9d1c647f546099dcc8444  46429  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-layout-workbenc-51e08-olling-workspace-customizer/complete-metrics-mobile.png
3adb4e45ad15e39a50fa327f607045f5eb96f193aed2d2e53ce66820db1f8410  128810  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-layout-workbenc-51e08-olling-workspace-customizer/selected-equipment-desktop.png
f592b617f927ac07de4b1b214bbd8ad713b13221afc89d3f2af78358c8f1e4e9  67926  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-layout-workbenc-65854-d-unit-isolation-customizer/unit-switching.png
73cd676b03e028432a8d53ab520536ed89aa55475ee32afee5002c3a0df57053  84947  .sisyphus/grok-followups-20260909/final-browser-artifacts/customizer-layout-workbenc-907dc-sed-destinations-customizer/warning-guidance.png
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/final-browser-driver.log
b8a1fc628e44b99dbbe74d2bee1d9a024028d4ce9defc43aef8b30b2460974a7  58059  .sisyphus/grok-followups-20260909/final-browser-results.json
ae3aefeddf699f288f8d4209d7804b7ee79d420ca6822ffdf17fbe1b08d7f4ea  2485  .sisyphus/grok-followups-20260909/final-browser-run.cjs
8ac82f5b4171d146b511f8829c0fedba66fc0519a624fb83934baf4659b74f60  631  .sisyphus/grok-followups-20260909/final-browser-status.json
d5b5e4f9da2c01b6d6b26af57466e1fe796e3d9b755c4b20f9aea7eb849a7fd2  810  .sisyphus/grok-followups-20260909/final-browser.config.cjs
0860d0a5aace388f99806a557597123799121d69fbf315e6e5462223f2fa6ac6  2969  .sisyphus/grok-followups-20260909/final-browser.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/final-build-driver.log
75042e474b25c10e81eea7ca916d9473d112c0f561d8d181a00288bd02c9c4ff  332  .sisyphus/grok-followups-20260909/final-build-verification.json
cbafbfea551abbaf89930cc2cd716aa0beca37abc256e1fb1693a87ab9c695a6  1600  .sisyphus/grok-followups-20260909/final-build.cjs
683b5087d073e5d65f437e0ed02352fa9c63b308ee70811b24e3c15b8b21daaa  191990  .sisyphus/grok-followups-20260909/final-build.log
0d594a4a529153ca196d7f0e387b995d6278b72888be2bb59a480cb93ea7e2a6  489  .sisyphus/grok-followups-20260909/final-durable-proof-jest-status.json
c5fecc6c3d79ccd0ebb341b3fb43adc189ce400ff538a353f2e9bf75c6cd35d7  2088  .sisyphus/grok-followups-20260909/final-durable-proof-jest.log
b2c3b64b483405a46af1b6947da776870d09ff698d901edc928aca5b01f7937a  21679  .sisyphus/grok-followups-20260909/final-focused-jest.log
6b61cde253da1818cdc898d7a63ed7ab43f44805bab914a4b207ac3e52241577  357  .sisyphus/grok-followups-20260909/final-format-check-status.json
0fd691be485d4ce76b3bfcec3e4728dd5ce6e73b0de1d8e565e92fcf1a843c72  1026  .sisyphus/grok-followups-20260909/final-format-check.log
440b61a33c9099385a826c2e28f12f7729dc1535a21e2e81aad6bfca0b427c85  455  .sisyphus/grok-followups-20260909/final-hydrate.log
7f55b823335d3251675b94c7d9f0fd6c76b80dbba87f0eed29d105c9ea517d2d  37841  .sisyphus/grok-followups-20260909/final-lint.log
0441dab8bdfac5e1973ccb300a95a13973bce527e39a6d00d9bffc20b7a4acc5  4094  .sisyphus/grok-followups-20260909/final-navigation-proof.cjs
bcb776b3106a3e3679e0fdf2340d36a662c52523ab14d9f2e02a9db644ab7f90  9462  .sisyphus/grok-followups-20260909/final-navigation-proof.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/final-owned-format.log
984eff016944b20bcbc782ba190cf9a0db65ea512fe1a41355e23ac051a7f87f  370  .sisyphus/grok-followups-20260909/final-qc-route-coverage-status.json
5ea39bb35373042e41e75db45ae5d4df5485615dde33572d3bbdc383424300e3  430  .sisyphus/grok-followups-20260909/final-qc-route-coverage.log
551dc4dc0790dedd48574ceff3d7dafd85aa1150e98cf0401725b3d948b30934  98  .sisyphus/grok-followups-20260909/final-server-stop.log
ce0095cbae79caa6999db5b74a3d391fc5f694b7b92ddc082d4e24d92d0629e2  536  .sisyphus/grok-followups-20260909/final-stable-config-failure-status.json
30c4e2eb10af19010edabc88343ea505267b3af86ecdaede42b456f93b8686b0  256  .sisyphus/grok-followups-20260909/final-stable-config-failure.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/final-stable-driver.log
a353acd290a1d86cbddcd4190c36efbbdf7b5917c70f24656e401e1f01312a08  539  .sisyphus/grok-followups-20260909/final-stable-jest-status.json
acbf4d84b08ece12b4e43ea15024b4043456e5256474c8799b216649ebc37e37  857921  .sisyphus/grok-followups-20260909/final-stable-jest.log
f0276e08bebf3a31e004243c92e8588a3659518757a42671fe0326c163c50181  13233833  .sisyphus/grok-followups-20260909/final-stable-results.json
35262100653d78b0407e7b4863a64db075bb22c6eab5ec56ce9d702d171c49e5  471  .sisyphus/grok-followups-20260909/final-stable-summary.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/final-static-driver.log
ffc3f9777c8d66614277d0c0591f10b42a18d65d532c94ea407c1a9c3c4f38e6  474  .sisyphus/grok-followups-20260909/final-static-verification.json
77943e1d4d940b59149d65bae3ee0bd2ec5f04bb3b71b3a6024b04fd8b3971b1  1418  .sisyphus/grok-followups-20260909/final-static-verify.cjs
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/final-typecheck-8gb-driver.log
9faf0a6e1aff0072bcdbdc23a340956819c2870c56d27479934663a076a8da5c  390  .sisyphus/grok-followups-20260909/final-typecheck-8gb-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/final-typecheck-8gb.log
54e077163c0c907ecf2eab8c0394234c3cc7fe38f8383c3f02be2dee7a502d74  1208  .sisyphus/grok-followups-20260909/final-typecheck.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/hook-probe-driver.log
7748e5420d16db220c3b358a0b31652eff38fe41221540c26cf67ba1cc458915  1386  .sisyphus/grok-followups-20260909/hook-probe.cjs
344b031512f9f366a2f3e01cc6bda6375b465202d6c9f67b35a9f0e3acd2b40f  4107  .sisyphus/grok-followups-20260909/hook-probe/events.ndjson
ec11e856cbe189e957f320f46288af28fac15a9888c5705b2ee6c5f2e917df2d  208  .sisyphus/grok-followups-20260909/hook-probe/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/hook-probe/stderr.log
708dcee60b3c75ab3cd5114dbc9aa423d5f5041c87ffdd4b94f0ef2f347450b2  2093  .sisyphus/grok-followups-20260909/initial-alignment.patch
ac9719e4f37bea5745bbf9cdee2b3338663de3ee1f235688a0eb468f6c28789b  166  .sisyphus/grok-followups-20260909/initial-status.txt
410b1a68e9b97a2aa3a592884cac1e338c75018aecbf80dd413d2bd959c1f010  380  .sisyphus/grok-followups-20260909/list-dependency-control-status.json
5b78bb08d7f165d75318cf18ab07834d17d01d3151ec8fdc583e21816d8515b5  2576  .sisyphus/grok-followups-20260909/list-dependency-control.cjs
8eb4095c28b4bde3121e5f19a85452fcc799174bf548b7928386babb8accb5f6  790  .sisyphus/grok-followups-20260909/list-dependency-control.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/list-dependency-control.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/list-dependency-probe-driver.log
511b9f444efc57d57ac9ec510c4f78285ddde57656a417a6f36bbbd0a4e1a893  375  .sisyphus/grok-followups-20260909/list-dependency-probe-status.json
f37046bc2e598b8ae300e84eb562d82eb523353f93d6eb4ea37095a998566058  2310  .sisyphus/grok-followups-20260909/list-dependency-probe.cjs
5dd8c027aa7c09aa3439b22ccff46daae4b00f714f0e7faa71c28b010cd6db46  19279  .sisyphus/grok-followups-20260909/list-dependency-probe.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/list-dependency-probe.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/list-layout-probe-driver.log
493f47884aa273ca9e2d7da9375b6de710192556b3a8a70c4003888321084147  459  .sisyphus/grok-followups-20260909/list-layout-probe-status.json
b4e24cb8b7c490af8c3d130dd84d7dada61d12b11bb34052a8c6b37c7bc53e9c  231  .sisyphus/grok-followups-20260909/list-layout-probe.log
65b5f3fe8167dbee8371babcfae5187a8277bcb0749b8de056d293650ecef0bb  5353  .sisyphus/grok-followups-20260909/nav-react-commit-probe.cjs
a7a51c851ff51bbe5dd41faf7376e0a2ca87f191297deb524c956eadbe8a6b85  217513  .sisyphus/grok-followups-20260909/nav-react-commit-probe.json
a0fc1fddc27a9d8046096bf9a62d96a6e01e83313ffafb2b1b0dd7fb38750e50  4476  .sisyphus/grok-followups-20260909/nav-react-root-probe.cjs
238dff110bde408c05513aadc98a5134a80a4f703e776b0ffbf90c802ccb2507  334954  .sisyphus/grok-followups-20260909/nav-react-root-probe.json
690f578b9f0b055a9d3b52a21b6aca813cd0f257f5f96bc0ad75e2d879225d2b  5047  .sisyphus/grok-followups-20260909/nav-service-worker-control.cjs
43316e021b85c5ad72d88ca0294d1122884ca5fd5fe3f8211524f3cfb62a7cbf  21652  .sisyphus/grok-followups-20260909/nav-service-worker-control.json
e86b7cf5ee0c137dd3a6b7dc80050d2e099376acce142133e9f76f608bf5e9ae  3443  .sisyphus/grok-followups-20260909/nav-sync-probe.cjs
ba61fd96b7c840c03bffd3f6c071dd03bc71d7efc7228a75bc09bc8f386fb07d  12720  .sisyphus/grok-followups-20260909/nav-sync-probe.json
3203838da87bc3a0e1cb64fb4250e82b853806f4f8a2ee108ba72bb2ca3daa4d  3936  .sisyphus/grok-followups-20260909/nav-sync-scheduling-control.cjs
eb623de0712757d01d2f57fd5f673b9a1e25db10d61f3c19874d6c69034fd16b  19854  .sisyphus/grok-followups-20260909/nav-sync-scheduling-control.json
a917c77ff270ecbb01f0a460223cf5ebdac2300ae4133f365d6559f7a6851774  194  .sisyphus/grok-followups-20260909/navigation-baseline-artifacts/.last-run.json
590393709c7e5c8b1c5202e0c852d810c0d43509714ef1f8ccba37ed0150cb77  115869  .sisyphus/grok-followups-20260909/navigation-baseline-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/armor-desktop.png
894423469fbcce4b477c02d561fa8514ef705fa172c9430f06e245313c6a2516  14976  .sisyphus/grok-followups-20260909/navigation-baseline-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/error-context.md
2c2ad4467482a7b566909ace25ab399cc0c53ab8f99fb01185299f3138ec3ef0  6379024  .sisyphus/grok-followups-20260909/navigation-baseline-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/trace.zip
aadff9f0cdcdbfbc8aea94bbb8b578c9ee33347e41c931cd94ae7b69a600df3b  13828  .sisyphus/grok-followups-20260909/navigation-baseline-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/error-context.md
efc4d893fb12da7b2e9cd9fc5f3ad2172071deaa5894ac5801354906be72ca91  5161579  .sisyphus/grok-followups-20260909/navigation-baseline-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/trace.zip
7c28e322dcb21fddf1429993ab4c0b01e2fb70919c0eed0da07e6d1f9042664c  11359  .sisyphus/grok-followups-20260909/navigation-baseline-artifacts/customizer-layout-workbenc-d087f-he-selected-unit-customizer/error-context.md
0ea5d549377c4b04ffc907f62f9ddeb53354922f1b7314df2170d047eee38f47  6071785  .sisyphus/grok-followups-20260909/navigation-baseline-artifacts/customizer-layout-workbenc-d087f-he-selected-unit-customizer/trace.zip
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/navigation-baseline-driver.log
211ccd19deee4b87dd4a6177905567c183da1ffd7baa9c6405a938d4100a9cbf  18165  .sisyphus/grok-followups-20260909/navigation-baseline-results.json
70b97a0a85e8114f6f5a17fcbb6b7b521668721ca3fc0b080098e1db907d1183  667  .sisyphus/grok-followups-20260909/navigation-baseline-status.json
43d498cb8e45c9357843351cd70887fc82ddef0c0fbbc44dd2893642bc229f28  752  .sisyphus/grok-followups-20260909/navigation-baseline.config.cjs
8ab08310d125ca82a2d909002c241a061a0380d3e043b8688ae563268bf38ba3  6310  .sisyphus/grok-followups-20260909/navigation-baseline.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/navigation-jest-driver.log
fe8db3bc771cc09e32d182812f3d1e76769779c730a92ec25e0529fc9b59a4bf  538  .sisyphus/grok-followups-20260909/navigation-jest-status.json
408edc87f7d78e54261f07e78dd29070ee6ed803f36d3710f158067ee9d84de5  17510  .sisyphus/grok-followups-20260909/navigation-jest.log
3ae209339df4600b9a9e7e87f9e2fd8c9ec62f6fa79076a1159cdc1af8a9025a  193  .sisyphus/grok-followups-20260909/preview-server.json
ee2ea614d0d8d98a83d7642788f220626614d0427c93ca8520fb8a53645926ef  708  .sisyphus/grok-followups-20260909/preview-server.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/probe-driver.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/probe-followup-driver.log
db4f0d8ae8a71aecaa993b5cd06e915edfcafddbd8d188f92062cb00878ae911  1017  .sisyphus/grok-followups-20260909/probe.cjs
db1060ee74cb43c2a33f4d9c0908d6fe8ef618ee0278e92ab3f2af2664b97d46  1554  .sisyphus/grok-followups-20260909/probe/events.ndjson
ceeb3c41a636eff8c7c1d714672d6a41148192286d5ee03a1924f1c19b46b5ab  208  .sisyphus/grok-followups-20260909/probe/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/probe/stderr.log
4094e861cb9f5af55bd37e5eb0b22fc11a6808becdfe8d64e3556b14b2c7ff7d  3057  .sisyphus/grok-followups-20260909/readonly-review.cjs
b64be9804dd827903ebcc289838e9adbb3f7ce8865c635325bf457f9790b593a  137  .sisyphus/grok-followups-20260909/route-probe.md
8d17f716679a0b062add10a84cb480e23988dab52ab8ef5a406844d7621ffaa2  9537  .sisyphus/grok-followups-20260909/route-probe.ndjson
948b81c84a8ac30244458938d10ad06aa05446679c89bc48e720306e33f1289c  140  .sisyphus/grok-followups-20260909/route-probe.stderr
431057dfc25d5b46109f779da2bd93a571222f5afa91fd5a5ffe01602921d789  794  .sisyphus/grok-followups-20260909/run-check.cjs
29530754135f65ecb12ad819777a9ccba9b8b7a782bbc325114d6f2613a695b2  194  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/.last-run.json
e832f183a64c8a280a9d780e5e24fbb18adc3cd845b35603dd86ab677904ae1a  73038  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-analysis.png
80c90119d18e0a9c10573fbe2ecee1e6ce2511ba3bbc283003705aafce44f828  65364  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-dashboard.png
4ff06391a407d828c3dad253407e2d974e9f8d6d70be890caf571d5c0cbda065  425708  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/tactical-map.png
f5e18a6b6ce4287248e38fefad719983df12ac40b4c7a5a22c3bafd9317a7133  73384  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-analysis.png
5dcacf069d4fc0c066cd6446c0415d50bfeb777b8d53bf95e51ac6210ad0000b  65951  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-dashboard.png
a15b6d8b2d16d26e35613eea2db3f6f7e00f06bed91d99c64410a0702a346f3e  425805  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/tactical-map.png
cd88645c6574d1fed7282ad7d9b02959dd1fa858df0cd3cfe38c46bffbd755a9  115863  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/armor-desktop.png
570f510bed17d1dc8ce9756c883351ab042e13cc915854c62e7d5b239c7fc592  18261  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/error-context.md
21da424782137176f2d8d3b4dead29e1e0bcb4b173706e2c36303e39ac35884b  5483669  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/trace.zip
afa3e872db46fe92ac6e9bd28a7fd82c5597b31010b6be4f6e73c0b7a6f1bab4  13828  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/error-context.md
ed593e5585734f34d1bdf0c334d0390bb3aeb9863327508d1012063dc3b1b8b9  5153583  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/trace.zip
69de0baabee6df1a5c5c807a4279534ab39e59fc7085ea9ecba4bf9b3c99f2a4  18266  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/customizer-layout-workbenc-65854-d-unit-isolation-customizer/error-context.md
e7a296639eaff58e7b3bc2491d348cf7674f4e8cff34e890718f8acdcfab0ad9  5013969  .sisyphus/grok-followups-20260909/runtime-browser-artifacts/customizer-layout-workbenc-65854-d-unit-isolation-customizer/trace.zip
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/runtime-browser-driver.log
f1b3900388a0059017798cd4c01e02ffe021439118fc53c3b143a6f60c7c486b  27771  .sisyphus/grok-followups-20260909/runtime-browser-results.json
9384ad945875d8a3ad033828f2792b7d16ef4ddefd267cdd86b1467cc172d995  567  .sisyphus/grok-followups-20260909/runtime-browser-status.json
fa31d7104bcbb31b1cbdb248a32d7d368e16f1e0c90055d7296e88922a6c67e6  744  .sisyphus/grok-followups-20260909/runtime-browser.config.cjs
5452aaec38b5df7538d92ea25749c5033aaf56d73c8f63fe6f600b289f0ab4e8  8576  .sisyphus/grok-followups-20260909/runtime-browser.log
5285622da7bcdf8563c36e07e3793b64c630d1af3fcc77da10578dea572c3683  143490  .sisyphus/grok-followups-20260909/runtime-build.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/runtime-fixes-jest-driver.log
e37f61a98b7ed89a04c76887df1eff74bfd981175c1baf4910ca4989ae3271d4  736  .sisyphus/grok-followups-20260909/runtime-fixes-jest-status.json
4323123141575ad4718fed23585e6a949c82e91881858ef72bfa7d792d67316a  794  .sisyphus/grok-followups-20260909/runtime-fixes-jest.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/runtime-format.log
440b61a33c9099385a826c2e28f12f7729dc1535a21e2e81aad6bfca0b427c85  455  .sisyphus/grok-followups-20260909/runtime-hydrate.log
966e6fc07e631dacacdce7f74cb4fc7fe617c7869d80ee9efb265801acd79d76  37829  .sisyphus/grok-followups-20260909/runtime-lint.log
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  4096  .sisyphus/grok-followups-20260909/runtime-tests/mekstation.db
cebb371f0c523240aa7359512698f962b69bd9f9be31ef58cd40b8e431b58ad5  32768  .sisyphus/grok-followups-20260909/runtime-tests/mekstation.db-shm
9a3109af7751b5d75118a5e03406d5a5cdd6fca9dea543856c4377868e9e6bc1  1878752  .sisyphus/grok-followups-20260909/runtime-tests/mekstation.db-wal
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  4096  .sisyphus/grok-followups-20260909/runtime-tests/multiplayer.db
e32d46f42a663076929e025e0279d96edf9d825ed0d54d1cd9d4de6abf92939b  32768  .sisyphus/grok-followups-20260909/runtime-tests/multiplayer.db-shm
cdf5bccd1a43a00147872f6354cb3d941034498f84f1abf6ece2ea8ff5ee49a8  304912  .sisyphus/grok-followups-20260909/runtime-tests/multiplayer.db-wal
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/runtime-typecheck.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/runtime-wave-driver.log
288d46b54b98ac17864da9e7b63ba9987be598ecb7dec86f7ad5691d102246a0  547  .sisyphus/grok-followups-20260909/runtime-wave-verification.json
05c99fc56f27a6e6a0719d82c4703e4f3b3ed40069d33b1de44f539d8ea60cc0  1728  .sisyphus/grok-followups-20260909/runtime-wave-verify.cjs
63f46f5af142e6b7c2750cc25618082da53b8d5816c344ff85b8d92e61a357cf  96  .sisyphus/grok-followups-20260909/saved-combat-browser-before-artifacts/.last-run.json
db2340ac4d5234556c05753bc1e264fafb707360e217f98f8f1041919de60b0a  20567  .sisyphus/grok-followups-20260909/saved-combat-browser-before-artifacts/saved-custom-combat-server-1e2cc-ntities-customizer-campaign/trace.zip
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/saved-combat-browser-before-driver.log
26b4c4ef06b3d258e18367e766984ad87fb016d3ebf12598e9cb94d2f9ab8fdd  6642  .sisyphus/grok-followups-20260909/saved-combat-browser-before-results.json
5a5c7118c0eb0cb91baf270294f53b146849cd426ba16c7fba64e297b36477de  466  .sisyphus/grok-followups-20260909/saved-combat-browser-before-status.json
9699cce4d0391e3c300a96c89d2100d3fbd18db4e111caedbfeacb1ca6837059  555  .sisyphus/grok-followups-20260909/saved-combat-browser-before.config.cjs
30e5a894966b684cafcddfd44bf5c6c0cc824ee204aea52f18b1f945ad086abc  2027  .sisyphus/grok-followups-20260909/saved-combat-browser-before.log
83f658865b1e2cc40fa9abed474671a8d303283a37e156b5daee70460af5b33f  706  .sisyphus/grok-followups-20260909/simulation-timeline/NEEDS-PARENT.md
c5acc54f107c06c1388ed16a507368c55333cb52a4d92db9ba159528fe237b6a  915  .sisyphus/grok-followups-20260909/simulation-timeline/PARENT.md
f4a4cf1f54485735a57569013b2bd8b27978b5bf930ec8c173e37d4bc1ede2c9  411  .sisyphus/grok-followups-20260909/simulation-timeline/PROGRESS.md
2e6db5356e98cdeca36ad667d4589d105164c7683238f5df6215d136e96eeed3  2993  .sisyphus/grok-followups-20260909/simulation-timeline/REPORT.md
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/simulation-timeline/driver-resume.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/simulation-timeline/driver.log
98a66b7d8a54c98fa47ccc207bbca089f581ee8046dbdc4190c555a6f82dcc4c  1211629  .sisyphus/grok-followups-20260909/simulation-timeline/events.ndjson
942707e02552f18ef012767e7c67f9570ca9ff77adf7fe57b1a9a6221dc49291  4191  .sisyphus/grok-followups-20260909/simulation-timeline/initial-prompt.md
020308a7f310d35624c6a2cbabb228db478ce3f869ff31d38cf139a85ac44f64  845  .sisyphus/grok-followups-20260909/simulation-timeline/playwright.config.ts
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  45  .sisyphus/grok-followups-20260909/simulation-timeline/probe-artifacts/.last-run.json
287431bcf6163b4f651d1dafabeafc61a4d8bbff8d485d90890227eec08f1289  341  .sisyphus/grok-followups-20260909/simulation-timeline/probe-list-layout.json
82f525635f016692e83a2de061453c82a0cee4e92fb6bec309632123244463f4  7200  .sisyphus/grok-followups-20260909/simulation-timeline/probe-list-layout.spec.ts
52558cd04669017c038999594825d80aee9da790a4fc8d4495c31dac18bee2aa  2999  .sisyphus/grok-followups-20260909/simulation-timeline/probe-results.json
788d7ec3d3baddb19d3480b816899f9b9c5baa1c8f5d66e538d6c1768166fa80  1259  .sisyphus/grok-followups-20260909/simulation-timeline/prompt.md
9ccc15e5ffbe144f2bedf1708ed159d131e4a9a5d34f2fbbdb7f8fb3d26d919b  2008  .sisyphus/grok-followups-20260909/simulation-timeline/reproduce-battle-details.spec.ts
76290d481c181c368d0042dffc939124bdc0cf3996e75f634df456862fbdeff4  303  .sisyphus/grok-followups-20260909/simulation-timeline/status.json
d2b36c2d28d9706015397cd23ea4ee5fd467acd7680c756de72ee0fa49a6c56f  133  .sisyphus/grok-followups-20260909/simulation-timeline/stderr.log
8ce8fbcdede95d4f398e9e9994a5e60d4a471f16e4068eb4e25f5a102d4fbfb7  956  .sisyphus/grok-followups-20260909/small-regressions/PARENT.md
5447218d93f0e67a34da4215afa4e6f9c03a33235efe849fc27251e11809e0e0  1733  .sisyphus/grok-followups-20260909/small-regressions/PROGRESS.md
4e35af2debc6b7d57ca00837f66f8a947363cc22e5fd0bd297fd1f75666bfb6a  5177  .sisyphus/grok-followups-20260909/small-regressions/REPORT.md
e69bbd65a16eedcf293f8134364ed5a05c5dec2e19619f3384cf02626ca66d0e  3288  .sisyphus/grok-followups-20260909/small-regressions/backup-extract/src_components_gameplay___tests___ActionBar.test.tsx
3e518569fb754279662cf060a5e5d59d364e25dedf5ad1881c0c085ccbae1b50  6872  .sisyphus/grok-followups-20260909/small-regressions/backup-extract/src_hooks___tests___useServiceWorker.test.ts
48195c46b1a4edaf50bc606bbdd01be20b17e9ba2b5a298ef17eb27b878c1a6c  4150  .sisyphus/grok-followups-20260909/small-regressions/backup-extract/src_hooks_useServiceWorker.ts
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/small-regressions/driver-resume.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/small-regressions/driver.log
33b251dc0e21fe8c5615176ff82b149a4e992624780fc5f6ebeda60fbe16af14  507426  .sisyphus/grok-followups-20260909/small-regressions/events.ndjson
266693bb16e845f0b1262e8e18f117a3934c6d30bddaf4d744e4f95da8732c63  19317  .sisyphus/grok-followups-20260909/small-regressions/parent-baseline-jest.log
2fea6bac580579539240f1b6a78ea261c18e860cbb991b9160934ae1775185fb  78  .sisyphus/grok-followups-20260909/small-regressions/parent-baseline-status.json
abf644b5a77ee27aa00c548340d95e7a9ec98418bb248e55a96d9a7d90df6d2b  4079  .sisyphus/grok-followups-20260909/small-regressions/prompt.md
493f373a8184e4d5229d109f8eb6457367a78b9cbcf02c3449242aaa74989fff  301  .sisyphus/grok-followups-20260909/small-regressions/status.json
d2b36c2d28d9706015397cd23ea4ee5fd467acd7680c756de72ee0fa49a6c56f  133  .sisyphus/grok-followups-20260909/small-regressions/stderr.log
9fb591bfc5aaef89b64a91fc77ba9b4741f160646c6f9a6a8b32956fba9cafba  301  .sisyphus/grok-followups-20260909/stable-resource.config.cjs
76747e3a1834703435e0c816fa2780e31c19cafe6424601228d3cea7deadb5f2  1364  .sisyphus/grok-followups-20260909/stop-owned-servers.ps1
1bfd1329cbdb4eef7c79d777e8e79eb75bddb8113a4a2db6fe8d14d1cf830913  197  .sisyphus/grok-followups-20260909/test-server.json
a7ae33c1af4f69e9c43d6cec9528365b94535c383f0c3c6c1ee94194a4e30017  960  .sisyphus/grok-followups-20260909/test-server.log
93876f8fcfae164345e70230df8f6bbb5adf473a9b7c83e7e0cc0f2260ceb731  2341  .sisyphus/grok-followups-20260909/unit-navigation/NEEDS-PARENT.md
730b94fb843b20e33cf47d55227f3db83553160107e22a9f213a5750f5cdcdcc  397  .sisyphus/grok-followups-20260909/unit-navigation/PARENT-OWNERSHIP.md
55cdaad5fc5bee543c27737074bb97a5400195034d91e24b852aab0b8cde5cd0  972  .sisyphus/grok-followups-20260909/unit-navigation/PARENT.md
931d211ec8751c40afe9afbcc68237509ef328d4821c02a891f5ef416d0b1a41  3151  .sisyphus/grok-followups-20260909/unit-navigation/REPORT.md
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/unit-navigation/driver-resume.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/grok-followups-20260909/unit-navigation/driver.log
c2e6de211f10167cc2a1aeec38d92d1c62db76ccbb0a6ebcb465f73c086affa3  1787864  .sisyphus/grok-followups-20260909/unit-navigation/events.ndjson
c8a509fc8d737ad4aef8e267b00569a55e76b0418462a90b642bdd7767b06f67  4273  .sisyphus/grok-followups-20260909/unit-navigation/initial-prompt.md
6a6a6d7d6700de54f4c603e8474278333621e2b26b4bd293f14bfdd1973f2433  2337  .sisyphus/grok-followups-20260909/unit-navigation/prompt.md
a0bf43041e66d9e7c9cba0c52596a748ba90cbc1b6ca3978afa931b2233b5da3  4021  .sisyphus/grok-followups-20260909/unit-navigation/rejected-candidate/useCustomizerRouter.recovery.test.tsx
01b562defc058700c4d0e00889a5945d14165871ee833bf92f176c8ed585a35e  1366  .sisyphus/grok-followups-20260909/unit-navigation/rejected-candidate/useCustomizerRouter.test.ts
341c66c5d46dd6c7938326101c8e90c85eda16732bdd738202310cfa53f5de01  12365  .sisyphus/grok-followups-20260909/unit-navigation/rejected-candidate/useCustomizerRouter.ts
e809a0ea0077e4aa2bc88ce0ea3355be95c28946f4bf0f4fe2f8ac97669883e8  5568  .sisyphus/grok-followups-20260909/unit-navigation/rejected-candidate/useMultiUnitTabsController.loading.test.tsx
7415c773ab33a6a00d27267d0e361f9f0c8d01270a07c4a913c90581ad477ac8  10811  .sisyphus/grok-followups-20260909/unit-navigation/rejected-candidate/useMultiUnitTabsController.ts
b5b36038c17d428592175436586e6b35e6b03479ec3943f751fe9300ef16456f  4030  .sisyphus/grok-followups-20260909/unit-navigation/saved-e2e/baseline-customizer-ui-test-repair-20260909.md
281c4913e53399b14677952596e27848dd6139e80e91826d3eddb9cf81edf66c  4198  .sisyphus/grok-followups-20260909/unit-navigation/saved-e2e/customizer-armor-workbench.spec.ts
592a284f00df154fb7a3a7b28d191947aad3b591a218a2095d57992b3f39cc2f  9768  .sisyphus/grok-followups-20260909/unit-navigation/saved-e2e/customizer-equipment-workbench.spec.ts
5fdbb8470788a83b57cd0ebe8f736ee31acc796716ffa24ebe92a5a801b61b65  16508  .sisyphus/grok-followups-20260909/unit-navigation/saved-e2e/customizer-layout-workbench.spec.ts
4f356a79192b0cc32a6e01399afe31f951e279651ced6ff2f5de26a00236a8f2  308  .sisyphus/grok-followups-20260909/unit-navigation/status.json
d2b36c2d28d9706015397cd23ea4ee5fd467acd7680c756de72ee0fa49a6c56f  133  .sisyphus/grok-followups-20260909/unit-navigation/stderr.log
8c4dcfce0a9bceefdad8bbfad1ba0f5cb259fc67bd4052136f5eeca5b50af313  785  .sisyphus/grok-followups-20260909/unit-navigation/unit-navigation.playwright.config.cjs
```

## 5. Safe to delete

Not reconstructible from git or from rerunning code as-is: the Playwright visual evidence under `browser-baseline-artifacts/`, `navigation-baseline-artifacts/`, `runtime-browser-artifacts/`, and `final-browser-artifacts/` (screenshots, `trace.zip` viewer traces, one PDF, `error-context.md` snippets — roughly 61 MB of the folder's 91 MB) captures the exact browser runs of 2026-09-10 and cannot be regenerated byte-for-byte; the raw Cursor/Grok worker logs and driver logs are likewise one-off process transcripts. The `runtime-tests/*.db*` SQLite scratch databases are reconstructible (regenerated by rerunning the same test suite) and carry no unique information.
