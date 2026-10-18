# Opus review: Task56/U79 cause-and-scope preparation (map and report only)

**Verdict: APPROVE** the bounded map and its defined stop. I found no concrete report defect that needs a change before this preparation can close. Four low-severity, non-blocking notes are at the end. This approval does **not** close Task56, NDC1 or M1, and grants no implementation.

## Reviewer identity and limits

- **Model and harness:** the system prompt identifies me as Claude Opus 5.5 (`claude-opus-5-5`), running in the Claude Code harness inside T3 Code. I can't attest that cryptographically, and the effort tier isn't visible to me.
- **No delegation:** I did all of this myself, with no subagents.
- **Operations used:** local reads, SHA-256/SHA-1 hashing, and in-memory JSON and byte comparison. Python ran with `-B -I` from stdin. Git use was limited to object reads with `--no-optional-locks` (`cat-file --batch`, `show`, `log`, `diff-tree`, `ls-tree`, `rev-parse`, `merge-base --is-ancestor`).
- **Not done:** no converter run or import, and the historical script was not run (I re-implemented its leg parser in memory). No tests, builds, `git status`, remote queries or installs. I didn't enumerate D recursively.
- **Write caveat:** Git Bash may briefly store a heredoc in a temp file outside the workspace. I made no deliberate writes, and the harness keeps its own transcript.
- **Not re-verified:** the recovered Codex session records (4826 and the others) and the 4,227-entry input-manifest rehash. My verdict doesn't depend on them, because I re-derived the key facts from primary artifacts.

## What I checked independently

| Claim                       | My result                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen MD and JSON identity | MD is 17,604 bytes, `becd1ddf…`; JSON is 2,163,926 bytes, `87591032…`. comparison.json is `d4ca64b6…`, preservation.json is `0229f966…`. All match.                                                                                                                                                                        |
| Expected tree is Main       | All 4,226 physical files in `public/data/units/battlemechs` match the blob SHAs in `ba8007f`. The six converter owner files also match HEAD and the report's pins.                                                                                                                                                         |
| 4,226 byte map              | The path set equals comparison `changed`. Every expected and generated SHA-256 matches the physical bytes. Zero raw hashes are equal. EOL counts match per file.                                                                                                                                                           |
| Byte partition              | Recomputed from bytes: **3,018 / 301 / 755 / 152**. For all 755 layout-group files, the non-whitespace token streams (strings included) are identical.                                                                                                                                                                     |
| EOF facts                   | 1,201 expected files end in a final LF, 0 expected files contain CRLF, and 0 generated files end in a final LF. 1,056 of the final-LF files are parsed-equal; the other 145 are semantic.                                                                                                                                  |
| 152 semantic paths          | Exactly equal to the retained `parsedDifferentChangedPaths` (152 + 4,074 = 4,226, no overlap).                                                                                                                                                                                                                             |
| 499 pointers                | My recursive diff gives exactly the map's per-path pointer sets (499) when it descends into arrays of equal length. Every scalar expected/generated value and every array hash (compact JSON, sorted keys) matches the actual JSON.                                                                                        |
| History for 499/499 fields  | For each field I read the value at `commit^` and at `commit`. All 499 transitions are real changes, match the map's before/after, and the after-value equals the current expected value. By commit: #231 = 488 (including the index timestamp), #429 = 8, #233 = 2, #232 = 1. The five commits are ancestors of `ba8007f`. |
| Category counts             | C1–C9 path counts add to 153, which is 152 paths plus the Thunder Fox C1+C8 overlap. Field counts: C1 450, C3 18 (10 configuration + 8 cockpit), C7 4. All named owner functions exist in the stated files.                                                                                                                |
| Source witnesses            | 151 source hashes match `mm-data`. Source lines confirm the C2 claim (11 × "Superheavy Gyro"), C8 (Jump MP 4 on both units), C6 Exo ("Industrial"), and C4: expected `id` is the migrated value, while the index ID equals the generated ID for all eight double-encoded paths.                                            |

## Item-by-item findings

**1. Coverage.** The coverage is complete and accurate for 152 paths, 499 pointers and 4,226 byte entries. `unmatchedHistoryFields` and `unassignedPointers` are both 0.

**2. Provenance versus recipe.** The report correctly separates the two:

- I re-implemented `parseMtfLegs` from the historical #231 `scripts/fix-quad-legs.js` (`a5f5f1d0…`, 5,238 bytes) in memory, using UTF-8, JS-style trim, empty-marker skipping and suffix stripping. It reproduces **445/450** arrays.
- The five rear-right exceptions fail exactly as stated: 6 expected items against 17 from source, and the first six are equal.
- The report repeatedly says first-six equality is not an approved rule. Nothing frames field-value history as a reproducible recipe.
- In the current input there are no duplicate keys among quad MTF files, so a historical index collision doesn't explain the exceptions. That is consistent with leaving them unresolved.

**3. Collisions.**

