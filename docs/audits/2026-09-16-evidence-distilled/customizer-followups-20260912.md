# customizer-followups-20260912 — distilled evidence

## 1. Purpose

Local follow-up verification evidence for the 2026-09-12 customizer spec reconciliation work. `close-local-tasks.cjs` in this folder writes acceptance notes into three OpenSpec change task files and the active-change ledger:

> "Acceptance 2026-09-12: the pre-fix production run failed explicit Structure precedence; the fixed hook/composition and affected preview/router suites passed (40 tests / 12 suites). Type checking and lint passed, strict OpenSpec passed 233 items, and all 12 production Chromium cases passed with zero retries." (`close-local-tasks.cjs`, embedded text written to `openspec/changes/fix-customizer-explicit-tab-precedence/tasks.md`)

and, for the Infantry record-sheet follow-up:

> "The later authorized Infantry follow-up is locally complete: shared frame/toolbar/scalable canvas/staging are wired, the original component fails both new regressions, 40 affected preview/router tests pass, and all 12 production browser cases pass." (`close-local-tasks.cjs`, text written to `openspec/changes/repair-record-sheet-rendering/tasks.md`)

`record-verification.cjs` confirms this folder is scratch space feeding `docs/audits/2026-09-12-customizer-spec-reconciliation/`: it copies `infantry-characterization.log`, `hydration.log`, `openspec-strict.log`, `openspec-strict-final.log`, `spec-purpose.log`, `ci-contracts.log`, and `format-owned.log` from this folder into `docs/audits/2026-09-12-customizer-spec-reconciliation/evidence/followups/` and writes `followup-verification.json`. `finish-readme.cjs` writes prose into `docs/audits/2026-09-12-customizer-spec-reconciliation/README.md` describing "the two customizer fixes" as "locally complete and remain active pending reviewed closure."

Work: the two changes are `fix-customizer-explicit-tab-precedence` and `repair-record-sheet-rendering` (Infantry follow-up), plus one open task on `add-customizer-pr-regression-gate` (observing its CI check/aggregator in a real PR — not done: "No commit, push, or PR has been created," per `finish-readme.cjs`).

Date range (file mtimes): 2026-09-12 03:48 to 2026-09-12 04:37.

## 2. Cited by

`git grep -n -F ".sisyphus/customizer-followups-20260912"` (excluding the roadmap-completion planning dir) and the same string search in `openspec/planning/2026-09-12-roadmap-completion` and `docs` both return only:

```
docs/audits/2026-09-12-customizer-spec-reconciliation/followup-verification.json:19:        "--output=.sisyphus/customizer-followups-20260912/browser-red-results"
docs/audits/2026-09-12-customizer-spec-reconciliation/followup-verification.json:189:        "--output=.sisyphus/customizer-followups-20260912/browser-results"
docs/audits/2026-09-12-customizer-spec-reconciliation/followup-verification.json:213:        "--output=.sisyphus/customizer-followups-20260912/browser-final-results"
```

These three lines are recorded Playwright CLI arguments inside a JSON evidence file (not links to be followed) — they will still read as historical text after deletion since `followup-verification.json` also embeds hashes/copies of the seven log files (see below), so it does not depend on this folder existing on disk. No other repo file references this path.

## 3. Key results

