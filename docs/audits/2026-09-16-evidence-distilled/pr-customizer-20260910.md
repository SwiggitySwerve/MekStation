# pr-customizer-20260910

## 1. Purpose

Isolated verification workspace for PR #1635, "Complete customizer editing recovery and saved-design combat" (branch `codex/customizer-editing-and-saved-combat`, head `9ea9cd4aa4456a1c09afe9e86bb5b2929b0328ec`). From `pr-body.md`:

> "Complete the saved-design workflow from customizer editing through campaign and combat use. - Add per-draft undo/redo, visible browser/library save status, browser-write retry, and safe saved-version restore. ... Admit exact server-saved biped BattleMechs to campaigns and combat. ... Fix production unit navigation and simulation timeline rendering..."

> "Verified on an isolated branch: **34,985 tests in 2,648 suites passed** (16 existing skips), **103 accessibility tests passed**, and **36 browser scenarios passed** against the packaged production server."

`acceptance.json` records `"base": "45a94017a449519491726c52083abc1c7bd1e7e3"` — the same baseline commit named in the `grok-followups-20260909` lane's `COMMON.md` — so this folder holds the final commit/PR/CI verification for the work those Grok follow-up repairs (plus the saved-design/combat feature) fed into.

Date range (file mtimes): 2025-12-13T01:27:48Z to 2026-09-10T20:18:48Z. The single 2025-12-13 outlier is the original npm-package mtime preserved on two vendored files copied into a local `node_modules/` (see Inventory/Safe-to-delete); every other file falls on 2026-09-10.

## 2. Cited by

`git grep -n -F ".sisyphus/pr-customizer-20260910" -- ':!openspec/planning/2026-09-12-roadmap-completion'` and the `grep` over `openspec/planning/2026-09-12-roadmap-completion` + `docs` both returned the same single hit:

- `docs/audits/2026-09-10-customizer-pr-verification.md:25` — "Earlier shared-checkout formatting and chassis route-coverage failures do not occur in this isolated PR tree. Local logs, reports, source fingerprints, and failed-attempt evidence are retained under `.sisyphus/pr-customizer-20260910/` (ignored by Git)."

**This citation will dangle once the folder is deleted** — the audit doc points at the raw logs as the source of its claims but does not embed them.

## 3. Key results

From `acceptance.json` (verified 2026-09-10T19:00:11Z, base `45a94017a449519491726c52083abc1c7bd1e7e3`):

- Unit tests: **34,985 passed, 0 failed**, 2,648/2,648 suites, 16 pending, `success: true`.
- Browser: **36 expected, 0 skipped, 0 unexpected, 0 flaky** (duration ~209s) against the packaged production server.
- `sourceFingerprints: 92`, `a11y: 103`, `openspec: 228`, `assets: 554`.
- `baselineQC`: "four archived references; identical on clean target main" — the QC registry validator's four stale references to an archived co-op change are a pre-existing baseline issue, not introduced by this PR.

