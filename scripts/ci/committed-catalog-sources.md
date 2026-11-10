# Committed catalog census source

Run from the repository root with Node, tsx and Python installed:

```sh
node --require tsx/cjs scripts/ci/committed-catalog-sources.ts \
  --commit <recorded-origin-main-sha> \
  --mekfiles <pinned-mm-data>/data/mekfiles \
  --reference <reference-full.jsonl> \
  --out <new-scratch-directory> \
  --source-only-families-identity-only
```

`--repo` defaults to the current directory; `--commit` defaults to HEAD.
`--python` defaults to python. Output directories must be new and outside
public/data. The command never writes catalog data or changes Git state.

The emitter lives beside CI tooling because it supplies the parity scoreboard.
`committed-catalog-inputs.ts` owns Git reads and index membership;
`committed-catalog-sources.ts` owns the join and output contract. Existing public
MTF/BLK helpers parse headers, `familyOf` classifies source families, `sourceHash`
normalizes source line endings, and `writeSourceManifest` creates the standard
consumer receipt. S0a and this emitter share the readers and SHA verifier in
`parity-scoreboard-io.cjs`; S0a's ESM artifact API re-exports the same functions.
The Python index generator owns fixture/non-unit membership. Catalog/source
family spelling differences live in `catalog-families.json`.

Each family is enumerated exclusively from its committed index.json. Catalog
objects come from immutable Git blobs, so dirty and untracked working files do
not affect output. Git listings explicitly set `-c core.quotepath=false` and use
NUL delimiters, retaining non-ASCII names. Other committed JSON designs absent from an index are errors,
except the six named legacy fixtures, explicitly listed as unjoinable. A
malformed index, missing blob, duplicate path or duplicate design identity fails.

Join on exact, case-sensitive family/chassis/model from source headers. The named
mech model alias maps catalog `Unknown` to source empty model. This changes only
the lookup key, never the catalog object. No filename, slug or MUL id fallback
exists. Zero/multiple source matches fail, as do multiple catalog matches.
FixedWingSupport in vehicles/ belongs to aerospace; smallcraft/ also belongs to
aerospace. Capital includes dropships/jumpships/warship/spacestation. Source
protomeks corresponds to catalog protomechs.

Every chosen source is hashed after CRLF-to-LF normalization and its path/hash
must match exactly one reference row before emission. Every reference row must
have a committed catalog match. The reference is a verification input, never the
source of a design's identity or digest. The consuming comparator must still
enforce its existing reference provenance policy (`--reference-trust blocking`
and `--reference-policy`). Per-file hashes establish source-byte equality with
that reference; they do not independently attest a source checkout's Git pin.

Successful output is `sources.ndjson`, its compatible `.manifest.json`, and
`committed-catalog-report.json`. The manifest adds `committedCatalog`, including
catalog commit, index/design blob ids, joins, alias count, reference digest,
family counts, unjoinables and errors. Serialization/order are deterministic;
there are no timestamps or output-directory-dependent fields. A failed join
writes the explicit error report and publishes no sources file or manifest.

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

Focused proof:

```sh
npx jest --selectProjects unit --runTestsByPath scripts/__tests__/committed-catalog-sources.test.ts --maxWorkers=1
npx jest --selectProjects unit --runTestsByPath scripts/__tests__/committed-catalog-parity.test.ts --maxWorkers=1
node --test scripts/ci/committed-catalog-scoreboard.test.mjs
```