- `spec-purpose.log`: `spec:purpose:validate:strict` — "Files scanned: 220, Errors: 0, Tracked source-of-truth debt: 0".
- `ci-contracts.log`: `qc:openspec-ci` — `workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=13 accountedActiveOpenSpecChanges=13 errors=0`.
- `format-owned.log`: "All matched files use the correct format. Finished in 506ms on 65 files."
- `hydration.log`: `{"ok": true, "hydratedStandaloneServer": ".next\\standalone\\server.js", ...}` — production standalone hydration check passed.
- `infantry-characterization.log`: characterization (red) run against the pre-fix `InfantryPreviewTab` — `Test Suites: 1 failed, 1 total; Tests: 2 failed, 4 skipped, 6 total`. Failures: missing accessible "Zoom in" control, and a stale-render width assertion (`Expected: 222, Received: 111`) — i.e. the old component both lacked zoom controls and re-rendered with a stale width, matching the "111 overwrote 222" defect description in `close-local-tasks.cjs`.
- `openspec-strict-final.log`: `Totals: 233 passed, 0 failed (233 items)`.
- `record-verification.cjs` summary object (embedded in the script, written out to `docs/.../followup-verification.json`): `browserCases:12, browserRetries:0, browserPassed:true, affectedSuites:12, affectedTests:40, ciContractTests:28, strictSpecifications:233, canonicalPurposeChecks:220, typecheckPassed:true, lintErrors:0, lintWarnings:84, buildAndHydrationPassed:true, remoteCiObserved:false`.
- `record-verification.cjs` interpretation notes (embedded text): "Pre-fix browser run intentionally rejected missing Infantry controls and explicit Structure precedence"; "First rebuilt browser run: 10 passed, 2 failed due to broad armor selector and exact paper label mismatch. Precise named selectors corrected, final full run 12 passed."; "No remote PR/check activation; no commit or push."
- Browser artifacts confirm a red→green arc: `browser-red-results/` holds two failed-test folders (`error-context.md`, `test-failed-1.png`, `trace.zip` each) for `customizer-edit-recovery` (tabs-restore) and `customizer-record-sheet-re...` (metry-and-export) scenarios; `browser-results/` and `browser-final-results/` hold the corresponding passing runs (screenshots, generated PDFs).
- Verified: the seven logs `infantry-characterization.log`, `hydration.log`, `openspec-strict.log`, `openspec-strict-final.log`, `spec-purpose.log`, `ci-contracts.log`, `format-owned.log` are byte-identical to their copies in `docs/audits/2026-09-12-customizer-spec-reconciliation/evidence/followups/` — confirmed via `sha256sum` on `infantry-characterization.log` (`d97c1204f6987153e7ff93bf787a680fe0ad95c117e40e25f8816e922ccbb14f` in both locations).

## 4. Inventory

71 files, 19,474,147 bytes total.

