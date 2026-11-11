# Committed catalog census source

For the hosted unit-to-reference join, run from the repository root with
Node 22.12+, the installed tsx dependency and Git:

```sh
node --require tsx/cjs scripts/ci/committed-catalog-sources.ts \
  --reference-only --commit <recorded-origin-main-sha> \
  --out ../committed-catalog-identity \
  --source-only-families-identity-only
```

This mode needs only repository files and committed catalog Git blobs. It
requires no mm-data checkout, Python, JVM, network or uncompressed reference.
The committed reference contains `chassis`, `model`, `concreteFamily`, `path`
and `sha256` on every row, so the same exact identity join can use it directly.
The compressed bytes, decompressed payload and provenance sidecar are verified
by the same `loadReference` owner used by S0a's `prepare` command. Source SHA
values in this mode are the verified reference's recorded LF-normalized hashes;
they are not independently recomputed from a source checkout.

For local source-text numerical parity, also supply Python 3.10+ and the pinned
mm-data tree. These explicit inputs are portable to Linux GitHub Actions:

```sh
node scripts/ci/parity-scoreboard.mjs prepare --out ../parity-inputs
node --require tsx/cjs scripts/ci/committed-catalog-sources.ts \
  --commit <recorded-origin-main-sha> \
  --mekfiles ../mm-data/data/mekfiles \
  --reference ../parity-inputs/reference-full.jsonl \
  --out ../committed-catalog-output \
  --source-only-families-identity-only
```

`--repo` defaults to the current directory; `--commit` defaults to HEAD.
`--python` defaults to python. Output directories must be new and outside
public/data. The command never writes catalog data or changes Git state.
All input/output paths can be relative to the invocation directory. The tsx
CommonJS loader is intentional: it matches existing TypeScript census scripts.
The local mode starts portable `git` and Python commands through Node; the
reference-only mode starts only `git`. Neither mode needs PowerShell,
Git-for-Windows paths, network, a JVM, a `_scratch` directory
or machine drive path. The example output directory must not already exist.

Java values are supplied by the committed
`config/reference/reference-full.jsonl.gz`, not calculated by this emitter.
Its gzip SHA-256 is
`bb1c1bf38eedf821ddd665a441c9c949a1ae255ceecfebc81d6fa2ed5cff0f77`;
the decompressed JSONL SHA-256 is
`4e19c56b957de2a8fc70dbfd131e76b64caa05adf8ba145b1610cc6b3ec37d87`.
`config/reference/parity-scoreboard.json` owns these digests and the 9,815-row
reference population. The provenance line in
`config/reference/reference-full.jsonl.provenance.json` is
MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, mm-data
`50f7efef0c9f775b0258f8283525ed4f906e1985`.
S0a's `prepare` command above verifies and decompresses that committed artifact
and copies its provenance sidecar; no Java execution or download is needed.
Only local source-text mode requires the caller to supply the pinned mm-data
`data/mekfiles` tree for header parsing and source-text rows. If a hosted consumer
needs those numerical inputs, S0a's workflow already prepares that tree
from its hash-verified archive before invoking consumers. The emitter itself
does not fetch it. This reference supplies source-evaluation Java values; new
runtime load/reopen measurements remain the nightly runtime job's responsibility.

The emitter lives beside CI tooling because it supplies the parity scoreboard.
`committed-catalog-inputs.ts` owns Git reads, index membership, verified reference
loading and normalized source-header inputs;
`committed-catalog-sources.ts` owns the join and output contract. Existing public
MTF/BLK helpers parse headers, `familyOf` classifies source families, `sourceHash`
normalizes source line endings, and `writeSourceManifest` creates the standard
consumer receipt. S0a and this emitter share the readers and SHA verifier in
`parity-scoreboard-io.cjs`; S0a's ESM artifact API re-exports the same functions.
`unit-index-rules.json` owns fixture/non-unit membership; the Python index
generator and Node catalog reader both consume it. Catalog/source
family spelling differences live in `catalog-families.json`.

Each family is enumerated exclusively from its committed index.json. Catalog
objects come from immutable Git blobs, so dirty and untracked working files do
not affect output. Git listings explicitly set `-c core.quotepath=false` and use
NUL delimiters, retaining non-ASCII names. Other committed JSON designs absent from an index are errors,
except the six named legacy fixtures, explicitly listed as unjoinable. A
malformed index, missing blob, duplicate path or duplicate design identity fails.
The expected join population is the sum of the validated committed index
`totalUnits` counts (each must equal its `units.length`): currently 9,815.
The six legacy fixtures are already excluded from those indexes; do not
subtract them again. `expectedPopulation` records this count. Any short join
fails with `joined-population-mismatch: expected=..., actual=...` and emits
neither the source table nor its manifest, including when one reference row is
missing. The reference never defines a smaller expected catalog population.

