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
consumer receipt. The Python index generator owns fixture/non-unit membership.

Each family is enumerated exclusively from its committed index.json. Catalog
objects come from immutable Git blobs, so dirty and untracked working files do
not affect output. Other committed JSON designs absent from an index are errors,
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
Those decisions remain pending the S0b design proposal.

The current comparator uses committed objects for mech BV/validity/weight and
vehicle/aerospace/capital BV. BLK construction validity/weight/quantities still
read source bytes; personnel BV also uses source bytes. A paired census must
describe that limit and report catalog-versus-regeneration differences separately.
No workflow wiring or catalog regeneration is included here.

Focused proof:

```sh
npx jest --selectProjects unit --runTestsByPath scripts/__tests__/committed-catalog-sources.test.ts --runInBand
```
