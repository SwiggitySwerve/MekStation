<!-- Root-preserved verbatim task summary. -->

Task: `node:delegated-task:command%3Amcp%3Ae08ed489-24f3-4767-9bc7-6985da31a184%3Adelegate-task%3Amek-opus-catchup-investigations-20261015-r2`

Provider/model: `claudeAgent` / `claude-opus-5-5`. Terminal status: `completed`. Served tier unobserved. Supplemental review of bounded investigation endings only.

---

All four closures hold up. My verdict on each is **APPROVE** for the bounded ending only. None of them accepts NDC1 or Task56, and both stay open.

**Route:** I ran as Claude Opus 5.5 (`claude-opus-5-5`) under the Claude Agent harness. I can't see the served tier. This review was read-only: file reads, hashes and in-memory parsing, plus read-only `git rev-parse` and `git --no-optional-locks status`. I wrote no files, ran nothing, changed no Git state and fetched nothing remote.

**Paths:** D = `.omo/ulw-execute/mekstation-whole-roadmap-execution-20261002-01a0febd`. R5 = `E:/Projects/codex-native-retention-repair-01a0febd/deployment/concrete-runtime-operation-namespace-foundation-r5-20261013`.

**Repair-scope files:** none named `task56-catalog-repair-scope-*` exist in D, P or `docs/audits`. The unfinished Task56 cause/scope mapping is not part of any approval below.

---

## 1. R5 failure and differential ending; live-export route stopped — **APPROVE**

**What I checked myself this session:**

- **Packet hashes match.**
  - Single-run result (566,932 B): `024985aa…0e`.
  - Differential result (18,683 B): `86c14e07…efc6`.
  - Root acceptance: `fb4617dc…cb2a`.
  - Driver: `4bfac1ed…a7`. Descriptor: `7b3f0e67…f7`.
  - stdout / process / dispatch: `d8c6b447…5`, `9e555ba7…f`, `2e58307d…c`.
  - Outcome audit: `09acee96…fa6`. It matches the hash STATUS pins.
- **Native-failure artifacts match their pins** (`failure.json` `7ca23dbc…`, `before-start`/`spawn`/`exit`, empty stdout/stderr).
  - C's raw frame: 60 B, `72c4499f…701`. B's raw frame is empty.
- **The 19-case run is 7 PASS / 1 FAILED_INCOMPLETE / 11 UNRUN**, read from `caseCompletion19`.
  - `attempts=1`, `automaticRetry=false`.
  - The native process exited 1 (PID 11844). The wrapper's exit 0 is not a pass.
- **Specimen results, compared as exact integers:**
  - **A (ADS, query only):** baseline = before = after.
  - **B (no ADS, BackupRead):** stable; a real zero-byte end of file and a complete export.
  - **C (ADS, BackupRead):** only LastAccessTime changed, `…27552314` → `…27736477`, a difference of **184,163** ticks.
    - Its first-boundary "after" equals its post-abort reading, so the change happened before the abort.
    - The single frame is the expected 18-byte `:root:$DATA` stream; the export is partial.
    - Source handle 548 had suppression BOOL 1 and NTSTATUS 0.
- **Every stop flag is in place:** `conclusion=ADS_ASSOCIATED_EXPORT_DRIFT`, `native19Credit=false`, `unrun=[]`, and Source/Main/operation false.
- **The R5 owner files are unchanged:** `winfiles.py` `21ed5f5c…` and `namespace.py` `73e83d96…` still match.

**Reported but not rechecked by me:** the 266 post-run input pins and the 261 post-native pins.

**Limits:**

- The result shows drift associated with the export interval. It does not identify the Windows internal cause and does not prove impossibility. The audits say so correctly.
- After Root released the run, the preparation review was shortened, changing its hash from `e730beef…` to `8e612253…`. Both versions approve the same driver and descriptor, and the change is disclosed. This is acceptable as it stands.

**Issues:** none. The stop (no R6, no retry, no masking, no further specimens) matches the decision table set in advance in `2026-10-15-ndc1-r5-native-failure-review.md`.

## 2. Current runtime and original route: unsupported by qualified evidence, not impossible — **APPROVE**

**What I checked myself:**

- **Hashes match:**
  - Route audit `ab2e899a…`, review `e6a1d66f…` (pinned by STATUS), observation `6f0d6a4e…`, shelved proposal `01c395ca…`.
  - Feasibility memo `951742ac…`, matching the STATUS pin.
- **The single App/native match recomputes from the retained JSON.**
  - The App text is 502 B with hash `4f9743e7…`; its last 137 B hash to `07b13cf7…`, the native aggregate output.
  - The App item has no typed payload, exit-code field or native turn ID, and the page reports `hasMore=true`.
  - This shows one small item and its output match. It is not full-byte Source proof.
- **The 64 KiB limit is corroborated, not reproduced byte-for-byte.**
  - The pinned upstream `policy.rs` at commit `092d3acd` (11,509 B, `65ce50e8…`) was fetched remotely by earlier lanes; I could not re-fetch it.
  - A local copy at `codex-native-retention-repair-01a0febd/src/codex-rs/rollout/src/policy.rs` (commit `dbf3dd37`, 10,725 B) shows the same thing: `PERSISTED_COMMAND_OUTPUT_MAX_BYTES = 64 * 1024` at line 14, and the paginated `CommandExecution` output truncated at lines 249–263.
  - So the mechanism is independently corroborated, but at different bytes.