Join on exact, case-sensitive family/chassis/model from source headers. The named
mech model alias maps catalog `Unknown` to source empty model. This changes only
the lookup key, never the catalog object. No filename, slug or MUL id fallback
exists. Zero/multiple source matches fail, as do multiple catalog matches.
FixedWingSupport in vehicles/ belongs to aerospace; smallcraft/ also belongs to
aerospace. Capital includes dropships/jumpships/warship/spacestation. Source
protomeks corresponds to catalog protomechs.

Every chosen MTF or BLK source is hashed by the existing `sourceHash` owner:
SHA-256 over its UTF-8 working-tree bytes after replacing CRLF pairs with LF;
these are not raw working-tree or Git blob digests. Lone CR bytes and other
content remain significant. The emitted sourceText uses the same LF form, so
CRLF and LF copies yield the same SHA, manifest join row and serialized output.
This differs from the receipt's `sourcesSha256`, which hashes the exact emitted
NDJSON bytes, and catalogBlob, which identifies the immutable Git object.
Each source's path/hash
must match exactly one reference row before emission. Every reference row must
have a committed catalog match. The reference is a verification input, never the
source of a design's identity or digest. The consuming comparator must still
enforce its existing reference provenance policy (`--reference-trust blocking`
and `--reference-policy`). Per-file hashes establish source-byte equality with
that reference; they do not independently attest a source checkout's Git pin.

## Java source keys, catalog keys and ports acceptance

The persisted S0b source key is **`path` plus `sha256` of LF-normalized source
bytes**. The earlier family/chassis/model join selects that source; path/hash
then verifies the reference identity. C3's keys refer to different files:

| Table                                                     | Key                            | Bytes identified                                                                          |
| --------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| S0b source manifest                                       | `path`, `sha256`               | MTF/BLK source, CRLF pairs normalized to LF                                               |
| C3 Java join                                              | `sourcePath`, `sourceSHA256`   | MTF/BLK Git blob at mm-data `50f7efef`                                                    |
| C3 census row                                             | `path`, `sourceSha256`         | MekStation catalog JSON; C3 keeps these bytes LF with `eol=lf`                            |
| C3 reopen acceptance (`postmerge-4db6eca2b/A-units.json`) | `unitId`, catalog `sourcePath` | Canonical unit id and MekStation JSON path; BV columns are `loadBV`, `reopenBV`, `javaBV` |

For the Java join, S0b `path` corresponds to C3 `sourcePath`. A batch Git-blob
audit at mm-data `50f7efef0c9f775b0258f8283525ed4f906e1985` checked every indexed
source below. No blob contained CR or CRLF. Therefore S0b's normalized SHA and
C3's raw blob SHA **must match exactly for every one of these 9,815 sources**.
A mismatch is a finding (wrong source/path/pin); it is not an expected newline
difference and must not be excused as lost rows or harmless normalization.
Windows `core.autocrlf=true` can create CRLF working-tree copies, but C3's Java
keys do not hash those copies. Normalize a working-tree copy before comparing
it with the source key; never normalize or substitute a hash string itself.

| Catalog family | Audited source blobs | Contain CR | Raw SHA differs from LF-normalized SHA | S0b SHA matches blob SHA |
| -------------- | -------------------: | ---------: | -------------------------------------: | -----------------------: |
| BattleMechs    |                4,263 |          0 |                                      0 |                    4,263 |
| Vehicles       |                1,444 |          0 |                                      0 |                    1,444 |
| Aerospace      |                  620 |          0 |                                      0 |                      620 |
| Capital        |                  394 |          0 |                                      0 |                      394 |
| Battle armor   |                1,188 |          0 |                                      0 |                    1,188 |
| Infantry       |                1,820 |          0 |                                      0 |                    1,820 |
| ProtoMechs     |                   86 |          0 |                                      0 |                       86 |

These counts cover the verified indexed S0b population, grouped by catalog
family (FixedWingSupport belongs to aerospace). Evidence is the per-family
`BLOB-KEY-PROOF.json` from the Root review; it uses `git cat-file --batch`.