- The pair census holds: 4,227 inputs and 4,225 pairs, still 4,225 after case-insensitive filename sanitisation. Only Jackalope JLP-KA and Blackjack C collide.
- Both historical blobs at `5d77eae` match the recorded SHAs and are parsed-equal to both the expected and the generated objects. Neither path has been touched since `5d77eae`.
- Witnesses confirmed. Jackalope: Republic has `Laser AMS, Head` first and deployment "Known for its increased speed…", while Shrapnel says "No Information on this variant". Blackjack: Force Packs line 182 has `systemmanufacturer:JUMPJET:Whitworth Jetlift`, Shrapnel lacks it, and expected has `fluff.systemManufacturer.JUMPJET` (singular). The corrected key is right.
- The report correctly says the full original traversal was not logged.

**4. Byte and EOF recipe.**

- I recomputed the touched-path union over the five commits: **1,208** paths, all present in the current tree. It contains all 1,201 final-LF files plus exactly the seven no-LF files the report names.
- Every file outside the union is in the 3,018 CRLF-only group.
- The formatter, version, scope and EOF recipe stay UNFROZEN. The report claims no normalisation or payload copying.
- Source selection is described as "not established", not as excluded or required. That is precise.

**5. Files and cap.**

- All eight proposed paths sit inside U79's three ownership paths, and the three NEW ones don't exist yet.
- The cap stays at 15 files / 500 non-generated product lines, with test lines reported separately. My copies of U79 in both units.json files are identical.
- `cap.fitClaimed=false`; actual counts are `null` / UNMEASURED.
- Admission is unchanged: CNI-only grants CNI0–3, U79 absent, runtime unqualified.

## Low-severity notes (non-blocking; optional clarifications if the report is ever revised)

1. **Pointer convention isn't written down** (JSON `/coverage/differentPointers`). The 499 count depends on descending into arrays of equal length; treating arrays as leaves gives 497 (Phoenix PX-1KR and Deep Lord collapse to `/equipment`). The map lists every pointer, so coverage isn't affected. The fix would be one sentence naming the convention.
2. **The commit scope is narrower than U79's "9 commits" note.** Two more commits touched the catalog after `5d77eae`:
   - `f592fa9` (#40) touched only `3-succession-wars/standard/Marauder C.json`.
   - `fba16c6` touched only `index.json`.

   Both paths are already in the 1,208 union and neither has a differing pointer, so no count changes. The report just doesn't account for them.

3. **The lexical-last remark is incomplete.** Lexical-last selection would also pick Shrapnel for Blackjack ("Force Packs" sorts before "Shrapnel"), not just Jackalope. Separately, the unchanged converter already yields both winners only because of the `Path.rglob` traversal order, which can vary between Python versions. That supports the report's "explicit precedence" wording; nothing to change.
4. **A lead for later, not a requirement.** Four of the five unresolved arrays (Barghest BGS-1T/2T/3T and Goliath GOL-4S) are also four of the seven touched files without a final LF. Their only post-`5d77eae` commit is #231, but `fix-quad-legs.js` always writes `+ '\n'`. So a different writer in #231 likely produced them, which links the two unresolved items. Also, the Barghest BGS-1T source in `mm-data` hasn't changed since `e6d0e055` (2025-10-28), which makes an input mismatch unlikely for that file. Neither point is a new mandatory investigation.

## Preserved limits

- **Proven so far:** field values match history; collision winners are explicit and historically anchored.
- **Still unresolved:**
  - the five rear-right recipe exceptions;
  - the formatter/version/scope/EOF recipe;
  - the full traversal schedule;
  - the actual file union, added product lines, test lines and cap fit, all UNMEASURED because no candidate diff exists.
- **Required future result:** a byte-for-byte raw match across the whole tree, with no normalisation, seeding, index exclusion or filename repair.
- **State unchanged:**
  - Task56 is pending, and this adds no M1 prerequisite.
  - P1 and P2 stay closed.
  - Canonical accounting stays at 25 accepted / 127 pending, with NDC1 in progress.
  - Admission stays CNI0–3 with U79 absent.

The map preparation can close at its named stop. It cannot close Task56, NDC1 or M1.

---

## Root preservation provenance

- Retrieved from `task_status` on 2026-10-15.
- Task: `node:delegated-task:command%3Amcp%3Ae08ed489-24f3-4767-9bc7-6985da31a184%3Adelegate-task%3Amek-opus-task56-scope-20261015-r1`
- Child thread: `thread:delegated-task:command%3Amcp%3Ae08ed489-24f3-4767-9bc7-6985da31a184%3Adelegate-task%3Amek-opus-task56-scope-20261015-r1`
- Child run: `run:thread:thread%3Adelegated-task%3Acommand%253Amcp%253Ae08ed489-24f3-4767-9bc7-6985da31a184%253Adelegate-task%253Amek-opus-task56-scope-20261015-r1:ordinal:1`
- Provider/model reported by task service: `claudeAgent` / `claude-opus-5-5`.
- Requested options in dispatch: effort high; fastMode false. Actual effort is not independently observed.
- Terminal status: `completed`; workState: `result_available`; pending children: false.
- The text above is the complete, unchanged task summary. Root disposition is recorded separately.
