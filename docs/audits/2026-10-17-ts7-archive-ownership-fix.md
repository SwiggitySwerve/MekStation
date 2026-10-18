# TS7 archive ownership correction

Date: 2026-10-17. Research only; no implementation, source permission, closure, or release is claimed.

**Decision.** Land a separate, three-file parent registration-correction PR after genuine TS7S5A closure and before TS7S5B admission. Move every disappearing TS7 source-file grant from `ownershipPaths` to exact `ownershipExceptions`, remove the four corresponding active-change entries from the roadmap node, and narrow TS7S5C's disappearing directory grant to its four actual source leaves. Keep all stable ownership paths. At the already-required S5B/S5C literal-path admissions, add only each unit's dated archive destinations. This fixes both seams without changing the validator, editing another unit inside an archive PR, rewriting historical receipts, or needing a new product unit.

Use the ledger's existing exact-exception mechanism and separate parent-correction precedent. Do not silently fold this into S5A closure or label an otherwise unauthorized S5B other-unit edit a parent amendment.

**Inspected baseline and evidence.** `origin/main` was `0dd080241e552acdc845d60d61d38281cbf646d0` (PR #2193, TS7S4B closure). The supplied C: worktree HEAD was older, so substantive ledger/history reads used `git show origin/main:...`. The prepared E: S5B worktree was at the pinned main commit with only the supplied staged archive/spec/tasks draft. The report destination checkout was behind main and had unrelated changes; none were used as current authority or modified.

Read `E:/Projects/Personal/MekStation-wt/ts7s5b-evidence-20261017/STOPPED.json`, the prepared worktree, original TS7 registration, current units/node, GOAL/DELIVERY/WORKERS, archive history, and the fold/park/closure helpers. No fetch, checkout, install, build, product test suite, OpenSpec run, Git write, or repository edit was performed. The only authored file is this requested audit.

The STOPPED receipt correctly distinguishes OpenSpec success (231 passed), QC's missing-`yaml` dependency failure, and the roadmap ownership failure. QC was not a successful prepared-worktree seam proof. The registration's `measurements.archiveSeamProbe` at line 359 proves only the two recorded OpenSpec/QC shapes, not validate-roadmap after moving files. Its normal NEXT checks occurred separately. Preserve that receipt and correct its interpretation in a new receipt rather than rewriting history.

**What the earlier archives actually did.** Both requested searches were performed against origin/main:

```text
git log -p -S 'openspec/changes/archive' origin/main -- openspec/planning/2026-09-12-roadmap-completion/units.json
git log -p -S 'openspec/changes/archive' origin/main -- openspec/planning/2026-09-12-roadmap-completion/roadmap.json
```

The unit search contains TS7 registration (`8170a1e38`) and U85's prose about possibly moving archives to a history repository (`6cbf68525`); it does not establish a historical verified-unit archive remap. No current unit has an archive path in `ownershipPaths`.

The concrete archive precedent is `0d55ca92cc6b112f40bc55870159217d64c93b13`, PR #1781. In the same PR as the moves, it replaced the active directory with the dated archive directory in `roadmap.json` for R1.infantry, R1.ci, and R2.receipts, and appended `archive20260916` records containing `originalPath`, `archivePath`, task hash, timestamp, and PR. It did not edit `units.json`. That proves nodes must lose vanished ownership paths; it does not prove that simply renaming a verified unit's grant preserves historical merge checks. R1.route already had its archive path at the initial published ledger; R1.archives owns broad existing parent directories. Neither supplies TS7's permission to widen ownership to a parent directory.

The `archive-chassis-*` receipts describe five blob-preserving moves plus removal of the active-ledger entry. Admission is dated September 13; the recorded merge is `c3b4cc1e3ace35ff95b7999d9680a5d657ca344f`, PR #1669, September 15. Its actual source files did not include roadmap.json or units.json; it predates publication of this planning ledger in #1776. The local acceptance and post-hoc merge receipt cannot establish a later unit-ledger path-remapping feature.

The validator comment at line 567, "Modern archives are mandatory even under --no-evidence", calls `validateReviewReceipt` and concerns portable review-identity evidence. It has no relationship to `openspec/changes/archive`. Fold sets `local-verified`, park sets `blocked`, and closure sets `complete`; none supplies an OpenSpec ownership remapper. `archived` is a recognized terminal state, but still incurs the unconditional path checks, needs the full stage ladder including tick, and remains subject to `--git`. Changing unit state cannot solve this failure.

**Why old grants must survive.** At the pinned main, validate-roadmap.mjs checks node existence at 356-357 and unit nonempty/existence/node-membership at 515-519. Unit ownership membership is literal equality against its owner node. `ciClass` derives from `ownershipPaths` at 521-522. Exact `ownershipExceptions` are not existence-checked or required on the node, and are accepted by the historical merge check at 714-720. This is explicitly documented in the original TS7 registration's `ledgerMechanics.nodeOwnership` (line 106).

Line 676 is the separate CNI1 sizing branch. Ordinary TS7 merges use line 709: `git diff --numstat --no-renames <mergeSha>^1 <mergeSha>`. It checks the current union of path grants and exact exceptions against historical first-parent changed paths, and recomputes additions independently. A rename does not rewrite those old paths. Unit ownership changes do not themselves alter implementation-actor census fields or bound local/review bytes; leave those bytes and summaries untouched.

Direct Git inspection found:

| Unit    | Recorded merge                           | Active-change files actually changed (+/-)                                    | All U41 counted additions |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------- | ------------------------: |
| TS7S1A  | c60ad495b4e4a98a48ec00c2fe7de363682764c1 | tasks.md +3/-2                                                                |                        45 |
| TS7S1B  | 3d9c45365bfc34d27930acb1ff3411b91af17cb9 | tasks.md +5/-5; design.md not changed                                         |                        27 |
| TS7S2A  | 2c909b0016d86426572c02d5a1e3186eda7203b5 | tasks.md +2/-2                                                                |                        33 |
| TS7S2B  | 08555b7a1b22f1bc10f9e6335c3ea7edd79c98da | tasks.md +3/-2                                                                |                        42 |
| TS7S2OD | 97c3281f5a3d943adee64e3516a538d466d50f8e | tasks.md +2/-2; proposal.md +1/-1; specs/bv-validation-tooling/spec.md +31/-0 |                        60 |
| TS7S3   | 9aea87cdccc7252b8c94d94b3ddad6ede0dbda93 | tasks.md +3/-3                                                                |                        21 |
| TS7S4A  | de9419356c740f3d89cc350f9812f8c87b03bdc9 | none                                                                          |                        22 |
| TS7S4B  | 7898c40ed633076c8f9931dfb56a33eeeab4ca2d | tasks.md +10/-9                                                               |                        31 |

All these counts are below the unchanged 500 cap. TS7S1 is blocked/superseded with no merge; S5A is planned, S5B/S5C blocked, with no recorded merge at this baseline. No recorded TS7 implementation merge changed design.md. Therefore a design-only remap would not retrospectively invalidate S1B's merge, but S5B's own eventual deletion still needs the old design path. A naive full old-to-archive replacement breaks eight historical path checks across seven units: seven tasks.md occurrences and TS7S2OD's proposal.md. The old BV delta is already an exact TS7S2OD exception and must remain one.

Future S5A and S5B merges will also need the old tasks.md grant after S5C. Do not stop the correction at today's seven terminal units.

**Exact parent correction.** All paths below are repository-relative. Abbreviations expand literally; never write the abbreviations or globs into JSON:

```text
P = openspec/planning/2026-09-12-roadmap-completion
S = openspec/changes/migrate-to-typescript-7
A = openspec/changes/archive/2026-10-17-migrate-to-typescript-7
```

The correction PR changes exactly these three files:

```text
openspec/planning/2026-09-12-roadmap-completion/units.json
openspec/planning/2026-09-12-roadmap-completion/roadmap.json
openspec/planning/2026-09-12-roadmap-completion/evidence/ts7-archive-ownership-correction-20261017.json
```

In `units.json.units`, select by `id`, remove the following entries from `ownershipPaths`, and append those identical literal file paths to `ownershipExceptions` if absent. Preserve every other array entry and its order. This transfers an existing grant; it does not remove historical authorization or grant an archive destination to a historical unit.

| Unit    | Source leaves transferred from paths to exceptions |
| ------- | -------------------------------------------------- |
| TS7S1   | S/tasks.md; S/design.md                            |
| TS7S1A  | S/tasks.md                                         |
| TS7S1B  | S/tasks.md; S/design.md                            |
| TS7S2A  | S/tasks.md                                         |
| TS7S2B  | S/tasks.md                                         |
| TS7S2OD | S/tasks.md; S/proposal.md                          |
| TS7S3   | S/tasks.md                                         |
| TS7S4B  | S/tasks.md                                         |
| TS7S5A  | S/tasks.md                                         |
| TS7S5B  | S/tasks.md; S/design.md                            |

TS7S4A is unchanged. TS7S2OD's existing `S/specs/bv-validation-tooling/spec.md` exception is unchanged. Superseded TS7S1 must be included because path validation does not exempt blocked units.

For TS7S5C, replace only the disappearing directory ownership with exact source leaves. Its resulting `ownershipPaths` is:

```json
["openspec/active-change-ledger.json"]
```

Keep its existing `ownershipExceptions` (units.json and the BV delta). Append these three source paths, without duplicates:

```json
[
  "openspec/changes/migrate-to-typescript-7/proposal.md",
  "openspec/changes/migrate-to-typescript-7/tasks.md",
  "openspec/changes/migrate-to-typescript-7/specs/typescript-toolchain/spec.md"
]
```

Do not put the old directory itself into exceptions: the validator's exception check is exact-file equality, not directory containment. No design.md source grant is needed by S5C because S5B already moves it.

For `roadmap.json.nodes[id="R6.ts7-toolchain"].ownershipPaths`, remove exactly these four entries:

```json
[
  "openspec/changes/migrate-to-typescript-7/tasks.md",
  "openspec/changes/migrate-to-typescript-7/design.md",
  "openspec/changes/migrate-to-typescript-7/proposal.md",
  "openspec/changes/migrate-to-typescript-7"
]
```

Leave all other ownership entries, restrictions, source-leaf subtotals, dependencies and acceptance clauses intact. The source paths remain in the finite restrictions and are represented in the units' exact exceptions. Do not add nonexistent archive paths to node ownership, add an archive-directory grant, or introduce a node exception field the validator does not consume.

All affected units retain nonempty stable ownership paths already listed verbatim on the node. In particular S5B retains `openspec/specs/bv-validation-tooling/spec.md`; S5C retains `openspec/active-change-ledger.json`. Every unit still derives `ciClass: "product"`. No added anchor or ciClass change is needed.

For traceability, add the following same annotation to the ledger root as `ts7ArchiveOwnershipCorrection20261017` and to the TS7 node as `archiveOwnershipCorrection20261017`:

```json
{
  "evidence": "evidence/ts7-archive-ownership-correction-20261017.json",
  "sourcePath": "openspec/changes/migrate-to-typescript-7",
  "archivePath": "openspec/changes/archive/2026-10-17-migrate-to-typescript-7",
  "rule": "Disappearing source leaves are retained as exact unit ownershipExceptions; stable ownershipPaths remain. Dated destinations are granted only to TS7S5B/TS7S5C by their registered literal-path admissions. No state or receipt is changed. Parent serial admission checks ownershipPaths plus ownershipExceptions."
}
```

These are explanatory annotations, not new executable policy fields. The correction receipt must record the actual author/baseline, complete field-level diff, pre/post byte hashes, the STOPPED evidence, historical path/count checks, the original registration's untested-roadmap seam, and the staged probes. Explicitly supersede the original registration's overlap claim insofar as it relied on path-only NEXT exclusion for these transferred files. Preserve the original registration and all bound historical evidence byte-for-byte. Generate actual hashes/times; do not prefill future review/merge/mainProof or claim admission.

No edits to state, baseline, prHead, mergeSha, stageReceipts, implementationActors, local/review identity evidence, capException, caps, ciClass, lifecycleOwnershipLimit, holders, packets, predecessor/release logic, or P-chain contracts belong in this correction.

**Literal archive admissions after that correction.** At S5B admission, the parent appends this one exact destination to `TS7S5B.ownershipExceptions`, under the existing literal-path-amendment authorization:

```json
["openspec/changes/archive/2026-10-17-migrate-to-typescript-7/design.md"]
```

Its existing canonical-spec exception stays; old tasks/design source exceptions stay. The S5B source PR therefore needs only its ordinary own-unit lifecycle changes and the registered own-unit literal admission amendment in units.json, plus its source/evidence manifest. It does not touch roadmap.json or another unit.

At S5C admission, append these four destinations only to `TS7S5C.ownershipExceptions`:

```json
[
  "openspec/changes/archive/2026-10-17-migrate-to-typescript-7/proposal.md",
  "openspec/changes/archive/2026-10-17-migrate-to-typescript-7/tasks.md",
  "openspec/changes/archive/2026-10-17-migrate-to-typescript-7/specs/typescript-toolchain/spec.md",
  "openspec/changes/archive/2026-10-17-migrate-to-typescript-7/specs/bv-validation-tooling/spec.md"
]
```

The BV delta is present on this main (31 lines, from merged S2OD), so it is an actual fourth S5C move, not an omitted hypothetical. Retain all four old source exceptions. Reuse S5B's frozen archive date even if S5C runs on a later calendar date. The admission freezes any remaining `<archive-date>` manifest placeholders into those literal files; placeholders are never executable grants.

Yes, S5C requires treatment of every TS7 unit still owning a disappearing source, including historical units and superseded S1, not just S5C itself. This proposal performs all that treatment in the preceding parent correction, so S5C itself needs no second cross-unit amendment. Eleven of the twelve TS7 entries change ownership representation; S4A does not.

**PR ownership, sequence and intermediate validity.** The separate correction is a registration-only planning change, following `evidence/p2cg1-split-registration-correction-20261016.json`: that precedent names only roadmap.json, units.json and a new correction receipt, preserves the corrected registration's bytes, and makes prospective contract corrections without releasing units. It is not a new source behavior requiring a product unit. Use independent exact-head review and the applicable actual CI/merge/main-proof process; no special merge bypass is justified here.

Keep S5A closure limited to its genuine closure. After it is merged/proved, land the correction before S5B admission. S5B is still blocked and its STOPPED draft has no folded lifecycle, so this does not widen an in-flight unit. If current main has advanced to an admitted S5B, the parent must stop and re-establish the registration/admission boundary rather than amend it silently in flight. Rebase/reprepare only through the parent while preserving the supplied draft; this research does not mutate that worktree.

`lifecycleOwnershipLimit` explicitly says "Only this unit's own authentic units.json lifecycle fields ...; no other-unit, packet, holder, historical receipt or prerequisite edit." A worker's units.json file exception is not carte blanche. S5A closure does not automatically own this correction. A parent-labelled S5B change would additionally need pre-approved cross-unit/node scope, ownership, a fresh measured manifest, and new review; it is unnecessary and increases the archive cap burden. Choose the separate PR.

| Main state                      | Ownership result                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before correction, before moves | Existing source paths exist; original ledger passes.                                                                                                                                                 |
| After correction, before moves  | Stable paths still exist; source exceptions retain exact old grants. S5B/S5C remain unadmitted.                                                                                                      |
| After S5B                       | Missing source design.md is not in any node/unit ownershipPaths. Source deletion and archive addition are both covered by S5B exceptions. Active tasks/proposal/deltas remain available.             |
| After S5C                       | No ownershipPaths refers to the removed active directory or its files. S5C source deletions and archive additions are exact exceptions. Earlier merge diffs still match their original source paths. |

Keep terminal source exceptions permanently; deleting them after archive would recreate the historical `--git` failure. Do not rewrite frozen task-source snapshots. Every TS7 `taskKeys` array is empty, so these archive moves do not require a task-key/source-path remap for the tick checker. The ordinary task/verification evidence requirements remain.

The one-lane rule is essential: validator NEXT checks only ownershipPaths (760, 773), not exception reservations or most documentary unit predecessors. Once source grants become exceptions, the parent must explicitly freeze/check the full union of paths and exceptions and prohibit any other product admission while S5B or S5C is in flight. Also serialize the correction's shared-ledger writer with closure writers. Keep S5C blocked until S5B's genuine main proof/closure; do not use a NEXT result as source permission. This is the same procedural enforcement already required for the track's prospective exceptions, now stated accurately for its source files too.

**Read-only verification performed.** A same-realm Node harness executed the actual prepared-worktree validator source with only its imports supplied and import.meta.url resolved to that real file. Its LF-normalized SHA-256 equalled origin/main: `07dcf8fbdbe599382076a4e4a934ceac5de2a2d8c77b056244cf4c54eb81f9d7`. Filesystem reads for the two ledgers and existence checks for the exact moved source/archive paths were overlaid in memory. Review-identity consumers remained real and enabled. Git ancestry/numstat queries were real and cached within the harness. No repo file was temporarily edited.

| Probe                                                                   | Exit/result                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Original ledger, virtual pre-move existence                             | 0, ROADMAP VALIDATION PASSED                                                   |
| Original ledger, actual prepared S5B absence                            | 1, exactly the four STOPPED missing-design errors                              |
| Corrected ledger, before moves, no new archive destination exceptions   | 0, ROADMAP VALIDATION PASSED                                                   |
| Corrected ledger, after S5B, only its dated destination added           | 0, ROADMAP VALIDATION PASSED                                                   |
| Corrected ledger, after S5C, its four destinations also added           | 0, ROADMAP VALIDATION PASSED                                                   |
| Corrected final shape with --git, against all currently recorded merges | 0, ROADMAP VALIDATION PASSED; 256 real cached Git queries                      |
| Corrected final shape with --next, original states preserved            | 0, TS7S5A, correctly reflecting this baseline rather than a fabricated release |

All successful validator probes reported the unchanged census: 80 nodes, 13 packages, 381 tasks, 40 triage rows. A separate naive-remap check reproduced the eight old-path historical ownership failures listed above. Without any correction, removing the full active tree would leave 19 missing ownership entries across the node/units; with the correction there are none.

An initial isolated-VM harness produced unrelated review-census errors because cross-realm object prototypes failed the real deep comparisons. That harness was discarded; the same-realm rerun above reproduced the exact four known errors and then passed the unmodified identity consumers. Those initial harness errors are not repository defects.

These are structural seam and existing-history proofs, not executed future S5A/B/C merges or fresh OpenSpec/QC/runtime proofs. The probe does not fabricate missing S5A/B/C lifecycle or receipts. The parent must rerun unchanged default, --git and --next validators on actual current-source heads and merged commits as those units land, alongside their required OpenSpec/QC/runtime evidence. Correction remeasurement must include the actual later S5A merge if it has landed by then.

**Sizing and delivery checks.** The correction has three actual files and zero source/product edits; record its real diff and review it as the precedent's bounded parent planning correction. It must not be charged as unreviewed extra scope in an archive product unit. Existing canonical unit/node caps remain 15 files/500 counted additions. In source admissions, count the own-unit JSON changes and all actual lifecycle/evidence files; evidence is excluded from U41 added-line totals, not from the complete file census. Moves count both deletion and destination paths and all destination lines under --no-renames.

The supplied prepared S5B index currently measures five no-renames paths and 279 counted additions before lifecycle/evidence (189 archived design + 88 canonical spec + one tasks line + one BV canonical line). That is not its final admission census. At the pinned main, S5C's four moved texts total 314 lines (55 proposal + 146 tasks + 82 toolchain delta + 31 BV delta), before later task outcomes and lifecycle. Its eight move paths plus active ledger and units.json already make ten paths before receipts. Measure the real finite manifest; these figures are not a waiver of the 15-file/500-line rules. If a slice cannot fit, use the registered narrower-successor process rather than changing caps or dropping required evidence.

No minimal validator change is needed. An archive alias engine, terminal-state existence exemption, broad parent-directory ownership, fabricated source stub, or post-move-only correction would add policy or leave an invalid intermediate main. The existing exact-exception mechanism preserves the historical checks and lets the already-registered archive slices finish within their own scopes.