Ports acceptance joins on **committed unit `id` plus catalog JSON path**:
`A-units.unitId` = the committed unit's `id`, and `A-units.sourcePath` =
S0b `catalogFile`. The committed object or its recorded `catalogBlob` supplies
the id; personnel identity-only rows keep `unit:null`, so their id must come
from that committed catalog object, not a filename-derived guess. The selected
S0b row then supplies the MTF/BLK path/hash for the Java reference lookup.
Do not compare C3's catalog-JSON `sourceSha256` with S0b's MTF/BLK `sha256`:
they identify different files. The acceptance file's catalog `sourcePath` also
has a different meaning from the Java-join table's MTF/BLK `sourcePath`.

Successful output is `sources.ndjson`, its compatible `.manifest.json`, and
`committed-catalog-report.json`. The manifest adds `committedCatalog`, including
catalog commit, index/design blob ids, joins, alias count, reference digest,
family counts, unjoinables and errors. Serialization/order are deterministic;
there are no timestamps or output-directory-dependent fields. A failed join
writes the explicit error report and publishes no sources file or manifest.

Both modes retain the `sources.ndjson` plus manifest filenames. Each source
row now additionally carries `catalogFile`, `catalogBlob`, `family`,
`evaluation`, `alias` and `sourceOnly`, copied from its manifest join entry.
The previous `path`, `sha256`, `unit` and optional `sourceText` fields retain
their meaning; the existing numeric input schema ignores these added fields.
Ports can therefore read the catalog-file/blob-to-reference mapping directly
per row, without another join against `committedCatalog.joins[]`, which is also
retained for compatibility.

Reference-only rows have `evaluation: "identity-only/reference"` and never
contain `sourceText`. The three personnel families still require explicit
acknowledgement and retain `unit:null`; other families preserve their committed
object unchanged. This mode performs no numerical calculation or object
regeneration. Its receipt has `scope: "committed-identity"`, the same version,
source count, payload digest and folders fields, and empty `converterInputs`.
That distinct scope deliberately prevents a numeric comparator from accepting
it as a full converted-input receipt. The report's `inputMode` is
`committed-reference`; local source-text reports use `source-text` and retain
the existing full converter receipt. The summary refuses to attach a numerical
census to an identity-only receipt.

Battlemechs, vehicles, aerospace and capital carry the complete committed JSON
object as unit. BA/infantry/ProtoMechs require the explicit option above and emit
unit:null with verified sourceText, matching the existing source-handler path.
Their manifest evaluation is `identity-only/source-text`. Without acknowledgement
the emitter fails. The manifest proves which committed object joined; it does
not assert that object equals fresh regeneration or that personnel BV used it.
Root approved this identity-only option. BA, infantry and ProtoMechs are labelled
"BV from source text; runtime-path BV not measured in CI".

The current comparator uses committed objects for mech BV/validity/weight and
vehicle/aerospace/capital BV. BLK construction validity/weight/quantities still
read source bytes; personnel BV also uses source bytes. A paired census must
describe that limit and report catalog-versus-regeneration differences separately.
No workflow wiring or catalog regeneration is included here.

## Object parity and scoreboard output

The following export is object regeneration work; schedule full-corpus execution
through the coordinator's census slot. It calls the existing converter owners
and writes only a scratch comparison artifact:

```sh
python -B scripts/megameklab-conversion/export_vehicle_aero_json.py \
  <pinned-mekfiles> <new-regeneration-scratch> --strict --catalog-objects
```

This mode emits `catalog-objects.ndjson` and an object-only receipt. It includes
real catalog-shaped BA/infantry/ProtoMech objects and produces no `sources.ndjson`
or numeric-input receipt. Normal strict exports retain their source-text path.

Pass `--regenerated <scratch>/catalog-objects.ndjson` to the emitter to compare
every committed object by its verified source path/hash. IDs are compared as
data, never used as join keys: the ten known differing mech IDs remain included.
Missing/duplicate/hash-mismatched input rows and conversion errors fail
explicitly. Object drift does not fail emission. With no comparison input, or a
null regenerated unit, object parity says unavailable, never equal.

`objectParity` in the report/receipt holds per-family equal/drifted/unavailable
counts and the complete drift ledger: catalog/source paths, field paths, both
values and explicit absent-field markers. Object key order and integral numeric
spellings do not matter; array order does. The known-class list records Root's
catalog-behind/C2 ruling at main `3e96c2283`; it does not automatically classify
future differences. Known classes include mech rules levels, Omni fields, Clan
names, slot-only equipment, Ares configuration, Tripod center-leg keys, Patchwork
armor, FrankenMek donor tonnage and aerospace source tech type.

