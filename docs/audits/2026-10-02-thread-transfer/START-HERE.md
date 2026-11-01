# Verified thread-transfer archive

This is the current reader portal. `README.md` is the unchanged historical
preparation-era record; its earlier materialization blocker is not the current
archive status. The old planning draft and exact task-core file also remain
unchanged historical evidence.

All three archive payloads and all 455 part files were byte-verified by the
curator and independently by the parent. The same independent reviewer
approved their archival content. The final portal, additive evidence and exact
publication file set still need that reviewer's final approval. Commit, push,
PR, normal publication hooks, final handoff statuses and pause remain held.

## What is included

| Reader name | Directory                  | Parts | Members | Original member bytes |
| ----------- | -------------------------- | ----: | ------: | --------------------: |
| `p2`        | `p2-source-archive`        |    12 |      21 |               200,057 |
| `history`   | `full-history-archive`     |   371 |     732 |             7,740,630 |
| `current`   | `current-controls-archive` |    72 |      19 |             1,275,499 |

The total is 772 member occurrences and 9,216,186 original bytes, not a claim
that every occurrence is a different original.

`p2` contains all 11 authored files, the separately identified generated
`next-env.d.ts`, immutable custody manifest and eight complete original
receipts. It is archival data, not accepted source delivery.

`history` retains the exact historical 732-row selection, every original
member's metadata/order and bytes, and the 125,059-byte LF manifest with SHA-256
`fe3663e55078e5110b0cf06d70fe27e65b95af67fadfdf09d03f1ddc93d46856`.
The old logical parent draft is 12,146 bytes and is authenticated through the
retained `PARENT-PLANNING-HANDOFF-DRAFT.md`. It is never replaced under its old
hash by the current 12,310-byte draft.

`current` separately captures the entire admitted current plan, Boulder,
457-record ledger, original goal/authorization, exact transfer directive,
complete override bytes and current planning draft, plus 12 additive original
receipts/helpers. All original criteria, executor categories, 153 task labels
and 43 original future obligations are retained. This is a prepublication
capture, not a final roadmap, publication or pause snapshot.

## Read exact original bytes

From this directory, use Node with its built-in modules; no installation or
service is needed:

```text
node read-archives.mjs --summary
node read-archives.mjs p2 --list
node read-archives.mjs history --list
node read-archives.mjs current --list
node read-archives.mjs p2 --member "src/components/campaign/coop/DESIGN.md"
node read-archives.mjs history --member "E:/Projects/MekStation/.omo/ulw-execute/handoffs/thread-transfer-next-thread-planning-handoff-20261002.md"
node read-archives.mjs current --member "E:/Projects/MekStation/.omo/ulw-execute/ledger.jsonl"
```

`--member` writes the complete selected original bytes to stdout without adding
a newline. Choose one exact original path from `--list`; P2 also accepts its
original relative source path. `history` returns the old draft bytes, while
the same logical path in `current` returns the separately bound current draft.
The reader never writes files, invokes Git, executes archived source, contacts
a service or updates any captured task/status object.

## Exact archive formats

`ARCHIVE-INDEX.json` binds the compressed and decoded lengths/hashes.

P2 is **gzip**, not Brotli. Read `chunk-000.json` through `chunk-011.json` in
ordinal order. Base64-decode each `gzipBase64Chunk`; verify its
`compressedBytes` and `compressedSHA256`, concatenate, verify the complete
gzip hash, then gunzip. The resulting JSON contains `originalManifest`,
`authoredFiles`, `generatedEvidence` and `receipts`. Each full `utf8` member
roundtrips to its original bytes; check its original length and SHA-256.

The other two archives are **Brotli**. Their four-digit part ordinals start at
`chunk-0000.json`. Join each part's `brotliBase64Lines`, base64-decode, verify
the part length/hash, concatenate in ordinal order and Brotli-decompress.
The first eight decoded bytes are an unsigned little-endian JSON-header
length. Read that many UTF8 header bytes after the prefix. The remainder is
the concatenation of every raw original member. A member's `offset` is
relative to this remainder; select `[offset, offset + bytes)` and check its
SHA-256. `captureSource` identifies an authenticated retained original where
the historical logical path now belongs to a later epoch.

No accepted archive payload or part-file representation was changed during
final packaging. Do not reemit the retained historical assembler against
current mutable paths and call its changed output the old historical package.

## Evidence and custody boundaries

`additive-parent-evidence` contains separately identified, lossless original
post-capture records and the complete correct native epoch-1 review verdict.
They do not alter the accepted archives or the historical manifest. The parent
report-copy retention lost one base64 character; that local failure is
qualified separately. Only the correctly computed full native verdict is
portable successful review evidence, not the malformed gzip field.

For a gzip/base64 original sidecar, decode `gzipBase64`, gunzip, and verify
`bytes` and `sha256`. Large JSON metadata can use a bounded envelope:
`fullDocument` gives decoded/gzip hashes and ordered part-file bindings.
Decode each part's `gzipBase64Chunk`, concatenate, verify the gzip binding,
gunzip, and verify the complete decoded JSON binding. Never treat a metadata
summary or an incomplete part list as the complete original.

`LOCAL-ONLY-CUSTODY-INDEX.json` preserves the original exclusions, private
hash-only rows, oversized/raw evidence provenance, relocation and retained
resource qualifications. It publishes custody metadata, not private Task 70
archives, raw native graph/session material or over-inspection-cap payloads.
Unadopted TEMP custodies, original/copy leases, locks, indexes and earlier
failed epochs remain qualified and retained. There was no external recensus,
foreign cleanup or lease adoption. Scoped input review is not blanket secret
clearance.

Full genuine patch argv/native streams and member/file proofs are sealed in
the owned local evidence receipts referenced by the index and final checkpoint.
The final `bounded-materialization-ready.json` binds the complete frozen
documentation manifest, this portal, reader, custody index and additive files.
These owned-machine receipts are not automatically extra publication files.

## Source and publication status

The original normal P2 source hook exited **1**:

```text
src/pages/gameplay/campaigns/[id]/missions/[missionId]/launch.tsx(187,54):
TS2345: string | undefined is not assignable to SetStateAction<string | null>.
```

There is no P2 source commit, push or source PR. Task 39/P2 source acceptance
and `CAMPAIGN_NOT_CONVERGED` remain unresolved/failing; archive acceptance does
not turn them green. Generated `next-env.d.ts` remains separate evidence, not
an authored source fix.

Task 67's separately rechecked PR 2112 is still OPEN/DRAFT at
`20946dbf76ce3091363c162ae1fe39fd29a90c14`, with its existing 31 checks
COMPLETED/SUCCESS. That custody record neither expands the earlier two-file
blob acceptance nor completes Task 67.

The original 43 future obligations remain pending. Final exact-file-set
independent review and normal unweakened hooks precede any publication release.
Actual remote head/blob/CI evidence and final task/ledger/handoff/pause records
are later additive epochs. This package makes no transfer-complete or
roadmap-complete claim.
