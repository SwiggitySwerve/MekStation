# spec-reconciliation-20260912

## 1. Purpose

Read-only planning/spec reconciliation lane, checked against repository head `be7f85b867aa3e8576e5e3d27e309276203bc24b` on 2026-09-12, plus one CI-implementation worker lane. From `active-planning-result.md`:

> "Checked against repository head `be7f85b867aa3e8576e5e3d27e309276203bc24b` on 2026-09-12. This lane changed planning/specification text only. No runtime source, test, ledger, archive, branch, commit, or external system was changed."

It reconciled stale claims in four active OpenSpec changes (`add-saved-custom-unit-campaign-roster`, `design-vault-campaign-separation-and-maps`, `add-cross-stream-effect-receipts`, `harden-gm-two-player-campaign-sessions`) against live code, produced a full disposition inventory of ten non-obvious active changes (`inventory-active.md`), and ran `final-customizer-review.md`, a canonical-spec-vs-implementation audit that found 4 drift issues (retired `megamek` armor variant still documented; armor variant display-label mismatch; `RecordSheetPreview` guarantee misattributed to the wrong component; unqualified "Other" equipment-category exception). Separately, `ci-worker-result.md` documents a CI worker that authored and implemented the new OpenSpec change `add-customizer-pr-regression-gate` (a `customizer-regressions` PR-gate job, job-scoped CI contract validator, and three new customizer browser regression specs); `ci-review.md` is the parent's read-only review of that CI work, flagging two "High" findings (a checked task claiming unrun browser verification, and job-scoped CI contracts that a comment/env-value can satisfy).

This lane's output was published via PR #1761, "docs(audit): publish customizer spec reconciliation data and review receipts" (merged 2026-09-15 into `docs/audits/2026-09-12-customizer-spec-reconciliation/`), and is referenced by the later roadmap-completion planning receipts dated 2026-09-15 (see Cited by) and by PRs #1776-#1779. `git log --oneline -- docs/audits/2026-09-12-customizer-spec-reconciliation` shows commit `d3540bfea` (#1646), `cb4058c6f` (#1761), `b668d659a` (#1776).

Date range (file mtimes): 2026-09-10T22:08:30Z (a carried-over `launch-check.cjs`) to 2026-09-12T10:29:33Z.

## 2. Cited by

`git grep -n -F ".sisyphus/spec-reconciliation-20260912" -- ':!openspec/planning/2026-09-12-roadmap-completion'` found 6 distinct files; `grep -rn -F ".sisyphus/spec-reconciliation-20260912" openspec/planning/2026-09-12-roadmap-completion docs` found the same 6 plus the roadmap-completion set below (184 combined raw lines; docs/audits results overlap between the two commands since neither excludes `docs/`).

- `docs/audits/2026-09-12-customizer-spec-reconciliation/inventory.json` — **152 occurrences**, all the identical provenance string `.sisyphus/spec-reconciliation-20260912/inventory-manifest.json partition other_b` tagging inventory rows with their source partition file.
- `docs/audits/2026-09-12-customizer-spec-reconciliation/verification.json:137,223` — an `--output=` CLI arg and a `browserArtifacts` field both pointing at `.sisyphus/spec-reconciliation-20260912/browser-production-ip-results`.
- `docs/audits/2026-09-12-customizer-spec-reconciliation/evidence/ci-docs-review.md:19` — "Local production evidence: all 10 cases passed in about 69 seconds with one worker against the hydrated standalone server on port 3636."
- `openspec/changes/add-customizer-pr-regression-gate/tasks.md:31,36,37` — task checkboxes 5.3/6.1/6.2 citing the 10/10 and 12/12 real-Chromium browser runs recorded in this folder.
- `openspec/planning/2026-09-12-roadmap-completion/evidence/admission-snapshot.json:960,974,981` — quotes the same three task lines above.
- `openspec/planning/2026-09-12-roadmap-completion/evidence/r1-ci-prefixes-2-4-prep-20260915.json:640` and `.../r1-ci-prefixes-2-4-review-20260915.json:170` — dated **2026-09-15** (the day before this distillation), citing this folder's task 5.3/6.2 evidence and browser log tails.
- `openspec/planning/2026-09-12-roadmap-completion/evidence/r1-remote-closure-20260915.json:188-189,207-208,214-215` and `.../r1-remote-disposition-brief-20260915.json:208,238-278` — also dated 2026-09-15, cite exact log-tail strings from `browser-production-ip.log`, `browser-production-followups-red.log`, `browser-production-followups-final.log`, and `ci-contracts-final.log` as **live-read receipts** proving roadmap tasks 5.3/6.1/6.2 were really executed.
- `openspec/planning/2026-09-12-roadmap-completion/roadmap.json:9311,9345,9362` — same task-line quotes.

