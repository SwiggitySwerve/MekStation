# record-sheet-repair-20260910

## 1. Purpose

Workspace for the OpenSpec change `repair-record-sheet-rendering` — a Grok-4.6-CLI-worker repair (contract-proof, critical-worker, preview-worker, pipeline-worker lanes) of two record-sheet print/export bugs, with a supervising parent doing reproduction, review, and visual acceptance. From `spec-ready.json`:

> `"change": "repair-record-sheet-rendering"`, `"changePath": "openspec/changes/repair-record-sheet-rendering"`, `"validated": "strict"`

From `final-print-review.md` (the parent's confirmed root cause):

> "Confirmed: canonical non-mech SVGs have root width/height but NO root viewBox. TemplateRecordSheetRenderer.getSVGString returns them unchanged. buildPrintDocumentHtml applies CSS paper-size width/height directly to inline SVG; without viewBox, SVG content stays at scale 1 instead of the PDF canvas scaling."

From `next-pipeline-review.md` (the second bug, found after the first fix):

> "Required measured correction before build: lossless PNG path needs explicit compression. Parent reproduced using real Chromium 2448x3168 text canvas and installed jsPDF: default addImage(...,'PNG',0,0,612,792) creates 23,269,033-byte PDF. Same data with compression 'FAST' creates 708,555-byte PDF... This is a measured size regression against old 9.89MB Atlas PDF, not speculation."

`product-ready.json` marks the work frozen: `"note": "Product frozen after inline print viewBox-less SVG scale repair. No further product-code changes without removing this marker."`

Date range (file mtimes): 2026-09-10T22:08:30Z to 2026-09-10T23:40:41Z.

## 2. Cited by

`git grep -n -F ".sisyphus/record-sheet-repair-20260910" -- ':!openspec/planning/2026-09-12-roadmap-completion'` and the `grep` over `openspec/planning/2026-09-12-roadmap-completion` + `docs` returned the same 7 lines, all inside the published audit directory `docs/audits/2026-09-10-record-sheet-rendering/`:

- `README.md:40` — "Product and test implementation used four Grok 4.6 CLI workers at high effort... Raw attempts remain under .sisyphus/record-sheet-repair-20260910; compact evidence is copied here."
- `evidence/browser-results.json:22,33` — `outputFile`/`outputDir` fields pointing at `.sisyphus/record-sheet-repair-20260910/browser-results.json` and `/browser-artifacts`.
- `evidence/browser-status.json:7` — references `.sisyphus/record-sheet-repair-20260910/browser.config.cjs`.
- `evidence/contract-proof-report.md:15-17,29` — references `spec-ready.json`, `contract-proof/characterization.json`, `contract-proof/REPORT.md`, `baseline.json`/`baseline-resize.json`/`before-letter.svg`.
- `evidence/critical-worker-report.md:4` and `evidence/preview-worker-report.md:3-4` — reference `spec-ready.json` and the `preview-worker` lane directory.

**These 7 references will dangle** (they point at raw files inside this folder), but per `README.md:40` itself, "compact evidence is copied" into `docs/audits/2026-09-10-record-sheet-rendering/` — so the audit's own narrative and evidence summaries survive; only the underlying raw traces/configs the audit links out to are lost.

## 3. Key results

Bug 1 — missing SVG viewBox (`inline-print-scale.json`, reproduced by `check-inline-print-scale.cjs`): `battle_armor_default.svg` intrinsic 576x756, current scale **1** vs correct/expected scale **1.396825**; `vehicle_turret_standard.svg` intrinsic 576x375, current scale **1** vs correct/expected **1.416667**. Confirms non-mech SVGs printed at the wrong scale before the fix.

Bug 2 — PNG export compression (`png-compression.json`, measured by `check-png-compression.cjs` against a real 2448x3168 Chromium canvas + jsPDF): default embed **23,269,033 bytes**; FAST compression **708,555 bytes**; MEDIUM **782,845 bytes**; SLOW **695,997 bytes** — roughly a 33x size reduction, matching the "old 9.89MB Atlas PDF" regression cited in `next-pipeline-review.md`.

Verification exit codes / counts:

- `printing-tests-final.log`: **47 suites passed / 47 total, 532 tests passed / 532 total, 5 snapshots passed** (targeted `printing|PreviewTab|RecordSheetCanvasPreview|PreviewToolbar|RecordSheetPreviewValidationBanner`).
- `typecheck-final-status.json`, `lint-final-status.json`: both `"code": 0`.
- `openspec-all-status.json` / `openspec.log`: strict OpenSpec validation run against the new change.
- `final-verification.json`: `baselineFiles: 96`, `baselineChanged: []`, `sourcesChanged: []` (no drift outside the owned change), `ledgerOriginalEntries: 13`, `ledgerAdded: ["repair-record-sheet-rendering"]`, `ledgerPreserved: true`; preview server responded `status: 200` on build `1789083011905`; `testPort3636Released: true`.
- `final-print-review.md`: all 30 task-owned source/test files in `owned-files.json` confirmed absent from the 96-file pre-existing dirty baseline (safe to format in isolation).

## 4. Inventory

210 files, 50,761,291 bytes total.

```
8732d89df9f820f500bd8b877068843c45f81c0a2b42c7d3ef6155b4001aae35  593618  .sisyphus/record-sheet-repair-20260910/after-a4-page.png
0a90751f329d63ac606f0ad9f5fc473ee3b8143b18429341432b66baa535d857  135021  .sisyphus/record-sheet-repair-20260910/after-a4-preview.png
26dce8376c547c5a87e4e9a7b3d682805bf55a9fc8faa50519b582d2b26eac22  654418  .sisyphus/record-sheet-repair-20260910/after-a4-print.html
9793ffac9531d8b12474cd2da7a3bf88ab156bfde33b6e2877ac59fcc9f3c08a  3158  .sisyphus/record-sheet-repair-20260910/after-a4.cjs
ae8a5b4db2371018dae889056632d8751544cc45443ec8d969c94b4981d26f21  645374  .sisyphus/record-sheet-repair-20260910/after-a4.svg
746898d826c86d035c8f0c4d8ce36770f38891920afe0e39e394cded099ea679  1115745  .sisyphus/record-sheet-repair-20260910/after-atlas-a4.pdf
e1e674d4f34cb5ef0263c7a77d252231a0432c4870f9bb74d363ad351ecb2a68  1111822  .sisyphus/record-sheet-repair-20260910/after-atlas-letter.pdf
488b86fb84834bf8cd3c401d89ee649952b777bc5cb7a29429fe5b27a39fb3ce  668065  .sisyphus/record-sheet-repair-20260910/after-critical-detail.png
1abeb6f66edcf93206ae1906181731dfe85a97d080088e58c88cd44ea5f60377  587273  .sisyphus/record-sheet-repair-20260910/after-letter-page.png
a9c085211c6756ce04319d88cbf7555c80d4be2817e483b1e9387059dfcf72fd  142089  .sisyphus/record-sheet-repair-20260910/after-letter-preview.png
34239e0c476509af1e0f51c2f5dabdeee95eb022b2ed91c99dcae4a8906592a2  653494  .sisyphus/record-sheet-repair-20260910/after-letter-print.html
d4f3110f78bb40dff0d4843389f9b96935b1564258e918186014be958fa4ee01  644465  .sisyphus/record-sheet-repair-20260910/after-letter.svg
83ea3c666caab8324fbdaf08fd4b35edeb785ee0aba95075246a4caee972e6b2  48611  .sisyphus/record-sheet-repair-20260910/after-mobile-preview.png
dfa85b8edda21f6c3935132a4ec80410fdb635d3abf69c4df73b0e814f538639  514709  .sisyphus/record-sheet-repair-20260910/after-print-a4-page.png
1712ca1924c246328430a051a6cb0d80e1d0a87c605f6d2fde3605ae081fde7b  209099  .sisyphus/record-sheet-repair-20260910/after-print-a4.pdf
d9694e1647e1f2ee012e18da453b68cfa30b2422356110e08b2a492bfe9af006  208138  .sisyphus/record-sheet-repair-20260910/after-print-letter.pdf
01562b4337197b4c63ab0d5dc5ae2963113f8841c079adced8e3f5bf12eb2055  263  .sisyphus/record-sheet-repair-20260910/after-proof-status.json
3056862f64afe53f9426b0e1d8294732a4c53efbbe7599e2a4c3fb5ad1404b6b  6360  .sisyphus/record-sheet-repair-20260910/after-proof.cjs
09cea16c1ae858b8206b0e30f9e8df2d5ece64110a8447b8905b54854d5e97b9  3338  .sisyphus/record-sheet-repair-20260910/after-proof.json
c1fd8b2e04998ecc62f77698c3ccbfd83aa76249a386fe1e513eb96b58c23fbe  3339  .sisyphus/record-sheet-repair-20260910/after-proof.log
5f5065b8a169166082bed815c40d0d7384ab2e4dc173d0d2d88af1bbe36f5f37  98061  .sisyphus/record-sheet-repair-20260910/after-svg-geometry.json
b7d9f47af1d2580d462a95a4e07c86702b48f236d137baf5b5373dce5af59b99  3056  .sisyphus/record-sheet-repair-20260910/after.cjs
194cc23407995f960f15ad96d20b9a1c7fb93c975177f3e24d1cd96bfdc8687d  263  .sisyphus/record-sheet-repair-20260910/baseline-a4-status.json
80da984f9267ea169246045f82abc524a3e99409324ec3f3686ed69782e6aa4f  3164  .sisyphus/record-sheet-repair-20260910/baseline-a4.cjs
0fdcab26db627e497568957a80c098ca974af925e2395dfc5177b70834d7df56  1640  .sisyphus/record-sheet-repair-20260910/baseline-a4.json
525ebe024e542c206134ebd561382063ba5606190ed669b0252dba7089e04171  1641  .sisyphus/record-sheet-repair-20260910/baseline-a4.log
a8418428251c274b5816bb26a8f7b2567c83b95e81262dcce3afee25f8132b33  271  .sisyphus/record-sheet-repair-20260910/baseline-resize-status.json
0603504e6ed4fff14e1961e829e7c0fd5a11e8ad202daf026951045221598182  2911  .sisyphus/record-sheet-repair-20260910/baseline-resize.cjs
a70f4a97ce4a0af1845e4b97301a46b823f4f3e01ff3908b3d25063b37f6fdfb  2136  .sisyphus/record-sheet-repair-20260910/baseline-resize.json
3874e475a1db997701576fc9f94cf02a727b97e42c0bccc208c57139122a2c89  2137  .sisyphus/record-sheet-repair-20260910/baseline-resize.log
e636d6baf63438b4f1ffc07cdb83a942a0941213e8cd18f4b0c4f13e8424454f  257  .sisyphus/record-sheet-repair-20260910/baseline-status.json
cac74442457d2868eed4b021ce9fc1fc0828137c3ab0a07d2e706495a9b875d5  3062  .sisyphus/record-sheet-repair-20260910/baseline.cjs
70b92d8e930c351c8eafa384f048f0f727fdb4d52712518f744c7bba84ec253e  1639  .sisyphus/record-sheet-repair-20260910/baseline.json
d03be2b4d60fcb610fdddd6070dbf7fe3cbfa379014607adc1557e28fab00617  1640  .sisyphus/record-sheet-repair-20260910/baseline.log
8e704ed3d43d442a40d7d6d2142ba0ace85a17bad32604a5bf07e70a9af39ae0  402512  .sisyphus/record-sheet-repair-20260910/before-a4-page.png
ab4ddac529ce643b34a25eb322c088c0806962ecd761cb6ba7daac87f4a430f2  639245  .sisyphus/record-sheet-repair-20260910/before-a4.svg
6ac59c533b0ea1265a59f617a4f613282a92fbda3734d8e18d1e52dcc487e816  9413888  .sisyphus/record-sheet-repair-20260910/before-atlas-a4.pdf
b0c62e454f989a51acd593cd6a3dbe0affde6f42be190b0f9fca1b9b80147c8f  9890758  .sisyphus/record-sheet-repair-20260910/before-atlas-letter.pdf
c7f865b755775639c1f9edde8357e0aab4d7a970fe1ee5dff8675b32b0d402f9  12436  .sisyphus/record-sheet-repair-20260910/before-hashes.json
82880616411e039d09ce538fc9bf2c982dd2151532834abe58b32bfc29594eef  638064  .sisyphus/record-sheet-repair-20260910/before-letter.svg
69dcdfffdf0bfd4a163c4c9d641305929f55f97c1efe966a6d4100af424768dd  611925  .sisyphus/record-sheet-repair-20260910/before-pdf-page.png
ee67f6aa1f02a7b6eb97b8555ed1df1e4d4d25a095fb40007670b2c47fc77096  130654  .sisyphus/record-sheet-repair-20260910/before-preview-a4.png
be286a898679e29986422ab8cf787bf1bd09ced4159e4711c0895da0983dfc43  97908  .sisyphus/record-sheet-repair-20260910/before-preview.png
714f82696735c8983632e7681c3080606ca9dec85d7cb07daf4162d49a41ecf6  5714  .sisyphus/record-sheet-repair-20260910/before-status.txt
90bb0bf7cc869982baa78202e81bf8ce84972cf730adedad85ffdea4af8017b6  4089  .sisyphus/record-sheet-repair-20260910/before-svg-geometry.json
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  45  .sisyphus/record-sheet-repair-20260910/browser-artifacts/.last-run.json
b63dddb12d2500b5ac597f0b4d13195d006e6c2e1f5c35c649a6f55cb95e44f4  988166  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/customizer-quad.pdf
440a7d139f4d367ff483d2037d47894d20de868c8c1fa5b1b2d7829d77a25b7b  71101  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/overview-desktop.png
5682719175ac402fde7cdfa55a3dc1317a63a7b30852784523df5e014ed8eb13  54010  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/structure-mobile.png
8ae4d5eb772ae750dc6d1751b5c413d5f7c3361b83c7653c05baf7d3f5b5b12b  116511  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/armor-desktop.png
c07b952dabe26bfdb36e32bc39a3c9e52d91cb29bf2ab225cf188eca8fe380f2  127473  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/critical-slots-desktop.png
e0d72a262c0865b8b7d7b6632492ea9a39597f60c85e607a6ed4ab83df54553f  96063  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/equipment-desktop.png
36e88e371d0a9c2b69ca1393a9218035ac1958c15a09220c1aea1b8dbff750cb  80783  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/fluff-desktop.png
96fb3f27a64e84b9f8cd492d1ddf00df7d2c2e276430c2f5da67f4b2ca6958f6  72388  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/overview-desktop.png
9b0f76578233ceafd6c8049f620a0d61c073eb8a6b7d77cd809d3b29f0866b0f  174542  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/preview-desktop.png
b6a990b4bfce3e964364ae32aa420320f981b869d403b600599f0d1805357737  105136  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/structure-desktop.png
2df996138bd9f8832c5b0fe42010d9449db47cfcbd7eef6fc9beb39d2b249556  58222  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/armor-mobile.png
0579d2f9a6a9e072bc8351aedf0679e0d33b2da3c94b61717e739b01cdb59a90  34969  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/critical-slots-mobile.png
57cc5e7041b67629c145bd99e88cf7eb31a57b2baa8ab7bd6c8d74fe46ba1afc  46910  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/equipment-mobile.png
c389caec3d84423a210a09dc802db513797546f854f2385d1ac9361fb1f1cec5  40356  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/fluff-mobile.png
6d940d460d887b8b80944888661e0a9c3ba84f29a930199daa51f76656402a0b  32468  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/overview-mobile.png
9303599ce11a62805b2db27126c71427f4290f0a510183381956c9843f3e9020  49205  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/preview-mobile.png
29edb35e5d04dca8d283e0f00b74f8b93b650d2a27a1e45b36ece0dd39f3cbe4  41553  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/structure-mobile.png
7c036215fb7ec581500d3042f4cc34ec3b2d6deaa394697f5f2d04323dc4c76a  1115745  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer/atlas-a4.pdf
09e499dc2a16156dcc5f39cc7f1865f887246155210a01744a0c29d8399d5565  1111822  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer/atlas-letter-after-switch.pdf
d11f00a0f19cc59e206e090ee42c8209a1002707be777f87aa77ccd9e2cda5bd  1111822  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer/atlas-letter.pdf
f5736c496ed444220e0064b8ca75dc5ff0be32eb619830b59c02b4e8c23b81b4  931365  .sisyphus/record-sheet-repair-20260910/browser-artifacts/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer/locust-letter.pdf
020db7c1fac96f436e76299ba1fbfe4488fe1607721480f1461679b4f49e5225  7847  .sisyphus/record-sheet-repair-20260910/browser-results.json
f4a55a51039375cc4a07cc34c33e6909082bd3a109f145d020421a03338e59ae  334  .sisyphus/record-sheet-repair-20260910/browser-status.json
afed97bb447f0ccace0604e57742344bab4dbc926a611c8129a4b9eddf7c6f5d  920  .sisyphus/record-sheet-repair-20260910/browser.config.cjs
d17297f5ba789cb8991f147d5455f4f58d61590f5bf68b895bc27d7a47bfdc46  780  .sisyphus/record-sheet-repair-20260910/browser.log
19ccf2e9f1613ceadc8436c9eaf8053e412bfabc7a9a85092b1a14e69159bcfd  1006  .sisyphus/record-sheet-repair-20260910/build-inputs.cjs
c3efd4a705e4d5798205ffe10be2e5edeff1eef0f47f281375c8245791153236  2267  .sisyphus/record-sheet-repair-20260910/build-inputs.json
3667f81a427319ea7b95a5acb002468b56254b1a4190a2d84a0438ecb710db11  274  .sisyphus/record-sheet-repair-20260910/build-status.json
e7fab64fcfc2e91f29d9ea95eddb1e0f7113fe04b3de5004c07c2550dc6612e2  153464  .sisyphus/record-sheet-repair-20260910/build.log
dc90796caf1f0cd7afe04fc1988333749096c59c01c48d55f9b2327450901c62  138  .sisyphus/record-sheet-repair-20260910/capabilities.log
42ae081ccbd3449bb99418383d11b2b39f6a5a4f6902edad9a3cf3c0b3184164  2967  .sisyphus/record-sheet-repair-20260910/capture-svg-after.cjs
c667e0b6c9e047a64a6dd8596dd23b4484f924e9c4fd52e58650b7bde09ba05a  2970  .sisyphus/record-sheet-repair-20260910/capture-svg-baseline.cjs
87ad8a836b79362880df8fb25b390b6eb138a8dce37ccc86d9504d0b56b5ac12  1125  .sisyphus/record-sheet-repair-20260910/check-inline-print-scale.cjs
06edc15665686fe803b5a272adaa976ed551426e60d2a8b272f3988dec5876ab  943  .sisyphus/record-sheet-repair-20260910/check-owned-format.cjs
c147610e21f82165893825edb4882070e35ddeb6979d473d468b7dd1be7893cc  945  .sisyphus/record-sheet-repair-20260910/check-png-compression.cjs
51bfe0b4498d950ef8957bbb3c1a34f2520ef436efcd419adbacd762b908906f  3998  .sisyphus/record-sheet-repair-20260910/contract-proof/REPORT.md
fe6d8320cf97077c81953ee3b4b0e36f23859c608c7d066986d15168f9b19dfc  729608  .sisyphus/record-sheet-repair-20260910/contract-proof/attempt2-resume-events.ndjson
7a4dedfc581d1b9dffd6b78c4c6b4fa917249a74a20d5dd943297a6b42941233  1844  .sisyphus/record-sheet-repair-20260910/contract-proof/attempt2-resume-prompt.md
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/contract-proof/attempt2-resume-stderr.log
2e6b33cc570a604752a4ececf2290ee388e7efe87101b37bd2b72f56956691fa  722  .sisyphus/record-sheet-repair-20260910/contract-proof/attempt2-status.json
b5f94ecb95645a360f11a356ced97dc5b4eb3d09c6796ca66c575a90a5341364  1803  .sisyphus/record-sheet-repair-20260910/contract-proof/characterization.json
ce9f319e9267b7c288bdacc7af5fd6f8af63dc122ce47abcae4ce2f190a8d394  1991708  .sisyphus/record-sheet-repair-20260910/contract-proof/events.ndjson
a2d142f8a4b53fd9e5210906c59dfc0d785e4a04b41a6b97103f2ff11feba55c  731  .sisyphus/record-sheet-repair-20260910/contract-proof/initial-status.json
a8cfd321808802d182965d46e95b36878289b94a06cb818b93dbb0ddfd25bd6b  2770  .sisyphus/record-sheet-repair-20260910/contract-proof/prompt.md
1ac661b21467628d37967c0fa7d19847442534f6b1814b7fc68003c2e6fba85f  230602  .sisyphus/record-sheet-repair-20260910/contract-proof/resume-events.ndjson
f32425f1e224e9f4a5dfae58f48a633816cf98a10fb7af338ff36fcf07a86b6f  1570  .sisyphus/record-sheet-repair-20260910/contract-proof/resume-prompt.md
e3889d9957a85f4a0ada36eb191a3133ed3525492ec75e13aa790f682b0d78f7  36  .sisyphus/record-sheet-repair-20260910/contract-proof/resume-session.txt
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/contract-proof/resume-stderr.log
5ff9d6c62856e355c8f92b86b8b158b119414eeb9e86ec734393ff55e71ec853  722  .sisyphus/record-sheet-repair-20260910/contract-proof/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/contract-proof/stderr.log
caa9440783ca142c63ddb4204b8bb646bb64d896e9baad31e56b45a97f9a055e  3882  .sisyphus/record-sheet-repair-20260910/critical-worker/REPORT.md
895a20f27173cc133f266a5f7b9a7666cae200ba0d97493695ff0444ffb49374  5212  .sisyphus/record-sheet-repair-20260910/critical-worker/characterization.md
08c61757ba94849cfd230772415d02015fcfc69e7a7ccafe7cc282d720eb9d42  2942445  .sisyphus/record-sheet-repair-20260910/critical-worker/events.ndjson
0fe2dc5de82c5a9e84a6d7f152eca728d3eca13870a42c1838f1963cfe2c428f  733  .sisyphus/record-sheet-repair-20260910/critical-worker/initial-status.json
f187cac0953adb6347e1622638fec660d80a7cd4f1103d6a7c00686838150888  1248  .sisyphus/record-sheet-repair-20260910/critical-worker/planned-layout.md
f9bd01a8a330a22576f4de80dec91e2391a7feb7c106da079c78b57a0e61d5fe  2270  .sisyphus/record-sheet-repair-20260910/critical-worker/prompt.md
ee322e6e17c5bdbce4b6bcf8975a8ac906043c056ffc47d67efc0d76e7c977f8  220211  .sisyphus/record-sheet-repair-20260910/critical-worker/resume-events.ndjson
92ab660376fd1e887efd9d369e99fa7763d354f58784a8730cba15b8ffc531d1  696  .sisyphus/record-sheet-repair-20260910/critical-worker/resume-prompt.md
e2a44e71bee2f196f69486f52a9f033886dc20303eb582488f043394e708ef20  36  .sisyphus/record-sheet-repair-20260910/critical-worker/resume-session.txt
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/critical-worker/resume-stderr.log
df3ee0fe5342fdbfa5bde99f66c54e25b3a547a0d9cee09ac221433a56963936  724  .sisyphus/record-sheet-repair-20260910/critical-worker/status.json
b3e62995cdc9d267dd575413b26c5eb3c56eb3f54d816fc4ace8f7b91c7d1b1f  25  .sisyphus/record-sheet-repair-20260910/critical-worker/stderr.log
854e677f67bbcee9f148734c3428e9446d2cedbc4da75fdf28a7a489f8b401dd  732  .sisyphus/record-sheet-repair-20260910/critical-worker/wait-spec-ready.ps1
3c46c246d124d1f785f152bf92af9e679486b2d3dc0488b549e1c595776266d5  2023  .sisyphus/record-sheet-repair-20260910/final-print-review.md
0bd566b7df5ffb05b8b2a482b0c66134f61e628027f5b232a6c6b6c56012e33b  418  .sisyphus/record-sheet-repair-20260910/final-verification.json
5071064879be0fd9296318ad3eea1349ea8d97f7c61bd19b3de058c92d245849  1293  .sisyphus/record-sheet-repair-20260910/grok-worker.cjs
7048ee17f8665d64b3803ac8901fd1ab124e8c4a3c849339483d4fe074f1325a  430  .sisyphus/record-sheet-repair-20260910/inline-print-scale.json
3fbff4a3ed5ea76c2230450a067c65885e7f2b77394b52a39c3eec640599c0d8  1412  .sisyphus/record-sheet-repair-20260910/inspect-pdfs.py
8f9ef6657e4ebb3ba0b67505d118395736a9f9c654258c5c1fa06336c9c4d4f8  310  .sisyphus/record-sheet-repair-20260910/launch-check.cjs
eae18747763271cf7a9f483b2b1a60d8912edff851698d77cae30d86a5985835  318  .sisyphus/record-sheet-repair-20260910/launch-grok.cjs
3fa2c251bcbf74aca45c79760f2f6a698b4bc5f160d6c6102a67fa987c383fb0  325  .sisyphus/record-sheet-repair-20260910/launch-resume.cjs
c50dd27af6c66ce1295a6619a1c44b1a877be2668164dc3a3545924e4a8ae10c  6871  .sisyphus/record-sheet-repair-20260910/ledger-before.json
116c1776dcc22af869f579eb7cada740cef42e5e122baeaf40798eace62509ee  238  .sisyphus/record-sheet-repair-20260910/lint-final-status.json
6108c7999fe596ff745161e953e9900f86fef663f63e2abc2f72de0b3571ef04  39543  .sisyphus/record-sheet-repair-20260910/lint-final.log
075efe2e3e9705f9032a51d3a103975d9bab3bf1ca143742d71a33d7092b2b6c  232  .sisyphus/record-sheet-repair-20260910/lint-status.json
3a172a2065d77fe4a57d5f6962633a451f8fbe13a6bca2107e425804982ff089  39322  .sisyphus/record-sheet-repair-20260910/lint.log
ac4027ec41eb17dee02952c2fcabd80cc3903722e5354a8a5cbf2e7a527f36f2  1953  .sisyphus/record-sheet-repair-20260910/measure-svg-after.cjs
b4009944e0d93f39b1a000bf75b0d2d424a7a858a429cc53826875a1beb3872a  714  .sisyphus/record-sheet-repair-20260910/next-pipeline-review.md
2775edee207c789e1d892706e656b04779844de5dec6a27cf7e7a2fd2478432f  339  .sisyphus/record-sheet-repair-20260910/openspec-all-status.json
e21ee5a93b949a4d54b08178b22d10d3ab304c1b55e46a00f05c1cfc9b56c76e  6935  .sisyphus/record-sheet-repair-20260910/openspec-all.log
5e3f5520411379ff16a03e8abef2c9cf03f596b06ed81810849090b173850fd6  359  .sisyphus/record-sheet-repair-20260910/openspec-status.json
c73d0c7382f6828a5709facaff4f4e3616891fe31d172cdd2898afcc0049f1f3  48  .sisyphus/record-sheet-repair-20260910/openspec.log
893c1e0dd4bf4308ef75eb80a3b61892ea075d1faacf89ba451c107e9f521f84  2139  .sisyphus/record-sheet-repair-20260910/owned-files.json
5c9877a4d908d227f83639a5a6d80f6382c660bb3ce8369c8444343232adbc9d  114  .sisyphus/record-sheet-repair-20260910/owned-format.log
8d0291653f3aab16d642cfc64e1c148f011488b222755fb41d48c7817a2ea837  992  .sisyphus/record-sheet-repair-20260910/parent-findings.json
efec7d970e52409515a0150c3b1b0079316f4d5e34fa4c810b181f84062fe9d5  1213  .sisyphus/record-sheet-repair-20260910/pdf-inspection.json
aa7273ca7ec85bcd18af0f4703fca81aa9f5533f92155468a41802e9c09f7926  1269  .sisyphus/record-sheet-repair-20260910/pipeline-review.md
72ae29877a8554f88d4c5101418f180822a949305608f75307c59ad40dd03a70  1062  .sisyphus/record-sheet-repair-20260910/pipeline-worker/REPORT.md
e02e374b3ff1fa4c0df16b0f8eb646bab094d2177ae82d1a9ec9dab08058f2f9  517804  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt2-resume-events.ndjson
caedf180d378f948405a4b29167f6cdce078be1ac60a4a7fc88ade689ce64dc6  1216  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt2-resume-prompt.md
b3e62995cdc9d267dd575413b26c5eb3c56eb3f54d816fc4ace8f7b91c7d1b1f  25  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt2-resume-stderr.log
98f5e991bcbb9c14f0fc9e127aeb61e9270fd1a11e41e762d7cfd6ad93ad9368  724  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt2-status.json
f5e2457f041166b2b5954ca00cccff1fa3b23bbd05ab062cb4951756a455f4c1  447432  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt3-resume-events.ndjson
9c2e2c6f35fba1ee19209e2714db3e60428d29ebfded1b376873daba42d71f15  1675  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt3-resume-prompt.md
b3e62995cdc9d267dd575413b26c5eb3c56eb3f54d816fc4ace8f7b91c7d1b1f  25  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt3-resume-stderr.log
ed56b993c0da1eac350777d00078c33cf91aa36c9c18bd957e1b2df25e34af8f  724  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt3-status.json
b8952941bb5eb037f0c5e2f570f4d77efcfd7b379ae502048388fac14a56ff63  495  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt3-typecheck.log
91362cb2a1054df3060e547da9a0ba470dfa77c8340cd0b1d7261c3ef4e7c343  2065  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt4-REPORT.md
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt4-final-typecheck.log
3d99f257fab4b33d65a815b8232d18023f600103a21b13406e315a9a37849de5  273517  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt4-resume-events.ndjson
e177a75a37b6c9147e8e8f227f77048899f24051498b86d5591f8c1a8c361eac  1934  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt4-resume-prompt.md
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt4-resume-stderr.log
528c930546924172d1a9ec2df1158a17fa282bb2739770069d4bb85b1a8fac5c  724  .sisyphus/record-sheet-repair-20260910/pipeline-worker/attempt4-status.json
978e4427151a6a0d3945c81a8f6756d5062df0fef724bba123eb0f4c9cd38bf0  2209395  .sisyphus/record-sheet-repair-20260910/pipeline-worker/events.ndjson
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/pipeline-worker/final-typecheck.log
b41050e43615fc2aaecdaaf8a0644775a10fcd66df6ba0ff5c132cd6fd533cc8  733  .sisyphus/record-sheet-repair-20260910/pipeline-worker/initial-status.json
a99904de5f9496e5ed95a2034ec0b39f11bce27051ae00370b7f53b08573e52e  2485  .sisyphus/record-sheet-repair-20260910/pipeline-worker/prompt.md
159558fc9db5969575001fdd77454e8be93f07bb349f2c36a00539e1d2f704dd  297788  .sisyphus/record-sheet-repair-20260910/pipeline-worker/resume-events.ndjson
f46241fe9be2dda6ec91161835432404b1553e887e14148990ce534ccb3da0c2  1527  .sisyphus/record-sheet-repair-20260910/pipeline-worker/resume-prompt.md
2dbe1aa6a259e80c7170c7de94f39961e15229f06b69c7f5307353155baa2534  36  .sisyphus/record-sheet-repair-20260910/pipeline-worker/resume-session.txt
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/pipeline-worker/resume-stderr.log
9ce4e5e69bb5b12ae14d2c777f3d71844f7ecfc31a25fdc01535ec30393f4d70  724  .sisyphus/record-sheet-repair-20260910/pipeline-worker/status.json
b3e62995cdc9d267dd575413b26c5eb3c56eb3f54d816fc4ace8f7b91c7d1b1f  25  .sisyphus/record-sheet-repair-20260910/pipeline-worker/stderr.log
b8952941bb5eb037f0c5e2f570f4d77efcfd7b379ae502048388fac14a56ff63  495  .sisyphus/record-sheet-repair-20260910/pipeline-worker/typecheck.log
91c3bcadedeb85080ad2467b178e5f8e0abac1848311f89191c8a4f17e418769  221  .sisyphus/record-sheet-repair-20260910/png-compression.json
3a7ce778a3e1101e18b6fb6d224eeec79f4ee70e3e0c2693f7d32ee5704aeeb8  2865  .sisyphus/record-sheet-repair-20260910/preview-worker/REPORT.md
d3b673234f7ff90f2aa31386f54479c2bb4c6f6e65baebc4ccef52173df51612  1144  .sisyphus/record-sheet-repair-20260910/preview-worker/characterization.md
4bd670df278ceadfb783ad616dd372ea03d74e4890bb864c65157b39370e9053  1963435  .sisyphus/record-sheet-repair-20260910/preview-worker/events.ndjson
68d561da5d22e8260d779addf1a73c4998696b0b13835dba83dcda659d2bc3ed  730  .sisyphus/record-sheet-repair-20260910/preview-worker/initial-status.json
ba7a32f109c609b828648a8b8f1859d639e4a8bac26cda98a7177dc1417e3abf  2424  .sisyphus/record-sheet-repair-20260910/preview-worker/prompt.md
ff24fa62f0c5e2785d7ff823c0e5593980240101be3c4a42d8f3f04e7fa11aab  448987  .sisyphus/record-sheet-repair-20260910/preview-worker/resume-events.ndjson
4fa6484251f6846d5f0db7af034cf0dfd22296d69cdf27670fd49187a0d72edf  1305  .sisyphus/record-sheet-repair-20260910/preview-worker/resume-prompt.md
44e282317334a243687e825f9c179e9f0e02ae23fea8ae2e8695a86d3d57bd2a  36  .sisyphus/record-sheet-repair-20260910/preview-worker/resume-session.txt
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/preview-worker/resume-stderr.log
fb7020a603ac2394485e2bc708a5c3c922e8ad04a0f2822364e00ba763393961  722  .sisyphus/record-sheet-repair-20260910/preview-worker/status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/preview-worker/stderr.log
6095aacd021a7d3a319b852d0138bddb7e6e42a8e8c3a549c048163d4c4551ad  447  .sisyphus/record-sheet-repair-20260910/print-render-proof.json
1fdeb3e10dd81b9a47c653d7cf80aca0b32308888d5b077bffca2c25872dee60  425  .sisyphus/record-sheet-repair-20260910/printing-tests-1-status.json
08a4b8af6b35d275a1ca695a31e6d6b05dd428d95c069f716e672363d1979119  4390  .sisyphus/record-sheet-repair-20260910/printing-tests-1.log
8491befaf25e143a12e47a5bba86eadb125db5a44ecf96eefef8b1a196e79fe0  429  .sisyphus/record-sheet-repair-20260910/printing-tests-final-status.json
92784b47f59516fda758d13655b41c207bc271314e63df1cda35f7f16e786ee6  4380  .sisyphus/record-sheet-repair-20260910/printing-tests-final.log
eca9ccfefc706a7ddf5e37ecaf716f1183b852b82856b617edb92e44146ca17a  424  .sisyphus/record-sheet-repair-20260910/printing-tests-status.json
39afc912fa05827b6b9d4f45882a65e3d5c15d2b9e2ecd33166303db082b9ab8  167  .sisyphus/record-sheet-repair-20260910/printing-tests.log
49c21883f550492d3c71556847db943835b2a590f4cabfc623ca6f4b1d1261d7  240  .sisyphus/record-sheet-repair-20260910/product-ready.json
193d0fa8f4e9c4e1b8afe14671e576ac50283592b0f5c3e4cbbe4c4efa8c2443  1059  .sisyphus/record-sheet-repair-20260910/render-print-proof.cjs
d53fa94448ec0a290550f1bdc93c488c4a016ea8c0ffa18df5725288e7824c48  1315  .sisyphus/record-sheet-repair-20260910/resume-grok-worker.cjs
5afc11e3f70b9e29a55bd1a9339cd64d1fab33fd775634e43a7f77a48aee79fe  264  .sisyphus/record-sheet-repair-20260910/routing.json
48cd5b1e260977846786d7919d29a1d5c8a5e86001e37dfb5931020e529b21ce  885  .sisyphus/record-sheet-repair-20260910/run-check.cjs
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  4096  .sisyphus/record-sheet-repair-20260910/runtime-tests/mekstation.db
1c4ecbb3a1a2930ef3de4c6a0ed093e823fc7595da78ed8f1aa312ca744375f7  32768  .sisyphus/record-sheet-repair-20260910/runtime-tests/mekstation.db-shm
a8e0daba46c340de420b62ed7f7e6c5ad5405189b41c757a83b141aae71faa06  1343152  .sisyphus/record-sheet-repair-20260910/runtime-tests/mekstation.db-wal
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  4096  .sisyphus/record-sheet-repair-20260910/runtime-tests/multiplayer.db
a47700c3b2b9d2fa9d22ddfdb989c3a7f950af6b6a6b4fb8396aca168a7f1bcf  32768  .sisyphus/record-sheet-repair-20260910/runtime-tests/multiplayer.db-shm
83c3e9c8c0a201fe6a6d2047cf3d7c1646c94cadc2bbc287c915a0a19b981642  296672  .sisyphus/record-sheet-repair-20260910/runtime-tests/multiplayer.db-wal
4ad2cbbd5f2b91fea3b3842d706fd55bf302938f8f4a6fbfa6535f557deb58e2  193  .sisyphus/record-sheet-repair-20260910/server-3611.json
66f6baf434300b79c110136bfd2e6e43f3036a00513b3e2f8baab6455c0aff26  320  .sisyphus/record-sheet-repair-20260910/server-3611.log
b1f762f2a14e1bd7088b80fefd414e6971d5589bb15ea62b3810397de344fd09  201  .sisyphus/record-sheet-repair-20260910/server-3636.json
450e35ec954db56c88ddf3e22ebfe36e7059bdce60496492d238edd7347d406b  320  .sisyphus/record-sheet-repair-20260910/server-3636.log
ee7846b607736b1704a10652b2af5abb58fcd815dae52a5492b6479011e82eb2  417  .sisyphus/record-sheet-repair-20260910/spec-ready.json
04bc7d5785b74235ef2694e92bc570346d3197f9b985ac34bd3f49304457085a  1657  .sisyphus/record-sheet-repair-20260910/start-server.cjs
70d727c68fc94ec72bc1c662695a44140158d85285a781965177dba0178e07ff  672  .sisyphus/record-sheet-repair-20260910/status.cjs
a9e4c2ec8ab3112f3e08c46c2709fec4ed6cf50db27b35ef3da4081d4f993069  764  .sisyphus/record-sheet-repair-20260910/stop-preview.ps1
6cba01bb965f04ccd8add9b04f84273783932499055371e38f0952932fd45c20  771  .sisyphus/record-sheet-repair-20260910/stop-test.ps1
cbb25168b0c09ab0a50b1198b07e2038001cb35c1fee81d506684755996128c6  119  .sisyphus/record-sheet-repair-20260910/stopped-preview.json
ebd0c946e089265403ac03b3c2be2c43491e8308d7dd1796314c6d42459b0336  118  .sisyphus/record-sheet-repair-20260910/stopped-test.json
7822f1a680f01c9700a3d938b0c47bd6a32f3d6f3b114479816a82cd811f9b37  273  .sisyphus/record-sheet-repair-20260910/svg-baseline-status.json
76cc904c49ded8faab4eaa3399762de1be6cd28256d9ff9b13e25b6860264bd3  4090  .sisyphus/record-sheet-repair-20260910/svg-baseline.log
b6735e188cf34e4b0e13ac23690292a86547e7a6c77c144a1736ac01dd9c008f  10623  .sisyphus/record-sheet-repair-20260910/svg-size-after-review.json
3c3e8b00479bca05e0ebb07b0213988fe54112b86ba501e938cdf3b4fb2f58eb  7526  .sisyphus/record-sheet-repair-20260910/svg-size-review.json
11a1db1e923e6ddb99640de932d7f092dee3e77aa352e31fa5eae8e6902e80a6  260  .sisyphus/record-sheet-repair-20260910/typecheck-final-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/record-sheet-repair-20260910/typecheck-final.log
54375e25df5d8b337d76a0d99a2c49f83095578fa18b034488049763e7f1ce4e  254  .sisyphus/record-sheet-repair-20260910/typecheck-status.json
6e55d840fc14ec89dd82224364737d8753b45e3918e9aa85315bcedba16c048a  4556  .sisyphus/record-sheet-repair-20260910/typecheck.log
b298d7d1cd7e19e902487531d870ff896fd216c18b7e0184e8460e520f4654b8  8438  .sisyphus/record-sheet-repair-20260910/write-audit.cjs
```

## 5. Safe to delete

Not reconstructible: the roughly 30 MB of top-level before/after visual evidence (`before-*.png/.svg/.pdf`, `after-*.png/.svg/.pdf`, e.g. `before-atlas-a4.pdf`, `after-critical-detail.png`, `after-print-a4.pdf`) captured the exact pre-fix and post-fix renders of the two bugs above; since the bugs are now fixed on `main`, the "before" state cannot be regenerated from the current source tree. The Playwright evidence under `browser-artifacts/` (screenshots, `error-context.md`, `.last-run.json`, ~6.5 MB) is similarly a one-off capture. Reconstructible: `runtime-tests/*.db*`-style SQLite scratch state and worker driver/stderr logs (would be regenerated by rerunning the same repair against the same commit, though the bug being reproduced is already fixed so the "before" runs specifically cannot be redone).