Render the scoreboard without starting any calculations:

```sh
node scripts/ci/committed-catalog-scoreboard.mjs --emitted <emitter-output>
# After the committed-input detailed census completes at the same SHA:
node scripts/ci/committed-catalog-scoreboard.mjs \
  --emitted <emitter-output> --census <completed-census-output>
```

It writes `committed-catalog-summary.md`, with identity, object parity and
source-text numeric parity on three separate lines. Numeric reading reuses
S0a's `readCensusResults` and requires a completed same-commit run evaluating the
exact emitted bytes. Interrupted or partial artifacts cannot supply numbers.
The source-text total covers the three personnel families; the family table
states their CI/runtime limit explicitly. Identity and object drift are measured
independently of the numerical result.

## Nightly numerical policy and explicit input labels

Integer total BV must be exactly equal; finite sub-terms and defensive/offensive
aggregates use `AGGREGATE_REL_TOLERANCE = 1e-9` from `unit-bv-parity.ts`:
`abs(local - reference) <= 1e-9 * max(1, abs(reference), abs(local))`.
`compareFigures` owns exact total status; `compareTerms` and `aggregateDelta`
own the tolerance. Missing/nonfinite terms remain separate diagnostics.

The two measured 1-ulp examples preserve exact totals:

- **Mad Cat Mk II 6:** total 2,663. `harjelBonus` is
  119.99999999999997 committed versus 119.99999999999999 fresh. The equipment
  arrays match exactly; `armor.allocation` key order changes `Object.entries`
  accumulation in `mechBV/calculator.ts`. Reordering only those keys reproduces
  the fresh result. Its critical-location map order also differs, while each
  location's slot array is unchanged.
- **Vulpes VLP-1DX 'Beast':** total 1,229. `physicalWeaponBV` is 28.95 committed
  versus 28.950000000000003 fresh. Its critical-slot arrays match per location,
  but location-map traversal changes derived mount order from left-arm claw,
  right-arm claw, left-leg talon to left-arm claw, left-leg talon, right-arm
  claw. Reordering only the critical-location keys reproduces the fresh result.
  Fresh equipment also appends slot-only talons and two claws; that separate
  inventory drift does not cause this ulp difference.

Both maps use committed location order LA, RA, LT, RT, CT, HEAD, LL, RL versus
fresh CT, HEAD, LA, LL, LT, RA, RL, RT (full enum names in the artifacts).
These are additional **C2-owned iteration-order drift rows**, alongside the
known Javelin rules-level drift. The generic object comparator ignores map key
order, so its semantic equality result does not replace this order audit.
Exact BV totals are proved unchanged here; consumers relying on location,
slot, or derived mount enumeration still require review. Do not sort or mutate
committed catalog objects to remove the ulp difference in a scoreboard PR.

Keep producer labels stable when publishing:

- **Identity:** committed catalog plus `--reference-only`, with no numerical
  figure implied by the identity receipt.
- **Primary source-scoreboard numeric BV and validity:** S0a's fresh strict
  conversion (`parity-scoreboard.mjs run` always invokes the fresh pipeline).
  The completed census has BV 9,815/9,815 exact and validity 9,815/9,815.
- **Committed-input numerical diagnostic:** S0b's full mode with explicit
  `--mekfiles`, `--reference`, and personnel acknowledgement. Mech BV/validity
  and vehicle/aerospace/capital BV consume committed objects; BLK validity and
  personnel BV consume pinned source text through the existing handlers.
  This diagnostic has BV 9,815/9,815 exact and validity 9,814/9,815. The one
  named expected difference is **Javelin JVN-10U**, committed STANDARD versus
  fresh INTRODUCTORY. It must remain a separate named drift, not disappear
  inside an unlabelled total or replace the fresh headline when modes change.

The primary numeric producer must not silently switch between fresh and
committed mode. A deliberate producer change requires an explicit new label;
identity-only output can never supply numerical totals. BA/infantry/ProtoMech
remain "BV from source text; runtime-path BV not measured in CI". New nightly
runtime load/reopen figures must name their runtime-path input separately.

Focused proof:

```sh
node node_modules/jest/bin/jest.js --selectProjects unit --maxWorkers=1 --runTestsByPath scripts/__tests__/committed-catalog-sources.test.ts
node node_modules/jest/bin/jest.js --selectProjects unit --maxWorkers=1 --runTestsByPath scripts/__tests__/committed-catalog-parity.test.ts
node --test scripts/ci/committed-catalog-scoreboard.test.mjs
```