From `ci-final.json` / `ci-run-final.json` (PR #1635, `headRefOid 9ea9cd4aa4456a1c09afe9e86bb5b2929b0328ec`, url `https://github.com/SwiggitySwerve/MekStation/pull/1635`): all 34 listed GitHub Actions checks report `"conclusion":"SUCCESS"` (Detect Changes, Install Dependencies, Lint, Format Check, Type Check, Unit Tests 1/6-6/6, Perf Smoke Tests, Statistical Proof PR, Perf Budget PR, Coverage Floor, A11y Tests, Validate BV Parity, Validate Combat Suite, Build Storybook, Schema Bridge, Determinism Audit, E2E Smoke, Seam Anchors, Desktop Type Check, Desktop Tests, Build Test / linux+win+mac, Lint and Test); run `https://github.com/SwiggitySwerve/MekStation/actions/runs/34518744897` concluded `"success"`.

From `commit-verification.json`: head `9ea9cd4aa4456a1c09afe9e86bb5b2929b0328ec`, **92/92 source hashes matched**, 109 files, `hooksPassed: true`, build `1789066965677`, committed-browser **3/3 expected, 0 unexpected**.

## 4. Inventory

301 files, 72,036,331 bytes total.

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/a11y-driver.log
ea0b2e5f734ab6eb97e487b939d6284def5942bbc45bdf8bfac305fe570a0318  36979  .sisyphus/pr-customizer-20260910/a11y-results.json
77f61255484e4c65ce92ee0c4280dd1bf26b64a804fc91f559e444c072cf917a  467  .sisyphus/pr-customizer-20260910/a11y-status.json
a337dc4636b495c505deaff738c487665cc55ee23e6b52607149eef419942d54  841  .sisyphus/pr-customizer-20260910/a11y.log
3889c65b8323b54a3d330136a4cf5b5009d248f2bc29f418961c723f8b7033cc  609  .sisyphus/pr-customizer-20260910/acceptance.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/assets-driver.log
5161186fef39995ae8014f52a72d43d7374992e2c0842b553cee1a7fa5f633b3  404  .sisyphus/pr-customizer-20260910/assets-status.json
75c2c99edba75eccaac574639d0b076917280f01bd514c38d4de7d2d91af3890  427  .sisyphus/pr-customizer-20260910/assets.log
e3eaacad54dbcfdde3a376b5b518a8fcc8a52f7a65568ed440c92149ec934b35  96  .sisyphus/pr-customizer-20260910/browser-artifacts/.last-run.json
bbaa4a2f495be17a5f7d9df055a5109744efaad2e580c02f03995218ad2413fd  128808  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Burgu-cdf78-application-area-appearance/customizer-desktop.png
ac3f35fbb6a80d53b93770df0662e7f0a414eaae80240105ab466ab195df4cdc  54176  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Burgu-cdf78-application-area-appearance/multiplayer-desktop.png
bc5d362bbab5f3cf6d19ecfefcb34a98e66fb377ad2015612dff7a72b28bd636  73193  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Burgu-cdf78-application-area-appearance/settings-desktop.png
3f7e5aec9bfd3336b5a21290f9ad07bce8b3cc9aec1ae05ecd16fb9b95be04bc  49256  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Burgu-cdf78-application-area-appearance/settings-phone.png
7dc2ed268ec20a0b69f4f72ad3a488f17545f89b6012225a362a05b752855bec  128345  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Class-3c760-application-area-appearance/customizer-desktop.png
4fdc492c6387f5c125b6cf47e4796369750276894ec46345f01d293fbb70e07c  54037  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Class-3c760-application-area-appearance/multiplayer-desktop.png
a4b909d7da15b6478412a063e5988df9c7d1c45c72bb80d037b0df162693dc0a  72935  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Class-3c760-application-area-appearance/settings-desktop.png
ce81490a158a1eed8c9efa6cddd9e1403f0f000c4ba89486c36d88c6dba0417b  44081  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Class-3c760-application-area-appearance/settings-phone.png
fe2b900fbd8c2c5c2815c4137bc4ef910311feb0e36583a33c2fc0a5eef14a7e  128930  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Coppe-067ea-application-area-appearance/customizer-desktop.png
f22a6c2a1a7d6ce859b6790744e261990e0f0caba3f40b1f15f5f245330b9af6  54093  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Coppe-067ea-application-area-appearance/multiplayer-desktop.png
48f103a255471412d2431141da3d8aaf0d4a3fc055cd34a038c051660559fbff  73217  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Coppe-067ea-application-area-appearance/settings-desktop.png
600857b64bc3ac85e43b10c354a8335f8229523788bf9bc0b02d4d50a7e25cc6  48601  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Coppe-067ea-application-area-appearance/settings-phone.png
b0653cba952042acff99587378d57535439976eff5d849a76453aa0758a31b0d  128465  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Field-cebc6-application-area-appearance/customizer-desktop.png
0aafa696cc3775a058d0271226d092aceca5e215e103094c546c2811b2970bff  54102  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Field-cebc6-application-area-appearance/multiplayer-desktop.png
000d4c0c0df38dc5dd2f9f26465f2cc50c1e91b9f5287bc44a68c62e769ff426  73030  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Field-cebc6-application-area-appearance/settings-desktop.png
ad222a890615952a019c6d9ca74fcd7e87ecc7822251c9c143d6f921cfbd83e0  44196  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Field-cebc6-application-area-appearance/settings-phone.png
7f17fd10ab8c378b8a0df3a6b4bcdbbd638bd21b2e7fd724105701aecf91949a  128546  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Midni-6e020-application-area-appearance/customizer-desktop.png
cbea22942df16370db0bad0cc147e6d22cb7b5d6d37f641e83e9760a1e641556  54142  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Midni-6e020-application-area-appearance/multiplayer-desktop.png
5e86693b08af1f1ee998e544438c36e628a5216bbfd9eb1936765fa09b0f2054  73252  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Midni-6e020-application-area-appearance/settings-desktop.png
51d9f997478cfff800d57d816f5c5c4ed7a1813e323cbdaa41dc7b15ba84b72b  44230  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Midni-6e020-application-area-appearance/settings-phone.png
60161039401d02ea7b5b28ac8cc2fb0960b298a3d53f72b4bd6e8b5badd3eef9  128448  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Neon--34362-application-area-appearance/customizer-desktop.png
f89161bc829bec7dc1111ed912db43b5d23d4ef9ff93d38249b52f9cff057c48  53709  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Neon--34362-application-area-appearance/multiplayer-desktop.png
ca357aaddc5864ec1dd83763f41ea4ee8022d907b18e979737a286ddb5538741  76196  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Neon--34362-application-area-appearance/settings-desktop.png
ff00b9583ad27574eb0a49fcd3e67719f862cec9e6df5187b0d3be70233fb8e0  48530  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Neon--34362-application-area-appearance/settings-phone.png
64eab1fa9246e31a000d78d1d7eba34eb859a125803e5a5563a4cc528ccbdea3  128062  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Obsid-c663a-application-area-appearance/customizer-desktop.png
d035ff293e51d541de05cc3699ed086e7a50866b6bf79d2c17d4b3d9e8b133da  53653  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Obsid-c663a-application-area-appearance/multiplayer-desktop.png
f14fe76c59d87d9a47ba70d72e6828f573d403c545aed722b8d7b8e135b0d6a5  73227  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Obsid-c663a-application-area-appearance/settings-desktop.png
a6dcbfeb6e499fc782d4c5433500411f81233ff6ee29562a5a17e489d86bccea  48092  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Obsid-c663a-application-area-appearance/settings-phone.png
635aae536425fe7266d866b6ea724f806d49aa932df023f2adb4f35c3dc81571  128248  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Petro-36e77-application-area-appearance/customizer-desktop.png
7d7f2f70b2e698e26f0f544b9bbffe399bfcc2e37ce21bfa0b789dc357016481  53931  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Petro-36e77-application-area-appearance/multiplayer-desktop.png
3613c191ffecd099582964f4d26400d690778e3b71539087bc7ac89de268730a  72830  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Petro-36e77-application-area-appearance/settings-desktop.png
9abd3d25068c3a3324a76563b6083fd4ce319079585b233cff9c25e9843c60fb  44188  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Petro-36e77-application-area-appearance/settings-phone.png
046786b6c11313deea3caf7448b717e81b3bc9f8d508fa868be216d49e1e49d7  73035  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-analysis.png
fda602ea4855f388dc97e8b05c782c25f7fe39cbd88bf161e8f7517d58b0b077  65359  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-dashboard.png
70126a82c7c5b2a3d7671fa8b852995dc4054c7de1f58ada11f259e93464c6ff  425277  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/tactical-map.png
6f28084d2d004b7781faa78047faa0ee9c13742670ebdc99148968c9518cb05c  73383  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-analysis.png
73633509e94ade7f17edd8ed79059d4af842be0d954cd44300a43fa95f8eca95  65948  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-dashboard.png
14933c5677af73f382c32ad5e52cd9fbe89053a1ec2e9124b7eaa6139445590a  425528  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/tactical-map.png
8e61370555edbde854fc2d6ada16ffb6af6b64f0e64c89a07cde60dd32a865fa  128923  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Royal-ef195-application-area-appearance/customizer-desktop.png
64ac4ee00d7427d7d886feba54e41c2cabf4923d0f570613a5ec8798cb82ddce  54219  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Royal-ef195-application-area-appearance/multiplayer-desktop.png
de47d64434a4cb5c38e4841b8bbd2e1c1aef67ed0ce436a7a8e01574cd76dabf  73444  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Royal-ef195-application-area-appearance/settings-desktop.png
553ef4f893b7a8a77d7be8afc24a1c9e035b1cea47918bc397b0c52f4f50fdc3  49646  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Royal-ef195-application-area-appearance/settings-phone.png
ff0d6a478939fe6d37d170ab960ddd8ad8a1fff679b1b123de8efb162f9847a4  127831  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Tacti-7e235-application-area-appearance/customizer-desktop.png
28bade57e015945aeb9a04ccfb2f2f6978f5f0e61dfff9d09053ec5fe46932e3  53823  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Tacti-7e235-application-area-appearance/multiplayer-desktop.png
5f53241b44b1d44ec20228a419b3c8d5fc4616da203c6190750991392f2ee915  72955  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Tacti-7e235-application-area-appearance/settings-desktop.png
656979acf2bde1de8af9a404cf5c7a35ebf6f160eaf30f034ff7639693931716  47438  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-Tacti-7e235-application-area-appearance/settings-phone.png
95361abf5318500864d3aad1a185ea5e666cd6477c515c9fc13e2706223a0849  72209  .sisyphus/pr-customizer-20260910/browser-artifacts/application-palettes-stora-cf1d6--selected-colors-appearance/palette-save-failure.png
e508a32f6ec13c8f737d6e994f2589e55f915e68cccbacd0224b15edf01042e8  41679  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-add-unit-Add-un-da4ff-ings-in-one-flow-customizer/add-unit-catalog.png
b0262269dd041e0d2ba84af6d8e911b89ce35127d90dc897ddfd88124e5f7dcb  41731  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-add-unit-Add-un-da4ff-ings-in-one-flow-customizer/add-unit-phone.png
0281d351382ee5aed7a98c9ea56e999244a6c6c1012b91aa6af64a83c770a003  27440  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-add-unit-blank--133d5-h-catalog-failed-customizer/add-unit-failed.png
e14ad13d3217157b6324b9383624617c41489ab285501fd8a8b6275289527d1f  25066  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-add-unit-blank--3ffd1--catalog-loading-customizer/add-unit-loading.png
674960c044be07425c434167561a488d58e30ca003d0fe9ee7593ecd473719d3  116089  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/armor-desktop.png
a60a1521be9e7fb4029a4fe4c561ab620adef4e225c979b16faacb3a3c585e7f  37401  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/armor-mobile.png
3d33919e106246384e9b510f8c097dda258d9eba85f9101d80cd6a8c2c897680  9034287  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/customizer-quad.pdf
02821576eb49013b1820b7e2c8b93fd9554ec99a9dcbeaf0afa0d9b82b70e7da  71285  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/overview-desktop.png
573b35c90092b133d9d35ca1fcdfa93b3d4a16649383f1f05a0e7999a221e5a7  48635  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/structure-mobile.png
8f8dc48e8796168e0b31db3902076851a1d31ea2e3b1cfce5398931b205dcfd1  9790  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-data-flow-fixed-ceadc-inline-inspector-customizer/fixed-omni-inspector.png
6d74fe4f73027f0a0e5daa2c717d2e149475debe0dfa052b97b9989dab0d7019  82594  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-data-flow-libra-5e495--the-same-design-customizer/fluff-desktop.png
8ae4d5eb772ae750dc6d1751b5c413d5f7c3361b83c7653c05baf7d3f5b5b12b  116511  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/armor-desktop.png
c07b952dabe26bfdb36e32bc39a3c9e52d91cb29bf2ab225cf188eca8fe380f2  127473  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/critical-slots-desktop.png
2a3b706b4fcf9ed57b2c06adbc21c75b9e1b5f245735332f5163971dfed35eab  96167  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/equipment-desktop.png
36e88e371d0a9c2b69ca1393a9218035ac1958c15a09220c1aea1b8dbff750cb  80783  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/fluff-desktop.png
96fb3f27a64e84b9f8cd492d1ddf00df7d2c2e276430c2f5da67f4b2ca6958f6  72388  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/overview-desktop.png
7c7c258c56c6e9d71667755877462569861f86dc0155d1e0b24ec3d3f2eca4e6  115316  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/preview-desktop.png
b6a990b4bfce3e964364ae32aa420320f981b869d403b600599f0d1805357737  105136  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/structure-desktop.png
2df996138bd9f8832c5b0fe42010d9449db47cfcbd7eef6fc9beb39d2b249556  58222  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/armor-mobile.png
0579d2f9a6a9e072bc8351aedf0679e0d33b2da3c94b61717e739b01cdb59a90  34969  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/critical-slots-mobile.png
72e7c93ed81658e49434e20ac263682377dc09208e6c3a5b1e78ea8c5499e25c  47167  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/equipment-mobile.png
c389caec3d84423a210a09dc802db513797546f854f2385d1ac9361fb1f1cec5  40356  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/fluff-mobile.png
6d940d460d887b8b80944888661e0a9c3ba84f29a930199daa51f76656402a0b  32468  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/overview-mobile.png
a5cb97fea9736d6bfcfc26eb4478a101a061df11f617377240668f9ea999e81a  41811  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/preview-mobile.png
29edb35e5d04dca8d283e0f00b74f8b93b650d2a27a1e45b36ece0dd39f3cbe4  41553  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/structure-mobile.png
9a202d52b98e243cc85ed298f7bf7a0d519bb1a610dbccd0e92ac3312220946f  35239  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/library-recovery-mobile.png
469244ad4195456d382ed76eb21b0b5a4c21fca935d68239f950d81e4fb7630b  49771  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-edit-recovery-u-4b397-independent-tabs-customizer/edit-recovery-mobile.png
ad6be787a21beb0891e808e4750710a6acdc3bb6091bfce3e68b8c8c74e2988d  35330  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/criticals-mobile.png
d2311c97bfb1c232a67a9cdafb15233986bc96742708f4ab65bcde225f6759b3  91460  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/equipment-desktop.png
9106eb656b079c2d35d25648dde97088139ff3ef49168bb5ac29a44067dcf4f4  28323  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-layout-workbenc-51e08-olling-workspace-customizer/error-context.md
cc29628e523b19f33974355bad71431fe3b51d4b22d833aad5247a3d821e7982  69029  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-layout-workbenc-51e08-olling-workspace-customizer/last-frame.jpeg
ec683124f08b5038a632553b6b20abdfa51bf6f639cf8141031897b1d6c06aed  1072268  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-layout-workbenc-51e08-olling-workspace-customizer/trace.zip
7b0e3beedc18e43c6ff29ba6ad55f199b646ef88070403264996699157129c71  68510  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-layout-workbenc-65854-d-unit-isolation-customizer/unit-switching.png
c3e91debcfb58f3ba8441d5845aa4c8c2bb6b8868d7e533c8fe4f0375d165266  81759  .sisyphus/pr-customizer-20260910/browser-artifacts/customizer-layout-workbenc-907dc-sed-destinations-customizer/warning-guidance.png
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/browser-driver.log
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  45  .sisyphus/pr-customizer-20260910/browser-final-artifacts/.last-run.json
bbaa4a2f495be17a5f7d9df055a5109744efaad2e580c02f03995218ad2413fd  128808  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Burgu-cdf78-application-area-appearance/customizer-desktop.png
ac3f35fbb6a80d53b93770df0662e7f0a414eaae80240105ab466ab195df4cdc  54176  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Burgu-cdf78-application-area-appearance/multiplayer-desktop.png
29e63fd4ed39de54883c95e86d82d7f1288176a97b68a03661aee0a7581266fd  73203  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Burgu-cdf78-application-area-appearance/settings-desktop.png
68e36049b8d8b877a81d02845a7594d467acd9d3f2bf0d7807c5e6d9d9e51fa9  49268  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Burgu-cdf78-application-area-appearance/settings-phone.png
7dc2ed268ec20a0b69f4f72ad3a488f17545f89b6012225a362a05b752855bec  128345  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Class-3c760-application-area-appearance/customizer-desktop.png
4fdc492c6387f5c125b6cf47e4796369750276894ec46345f01d293fbb70e07c  54037  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Class-3c760-application-area-appearance/multiplayer-desktop.png
a4b909d7da15b6478412a063e5988df9c7d1c45c72bb80d037b0df162693dc0a  72935  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Class-3c760-application-area-appearance/settings-desktop.png
ce81490a158a1eed8c9efa6cddd9e1403f0f000c4ba89486c36d88c6dba0417b  44081  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Class-3c760-application-area-appearance/settings-phone.png
fe2b900fbd8c2c5c2815c4137bc4ef910311feb0e36583a33c2fc0a5eef14a7e  128930  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Coppe-067ea-application-area-appearance/customizer-desktop.png
f22a6c2a1a7d6ce859b6790744e261990e0f0caba3f40b1f15f5f245330b9af6  54093  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Coppe-067ea-application-area-appearance/multiplayer-desktop.png
48f103a255471412d2431141da3d8aaf0d4a3fc055cd34a038c051660559fbff  73217  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Coppe-067ea-application-area-appearance/settings-desktop.png
600857b64bc3ac85e43b10c354a8335f8229523788bf9bc0b02d4d50a7e25cc6  48601  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Coppe-067ea-application-area-appearance/settings-phone.png
b0653cba952042acff99587378d57535439976eff5d849a76453aa0758a31b0d  128465  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Field-cebc6-application-area-appearance/customizer-desktop.png
0aafa696cc3775a058d0271226d092aceca5e215e103094c546c2811b2970bff  54102  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Field-cebc6-application-area-appearance/multiplayer-desktop.png
000d4c0c0df38dc5dd2f9f26465f2cc50c1e91b9f5287bc44a68c62e769ff426  73030  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Field-cebc6-application-area-appearance/settings-desktop.png
ad222a890615952a019c6d9ca74fcd7e87ecc7822251c9c143d6f921cfbd83e0  44196  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Field-cebc6-application-area-appearance/settings-phone.png
7f17fd10ab8c378b8a0df3a6b4bcdbbd638bd21b2e7fd724105701aecf91949a  128546  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Midni-6e020-application-area-appearance/customizer-desktop.png
cbea22942df16370db0bad0cc147e6d22cb7b5d6d37f641e83e9760a1e641556  54142  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Midni-6e020-application-area-appearance/multiplayer-desktop.png
5e86693b08af1f1ee998e544438c36e628a5216bbfd9eb1936765fa09b0f2054  73252  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Midni-6e020-application-area-appearance/settings-desktop.png
51d9f997478cfff800d57d816f5c5c4ed7a1813e323cbdaa41dc7b15ba84b72b  44230  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Midni-6e020-application-area-appearance/settings-phone.png
60161039401d02ea7b5b28ac8cc2fb0960b298a3d53f72b4bd6e8b5badd3eef9  128448  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Neon--34362-application-area-appearance/customizer-desktop.png
f89161bc829bec7dc1111ed912db43b5d23d4ef9ff93d38249b52f9cff057c48  53709  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Neon--34362-application-area-appearance/multiplayer-desktop.png
4274b9e1b4bf4c7a30fd48c2840a77ff61efc7fe7bed4c1e7c5eda95ab4766ae  76189  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Neon--34362-application-area-appearance/settings-desktop.png
ff00b9583ad27574eb0a49fcd3e67719f862cec9e6df5187b0d3be70233fb8e0  48530  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Neon--34362-application-area-appearance/settings-phone.png
64eab1fa9246e31a000d78d1d7eba34eb859a125803e5a5563a4cc528ccbdea3  128062  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Obsid-c663a-application-area-appearance/customizer-desktop.png
d035ff293e51d541de05cc3699ed086e7a50866b6bf79d2c17d4b3d9e8b133da  53653  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Obsid-c663a-application-area-appearance/multiplayer-desktop.png
f14fe76c59d87d9a47ba70d72e6828f573d403c545aed722b8d7b8e135b0d6a5  73227  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Obsid-c663a-application-area-appearance/settings-desktop.png
da6f01c13070d91af6f4c9b7b8f1f9b3a13a7eaa7025f55d8ff1cdf63acb825a  47992  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Obsid-c663a-application-area-appearance/settings-phone.png
635aae536425fe7266d866b6ea724f806d49aa932df023f2adb4f35c3dc81571  128248  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Petro-36e77-application-area-appearance/customizer-desktop.png
7d7f2f70b2e698e26f0f544b9bbffe399bfcc2e37ce21bfa0b789dc357016481  53931  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Petro-36e77-application-area-appearance/multiplayer-desktop.png
0443c56368dd20b40332f93120e8dac99b38666b7eecb261f851f7e5a8ad629d  72865  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Petro-36e77-application-area-appearance/settings-desktop.png
baebf753d944b3912013ff9298e509e492b71abf4603cdd185331b9a1eac1366  46402  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Petro-36e77-application-area-appearance/settings-phone.png
046786b6c11313deea3caf7448b717e81b3bc9f8d508fa868be216d49e1e49d7  73035  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-analysis.png
fda602ea4855f388dc97e8b05c782c25f7fe39cbd88bf161e8f7517d58b0b077  65359  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/simulation-dashboard.png
293427d568013828752cd6f5abf18cdda91c17772ef45b916e7af611b294459a  425365  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Petro-42f69-cal-map-controls-appearance/tactical-map.png
7db5de04353fe2aeabc6650acada23aac619233ad10a343bf32404cb642bb8e8  73388  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-analysis.png
73633509e94ade7f17edd8ed79059d4af842be0d954cd44300a43fa95f8eca95  65948  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/simulation-dashboard.png
65cdf388af6ccaa801ec9f3912d74a08d5fcd0101eb403c3eca66c33846595c2  425485  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Royal-6e960-cal-map-controls-appearance/tactical-map.png
8e61370555edbde854fc2d6ada16ffb6af6b64f0e64c89a07cde60dd32a865fa  128923  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Royal-ef195-application-area-appearance/customizer-desktop.png
64ac4ee00d7427d7d886feba54e41c2cabf4923d0f570613a5ec8798cb82ddce  54219  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Royal-ef195-application-area-appearance/multiplayer-desktop.png
0632f7d4677581ee993fd1b8d31b04026065644243788d3f4ca881939f723490  73430  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Royal-ef195-application-area-appearance/settings-desktop.png
553ef4f893b7a8a77d7be8afc24a1c9e035b1cea47918bc397b0c52f4f50fdc3  49646  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Royal-ef195-application-area-appearance/settings-phone.png
ff0d6a478939fe6d37d170ab960ddd8ad8a1fff679b1b123de8efb162f9847a4  127831  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Tacti-7e235-application-area-appearance/customizer-desktop.png
28bade57e015945aeb9a04ccfb2f2f6978f5f0e61dfff9d09053ec5fe46932e3  53823  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Tacti-7e235-application-area-appearance/multiplayer-desktop.png
5f53241b44b1d44ec20228a419b3c8d5fc4616da203c6190750991392f2ee915  72955  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Tacti-7e235-application-area-appearance/settings-desktop.png
4d01159784034a511587aaee04dc7e3562756c5b8334b69638f8cf918234f151  47424  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-Tacti-7e235-application-area-appearance/settings-phone.png
95361abf5318500864d3aad1a185ea5e666cd6477c515c9fc13e2706223a0849  72209  .sisyphus/pr-customizer-20260910/browser-final-artifacts/application-palettes-stora-cf1d6--selected-colors-appearance/palette-save-failure.png
e508a32f6ec13c8f737d6e994f2589e55f915e68cccbacd0224b15edf01042e8  41679  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-add-unit-Add-un-da4ff-ings-in-one-flow-customizer/add-unit-catalog.png
b0262269dd041e0d2ba84af6d8e911b89ce35127d90dc897ddfd88124e5f7dcb  41731  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-add-unit-Add-un-da4ff-ings-in-one-flow-customizer/add-unit-phone.png
0281d351382ee5aed7a98c9ea56e999244a6c6c1012b91aa6af64a83c770a003  27440  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-add-unit-blank--133d5-h-catalog-failed-customizer/add-unit-failed.png
e14ad13d3217157b6324b9383624617c41489ab285501fd8a8b6275289527d1f  25066  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-add-unit-blank--3ffd1--catalog-loading-customizer/add-unit-loading.png
a97b349bebed99b6829899fd9cb02d0f72efe181df76d8f2472cb767a0d8f3bb  116094  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/armor-desktop.png
2513fe415c4b14f6b3aa26b9f85477f7a07ec7a937f6a00cfbd232fa8d1ef972  37400  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-armor-workbench-4ac43-d-unit-isolation-customizer/armor-mobile.png
87701001034954952e9ce6781d44ba5a3b1e720250c6c5ee2492ea0524914840  9034287  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/customizer-quad.pdf
2a04f02d9e464e8fa40e955b04fdd3cdd15c3558633ad5c96068555663901630  71673  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/overview-desktop.png
573b35c90092b133d9d35ca1fcdfa93b3d4a16649383f1f05a0e7999a221e5a7  48635  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-data-flow-all-t-2982f-nd-configuration-customizer/structure-mobile.png
8f8dc48e8796168e0b31db3902076851a1d31ea2e3b1cfce5398931b205dcfd1  9790  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-data-flow-fixed-ceadc-inline-inspector-customizer/fixed-omni-inspector.png
41a8def156390aa630985667f3d12093361e36b2da8bb24c3a2be95bd4f4d161  82714  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-data-flow-libra-5e495--the-same-design-customizer/fluff-desktop.png
8ae4d5eb772ae750dc6d1751b5c413d5f7c3361b83c7653c05baf7d3f5b5b12b  116511  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/armor-desktop.png
c07b952dabe26bfdb36e32bc39a3c9e52d91cb29bf2ab225cf188eca8fe380f2  127473  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/critical-slots-desktop.png
2a3b706b4fcf9ed57b2c06adbc21c75b9e1b5f245735332f5163971dfed35eab  96167  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/equipment-desktop.png
36e88e371d0a9c2b69ca1393a9218035ac1958c15a09220c1aea1b8dbff750cb  80783  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/fluff-desktop.png
96fb3f27a64e84b9f8cd492d1ddf00df7d2c2e276430c2f5da67f4b2ca6958f6  72388  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/overview-desktop.png
7c7c258c56c6e9d71667755877462569861f86dc0155d1e0b24ec3d3f2eca4e6  115316  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/preview-desktop.png
b6a990b4bfce3e964364ae32aa420320f981b869d403b600599f0d1805357737  105136  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-a-f8b34-plicit-wide-mode-customizer/structure-desktop.png
2df996138bd9f8832c5b0fe42010d9449db47cfcbd7eef6fc9beb39d2b249556  58222  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/armor-mobile.png
0579d2f9a6a9e072bc8351aedf0679e0d33b2da3c94b61717e739b01cdb59a90  34969  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/critical-slots-mobile.png
72e7c93ed81658e49434e20ac263682377dc09208e6c3a5b1e78ea8c5499e25c  47167  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/equipment-mobile.png
c389caec3d84423a210a09dc802db513797546f854f2385d1ac9361fb1f1cec5  40356  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/fluff-mobile.png
6d940d460d887b8b80944888661e0a9c3ba84f29a930199daa51f76656402a0b  32468  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/overview-mobile.png
a5cb97fea9736d6bfcfc26eb4478a101a061df11f617377240668f9ea999e81a  41811  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/preview-mobile.png
29edb35e5d04dca8d283e0f00b74f8b93b650d2a27a1e45b36ece0dd39f3cbe4  41553  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-design-revamp-m-03f52-oss-all-surfaces-customizer/structure-mobile.png
4fa0256651db6a5bf12cfb73ff0ce91d64031a2f21249cb2b560e6642c8a31c4  35331  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/library-recovery-mobile.png
313bd5bb92e382700bf52902da79951ebd1322937dee1752372a85573989c02a  49771  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-edit-recovery-u-4b397-independent-tabs-customizer/edit-recovery-mobile.png
b05a7700a92d6b11f13514f8ae5409450b8beb42edc2bc8e3aab10180a671911  35359  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/criticals-mobile.png
d2311c97bfb1c232a67a9cdafb15233986bc96742708f4ab65bcde225f6759b3  91460  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-equipment-workb-d2a2f-st-independently-customizer/equipment-desktop.png
114e9ff01294d28e61afbbde140fc26e35f5cb952d4c45c8963971c99f263508  43976  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-layout-workbenc-51e08-olling-workspace-customizer/complete-metrics-mobile.png
b30bcbd68b1bc49d2e3559759b32b1af1e3932bf40e530b524889f3c070c606e  125365  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-layout-workbenc-51e08-olling-workspace-customizer/selected-equipment-desktop.png
01f9c8b18d022070f471597efb2f97137abfe79edbf17753b6a7cd1c348489b2  68508  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-layout-workbenc-65854-d-unit-isolation-customizer/unit-switching.png
c3e91debcfb58f3ba8441d5845aa4c8c2bb6b8868d7e533c8fe4f0375d165266  81759  .sisyphus/pr-customizer-20260910/browser-final-artifacts/customizer-layout-workbenc-907dc-sed-destinations-customizer/warning-guidance.png
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/browser-final-driver.log
d9d489bbc5e9f6c10d376a570b9fc7a275e1f0638a447d5e68a2b65cdd05d2c5  479761  .sisyphus/pr-customizer-20260910/browser-final-results.json
b078bcc2653ba7a2ca92b8af45100c39acc3debbd742af7c1d1378f1940d3155  419  .sisyphus/pr-customizer-20260910/browser-final-status.json
c86f88472b98ceddb8e4ab915236fb49bed07b4a514bd5d58821248bcea4c445  1082  .sisyphus/pr-customizer-20260910/browser-final.config.cjs
658d3f15056e9af8b37e0ec6eb34ffae303ac9fd8e17b4997da18cd9c92fa790  5098  .sisyphus/pr-customizer-20260910/browser-final.log
e3ac9a89a49b47f59a01927b7654d78f3dd936054ba913f602c0aaa3b9891d16  480369  .sisyphus/pr-customizer-20260910/browser-results.json
e9d6c5e68cfc0bb91415c1f356386fa9690c74323c6eb411452984c62ab252f2  407  .sisyphus/pr-customizer-20260910/browser-status.json
cd0c774a82ad79376f98e4783537e9302e9fcbdad26394f2a1c269d008ce5a4d  1070  .sisyphus/pr-customizer-20260910/browser.config.cjs
cb499a88e4af442d30b0163f4c5935deb3e1de4690f5cefe6de43bc41358ec7d  6898  .sisyphus/pr-customizer-20260910/browser.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/build-driver.log
31995ea8c3d35a7ce7a5d2f27fdb0dda8d27df419609bdee43a28930595831a6  331  .sisyphus/pr-customizer-20260910/build-status.json
09605cea781d9ecc27c1bcc2b0b819dc109d7acce3779ed98f94a839012550fa  544  .sisyphus/pr-customizer-20260910/build.cjs
446c9893b76ffdd662127bc0437eda7150d732a55d824637402790ab1339d497  2940708  .sisyphus/pr-customizer-20260910/build.log
bf13fa6d54711593eb5852017729ceac53dd8b20786cac6598dbb1be4d4e4cf0  9128  .sisyphus/pr-customizer-20260910/ci-final.json
9a84f7675609dc459b3333bacc948af05a0942b146116501487974f065617912  200  .sisyphus/pr-customizer-20260910/ci-run-final.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/combat-driver.log
382f498e74fae78e41df2705bbb849aa0a9f13971066e1373d574ab98f76a727  352  .sisyphus/pr-customizer-20260910/combat-status.json
7e65086da9200bf06d915128d9af70b600339cfcc9b79e40f41a9ca8845592e1  12459  .sisyphus/pr-customizer-20260910/combat.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/commit-driver.log
70191301d1a27344e5e8222a1f3a18f93781c96050e08221bb3f3a50983f0a34  337  .sisyphus/pr-customizer-20260910/commit-launch.cjs
3ec9055637611b92fd8b9e473749f712db8be1c8884b09da3de0678eb6eb43c1  232  .sisyphus/pr-customizer-20260910/commit-status.json
b8593eb55c2a9be9c9aba11ca60c9cf8af9c2dc00c119562ba2201e9b5aad555  349  .sisyphus/pr-customizer-20260910/commit-verification.json
6a4bbf8549cb23f8d51202d556f7bb1d0352b8222b521d1ccbae0c9c657f25be  987  .sisyphus/pr-customizer-20260910/commit.cjs
efa470f1fae2e279affa1753d160232a6ba20423ee335a95b2117b8194cb6cc6  3299029  .sisyphus/pr-customizer-20260910/commit.log
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  45  .sisyphus/pr-customizer-20260910/committed-browser-artifacts/.last-run.json
fd717046ffc322e00c73b92c2b173e6998a7c672ec99cf7700a5fca61e7d0541  35196  .sisyphus/pr-customizer-20260910/committed-browser-artifacts/customizer-edit-recovery-s-71c90-e-selected-draft-customizer/library-recovery-mobile.png
89c9458c921237db0243277dc24c457ffe70f74c4c2d14336bddb75e26a8fd37  49790  .sisyphus/pr-customizer-20260910/committed-browser-artifacts/customizer-edit-recovery-u-4b397-independent-tabs-customizer/edit-recovery-mobile.png
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/committed-browser-driver.log
884752f90efb6a3cc15823f0872c8a3f2d4e3dbfbc3190f43becfcc11c7bbec4  72172  .sisyphus/pr-customizer-20260910/committed-browser-results.json
e04e4b607b342028c93f02f7d2b74d88ab458caaf806731130cc7c42e622f7bf  426  .sisyphus/pr-customizer-20260910/committed-browser-status.json
93adcfe3e5ed65364c30e915999c8aa531e627307df50fb7c567064567d80e15  805  .sisyphus/pr-customizer-20260910/committed-browser.config.cjs
48cad34f251af209a23f6c8b0ca3a681f5d46f02d01affa65a1f1ee963ef7876  536  .sisyphus/pr-customizer-20260910/committed-browser.log
6f2aefbababb314bdbc9c18d0bc67b121dcbafea6952677bc087281a4244f0b6  1155  .sisyphus/pr-customizer-20260910/copy-dependencies.cjs
0737a8cb223cabd838cd3d6a53300b7c17ce72e45f106a98111b65fee6ec310f  324  .sisyphus/pr-customizer-20260910/copy-launch.cjs
9a2d849bcbd683c308ba0f670abeb3d0da0ba6c952f45f17a989c6f4f53ddef8  97  .sisyphus/pr-customizer-20260910/dependencies-isolated.json
070bd4bc882cbd76aa36d1806680d768233726476462f552f55b230525a8c9f1  27  .sisyphus/pr-customizer-20260910/dependency-copy.log
46e9bc0a47e186c5b2fc0ac377eb94b5c2e2b1435e6b9588e35d4b1a2dafa1a4  311  .sisyphus/pr-customizer-20260910/dependency-recovery.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/determinism-driver.log
ef52f80aa100e741910a539c198c335c09614ede72100659a6867014837512e7  359  .sisyphus/pr-customizer-20260910/determinism-status.json
b30d1edc4abfb3a17242d7a3acba16be1920b12005a0392b108550ae69d58c06  63  .sisyphus/pr-customizer-20260910/determinism.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/format-driver.log
18c79fe149db8e95eced7117a531adfdafc9b2ea821a6b6181d8a7cbacdb7b1c  118  .sisyphus/pr-customizer-20260910/format-final.log
37b96ae0f78fdf3a0c61f64fbc1dd835e7a4eab319337fe4c6b47abfaf047ae9  371  .sisyphus/pr-customizer-20260910/format-status.json
3bdadcef0ed7844138e9b77b15eac9c2b919ff0b5968df398343ee55bd5194a8  118  .sisyphus/pr-customizer-20260910/format.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/hydrate-driver.log
21d720f2ec3c4c04df76a326396792e00eea45a998faefc44b23f63bfd49909f  373  .sisyphus/pr-customizer-20260910/hydrate-status.json
440b61a33c9099385a826c2e28f12f7729dc1535a21e2e81aad6bfca0b427c85  455  .sisyphus/pr-customizer-20260910/hydrate.log
f16064f4ca946a7934d646e7ba880db225537b9b5330316f138b648e2c71d4b2  390  .sisyphus/pr-customizer-20260910/launch.cjs
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/layout-final-driver.log
c005dba3eb95489b20da07ff43f9eda0c4b9d71d733b436490117c0a453c2745  12361  .sisyphus/pr-customizer-20260910/layout-final-results.json
b69f9ddabf6789b8b75a620a5f56d948642cba8d55969aa90d03dd194b54d6b6  460  .sisyphus/pr-customizer-20260910/layout-final-status.json
240d984bda702e8635692b60a1c456c700771b33b41c0f55ba2bee4d47183bc5  900  .sisyphus/pr-customizer-20260910/layout-final.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/lint-driver.log
c02a643e87ec202e04417bfbbab736c86d8f4904828c57833058d3faccf8ed2c  346  .sisyphus/pr-customizer-20260910/lint-status.json
869a7dbd732179c8cbc3fddd792f98c3d1c52167cb7cf23fdf5ce3953177cacf  37909  .sisyphus/pr-customizer-20260910/lint.log
46f2e1a165a1ec49ce067d00d16af4ce737e92b08b7a24e23db3e9336159d9c9  2879  .sisyphus/pr-customizer-20260910/node_modules/next/dist/compiled/jest-worker/processChild.js
620f2a67e74cb6f180add948f3b2226fba7678afd95f5907fcf634801ec4e0eb  3174  .sisyphus/pr-customizer-20260910/node_modules/next/dist/compiled/jest-worker/threadChild.js
3aa86d6d0b92747b11f1eac6367960d29e34b164fc5a01494fe45dd91837a311  22322  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/lib/start-server.js
df2d1867b1e63c7aa1462938d894f72fed8de5b1bfedd229ef2ed5243145c19b  69366  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/next-server.js
8d79ba6b187417427456887f4beecdb48ef3eeaf733d82333207a7d3a195d9a4  17620  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/next.js
e82f0ceba88d025c725ea3062974ad9d7a54a892df8c34a525cb129202387db8  3066  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/require-hook.js
3b55f56f8c70bbadffdacea23a1c19689c3889bab7e78da6c8121ada787bfe99  1609  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/app-page/module.compiled.js
d9a4fbf2796bc864675f91a8c8c3b4f7e07c1d2aae7640866eb60e56be95f0eb  150  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/app-page/vendored/contexts/app-router-context.js
66f970731c65accf19ca7f8576b2718b503ba478fd7076c136ac498d1b7207ca  3343  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/app-page/vendored/contexts/entrypoints.js
7f5fa0f0382fed17b9de98269badaf1c76f3847a05277fb73d2f4b289c8f844d  154  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/app-page/vendored/contexts/head-manager-context.js
2999cbb0fb08a3e7745fde74c0b68e41f30c2825abcf16b4208adad42fc45386  154  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/app-page/vendored/contexts/hooks-client-context.js
2d1e0326d6b7c70b29a4168663ea09dbbea382899c5606004d0b87d2284b244a  154  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/app-page/vendored/contexts/image-config-context.js
e3a2a29dcc06ed167f52377b76a509f77d7dbbe6e3f0f3c7d3b08c2a18433054  143  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/app-page/vendored/contexts/router-context.js
ca03dfce594acc4e5b6c73bf2d902078597b54cfca6aefc8508d8531d2d52616  154  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/app-page/vendored/contexts/server-inserted-html.js
b88d690f8f1f34d7458d6f7424dee20aab425252f62f2b60d15740ac0808037f  775  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/module.compiled.js
d9a4fbf2796bc864675f91a8c8c3b4f7e07c1d2aae7640866eb60e56be95f0eb  150  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/app-router-context.js
abaa19486d99d0553750a2dd630041e989fe6a9cfd269831e0a7e708fc5f4422  4076  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/entrypoints.js
7f5fa0f0382fed17b9de98269badaf1c76f3847a05277fb73d2f4b289c8f844d  154  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/head-manager-context.js
2999cbb0fb08a3e7745fde74c0b68e41f30c2825abcf16b4208adad42fc45386  154  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/hooks-client-context.js
0f8b829d80b1c1ebb8177d76af497e6d5ebda72933f4741afbbb49394106c43c  139  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/html-context.js
2d1e0326d6b7c70b29a4168663ea09dbbea382899c5606004d0b87d2284b244a  154  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/image-config-context.js
743ae9dc457c12eaf3bb028b2ceb8d9ba772f1de31d6864d6f6df450850c9f07  147  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/loadable-context.js
62e6035b928cb801c383a60527cdb140c1405438231d9ed4c40987d7fb665156  132  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/loadable.js
e3a2a29dcc06ed167f52377b76a509f77d7dbbe6e3f0f3c7d3b08c2a18433054  143  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/router-context.js
ca03dfce594acc4e5b6c73bf2d902078597b54cfca6aefc8508d8531d2d52616  154  .sisyphus/pr-customizer-20260910/node_modules/next/dist/server/route-modules/pages/vendored/contexts/server-inserted-html.js
6681c21972024a136e1fa41b7edb3d82f299460827e3ea7fe44ea6e29f421595  41  .sisyphus/pr-customizer-20260910/node_modules/styled-jsx/index.js
4aeae6965d9a8132532c69aaea21aa2df00203e7ce6b5c9b86c8db1796bd66e5  47  .sisyphus/pr-customizer-20260910/node_modules/styled-jsx/style.js
403af3feadde257c921a0d3bd4b932c20a70d8cb70e5d92958f4e75963ee4d3f  6812  .sisyphus/pr-customizer-20260910/openspec-all.log
cf7cf8c2a1e1b5f03489a1f1b535d24712b69f67a3120bd43bbce7a18bbe0266  168  .sisyphus/pr-customizer-20260910/openspec-quality.log
366b9ece83a610a0fa6eb512dca61ad7e43c0ad937a88d77e2ffc3b86cf8a001  6717  .sisyphus/pr-customizer-20260910/owned-files.json
74699ce1cd18610537602e49ec2df49f9922c9d5a77cfadec4e5f7806b3803b6  1824  .sisyphus/pr-customizer-20260910/pr-body.md
96734688afe9ef548dbe768ce35adaa1daa8ca91ad372b16a9331a0c50e76096  9768  .sisyphus/pr-customizer-20260910/pr-readback.json
98ab432eab6afba548673abb5e21e4b9df35cb54950647fb9c7ca95fba2ca819  696  .sisyphus/pr-customizer-20260910/qc-registry-base.log
98ab432eab6afba548673abb5e21e4b9df35cb54950647fb9c7ca95fba2ca819  696  .sisyphus/pr-customizer-20260910/qc-registry.log
fd585164b6589693f70b8ae0f251dd5cf7161a8919f21fed55c9352186b1486d  249  .sisyphus/pr-customizer-20260910/required-checks-final.json
b71d10e315d76077ba461aa6922770cd3f93b23c4d14cd8a5bf04e205d5e221f  19593  .sisyphus/pr-customizer-20260910/root-before-hashes.json
4bebc97a2609abd0425be26f5c4ebec088cd861dd36897d32eab6a3e194a8747  8869  .sisyphus/pr-customizer-20260910/root-before-status.txt
8555f52a9249166accd71ff14aa34bc31cace5dc7f91c3f0208a7c7a74f76cc0  117  .sisyphus/pr-customizer-20260910/root-preservation.json
d2b3540a75489a476e0fd2c5e07def470180016810a601d2e4d5ea8474fef7dc  1081  .sisyphus/pr-customizer-20260910/run.cjs
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  4096  .sisyphus/pr-customizer-20260910/runtime-tests/mekstation.db
a10848edf49a11053fec4f3e8a898a4bd85abb545bf1bdf9a41085224b2448a7  32768  .sisyphus/pr-customizer-20260910/runtime-tests/mekstation.db-shm
48bed77da89a8ef85e4741066fc381a069421891e38b071aae38f930e7519dd7  3160072  .sisyphus/pr-customizer-20260910/runtime-tests/mekstation.db-wal
da63a52bdf62b3fc863995d79f497584be3ba97c1de4c55d1d301afbafab6cfc  4096  .sisyphus/pr-customizer-20260910/runtime-tests/multiplayer.db
d06d8324f58fc76c978bd8f57c1fc5222b8e84c9826eb371e6c1cc7cc6c3c6c0  32768  .sisyphus/pr-customizer-20260910/runtime-tests/multiplayer.db-shm
a63890470fb59d12a7ab9af0228afb0bd6612bf23c28535ab14986cd6c9b0b1e  300792  .sisyphus/pr-customizer-20260910/runtime-tests/multiplayer.db-wal
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/schemas-driver.log
c4cb471f66d6513d7ae24d55c7c4325815dc06466d706ee066e4cbba9a49844e  365  .sisyphus/pr-customizer-20260910/schemas-status.json
24a845dff1647e8c1cf51f15d925065ebce1b7545b3ee26ac218abb527e5cf1b  48  .sisyphus/pr-customizer-20260910/schemas.log
d2197eef8f2c524aafa7f221859af270a94af90bdc7f4480f8eb5a6a60a7d9d2  215  .sisyphus/pr-customizer-20260910/server-stop-first.json
fc98190f3755e770a486fdc221a48023364b99c46459102133a35af4e84eb48d  215  .sisyphus/pr-customizer-20260910/server-stop.json
1f6fae51d7ed50fa926aa399a2635e70785c22732ad9a191cf9862f07e497ea5  278  .sisyphus/pr-customizer-20260910/server.json
88cbd2006df1d2892015fd8ef7c68802b987f897a23fbe9de92824798d731c89  732  .sisyphus/pr-customizer-20260910/server.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/stable-driver.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/stable-final-driver.log
e18eacde4819b3f12466bcb5b9b1bf27b11c18ccb557513324ff25cd71db02df  13323702  .sisyphus/pr-customizer-20260910/stable-final-results.json
667027935b16be5d8e14d2b3656d2e9d097961a11b132883049f5d62cb007126  524  .sisyphus/pr-customizer-20260910/stable-final-status.json
9bf5fa7f5db5bb256b3b72c67ab07c7a2a653c978cab571d79fcd75f1f8e3a76  914593  .sisyphus/pr-customizer-20260910/stable-final.log
9c5ed153199683014791b98f34abadb5b7e35e231cfdc91bc934219f77a14479  13349178  .sisyphus/pr-customizer-20260910/stable-results.json
ec179a859eafc49bead8f54b18b2309ce4fffd1260e58b42d0adcab01f9fcf42  491  .sisyphus/pr-customizer-20260910/stable-status.json
354deee2d960bb29446ad145a13f23501c0cb1a3c93d9cf5c612c786735b9c96  292  .sisyphus/pr-customizer-20260910/stable.config.cjs
3c680e27d581a3bf3b6c718ebd0316da4647fd290e4c65adc64df926a4938935  880223  .sisyphus/pr-customizer-20260910/stable.log
39b8ba722f1b1780801b69b211fdb299a93926a98cfa9db8e156351585ffd8ca  352218  .sisyphus/pr-customizer-20260910/staged-final.diff
e176ff18ecca533aea1b28d6625d676f150a24cbdb0f723799306c2afa3990a5  348170  .sisyphus/pr-customizer-20260910/staged.diff
9f3c29653852674b86c1974a050699e7d0490f518e450000fd5eba48e93b12a6  1320  .sisyphus/pr-customizer-20260910/start-server.cjs
933bebffe07bbeacd6b179e494d9054aff76098f9b3b0b46bb4189e5f858708d  1042  .sisyphus/pr-customizer-20260910/stop-server.ps1
241f8a2649b097cbc079d7a3fb9d4de9fa65e1de2cea1c50ec3bd706b71f79f7  31  .sisyphus/pr-customizer-20260910/test-library-cleanup.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/transient-rerun-driver.log
6fd02243c5ab8d57c96552d9f4c4442601a9e2b54a12350e14996a08131f93fe  18865  .sisyphus/pr-customizer-20260910/transient-rerun-results.json
153bc1723530ed72811d8443ba03f551978c52acc1e11e6e78db90eacd17d35e  604  .sisyphus/pr-customizer-20260910/transient-rerun-status.json
15521797c3331df906dc166b5ba22f43ae20549e61b0052e9f49c20d0afca62a  450  .sisyphus/pr-customizer-20260910/transient-rerun.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/typecheck-driver.log
17794f17f82abc1ec31f5f4ea690b4a934cca573dd5e0f367058ddbd7f06ffdf  368  .sisyphus/pr-customizer-20260910/typecheck-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/pr-customizer-20260910/typecheck.log
bee5349a117290c455fe66b24de4dde1f6d0a1a014662d2768ca1f23ec1aed89  11852  .sisyphus/pr-customizer-20260910/verified-source-hashes.json
```

## 5. Safe to delete

Not reconstructible: the Playwright visual evidence under `browser-artifacts/` and `browser-final-artifacts/` (screenshots, `.last-run.json`, `error-context.md` — roughly 31.6 MB) captures the exact isolated-branch browser runs and cannot be regenerated byte-for-byte; `committed-browser-artifacts/` likewise. Reconstructible and low-value: `runtime-tests/*.db*` SQLite scratch databases (regenerate by rerunning tests), and the 169 KB `node_modules/next` + `node_modules/styled-jsx` vendor-file copies used by `copy-dependencies.cjs`'s dependency-isolation check (reproducible via `npm install` at the pinned versions).