- **The memo's owner citations hold:**
  - `helper.py:76` holds the writer-proof literal.
  - `helper.py:136` raises `Block1-unarmed-operation-not-admitted`.
  - `contracts.py` has no snapshot or origin field.
  - All seven cited D preparation records exist, including the "Installed normal-only shutdown contracts" and "Loaded-thread preservation and relaunch" sections.

**Limits:**

- The observation's `sourceOwners` entry says the owner is "identical to original alpha17.2". This is carried over from earlier work; I could not verify it, and the local tree is not proven to be the alpha17.2 baseline.
- The route audit still reads "independent review pending" in its header. That line is stale, but the file is pinned, so leave it unedited.

**Issues:** none against the bounded ending. No policy waiver was invented, and the compatibility proposal is correctly shelved.

**Process note:** the memo and the route review both say no follow-on project starts automatically. Yet the VSS design and candidate (scope 3) began about 7 minutes after the memo. Their own text says Root released them. I found no written Root authorization for that step in P or in D's top-level listing. It ended at a measured stop, so there is no product harm. Given your priority on stopping scope expansion, note that this was a follow-on step after the "unsupported" ending.

## 3. VSS candidate measured stop — **APPROVE**

**What I checked myself:**

- **Packet hashes match:** `.md` `985d9f60…`, `.patch` `6d4bf905…`, `.json` `d9423446…`, candidate review `6e2885f8…`, design review `5d6382be…`, preserved design `08b77887…`.
- **The patch is one append-only hunk at `@@ -715,3 +715,130 @@`.**
  - Its 3 context lines match R5 `contracts.py` (717 lines, `72be4fb8…`).
  - It adds **127 lines (115 nonblank) and deletes 0**.
  - Applying it in memory gives 32,276 B, `685d484f…`, which matches.
- **The baseline count reproduces.** I ran my own diff of the earlier baseline file P12 against R5 `contracts.py` (`8f89f08b…`): 607 → 717 lines, 607 shared, so 110 added and 0 removed.
- **The cap arithmetic holds.**
  - The other rows from the budget JSON (`56054914…`) sum to 1,413; adding 127 gives **1,540**.
  - The conservative count is 1,426 + 127 = **1,553**, against a cap of 1,500.
  - The current R5 admission allows only a `plan.schema.json` change (`allowedChangedSource: ["plan.schema.json"]`), so the grant also bars this patch.

**Limits:**

- The patch only defines data records and parsing, and nothing calls it.
- It shows that this candidate exceeds the cap. It does not bound what a different implementation would cost.
- The cap counts lines added against P12, not total file size, and is separate from H3's 15-file / 500-line cap.
- The CIM `Win32_ShadowCopy.Create` metadata and the missing `diskshadow.exe` come from Root's chat output (`04b2d2`, `53035e`). They are reported, not re-verifiable.
- All qualification steps Q1–Q9 remain UNRUN.

**Issues:** none. The design review's REQUEST_CHANGES was resolved by producing this candidate, and the original design file is preserved unedited.

## 4. Task56 one-run failed reproduction — **APPROVE** (diagnostic only; Task56 stays pending)

**What I checked myself:**

- **All seven output-file pins match**, including comparison `d4ca64b6…` and preservation `0229f966…`.
- **I rebuilt all three manifests by walking the trees fresh:**
  - Input: 4,227 files, digest `41a84e51…`.
  - Expected: 4,226 files, 22,004,233 B, `7d80b9ee…`, 1,201 ending in LF.
  - Generated: 4,226 files, 22,694,087 B, `85173c14…`, none ending in LF.
- **Comparison results:** the filename sets are identical, **0 files are byte-equal**, and parsed comparison gives 4,074 equal / 152 different. The `changed` list covers every path.
- **Run custody:**
  - HEADs are `ba8007f2…` (converter and expected tree) and `b67baa5e…` (input). Both trees are clean for the converter and catalog paths.
  - `converterRunCount=1`, `retryCount=0`, `noNormalizationOrSeeding=true`.
  - The exact command line is retained. The child process was PID 50956 and exited 0.

**The original Task56 criterion is not met, and the run doesn't claim it is.** The plan (lines 1766–1784) requires an exact tree comparison exiting 0 and a verified compatible input.

**New observations (diagnostic, from a read-only look at the converter source; no rerun; not a normalization of the result):**

- `mtf_converter.py` writes with `open(path, 'w', encoding='utf-8')`. On Windows that writes CRLF line endings: the generated files contain 821,183 CRs and the expected files contain none.
  - Converting CRLF to LF makes 3,018 files equal; adding a final LF makes 301 more equal; 907 still differ.
- `should_preserve_trailing_newline` (lines 53–76) decides the final newline from whatever file already sits at the output path. Output written into a fresh temp directory therefore can never carry the 1,201 final LFs.
- The index stores `datetime.now()` as `generatedAt` (line 209). An unchanged converter cannot reproduce `index.json` byte-for-byte.
- 4,227 successful conversions produced only 4,225 unit files. The two missing outputs are unexplained; possibly a path collision or overwrite.

These bear on the cause mapping. They are not part of this approval, and they don't make the 152 content differences go away.

**Issues:** none against the closure.

---

**Unchanged state:** canonical accounting stays 25 accepted / 127 pending / NDC1 in progress. NDC1 Source/Main/operation acceptance remains false. Task56 is pending. P1/P2 stay accepted, and M1 still needs P3, P4 and task33. Nothing in this review is new canonical acceptance.