```
be0ee8fcb6463d4e47ba6b52509b8169891483eba62deeb82d6f019925de5755  .sisyphus/customizer-followups-20260912/add-inventory-next.cjs
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  .sisyphus/customizer-followups-20260912/browser-final-results/.last-run.json
bbc861fe684cf7e3e1faf10f5454f50bc1e0425da2ba1109e0265b93fc8575d3  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-edit-recovery-s-71c90-e-selected-draft-customizer-chromium/library-recovery-mobile.png
403931f02757850327c38fc61e226a83f961c76674802976da95d3456c308a51  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-edit-recovery-u-4b397-independent-tabs-customizer-chromium/edit-recovery-mobile.png
0104240ae2ef6b483e5073ebec1eff417321b19f3053375004f22b2632e03786  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-equipment-catal-335ca-nrelated-filters-customizer-chromium/electronics-desktop.png
490ddb2ed4562d9a267b145cdaa1ff014232f80b796c54d911c3fd08225dcd9e  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/catalog-desktop.png
94b2d14e4e37a83d2bc230a005f0c600265cb7a34e15807332a6f92a3f2853e2  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/catalog-mobile.png
3f4e5947101567e73a16851016fd0157380063085bd76bca7ef28d327e31b1bf  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/placement-mobile.png
bb9a4e45fd6bc2328fff3164516771c96bd23ce72ac7e9f6326dba81d16e53e9  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-scrolled.png
4e3cd7eb6fa94fcd109e1f24a268e76ad7446e1f1609c9cd703e757d0a3e35a1  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-sidebar.png
bb7caa29e64fc6af71e22375ceda90e442c675bbcdb0e82842f17f8cf2e14d35  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-wide.png
c1f09af176270bd127d58a0303d1d1c412bb69667cc45eccd677d1d2865f26e0  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-mobile.png
e2b86c3e003963b8be5f06ad69637edcc8d68178b0ac5452a1014d0c41343d40  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-record-sheet-re-02aca-o-a-one-page-PDF-customizer-chromium/atlas-a4-page-box.pdf
5efa6f201d55c51b8b994e55e0a8f86acfff1b30601239976cc44d55f2a6ec1f  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-record-sheet-re-02aca-o-a-one-page-PDF-customizer-chromium/atlas-letter-after-retry.pdf
45f8c8dc372575986a6abe8cd4e5bfdf8ea983f4e252e7ce38fb6178a4ce2289  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-record-sheet-re-69880-metry-and-export-customizer-chromium/infantry-a4.pdf
0a21b728993247ae2c883110d8e1d66430d385cfec0dced8df317172a8213470  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-a4.pdf
154895bc2081894cc46ffbb866519a4c20f6ede7f5aa1eb21d266fdb49aa5aac  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-letter-after-switch.pdf
cc919981ae972e536b058ea0b6044e9ae270e036a191184ab162a2db81613d38  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-letter.pdf
396bab7bb4cf8c66738a4262cd10bc53db6817a0bc7d49864df5834735d22221  .sisyphus/customizer-followups-20260912/browser-final-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/locust-letter.pdf
32d7ca7263ae11628dd4bca7667f4ef0b804ce212e639faa3f89a1fd8de83712  .sisyphus/customizer-followups-20260912/browser-red-results/.last-run.json
6bb771fa3620079a7dc3abf1b14dfa5943538892e581e02711bebc61c1d19222  .sisyphus/customizer-followups-20260912/browser-red-results/customizer-edit-recovery-e-b329e--tabs-restore-it-customizer-chromium/error-context.md
83d68cc053673944ab7597a656effc2753c2e80753787564eea783759b1ed2da  .sisyphus/customizer-followups-20260912/browser-red-results/customizer-edit-recovery-e-b329e--tabs-restore-it-customizer-chromium/test-failed-1.png
5c53e48fa7603da34659e053e694ffcdfd05e3f7e5a4efba4119a06fc46040b2  .sisyphus/customizer-followups-20260912/browser-red-results/customizer-edit-recovery-e-b329e--tabs-restore-it-customizer-chromium/trace.zip
d4358c34775dea0abc5761ec22ba30f45179f8649a111c7662705c30c210c57f  .sisyphus/customizer-followups-20260912/browser-red-results/customizer-record-sheet-re-69880-metry-and-export-customizer-chromium/error-context.md
3b0614707a4b914bc7598e9d5f9e287631546b7e699f8131419a140873c27c6a  .sisyphus/customizer-followups-20260912/browser-red-results/customizer-record-sheet-re-69880-metry-and-export-customizer-chromium/test-failed-1.png
0d1b85e82dcee1d396300a22bfb5d292f3bfe6a1fa7b652d44b6e6abf206bd6f  .sisyphus/customizer-followups-20260912/browser-red-results/customizer-record-sheet-re-69880-metry-and-export-customizer-chromium/trace.zip
6d59130bd2b615fe774ee8fec511811262df1cd9dfddc33dde978134c6590a78  .sisyphus/customizer-followups-20260912/browser-results/.last-run.json
66933c5f881da38b1a95dccede24fa0f5322d51c9a518ce577299d19c5cb4917  .sisyphus/customizer-followups-20260912/browser-results/customizer-edit-recovery-s-71c90-e-selected-draft-customizer-chromium/library-recovery-mobile.png
8a3a29be53350d3aaad39e362f0cde489e0ec30507db345b9da190b97f466293  .sisyphus/customizer-followups-20260912/browser-results/customizer-edit-recovery-u-4b397-independent-tabs-customizer-chromium/error-context.md
f7e0c39ee22ce1f82fbd23f8b43585fea54958807dbef8820f197cf2813f15e6  .sisyphus/customizer-followups-20260912/browser-results/customizer-edit-recovery-u-4b397-independent-tabs-customizer-chromium/test-failed-1.png
9cec9b3f7e1e2ee76047c463dd7d86c8394c38d66014c722236399addde3492d  .sisyphus/customizer-followups-20260912/browser-results/customizer-edit-recovery-u-4b397-independent-tabs-customizer-chromium/trace.zip
0104240ae2ef6b483e5073ebec1eff417321b19f3053375004f22b2632e03786  .sisyphus/customizer-followups-20260912/browser-results/customizer-equipment-catal-335ca-nrelated-filters-customizer-chromium/electronics-desktop.png
490ddb2ed4562d9a267b145cdaa1ff014232f80b796c54d911c3fd08225dcd9e  .sisyphus/customizer-followups-20260912/browser-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/catalog-desktop.png
0d8685340d43a0193cf855a746ddee1051f2a9af7244fc6c69b80c68acc58632  .sisyphus/customizer-followups-20260912/browser-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/catalog-mobile.png
3f4e5947101567e73a16851016fd0157380063085bd76bca7ef28d327e31b1bf  .sisyphus/customizer-followups-20260912/browser-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/placement-mobile.png
a27e89cbda01b82e0d54510df3eb1ac77443d1573e5ddc9fd682610765c9ef28  .sisyphus/customizer-followups-20260912/browser-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-scrolled.png
3c01d1bfe50ac55dbf24ff2300a42afa4ab326851d865ba844381357027c1491  .sisyphus/customizer-followups-20260912/browser-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-sidebar.png
442d90f8343fc386454cc84f90c7836bed901a66ecf6e49f440beef7bbcad68c  .sisyphus/customizer-followups-20260912/browser-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-wide.png
f036342090dcfec776f6a389a422819f0f6846d4f6d86b5c1c37308bb02a4294  .sisyphus/customizer-followups-20260912/browser-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-mobile.png
c02111dee40085e138d0eff5c2d8e7d38c3d05bfcebd7b5857097e76a15cc973  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-02aca-o-a-one-page-PDF-customizer-chromium/atlas-a4-page-box.pdf
9a6b956f5b0780c7e6898bbac98676461b36f3d7bb0bf6363bfbbb1cac1e644e  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-02aca-o-a-one-page-PDF-customizer-chromium/atlas-letter-after-retry.pdf
8ba0f27ad6860e44be76311c8ecb779f8a3062ccc04fa70b504ec4b6c961191d  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-69880-metry-and-export-customizer-chromium/error-context.md
9b71f31282be5e26fb11a9cd7d70eeb659007604378b5c7c956a1126b03aa33a  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-69880-metry-and-export-customizer-chromium/test-failed-1.png
137b9d41d1da5ca8df7e9dd1ae511eaf64f997e49469396d9d173dfac4ece2e3  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-69880-metry-and-export-customizer-chromium/trace.zip
db355417f48cca58c79f7dce63b5b3b0fb3f722206da78c7c2d6885c3dea4634  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-a4.pdf
f1889595cd800159f74505d9597a15b81b84d6029df5ec045e6c94e39f9a319c  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-letter-after-switch.pdf
76271a699d399573bd33319a93e2a5cbb7d4b904d80bb6b5ab9d14039df03061  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-letter.pdf
f26189f3093393585b58bf1055cca71a26591daec81540a197549bf814aa63fc  .sisyphus/customizer-followups-20260912/browser-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/locust-letter.pdf
b8d4980347c837d0e133f8dc39f8c10173b92969d77ffeaefe0f03644732c392  .sisyphus/customizer-followups-20260912/characterize-infantry.cjs
733ab69d272db2fd5d9a47b9a4fc4ff307b5ac517131ebd2a2f41b734f2e2c68  .sisyphus/customizer-followups-20260912/ci-contracts.log
f1d192c79dd642e1f5e0c0b9ce77b3f48c0fab2b9c9c9a145ff1c3d5dfe48af9  .sisyphus/customizer-followups-20260912/close-local-tasks.cjs
6032d92b86e62190bec070162326d58cf2808e036477defe9c6967950c4ba708  .sisyphus/customizer-followups-20260912/final-format.cjs
9eaa9ad794b0614766dee54d29a53dd6e01808021a9b35498b79bbc32c190e1e  .sisyphus/customizer-followups-20260912/final-inventory-check.cjs
f912997a7c79eb86b1455569c35b03ed7af6adc6bc2db073eadc6a15a3fc2814  .sisyphus/customizer-followups-20260912/finish-infantry.cjs
bfc355eee576b44f559e729a881e7822d87033d9cc3f8a82318d6a3957d956dd  .sisyphus/customizer-followups-20260912/finish-readme.cjs
8a48e272f95b6a049323a318915293b37846bad739dd8a861f0e6ed0575b725a  .sisyphus/customizer-followups-20260912/fix-router-mock.cjs
9cf8cb942a1c10588229b2e85766515e8128e33c21b46fd553e0670fd6d740eb  .sisyphus/customizer-followups-20260912/fix-routing-spec-section.cjs
3cfdfe2eb24aeaa3597306e57319cab459cb1924a2494743411da4cd666dc53a  .sisyphus/customizer-followups-20260912/format-owned.log
440b61a33c9099385a826c2e28f12f7729dc1535a21e2e81aad6bfca0b427c85  .sisyphus/customizer-followups-20260912/hydration.log
d97c1204f6987153e7ff93bf787a680fe0ad95c117e40e25f8816e922ccbb14f  .sisyphus/customizer-followups-20260912/infantry-characterization.log
a836b5558a82c59baac801efe60fcee0c1badffc4ef5734c772700c776da2e32  .sisyphus/customizer-followups-20260912/openspec-strict-final.log
c13cf7480bc2562c40acacd5a3dfb53b6eb0a48fa1b64b7b6495fb77d89a8581  .sisyphus/customizer-followups-20260912/openspec-strict.log
ab6749dafa8bf79dfe9774d9c00cd0d40172641cdf77bb471db995479dd32c04  .sisyphus/customizer-followups-20260912/record-verification.cjs
ea0876d5c44b10524d49afcc56210fbb774e7af85e09c6f770bbc039cccf6443  .sisyphus/customizer-followups-20260912/refresh-inventory.cjs
887eb4cbf5a78c41ac625cb9becb74375321a9e40f66eb3dd5146e4075d1c040  .sisyphus/customizer-followups-20260912/refresh-local-status.cjs
77455d0f614d98fef16e5775ebbbc0b6d038ceedc23953b5dcecbf145ce5cc31  .sisyphus/customizer-followups-20260912/repair-vault-proposal.cjs
7c0ef64ff56416c105f73466d23eccbde4a97e9f1b2062a2a740d39278d03317  .sisyphus/customizer-followups-20260912/spec-purpose.log
c8749ba4093537bf9b0f85e4efa8f34c963c774ad943a3231318954533dc8222  .sisyphus/customizer-followups-20260912/sync-followup-specs.cjs
fe6ea2de2fb393d32f8a43e4eb1622390e87a6d370d0ae652ea4d39581660bd1  .sisyphus/customizer-followups-20260912/update-ci-docs.cjs
736ab30fc97e79aac49259148e1156dba3fe1fa59542029d672b852df6b4daa3  .sisyphus/customizer-followups-20260912/update-counts.cjs
613f982760b31fdbf46f3e2a016f7aee08ea96b77f117091e18264d6d72e9cf8  .sisyphus/customizer-followups-20260912/update-detail-records.cjs
```

## 5. Safe to delete

Not reconstructible from git: the 40 screenshot/PDF/`trace.zip` files under `browser-final-results/`, `browser-red-results/`, and `browser-results/` (23 PNG screenshots, 13 generated record-sheet PDFs, 4 `trace.zip` failure traces) plus the `.cjs` driver scripts themselves; the seven `.log` files (`infantry-characterization.log`, `hydration.log`, `openspec-strict.log`, `openspec-strict-final.log`, `spec-purpose.log`, `ci-contracts.log`, `format-owned.log`) are already byte-identically preserved under `docs/audits/2026-09-12-customizer-spec-reconciliation/evidence/followups/`, so only those seven are safe in the sense of already being duplicated elsewhere in git.