**Flag:** unlike the other three folders, several of these citations (`r1-*-20260915.json`, `admission-snapshot.json`, `roadmap.json`) are from an **active, one-day-old roadmap-completion package** that treats this folder's raw logs as its evidentiary receipts for already-closed roadmap items, not just a historical audit's dead links. Deleting this folder removes the underlying proof those receipts point to, though the receipt files themselves (which quote the relevant log-tail text inline) will still read correctly; only a re-verification against the original raw files would become impossible.

## 3. Key results

- `openspec-all-final.log` (strict, `--all`): **235 specs passed, 0 failed** — `openspec-all-final-status.json` exit code 0.
- `specs-final.log` / `specs-final-status.json`: exit code **1**, but the failure is environmental — `Error: Cannot find module '...node_modules/@fission-ai/openspec/bin/openspec.js'` (the CLI wasn't installed at that path for this invocation), not a validation failure; superseded by the successful `openspec-all-final` run above.
- `ci-contracts-final.log` / `-status.json`: exit code **1**, Jest run of `scripts/__tests__/openspec-ci-quality-qc.test.ts` — **27 passed, 1 failed, 28 total**. The one failure ("rejects the gate command when only an environment value mentions it") is the same gap `ci-review.md` finding #2 calls out: the validator does a raw string `includes()` check rather than parsing the workflow YAML, so a comment/env-value can satisfy a required token.
- `typecheck-followups-final-status.json`: exit code 0.
- `browser-production-followups-final.log`: **12/12 Chromium tests passed (1.1m)** — the new `customizer-regressions` gate's expanded 12-case pack (`customizer-edit-recovery`, `customizer-equipment-catalog`, `customizer-record-sheet-rendering` specs), matching `ci-worker-result.md`'s "Passed 12/12 in about 69 seconds" claim.
- `ci-docs-review.md:19` / task 5.3: an earlier **10/10** real-Chromium run against the hydrated production standalone server on port 3636 also passed, ~69s.
- `final-customizer-review.md` recorded 4 canonical-spec-vs-implementation drift findings (severities: high, medium, high, medium) — see Purpose for the summary; each cites exact file:line pairs in both `openspec/specs/` and `src/`.

## 4. Inventory

153 files, 22,646,408 bytes total.

```
23d52b1c1788e1c27a9e7ae0a2c7e8b4acf97c178eec98db92439f214c13199f  7665  .sisyphus/spec-reconciliation-20260912/active-planning-result.md
f82d1b499463366f7c6b8a443d3ac80926b0d9c51cd853770466a37b9cfdd07f  9737  .sisyphus/spec-reconciliation-20260912/after-archive-ci.json
71138071a40c86ea1eec29a3e7979224e437a2fbd9087118e144ff2c552cdc54  3498  .sisyphus/spec-reconciliation-20260912/archive-approved.cjs
997c4e9f5b1ce3c2072df7a6ec90fbc7b6ff4f15528a7203413c5516e2ae0852  291  .sisyphus/spec-reconciliation-20260912/assets-status.json
75c2c99edba75eccaac574639d0b076917280f01bd514c38d4de7d2d91af3890  427  .sisyphus/spec-reconciliation-20260912/assets.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/spec-reconciliation-20260912/before-specs/battlemech-chassis-index.md
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/spec-reconciliation-20260912/before-specs/customizer-edit-recovery.md
62821d00b93155e0e42fe0815adc25aadf8f139005fd62d96e875a1799b402aa  26421  .sisyphus/spec-reconciliation-20260912/before-specs/equipment-browser.md
b018fc70dba3dc2a9b0e084e99e75ee819830a4fc3d248ca24c30611fb35d2f3  49075  .sisyphus/spec-reconciliation-20260912/before-specs/record-sheet-export.md
c279631854e5338129800bc988ae3cbbe9125a5e3894eedaa4dece6a0656c8a9  610  .sisyphus/spec-reconciliation-20260912/browser-customizer-loopback-status.json
8d26c8b19a72c955d58e9bd0338a90d99b8c61d1b907946ff591c75264f3de60  26585  .sisyphus/spec-reconciliation-20260912/browser-customizer-loopback.log
5dd05d7dab0fe54b612ca6cab6a7dbe2a5ebca0a5adbd031cd0d3c2f8a741b7f  601  .sisyphus/spec-reconciliation-20260912/browser-customizer-status.json
a4d33d6e1b354fd3622f011b2a6f1fedbfcb1366864c7f0f6e7f24043ac2b9a0  155  .sisyphus/spec-reconciliation-20260912/browser-customizer.log
97521aedf21cdf5c7735c16176c58d6b222093514caca4b30fd51af0638c9de5  624  .sisyphus/spec-reconciliation-20260912/browser-production-followups-final-status.json
610a127b1517789e98e0121b0dafd681b911db671a046bdd0965a426a5febba6  2689  .sisyphus/spec-reconciliation-20260912/browser-production-followups-final.log
c0b651f182771fd9f228d60e1f6b9aba0e68a27338ecad2b8edb11f2dcda643b  629  .sisyphus/spec-reconciliation-20260912/browser-production-followups-red-status.json
2d9c639081d41ccb481a8c32b69cfc88abe8462beb6461d525e4c5a083bb2b06  7460  .sisyphus/spec-reconciliation-20260912/browser-production-followups-red.log
79e7feb70b72d5500a9dbd96796c8edee4a3bda79805ac4aedbf53afc80cb83a  612  .sisyphus/spec-reconciliation-20260912/browser-production-followups-status.json
8e37837897f924f2d1f7f8abfeeb04c4bce6ff75a094819b60ba98b7366e8d73  9974  .sisyphus/spec-reconciliation-20260912/browser-production-followups.log
91d1c43004802cd49950d78eb11c8fa7d05da8ffffe219a8b13b2f561bc00903  45  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/.last-run.json
877a7390df67bcabf5d10ecbf4d197710735c834df5132e1245b78c71e632d33  35360  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-edit-recovery-s-71c90-e-selected-draft-customizer-chromium/library-recovery-mobile.png
5cf331ae1acea4fd730e7c280a5185f4fe1b4a4d859a92f5f074e62bad09a59e  47239  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-edit-recovery-u-4b397-independent-tabs-customizer-chromium/edit-recovery-mobile.png
0104240ae2ef6b483e5073ebec1eff417321b19f3053375004f22b2632e03786  77108  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-equipment-catal-335ca-nrelated-filters-customizer-chromium/electronics-desktop.png
490ddb2ed4562d9a267b145cdaa1ff014232f80b796c54d911c3fd08225dcd9e  69250  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/catalog-desktop.png
94b2d14e4e37a83d2bc230a005f0c600265cb7a34e15807332a6f92a3f2853e2  43194  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/catalog-mobile.png
3f4e5947101567e73a16851016fd0157380063085bd76bca7ef28d327e31b1bf  43480  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/placement-mobile.png
a27e89cbda01b82e0d54510df3eb1ac77443d1573e5ddc9fd682610765c9ef28  92027  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-scrolled.png
3c01d1bfe50ac55dbf24ff2300a42afa4ab326851d865ba844381357027c1491  87873  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-sidebar.png
442d90f8343fc386454cc84f90c7836bed901a66ecf6e49f440beef7bbcad68c  68321  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-wide.png
918ba9d39f3dc394a4a39597b64bcef2350fe4de0041b8b0d399306e3240d2e0  57652  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-mobile.png
aad92e0f98f6d5b4ad724ac7d309b6844834520dec04a3eb74fdbfe9ebe0f6b5  1115745  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-record-sheet-re-02aca-o-a-one-page-PDF-customizer-chromium/atlas-a4-page-box.pdf
c8ea1f9ed9ca2d01a6e3c17b8d4f8ef7680a7b769b55f7e9fddb942f882306b3  1111822  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-record-sheet-re-02aca-o-a-one-page-PDF-customizer-chromium/atlas-letter-after-retry.pdf
f4a4dc507d16ae5ada3822ab4121bd9cde6a7a4e9ca7b86d0240bdd6daa04057  1115745  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-a4.pdf
e4c122d838ad6f8542ce7f75503a67810f07644b33d6fecb579aca75acfbb3f4  1111822  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-letter-after-switch.pdf
50cbe9241ab0be37729afa8ec044ccae7e356423f60ff993e59c973d1dd9daae  1111822  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-letter.pdf
5737a8e1755e1b2f750269f92d5a368d3de97cba4bd2f8367e988e46291b0b2f  931365  .sisyphus/spec-reconciliation-20260912/browser-production-ip-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/locust-letter.pdf
255322abaa113771cda23cd739f923f9b76865dcb820b2f16f49d1b2aa5c4ff6  617  .sisyphus/spec-reconciliation-20260912/browser-production-ip-status.json
952104e2cfa558f28b7dff05df65ad6a224d8ed959ebe6f6c9268aeab4d5f3d7  2351  .sisyphus/spec-reconciliation-20260912/browser-production-ip.log
e22df5d0991eb28c09093b1e678b3fa8cd1fab48185d38e67cf79fb6e63ad5ea  45  .sisyphus/spec-reconciliation-20260912/browser-production-results/.last-run.json
f1c060e1bbc3f67b89673ce7b22c5b354fc4637d2b9518dc60dbc488e5cf2ab3  612  .sisyphus/spec-reconciliation-20260912/browser-production-status.json
a853ba1900af643cb8413e9194529b73129052fae22eb75be58f891acf5e7265  151  .sisyphus/spec-reconciliation-20260912/browser-production.log
8b316abe32b3c12b5981c1f42b012162546bb4a2efd6a54ec3bf84ffb986d434  96  .sisyphus/spec-reconciliation-20260912/browser-results/.last-run.json
4e3f51bff1e2dc6f9f6eb111fe0bff7aa07ff568d9a979edd2b942b8e087b512  37134  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-edit-recovery-s-71c90-e-selected-draft-customizer-chromium/library-recovery-mobile.png
4d77eb0eaf98f128da1451ae65b435d04402ef161277f3bf0862774d8cc477c5  48979  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-edit-recovery-u-4b397-independent-tabs-customizer-chromium/edit-recovery-mobile.png
342477648a23638d69a907a92223c1806c2b8c6dab3469a74a1db9d47d553880  78926  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-equipment-catal-335ca-nrelated-filters-customizer-chromium/electronics-desktop.png
2b053547844f2b2559ff2162a4f40570db62ed384c00b5f50551a624e74391ed  71243  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/catalog-desktop.png
4eb22698eb5d4b20340804ab05d3fc55ab66f73e8398f0709cf88aebb958b319  44605  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/catalog-mobile.png
f5cde430a6bb0bf1b30e47218eb036a8e3c6d15ec11a37d86ab1b6382c7e48b6  45170  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-equipment-catal-63444-sktop-and-mobile-customizer-chromium/placement-mobile.png
1e26d767af9a48804bd26394846b2169f80ed74008eb07da8facaffb8f91dc64  93872  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-scrolled.png
588d624f946c53c05799bcaa3f65859d51fe00b5495202f0621a56d9c59a12fe  89735  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-sidebar.png
56f207d176d04c0b5257e29c56afa609f701d5fa4b8c836129f285eb005b9735  79202  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-desktop-wide.png
24a3636e2437d106113318be1d91dc7f7df355e0849ebb08b84288a1e211af82  59399  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-equipment-catal-f2690-sktop-and-mobile-customizer-chromium/density-mobile.png
fe23f2a58508b7f5988adc9e89e29c56458f0520168ad4d6dbf30b3577ced064  1115745  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-02aca-o-a-one-page-PDF-customizer-chromium/atlas-a4-page-box.pdf
4535851990b41ee11d4b23e9fb5d11481d092b2c8db7e2862cb66a8c6210ab55  1111822  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-02aca-o-a-one-page-PDF-customizer-chromium/atlas-letter-after-retry.pdf
9b763f04ca108d1ded0027637e33f715a454b2436b8b91ab62dc95017189eda8  17761  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-0ccb5-and-Retry-prints-customizer-chromium/error-context.md
e0327db1e10bdcab6bb61b23206f791aec8bdbe5b98fdde083370ec972280254  181573  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-0ccb5-and-Retry-prints-customizer-chromium/test-failed-1.png
6fd4c250b94091bffc39f9d242253c27bc4042e56b77647c7c97f6d8f272fd48  3023713  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-0ccb5-and-Retry-prints-customizer-chromium/trace.zip
1c44c257e07f640e563b8e2c637fed86d8e57504c3f570c3cec0eabd4d4f06a3  1115745  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-a4.pdf
d849272023feccd6f2a98dbb109df2a412f3614f52cbc547ee5ea1ecefee8675  1111822  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-letter-after-switch.pdf
fc7f142e25bd24ac361e1334156faf93dbab657350e813d1f664bf353470e19e  1111822  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/atlas-letter.pdf
f9176584aea6563f106db85d16c90ac05b9a65a8def6aa55b0a9de2cf937f962  931365  .sisyphus/spec-reconciliation-20260912/browser-results/customizer-record-sheet-re-de5ee-tter-and-A4-PDFs-customizer-chromium/locust-letter.pdf
ae55ced3d6425b38a33d1530db9dbf642d6be1264e0154c4ff76eebb32e048b9  268  .sisyphus/spec-reconciliation-20260912/build-followups-status.json
ac6c801e9ce14d568d66d42a0db94434609397a595e147ae4486df5abcffd980  154044  .sisyphus/spec-reconciliation-20260912/build-followups.log
74999d8ad935873db77e28bbcd738e207fe4a1b378fac73ff8b657ffc84d369f  241  .sisyphus/spec-reconciliation-20260912/build-status.json
e4d47528788e8089965ed1239a7e7720c33bcb653a1a7b26c2c47022071fca0f  266  .sisyphus/spec-reconciliation-20260912/build-webpack-status.json
ed5579fb5be84c410b5896e5baab4728af0354971500e88e87d0b4681a105c96  2606190  .sisyphus/spec-reconciliation-20260912/build-webpack.log
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/spec-reconciliation-20260912/build.log
a7d911b136b7f36a873e65e26e7b1e1371889a4375cce6a25db87af5b3d2c184  4757  .sisyphus/spec-reconciliation-20260912/changed-paths-before-final.json
a33768ff8688fdd35ba997a5e2bb57c5add61133cb1173b0e015006951d0a983  383  .sisyphus/spec-reconciliation-20260912/ci-contracts-accepted-status.json
9d1cb7213c57fc3abb24a0b864ea7296ec3fcffe4c13409164c6d938728d6eda  2369  .sisyphus/spec-reconciliation-20260912/ci-contracts-accepted.log
2f9d0653fb3f6c5ae4bea05f37eff2d38ff558b3f8591c3bf8220729b4201b6d  383  .sisyphus/spec-reconciliation-20260912/ci-contracts-complete-status.json
fcbac14bf4b55ea6c41c6145b9216278ab79e8202f410d2a93a9a703974f6474  2360  .sisyphus/spec-reconciliation-20260912/ci-contracts-complete.log
cbac644eb822ab34e4fe696ee20a93b11b4de7621629a1dc0218b008bb58da2f  380  .sisyphus/spec-reconciliation-20260912/ci-contracts-final-status.json
acac3d784ad24c5021f6607613bfcde8a9cd696efa7b026e87bbd7b960a8bdf8  4875  .sisyphus/spec-reconciliation-20260912/ci-contracts-final.log
e4d7dc9387a14ae53eee9ebc03ca8044ae5a16ea47a2203ddbdb7a1bf6b43a83  374  .sisyphus/spec-reconciliation-20260912/ci-contracts-status.json
59f795925926b1b05dbbb68ce1dd5a3421f2d54f8cd61031399e4a3e99a8f02c  1502  .sisyphus/spec-reconciliation-20260912/ci-contracts.log
2224ecfd37f75d50a1943aa9a2458ed637d32d0c7c403d0582c096cf0e801a70  2659  .sisyphus/spec-reconciliation-20260912/ci-extra-tests.txt
a711b21e1b9d7942b6766db09f9664183823e864a5d937cf97302e6969898c73  10840  .sisyphus/spec-reconciliation-20260912/ci-final-manifest.json
e28a50fc8cfa60e893a62f2917a2ff6d4342e8c7f67148956002e27839e8e65f  330  .sisyphus/spec-reconciliation-20260912/ci-followups-status.json
3144f8fde067958b16404e4c950620c152b107823dd013cd387c087f5a02fcd6  181  .sisyphus/spec-reconciliation-20260912/ci-followups.log
8be12253e3103f3781c930543085a3f24c0b8b5b49ace9cf48777a99ffaa0dcb  3350  .sisyphus/spec-reconciliation-20260912/ci-review.json
8286add0ae70baec952517fd2e8e2476dd2ba436ef6e8fa1823b695961a87ccb  2358  .sisyphus/spec-reconciliation-20260912/ci-review.md
9dc8953a79a7401e86dc45e1dab9e185665806d1be9cbf159a97a0d2115aa090  3895  .sisyphus/spec-reconciliation-20260912/ci-worker-prompt.txt
5b8c42e09947c6c76ab8cb8e6408144dabac67f85e01e5faee0679ba8f92d96a  11496  .sisyphus/spec-reconciliation-20260912/ci-worker-result.md
0795ba73379de11da08e11ebb6f74d6242e92751aca043d558e39dd5f1971205  222  .sisyphus/spec-reconciliation-20260912/ci-worker-status.json
f30da258120450579b0d1c7804a145d79be5ab196bf5694de28673fcd19287db  1545579  .sisyphus/spec-reconciliation-20260912/ci-worker.jsonl
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/spec-reconciliation-20260912/ci-worker.stderr.log
47f36f8f294c211cfc8b88cc16c01100ccba7c56aa9293ead38796ff706eec8f  708  .sisyphus/spec-reconciliation-20260912/combat-contracts-status.json
721b936ef894006ce217a77e32285e4b3cc1d5e108532f89694c83fd8bc5b3fe  2516  .sisyphus/spec-reconciliation-20260912/combat-contracts.log
e34d69f7f567a10b7b90048b010d82ea105d1a245a377bdb1a6e62ab10ece6d1  8264  .sisyphus/spec-reconciliation-20260912/compile-inventory.cjs
dbcb9d2d76ba22ea0fb43ba2de4389fd4aff04d5eef13c9f05399293730ad509  5538  .sisyphus/spec-reconciliation-20260912/customizer-crossrefs.txt
5dbd7a86df4a122cca7bdd6a1c6a078a9ff1d1b381dfc09a25ec40fb4f740fc6  3900  .sisyphus/spec-reconciliation-20260912/data-specs-result.md
90583d67aaf59ee93f98e62ea65373dab3238810466c3b6096aa23fe15e0bc20  790  .sisyphus/spec-reconciliation-20260912/editor-baseline-status.json
5c1611b42129e7cef0de81ec708ca9fc66aabdba8dc7e8e1bdf46322945f2a2e  1097  .sisyphus/spec-reconciliation-20260912/editor-baseline.log
eadd415dcd2201df97892ddc39922ad7c83416100d9613d865b365c829546913  8082  .sisyphus/spec-reconciliation-20260912/final-customizer-review.md
c8bd4f20dd3464bb0f73c1ad273272bae2fb8b9d91b20ec556ea61766806fb94  5251  .sisyphus/spec-reconciliation-20260912/final-owned-format-paths.json
f3bffe2b21cfe7cd650f2a2b1fe91c4d8eb13d88cd66a9ab8e24587ac5c5abc7  3027  .sisyphus/spec-reconciliation-20260912/final-records.cjs
08441cc59217efc4c9ccc1fc09b294d6a84312bde09d5aa66d5cd336111ff44c  4535  .sisyphus/spec-reconciliation-20260912/finish-ci-code.cjs
48a99bc5b2d35e2ba21e5b9347251e2c8ccdf60ea0372b39b50172aaf180b188  584  .sisyphus/spec-reconciliation-20260912/focused-followups-status.json
569196f168fbed5269b486b8f02c086c2636fffdf7f79fd1b96ad7656fe99f41  415  .sisyphus/spec-reconciliation-20260912/focused-followups.log
b652f544f431fac71a43c2d4c69bc7c9bed82038b97f58d9678db5a6bba10f7f  50  .sisyphus/spec-reconciliation-20260912/format-whole-final-status.json
65ca75d0c66fcfb642fe67b159ff96011fb72334ecd3cfb5fffb1fae47864c00  559  .sisyphus/spec-reconciliation-20260912/format-whole-final.log
a11d3b206a14ba1749e4c9d934e9078192a4ac308e46c1696bfac4711af86d03  24096  .sisyphus/spec-reconciliation-20260912/inventory-active.json
2acea257b1aa134a8f7143fb3b154980cfff5638468dc063300c66f32bfae6f3  7276  .sisyphus/spec-reconciliation-20260912/inventory-active.md
266da0fea0b65b55292005c6ae68b2a047c902bda701701af94466bf96318129  253141  .sisyphus/spec-reconciliation-20260912/inventory-customizer-rg.txt
e5ec0a0f874897a88a811eab6b126e96d18495b79f370b0b9a71f4ef7e5fa02e  24233  .sisyphus/spec-reconciliation-20260912/inventory-customizer.json
7ecc0cf55bdcd8a1eb7df77a19352e978075ab39770ac2e0aa85877d653e6e0b  22794  .sisyphus/spec-reconciliation-20260912/inventory-manifest.json
3c5e8b82ceb84f0c2685cbe4c65779e05f738504c1565b380bd482c614764aa0  27671  .sisyphus/spec-reconciliation-20260912/inventory-other-a.json
0f6a07ab22576f58a97166b29930d6b638fc27f8905857917c2d491b75fe5172  23105  .sisyphus/spec-reconciliation-20260912/inventory-other-a.md
6a28cb243e635ecf0d5f045a4370b4a44fb7d5991b067d860a9ca5d985612e5e  50935  .sisyphus/spec-reconciliation-20260912/inventory-other-b.json
8f9ef6657e4ebb3ba0b67505d118395736a9f9c654258c5c1fa06336c9c4d4f8  310  .sisyphus/spec-reconciliation-20260912/launch-check.cjs
902f450d4359ef80666f77b5e6487475005fff8815c7e00dddd844f4f2e755b7  247  .sisyphus/spec-reconciliation-20260912/lint-final-status.json
e1a88e82e29eb694b9d615fd35fe5ed9b5227482dda6970832ac83b3f011d7af  39125  .sisyphus/spec-reconciliation-20260912/lint-final.log
99ed6a964c9beeddd21a470dec6ed9a91c6620103440407829b5e9b0381980ee  248  .sisyphus/spec-reconciliation-20260912/lint-followups-final-status.json
c50da1808bccb7aab28947c3a9b8fa08adf01de4f58857fb250007c380a5b2ad  39125  .sisyphus/spec-reconciliation-20260912/lint-followups-final.log
938fee93c70b33cdbfe4aee9546ba90f21d70a61c8dba34de26f7f83886bdc1f  271  .sisyphus/spec-reconciliation-20260912/lint-followups-status.json
c796e4256a4a82ddb08c21a2c7cf986f317624fe1097c9337abc2a7d6e2ffa8c  62  .sisyphus/spec-reconciliation-20260912/lint-followups.log
dcb05de26bc777b7fbcbf5519adb62c0177552cc8e3d488efdb4f65e55b92e77  232  .sisyphus/spec-reconciliation-20260912/lint-status.json
f003c16b9a9eb88894b1e634d66629adca8798b09fd336e84a1295b0625be275  39125  .sisyphus/spec-reconciliation-20260912/lint.log
216e1cc6d6a5702d68370931bd88770064b9582705ae8f7df4da61b1b3168861  50  .sisyphus/spec-reconciliation-20260912/openspec-all-final-status.json
37f27a1f9d26e652f5c0d4c4bae05ebef45eaf62f544a8082f802c0613452fd1  7076  .sisyphus/spec-reconciliation-20260912/openspec-all-final.log
d730f80a307e15fc0b5713f3ff409f649c7a18cf7bdb275dd76ba8fd0f797690  3022  .sisyphus/spec-reconciliation-20260912/pointer-cleanup-a-result.md
594a30f65d1f820a828a3fa0f02f1e6df7c1b9228e3832e17600ed9cb9e6b754  10435  .sisyphus/spec-reconciliation-20260912/pointer-fixes-a.json
08d2b7b1be6258c2034262d635cdf9c203420d76a3d442ae3ac52e30dc760b89  3300  .sisyphus/spec-reconciliation-20260912/pointer-fixes-b.md
19daa7eaf1e776030c186f651c66c72e78470282044cb0800007fe22c3ba48ff  585  .sisyphus/spec-reconciliation-20260912/preview-followups-status.json
529d1a48c1ab57d8f2160a6a4ada30e7865a9b63505fa39056820f8916ecdf2b  1147  .sisyphus/spec-reconciliation-20260912/preview-followups.log
e26ca732592ace0253cc563f512f74a327cee7bffad012be5e4bf410d16a4d3b  449  .sisyphus/spec-reconciliation-20260912/printing-baseline-status.json
c2b64d567f05c5973a88a56314a840941ca597be404f20c22d1005b8629a9f5f  3477  .sisyphus/spec-reconciliation-20260912/printing-baseline.log
3b05e7ade08eecc806403c74f5c7eb9d38a07b1edba3e8f4ff9f7aee4e20f8e9  285  .sisyphus/spec-reconciliation-20260912/purpose-final-status.json
a3911de992bc85c66b8d98144e41d0b6996542141b72fe535eaacd88dfc48f84  137  .sisyphus/spec-reconciliation-20260912/purpose-final.log
c6040dcbfac15d62b641d0666f41fbcef525a1f0b0e83e3eee0792c53c27c924  3380  .sisyphus/spec-reconciliation-20260912/reference-cleanup-result.md
b7934d63aec31c12ccf5d1c27391da35dff63479b1594df5077b1d822343e28d  379  .sisyphus/spec-reconciliation-20260912/router-final-status.json
0ba18d8f7c769ba94c7d445ccce1987920dedd3ae49f75dc5c9001f6f125c7e0  189  .sisyphus/spec-reconciliation-20260912/router-final.log
e9d7cc6cf0a31c5ace038fa78a5eefa3b12f15db664a2af91c3ced27fbc16a01  1212  .sisyphus/spec-reconciliation-20260912/run-check.cjs
fec47629d16870db3cb82ecdaa5a0179d44606bed3a23e86fc20466e0be51495  270  .sisyphus/spec-reconciliation-20260912/source-token-check.json
1d81cf365937fbfd0810108ec3ba08c92c55113c33de34036ced3b3969eb064b  303  .sisyphus/spec-reconciliation-20260912/specs-final-status.json
52036fb7c07e1963e1d3ad3928230b7fc13db07304f1a196094af9c439f9134e  795  .sisyphus/spec-reconciliation-20260912/specs-final.log
ceba5730cd74939deb8a0e72c87934218cb2303bf8b54ba08da0c6774fbb89d3  1315  .sisyphus/spec-reconciliation-20260912/sync-initial.json
d53d78ce8df953442fde7d4e89dd5688782c55fefad5e89f7a88b05e29df0ce3  323  .sisyphus/spec-reconciliation-20260912/terminology-final-status.json
566cf7113875896487760fb21d749a257d6e8c8bd7aaf49a0c638dfc22b5529d  1513  .sisyphus/spec-reconciliation-20260912/terminology-final.log
a44677381a89634c32c6ee8d116c1fb42b4f86b407c624d661486ccc464cd36d  317  .sisyphus/spec-reconciliation-20260912/terminology-status.json
0e262861cfde446813ffc63b5f5f88a512c7b92789f53f84bf08ced32d0a3fde  4733  .sisyphus/spec-reconciliation-20260912/terminology.log
7f922d3de23c443f0b7d038fbb84a2abc85870a137b6152fe6cb4b2f8c272aba  260  .sisyphus/spec-reconciliation-20260912/typecheck-final-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/spec-reconciliation-20260912/typecheck-final.log
4ae0ca674d27da4b26305e2747d1400cb4d0b775ee1241a624cb7e93b7396bf5  304  .sisyphus/spec-reconciliation-20260912/typecheck-followups-final-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/spec-reconciliation-20260912/typecheck-followups-final.log
e570e78f43b98a7b31cebdbba246fe21ec25451aa60dbe2ed89c633e8891480d  298  .sisyphus/spec-reconciliation-20260912/typecheck-followups-status.json
0400846ffc37c2a89be60fe9a9c5fb6395a3c13d3fa046f930cca6322747a9d4  162  .sisyphus/spec-reconciliation-20260912/typecheck-followups.log
3657b21428a972a541a57bd0b2ac20792e9880165e4e881e3fe668cd9dfc5ba1  254  .sisyphus/spec-reconciliation-20260912/typecheck-status.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  0  .sisyphus/spec-reconciliation-20260912/typecheck.log
17e6ab73b73abf0e71c0fab552b106ed11cfd2d4ef6fadbeedf5cc2474c43fa1  1284  .sisyphus/spec-reconciliation-20260912/worker-run.cjs
a7036f9974215f5f94aa525c40b4e35a04e8edd55e00b6fa468ed23315aa0453  2107  .sisyphus/spec-reconciliation-20260912/write-audit.cjs
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  5  .sisyphus/spec-reconciliation-20260912/x-test.txt
```

## 5. Safe to delete

Not reconstructible: the Playwright evidence under `browser-results/` (~10.4 MB) and `browser-production-ip-results/` (~7.1 MB) — screenshots, `.last-run.json`, `error-context.md` — captures the exact dated browser runs cited by the roadmap-completion receipts above and cannot be regenerated byte-for-byte. Reconstructible: `before-specs/*.md` (~75 KB) are point-in-time copies of four canonical spec files taken before this lane's edits — recoverable at any time via `git show be7f85b867aa3e8576e5e3d27e309276203bc24b:openspec/specs/<name>/spec.md` — so no unique loss there.
