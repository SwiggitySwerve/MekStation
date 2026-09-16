# equipment-catalog-20260910 — distilled evidence

## 1. Purpose

Evidence for the `repair-equipment-catalog` OpenSpec change, run as a parallel Grok-CLI worker fan-out (browser-worker, filter-audit, filter-worker, placement-worker) plus a parent hub driving build/lint/types/spec/browser gates. Purpose and scope, quoting the parent's `README.md` pointer to this folder:

> "Detailed logs and preserved failed attempts: `.sisyphus/equipment-catalog-20260910/`." (`docs/audits/2026-09-10-equipment-catalog/README.md:47`)

Worker prompts establish the task: fix a broken Playwright matcher on a disabled catalog `<option>` (`browser-worker/prompt.md`: "Concrete reproduced failure: first catalog browser scenario passes, but Add and place scenario at line 116 fails on `expect(dialog.getByRole('option', ...)).toBeDisabled()`"); audit ammo-filter/reactive-sync/Electronics-category bugs from a pre-supplied source dump (`filter-audit/prompt.md`); re-verify the filter/pagination/ammo-compatibility path after the audit's fixes (`filter-worker/prompt.md`); and re-verify catalog "Add and place" placement legality, fixed mounts, and undo (`placement-worker/prompt.md`).

Findings:

- `browser-worker/REPORT.md`: root cause was Playwright's `elementState("disabled")` retargeting an `<option>` inside a `<label>` to its enclosing native `<select>` before checking `disabled`; fixed by asserting `toHaveJSProperty('disabled', true)` directly on the option instead. Test-only fix; isolated rerun of the new spec against the running production build passed 2/2.
- `filter-audit/REPORT.md`: three proven defects — (1) ammo-to-weapon matching used substring comparison on `name`/`id` instead of the catalog's `compatibleWeaponIds` field (false positives like `ac/2` matching `ac/20`, false negatives like `is-lrm-15` vs `lrm/15 ammo`); (2) filtered results were memoized against hook-local values while reading a Zustand `unitContext` written later in a `useEffect`, so results went stale until an unrelated filter (e.g. Hide Ammo) forced a refresh; (3) `EquipmentCategory.ELECTRONICS` was folded into the "Other" filter bucket with no dedicated control, so it was discoverable only via the ammo-count side effect of toggling Hide Ammo.
- `filter-worker/REPORT.md` and `placement-worker/REPORT.md`: both report **no actionable findings** — the audit's fixes were already present in the owned files by the time these workers ran, confirmed by focused regression runs (18 tests / 2 suites for filter-worker; 10 tests / 2 suites for placement-worker).

Date range (file mtimes): 2026-09-10 14:47 to 2026-09-10 15:48.

## 2. Cited by

`git grep -n -F ".sisyphus/equipment-catalog-20260910"` (excluding the roadmap-completion planning dir) and the same string search in `openspec/planning/2026-09-12-roadmap-completion` and `docs` return the same 8 lines:

```
docs/audits/2026-09-10-equipment-catalog/README.md:47:Detailed logs and preserved failed attempts: `.sisyphus/equipment-catalog-20260910/`.
docs/audits/2026-09-10-equipment-catalog/browser-worker-report.md:6:- `.sisyphus/equipment-catalog-20260910/browser-worker/**`
docs/audits/2026-09-10-equipment-catalog/browser-worker-report.md:67:npx playwright test --config=.sisyphus/equipment-catalog-20260910/browser-worker/browser.config.cjs
docs/audits/2026-09-10-equipment-catalog/browser-worker-report.md:70:Config copy: `.sisyphus/equipment-catalog-20260910/browser-worker/browser.config.cjs`
docs/audits/2026-09-10-equipment-catalog/filter-worker-report.md:36:- `.sisyphus/equipment-catalog-20260910/filter-audit/REPORT.md` (old findings)
docs/audits/2026-09-10-equipment-catalog/filter-worker-report.md:37:- `.sisyphus/equipment-catalog-20260910/catalog-tests-corrected.json` (182 passed earlier)
docs/audits/2026-09-10-equipment-catalog/placement-worker-report.md:31:- `.sisyphus/equipment-catalog-20260910/placement-tests.json` — prior 30/30 pass including owned suites
docs/audits/2026-09-10-equipment-catalog/placement-worker-report.md:112:Prior hub run `.sisyphus/equipment-catalog-20260910/placement-tests.json`: 5 suites / 30 tests passed, including these two files plus omni, CriticalSlotsTab smoke, and unitEditHistory (those extras are not owned and were not re-run).
```

Both searches return the same 8 lines across 4 files: 1 pointer line in `README.md` plus 7 prose/command lines across the three `docs/audits/2026-09-10-equipment-catalog/*-report.md` files (verbatim copies of this folder's own `REPORT.md` files). After deletion, the `browser.config.cjs`/`REPORT.md`/`catalog-tests-corrected.json`/`placement-tests.json` paths named in the docs copies will not resolve, but the docs copies themselves retain the full report text and numbers.

## 3. Key results

- `catalog-tests-corrected.json` / `.log`: `numPassedTests: 182, numFailedTests: 0, numTotalTests: 182, success: true` — `Test Suites: 9 passed, 9 total`.
- `types-final-status.json`: `tsc --noEmit`, `code: 0`.
- `lint-final-status.json`: `oxlint`, `code: 0`.
- `spec.log`: first attempt failed — `Error: Cannot find module '...@fission-ai/openspec/bin/openspec.js'` (`MODULE_NOT_FOUND`); `spec-final.log` (after install/fix): `Change 'repair-equipment-catalog' is valid`; `spec-all-exit-code.txt`: `0`.
- `browser-final-status.json`: Playwright run against `browser-final.config.cjs`, `code: 0` (2026-09-10T21:44:46Z → 21:45:20Z).
- `browser-worker/REPORT.md` isolated rerun: "2 passed (8.7s)", exit 0, against already-running production `http://localhost:3634`.
- `placement-worker/REPORT.md` owned regression: "2 suites, 10 tests, all passed... ~11.8s"; prior hub run `placement-tests.json`: 5 suites / 30 tests passed.
- `filter-worker/REPORT.md` owned regression: "2 suites, 18 tests, all passed, ~1.6s"; cites "182 focused tests passed" from the hub as not needing re-run.
- Parent's rollup table in `docs/audits/2026-09-10-equipment-catalog/README.md` (not a file in this folder, but summarizing it): "New regression characterization: 14 failures before repair; all pass afterward"; "Focused catalog and placement checks: 9 suites / 182 tests pass"; "Independent final browser run: All 5 scenarios pass, no retries or skips"; "Full stable suite: 2,662 suites and 35,134 tests pass; one unrelated failure... 16 skipped tests"; "Lint: 0 errors; 84 existing warnings"; "Strict OpenSpec: 230 items pass"; "Production build and standalone hydration: Pass; build `1789075502145`".

## 4. Inventory

153 files, 10,689,226 bytes total.

```
7439555011ae3de78a6276592a0d3e6d2dad81d30dfce1cac6f7d3faa4c279e2  .sisyphus/equipment-catalog-20260910/browser-artifacts/.last-run.json
542598769b35a9c6c3de73a274eb5bbbf4e5a9259577b14435390210c3f12bfe  .sisyphus/equipment-catalog-20260910/browser-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/library-recovery-mobile.png
b9d64a9619abdb2d677f9e6528332557de7dc7a05bd6a8e38b055d69fd05b024  .sisyphus/equipment-catalog-20260910/browser-artifacts/customizer-edit-recovery-u-4b397-independent-tabs-customizer/edit-recovery-mobile.png
15b23d80d2f569a9dbbae5571006980a59d5b04313187e1d2005bdd783c23ecd  .sisyphus/equipment-catalog-20260910/browser-artifacts/customizer-equipment-catal-335ca-nrelated-filters-customizer/electronics-desktop.png
2bec84675a5eb7bbd46ea0d019283f93d4dc4e40ecf572953eab36e2e08935ef  .sisyphus/equipment-catalog-20260910/browser-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/error-context.md
7ce3c9afeef406d4d6afb5bc7cc09e64ed85be9cbc76d9955ccdc067c2bc6087  .sisyphus/equipment-catalog-20260910/browser-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/test-failed-1.png
2cc269b41ad95f0ec276a1a86b856bf94f65095f3e97b19bb20fdc6ddc21173f  .sisyphus/equipment-catalog-20260910/browser-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/trace.zip
1f63300a5f9368291649bbd3fc90606891156316372ba619f16aa584971058ec  .sisyphus/equipment-catalog-20260910/browser-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/criticals-mobile.png
7f8ae180d109481b6737374db45387a3a3e08d2afa078e973846f5d2ac52043e  .sisyphus/equipment-catalog-20260910/browser-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/equipment-desktop.png
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/.last-run.json
36103d51f2884af2f856d6a72c4fb9443801d9bdff7a3573a8bfb8a1dc8b2640  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/library-recovery-mobile.png
22cd4e93a15a3e6f3e857ba96b80934698a2e50f17d37eb4c9495a6a0bbc3b39  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/customizer-edit-recovery-u-4b397-independent-tabs-customizer/edit-recovery-mobile.png
90016562f2153632a014f301ac3ed87c22c3a6c06ac96d65229531db2e00ab2c  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/customizer-equipment-catal-335ca-nrelated-filters-customizer/electronics-desktop.png
3c5eb0d13406fadc9debc56baaf19110af0df63876a895c15a9b0951cc896620  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/catalog-desktop.png
2d00051427af4fe194429c3914af7c40b2e432370cf0d08144df99a385a1832a  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/catalog-mobile.png
6b89a5623caa5570bd084c759e8afb1a85e872bcbfa070de42558c13aebdd1d0  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/placement-mobile.png
7cc7287d0f4ed60b17eb46b6d6df9a8008efe8ec8175db9b5f5f3e5d6041afb0  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/criticals-mobile.png
e31ed441a901174255dbe2bdedef5b1f3fb3f7ac4d6bbb1efa518d0ec44296de  .sisyphus/equipment-catalog-20260910/browser-final-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/equipment-desktop.png
cc6a8d0f7b8fa64178de3b469e64eee1b4029ae37042be20bf079c917eda81b9  .sisyphus/equipment-catalog-20260910/browser-final-results.json
aa25633cefeec395224a70a580fc6735e4c8540f0c64f2c7492db10c8863437d  .sisyphus/equipment-catalog-20260910/browser-final-status.json
057c9a43c2ce97e58761a0644f1a7bde9870cd401e1f38e5641ba4e2eec55f85  .sisyphus/equipment-catalog-20260910/browser-final.config.cjs
bcf03139d32b56403387b9b1036bf4b5e68f5efc3e7e9f0a33934cc18b814336  .sisyphus/equipment-catalog-20260910/browser-final.log
e0c951f288d14b91fba61968b7cffcc541f382ca90bbead4761fd70b77df47e1  .sisyphus/equipment-catalog-20260910/browser-results.json
33ff2562b327d307ca1594518d9cebde155d922e88924ab7629b7fe06edf76a8  .sisyphus/equipment-catalog-20260910/browser-status.json
a984e5cd162292116e15ec087a78aceccde949bbc0d695a811a06ef464fdabfe  .sisyphus/equipment-catalog-20260910/browser-worker/REPORT.md
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  .sisyphus/equipment-catalog-20260910/browser-worker/browser-artifacts/.last-run.json
90016562f2153632a014f301ac3ed87c22c3a6c06ac96d65229531db2e00ab2c  .sisyphus/equipment-catalog-20260910/browser-worker/browser-artifacts/customizer-equipment-catal-335ca-nrelated-filters-customizer/electronics-desktop.png
3c5eb0d13406fadc9debc56baaf19110af0df63876a895c15a9b0951cc896620  .sisyphus/equipment-catalog-20260910/browser-worker/browser-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/catalog-desktop.png
2d00051427af4fe194429c3914af7c40b2e432370cf0d08144df99a385a1832a  .sisyphus/equipment-catalog-20260910/browser-worker/browser-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/catalog-mobile.png
6b89a5623caa5570bd084c759e8afb1a85e872bcbfa070de42558c13aebdd1d0  .sisyphus/equipment-catalog-20260910/browser-worker/browser-artifacts/customizer-equipment-catal-63444-sktop-and-mobile-customizer/placement-mobile.png
a7ed6a1f9a4c5e59983a871cdddd5a03c20d862f9e54844bafcaee184ca41ae9  .sisyphus/equipment-catalog-20260910/browser-worker/browser-results.json
00dd4cc026959a5b0680f2276b6d7db97ebe6e7e01bb967c1b2a7a42fdab78c7  .sisyphus/equipment-catalog-20260910/browser-worker/browser.config.cjs
65b86f2964a72389e75f9e3b2d518109db28fad980279e5d0b938a0ebd6edea2  .sisyphus/equipment-catalog-20260910/browser-worker/events.ndjson
0fbb3a7c827db01618b309df25ee1208d58b8129ef3c1a040535ba7370b3508a  .sisyphus/equipment-catalog-20260910/browser-worker/initial-status.json
d943fa6bac946bcbc90a7eee8182bd1cfcf6c0d0284481bbb2ff7d9605d538d4  .sisyphus/equipment-catalog-20260910/browser-worker/prompt.md
0a2c53f283d94eb503a381fd21419950f3a1d4de018ba325b12bf67e01a29ac3  .sisyphus/equipment-catalog-20260910/browser-worker/resume-events.ndjson
e8c44a90764b8f8089c4f067c84c74928f525885f87b0d692ee3be3ee569a36e  .sisyphus/equipment-catalog-20260910/browser-worker/resume-prompt.md
5a591f9e1b103222351ed0c096296278834fee88e88e0c48337935ba827ac824  .sisyphus/equipment-catalog-20260910/browser-worker/resume-session.txt
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/equipment-catalog-20260910/browser-worker/resume-stderr.log
4d01901f1b725f2ae87040e8594d03c62e4d6ed264339fdcbee582b695376bc8  .sisyphus/equipment-catalog-20260910/browser-worker/status.json
b3e62995cdc9d267dd575413b26c5eb3c56eb3f54d816fc4ace8f7b91c7d1b1f  .sisyphus/equipment-catalog-20260910/browser-worker/stderr.log
dff69deb71594c9ff3dff056e5edc3a59689a0eb7d408e3ece976b75f7628224  .sisyphus/equipment-catalog-20260910/browser.config.cjs
6437eb3de7ad60a7a266f50d686a4fb24b57746a25f26d5f3d241d4b8abb9987  .sisyphus/equipment-catalog-20260910/browser.log
561e73132e9879d42863b5b6910f5b9f4c3264ccf59177d07c82df3b4db69964  .sisyphus/equipment-catalog-20260910/build-status.json
999a2942e95e082dcf8a9bd18172c6d444b9f9ed29dc9b0732d6ee84c7824f2f  .sisyphus/equipment-catalog-20260910/build.log
2bb7087b57d5bc4a57f0ff556d37f7058d4f0c69706460b41322f36104cbc038  .sisyphus/equipment-catalog-20260910/catalog-tests-corrected-status.json
04395f887b80a87d61f5b0894b79a1775fc6564ff6b412cd3a9d0d53044bf7dc  .sisyphus/equipment-catalog-20260910/catalog-tests-corrected.json
eadd4a34e4682ff3df0c2a4c61376ab70005a3e3bee5b47e3589715302593ebf  .sisyphus/equipment-catalog-20260910/catalog-tests-corrected.log
45bbd277fe5db7801ade137b7d9ea00fc3b78053215ef644473784226a70bb72  .sisyphus/equipment-catalog-20260910/catalog-tests-final.json
84df05a9842bbb9cb44dd7916614a8de98fab4a66067695efaf08b1e13d3b29a  .sisyphus/equipment-catalog-20260910/catalog-tests-status.json
9d5c637ebc1daf9c74ee255a62da4bc7b1a38d4df9a07c11c3eb88d971db5b4b  .sisyphus/equipment-catalog-20260910/catalog-tests.json
b209571f1a2e0ee721e97265482055ffa7c0fad75a2ccebae7deb38ba4c2f811  .sisyphus/equipment-catalog-20260910/catalog-tests.log
8c47de99b67c75327d88701c397fab272a670a6b26093ad1a4df90fd3126c1a3  .sisyphus/equipment-catalog-20260910/characterize-filters.cjs
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/equipment-catalog-20260910/diff-check-final.log
04a012e3aacb35de4f1e46d146705dec9b052c1a9e1853991f8469d23020ab25  .sisyphus/equipment-catalog-20260910/existing-catalog-tests.json
8bc0ff02bc5e8d6e5ba06d8ff2a19a8d6338f1b6f1f67bd7a316b79d272a2038  .sisyphus/equipment-catalog-20260910/existing-catalog-tests.log
1ada3f6d002165c10d341c307e918cb44c261ba94906e8f64d1ad6badb5203b3  .sisyphus/equipment-catalog-20260910/filter-audit/REPORT.md
beecc26e728ad63c93a5605e599592145b54eaa1b8884fbc80e7b275418b308d  .sisyphus/equipment-catalog-20260910/filter-audit/events.ndjson
e1ffd86bfec5ae6a76a8cf499df1878a438b1c6d624c127f5bd48a57ec50a1cd  .sisyphus/equipment-catalog-20260910/filter-audit/prompt.md
21b06bc14f858d8668dc549f277223a5f166f9426afc6685a71448f6e879f9ee  .sisyphus/equipment-catalog-20260910/filter-audit/public-source.txt
c7016af103068b9b89e23857959908933a6e75f116a02cda97afa83f68f30196  .sisyphus/equipment-catalog-20260910/filter-audit/status.json
b3e62995cdc9d267dd575413b26c5eb3c56eb3f54d816fc4ace8f7b91c7d1b1f  .sisyphus/equipment-catalog-20260910/filter-audit/stderr.log
3c5855a9c051d11eedfb66e42c3e8e5bf80906d6343a0ca54d0bb00e190b007d  .sisyphus/equipment-catalog-20260910/filter-characterization.json
42ea73350714adc97b3c4e2ea037dfa9628f61432a283c61990f159acd5da09b  .sisyphus/equipment-catalog-20260910/filter-worker/REPORT.md
e1bad84c8677de8b44ccd2161d1082c82b90a58ecdd4fe107cc1c821f86afaed  .sisyphus/equipment-catalog-20260910/filter-worker/ammo-meta.json
b8f873e3a740cd97ee89c19f6c5625a1e84a69bc27b5f41a0960477186904c47  .sisyphus/equipment-catalog-20260910/filter-worker/events.ndjson
138dfb6a445c56a1e93301f47d7fe0601fb3c367c2f6c362437a99e3af701f62  .sisyphus/equipment-catalog-20260910/filter-worker/initial-status.json
40b6f0cc7cde39bab5e8e1ad28f9779dc960e50bf976d26b7cde99b3bb7824b5  .sisyphus/equipment-catalog-20260910/filter-worker/prompt.md
40f747fa76eb2042b5442d0d0f6268d6662f55039f16d33432eedeb40dd8ea0a  .sisyphus/equipment-catalog-20260910/filter-worker/resume-events.ndjson
ecac2d6d3b9a77ce544228e95e99ca8d356e052005ae0a98b160e2bb61b7b966  .sisyphus/equipment-catalog-20260910/filter-worker/resume-prompt.md
d6f042008d52f0bf06089da49fb4f0e172327583037dae60d7a5c69ffc74d7bf  .sisyphus/equipment-catalog-20260910/filter-worker/resume-session.txt
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/equipment-catalog-20260910/filter-worker/resume-stderr.log
0f1d947a077f33f75d2e1870d63198b2dddd7a18244da8db31d658717fd28a77  .sisyphus/equipment-catalog-20260910/filter-worker/status.json
b3e62995cdc9d267dd575413b26c5eb3c56eb3f54d816fc4ace8f7b91c7d1b1f  .sisyphus/equipment-catalog-20260910/filter-worker/stderr.log
8aacf3abac4610a36a5f9b4817d224a6f811fc978affb696099e3cf45749a530  .sisyphus/equipment-catalog-20260910/format-check-status.json
d86a549a9148b3c321d9d6bf9d3ce71267e3cdd760df6660d48844e6851f4591  .sisyphus/equipment-catalog-20260910/format-check.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/equipment-catalog-20260910/format-write.log
c6428460b35eb0d515d73bbdf0f51a242b5453dcb3bc35130422a1cf0e023b86  .sisyphus/equipment-catalog-20260910/grok-readonly-runner.cjs
1c50a457c04a09dd6eb6b53f1ac03759752cd4c373460a7e6572c87d8024d043  .sisyphus/equipment-catalog-20260910/grok-worker.cjs
68abbdfe30125834243f50ef94029e75d78e7a9f04af5fcfd0bf681cb51f5cda  .sisyphus/equipment-catalog-20260910/hub-context-corrected-status.json
927d295409d620df98d8d5a646ae2046f024030bacab5858f5509dcd2dacf3fe  .sisyphus/equipment-catalog-20260910/hub-context-corrected.log
8f9ef6657e4ebb3ba0b67505d118395736a9f9c654258c5c1fa06336c9c4d4f8  .sisyphus/equipment-catalog-20260910/launch-check.cjs
e56d598f2f07e996bb2ca35688185b64685d1002900335de7cd461b7534ab7df  .sisyphus/equipment-catalog-20260910/launch-grok.cjs
3fa2c251bcbf74aca45c79760f2f6a698b4bc5f160d6c6102a67fa987c383fb0  .sisyphus/equipment-catalog-20260910/launch-resume.cjs
6b263b65f7f1fcf0260e849afeab06d19f167ecf47be8445166b6d6d9dab834b  .sisyphus/equipment-catalog-20260910/launch-review.cjs
fc7467244d0604df192a2169e940b91143f04f8daaa39d2810b5f182ef1d6ed7  .sisyphus/equipment-catalog-20260910/lint-final-status.json
8ed4bebe78dcce50c6abd04afb7ea694302e4d04c41f1557c89f8b0312aef3d6  .sisyphus/equipment-catalog-20260910/lint-final.log
da12edf8f53d7ab02fd6c66ee62711ab4efba42998490f119f7307dfaafe83f6  .sisyphus/equipment-catalog-20260910/lint-required-status.json
63777ec8317343e0316404e8c6f12e3ad845f2262f54467c79413146e5b2f530  .sisyphus/equipment-catalog-20260910/lint-required.log
2a5d94f7caeeefd0e9e51f82b98c31a6e31f38f0f37ddefa882f138c77ab6e19  .sisyphus/equipment-catalog-20260910/lint-status.json
b1f693ea15cde92172a7a57fce530b4ebfbd01c022002ca9dea2e282db45c191  .sisyphus/equipment-catalog-20260910/lint.log
41856c57718e5a4b88562d3414b4c211b092bdc4ccb914fd0a1b6e98ca75e1b6  .sisyphus/equipment-catalog-20260910/option-matcher-evidence.json
08632336c3d209b0624d4070f241f3aa8b64cb06108d86d826878b28c046d1cd  .sisyphus/equipment-catalog-20260910/owned-files.json
11c18d98e7228c5754403b9a48cbbbd8baa9956ff3b8bd576db8e5f0dde1e9bd  .sisyphus/equipment-catalog-20260910/owned-format-check.log
cd44a7abc23ff2e925fccf6142e9f4154cf5e8aeb4959c4607ca0cbfe2c9cb71  .sisyphus/equipment-catalog-20260910/owned-format-final.log
d5b3538509bd2e713dcb5c83536bd103e38342ffede85f88b9ac17a4297058fe  .sisyphus/equipment-catalog-20260910/placement-tests.json
6d8489cd3d68ce49243479804a8957bdc0ce38c0ede854f67981b72324f31090  .sisyphus/equipment-catalog-20260910/placement-tests.log
e11a981badacb603cbd85e3f635034943705569ed9b8fd293dbaad053215d453  .sisyphus/equipment-catalog-20260910/placement-worker/REPORT.md
7411500daca622b29797d8fb9f6fe265e6275e5ac3291ad2ed5ffb259868fd38  .sisyphus/equipment-catalog-20260910/placement-worker/events.ndjson
76760481932344a9f1ba308b49af2b1d7c427131b15a1e36dade846fb2ede13c  .sisyphus/equipment-catalog-20260910/placement-worker/initial-status.json
cdd9655654e1812cf59e8220174e93c8484f3227f16c32f9f465c32ca777797a  .sisyphus/equipment-catalog-20260910/placement-worker/prompt.md
7d14e202ad43b592e09a57655e65c5a24f64f4f106a3288df24d3d94523ef591  .sisyphus/equipment-catalog-20260910/placement-worker/resume-events.ndjson
2633330e1bb683155501009af970bb3ba1ea6013a289307ed05f3ae4041d9158  .sisyphus/equipment-catalog-20260910/placement-worker/resume-prompt.md
3487dbbf6850a6438855c24c8a51ef72d481ab3dfe71dd3f84483789eb22ec0e  .sisyphus/equipment-catalog-20260910/placement-worker/resume-session.txt
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/equipment-catalog-20260910/placement-worker/resume-stderr.log
2ad9c1139e12ddacf5492defc8ef8d33e5454dd4cf1c21299039140f5d456f22  .sisyphus/equipment-catalog-20260910/placement-worker/status.json
b3e62995cdc9d267dd575413b26c5eb3c56eb3f54d816fc4ace8f7b91c7d1b1f  .sisyphus/equipment-catalog-20260910/placement-worker/stderr.log
5a97b3f15924a3ab900905a261de4b29676923bed9af62269ca3708640a9cf9d  .sisyphus/equipment-catalog-20260910/pre-grok-hashes.json
5e220e30b05b1bbb3c8e8477901b826e56a14a2c4f2a564d1d83111347e663d4  .sisyphus/equipment-catalog-20260910/preview-verification.json
a51066143ef59fb31c92e3b9601ae4252d73b3bf0e29a706e9acb7a9ffc6be70  .sisyphus/equipment-catalog-20260910/protected-files.json
e1c283648d2d7fb430072cf01c9d3b4a1fbbddeae44846eaad6b579ba6849abe  .sisyphus/equipment-catalog-20260910/protected-verification.json
5ea39bb35373042e41e75db45ae5d4df5485615dde33572d3bbdc383424300e3  .sisyphus/equipment-catalog-20260910/qc-route-failure.json
3532b0f0d8b91fa02b6688d0c4f38ebc6ca60874c412254a40d1d6ea7f5e41e9  .sisyphus/equipment-catalog-20260910/regression-after.json
7b833c13d5ae079f15b88dbcd35af6782d8c2ab9405bf53fd1714a61bc3fa978  .sisyphus/equipment-catalog-20260910/regression-after.log
9917418b697545d74b02b5a9de08154d59724e7277e568ef670eb6814a973eb8  .sisyphus/equipment-catalog-20260910/regression-before.json
0f33ee5fc46e5923d8650d8e6547083a6f149c11ea63f8be1c17c4152ea7c80b  .sisyphus/equipment-catalog-20260910/regression-before.log
d53fa94448ec0a290550f1bdc93c488c4a016ea8c0ffa18df5725288e7824c48  .sisyphus/equipment-catalog-20260910/resume-grok-worker.cjs
6ffce775b9551a5b5041798699e39c26680e3617633f196843a0c5f441ccb701  .sisyphus/equipment-catalog-20260910/root-before-status.txt
78e803982bc9cf5e7646fb458ab927f9c388b51a53f852f83ee3d5ebe1415877  .sisyphus/equipment-catalog-20260910/routing-current.json
cf6c417ed2c8a72ddfe8055e2371bb5612d66fe5c96ecfd2604f32cab1a5cbc6  .sisyphus/equipment-catalog-20260910/routing-drift.json
48cd5b1e260977846786d7919d29a1d5c8a5e86001e37dfb5931020e529b21ce  .sisyphus/equipment-catalog-20260910/run-check.cjs
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  .sisyphus/equipment-catalog-20260910/runtime-tests/mekstation.db
f24ffe9dbd28ab3ed01309d36615e6a15622bb56e93c1edd0a53d4a072eda1ff  .sisyphus/equipment-catalog-20260910/runtime-tests/mekstation.db-shm
554fc9e96fc0b101afbb2ec5e598c2fed0d0807944cc850b3acfc8b41456d5c6  .sisyphus/equipment-catalog-20260910/runtime-tests/mekstation.db-wal
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  .sisyphus/equipment-catalog-20260910/runtime-tests/multiplayer.db
e776b186dc9676f6780100efe3b8698f862e256fe1286bfad8b329f202e7cc77  .sisyphus/equipment-catalog-20260910/runtime-tests/multiplayer.db-shm
54bac1a80b7fe47d97bcf81b35205e8ab558f931402d844fc5438e76987dadd3  .sisyphus/equipment-catalog-20260910/runtime-tests/multiplayer.db-wal
1cdbe39382ad73f4496ca9709b8dd51406e749d3d468e16a69c6704ef6d166b6  .sisyphus/equipment-catalog-20260910/server-3611.json
0687618beb956a91f238b2c5b0697a5db5adcc15488a499200affc4bb42c0afa  .sisyphus/equipment-catalog-20260910/server-3611.log
f6fdd0fc3738fbcd243db2bedbbb644091f5ab8059f364497a869b55f9b4e298  .sisyphus/equipment-catalog-20260910/server-3634.json
3defc5e1830262c6b1573ebaa0bc0564fc0923064f7912edec133304d8950044  .sisyphus/equipment-catalog-20260910/server-3634.log
9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa  .sisyphus/equipment-catalog-20260910/spec-all-exit-code.txt
f1fb22a11dcc48230a0150c342feeb64e2552dc0d5897c571eecd789dfd03558  .sisyphus/equipment-catalog-20260910/spec-all.log
f1249458a80c5787645cdc2056b8ad3ef18ef297f5f5aa31d6b000829a361478  .sisyphus/equipment-catalog-20260910/spec-final.log
7492152c5757dcbf3429e8de2f15a091da059f05203a3e975c6076d71a69d823  .sisyphus/equipment-catalog-20260910/spec-status.json
52036fb7c07e1963e1d3ad3928230b7fc13db07304f1a196094af9c439f9134e  .sisyphus/equipment-catalog-20260910/spec.log
d4a1ddc58e2e9a3fe5a447b0ea79cb234259fec5aca6b85adc05e917da08cdba  .sisyphus/equipment-catalog-20260910/stable-final-status.json
400b417b1969f3ef7c0e222f47b9d07a1d532ed9b40df8d9f78bd016d13f383c  .sisyphus/equipment-catalog-20260910/stable-final.log
2c40defab52fa72c01e3a8444a8e0bcb9ceda476f44fe0235945ef2dcdd30156  .sisyphus/equipment-catalog-20260910/stable-status.json
631031dbdd1096d3d60b59cb1c6e3bf607f046d0893fafd546ab7cfcf805bda9  .sisyphus/equipment-catalog-20260910/stable.log
b343649010deca9cc3d8ec07511d81044def53919a4723ee4a5f17e0a8559454  .sisyphus/equipment-catalog-20260910/start-server.cjs
3188b76f2939fb3528082e637520cc4468604e93f86b7e887e9c1b6071a24da4  .sisyphus/equipment-catalog-20260910/stop-preview.ps1
9de1ac3824c0b6cc9ec692d0cf9669d4555d09566121e9cb22c3cfde9e71922d  .sisyphus/equipment-catalog-20260910/stop-test-server.ps1
e29cf919576b81cc4c15a28e24ff406fd2922ff1f825b8df2792703b0d82be5c  .sisyphus/equipment-catalog-20260910/stopped-preview.json
7eebf9c55c02f8bf8083f9041ac93942220f67fd14143b1304f4a629b58725db  .sisyphus/equipment-catalog-20260910/test-server-cleanup.json
efc1193a213ef3299e076710e114ed45dc6d5524ed6288c32d33e014884d0af2  .sisyphus/equipment-catalog-20260910/types-acceptance-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/equipment-catalog-20260910/types-acceptance.log
bcb0a945776c32222eb2df73d4525e6698f51bef2eec5cbe67be65ae5e75ba9e  .sisyphus/equipment-catalog-20260910/types-after-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/equipment-catalog-20260910/types-after.log
553cf990d038966b5cf79a3c57a4f61043eb32089907f9f960f068802b75c8c3  .sisyphus/equipment-catalog-20260910/types-final-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  .sisyphus/equipment-catalog-20260910/types-final.log
c6f852e566a9f69c3e47f087039ac34295127ddbe806183a8b54f77c88ad24ca  .sisyphus/equipment-catalog-20260910/types-initial-status.json
840384b4f5cf48511cdb78b3c39fff6536cabe5f1bf937736e65674c410259c4  .sisyphus/equipment-catalog-20260910/types-initial.log
```

## 5. Safe to delete

3 of the 18 screenshots (`catalog-mobile.png`, `electronics-desktop.png`, `placement-mobile.png`, all three under `browser-final-artifacts/`) are verified byte-identical (`sha256sum`) to copies embedded in `docs/audits/2026-09-10-equipment-catalog/`, so those are preserved. The remaining 15 screenshots and the one `trace.zip` file (under `browser-artifacts/`, `browser-final-artifacts/`, and `browser-worker/browser-artifacts/` — additional desktop/mobile/criticals/equipment screenshots and one failure trace) are not duplicated anywhere else in git and are not reconstructible after deletion. `browser-worker/REPORT.md` differs from its `docs/audits/2026-09-10-equipment-catalog/browser-worker-report.md` copy only by extra blank lines (verified via `diff`); `filter-worker/REPORT.md` and `placement-worker/REPORT.md` are byte-identical to their `docs/` copies (verified via `diff`, no output). `filter-audit/REPORT.md` has no copy in `docs/` and would be lost, though its findings are restated and superseded by `filter-worker/REPORT.md`'s "no actionable findings" follow-up.
