# Portable source provenance 1.0.0

This proposed interchange contract records where original unit source bytes
came from. Its authority is
[`source-provenance-schema.json`](../../public/data/equipment/_schema/source-provenance-schema.json)
(JSON Schema draft-07); `SourceProvenanceContract` and
`ISourceProvenanceContract` are generated/exported through the existing TypeScript
contract boundary. It can be validated independently of MekStation or MegaMek.

This is a provenance slice. It does not define a complete portable unit design,
establish any construction-family support, or prove numerical parity. Current
live loaders, persistence and legacy unit serialization do not consume it.

## Wire rules

- `format` is exactly `battletech-source-provenance`; `version` is exactly
  `1.0.0`. Consumers reject other identifiers/versions. This immutable schema
  provides no automatic migration or fallback. A future migration needs its own
  explicit, tested operation and must preserve original identities and hashes.
- `sources` is a nonempty ordered array. Retain every row, including identical
  rows or several origins of one design. Do not infer a design ID/revision from
  its path, source order, source hash, or commit.
- Each row has `source`, `originalFormat` (`mtf`, `blk` or `bfs`) and `sha256`.
  Format describes source syntax rather than a filename extension or evidence
  that the unit can be parsed, loaded or calculated correctly.
- A `git` source requires a stable HTTPS `repository` identity, resolved full
  lowercase `commit`, exact repository-relative POSIX `path`, and full lowercase
  Git `blob` object ID. Commit and blob must both be SHA-1 Git IDs (40 digits) or
  both SHA-256 Git IDs (64 digits). Branches and abbreviated IDs are rejected.
  Repository identities exclude credentials, queries, fragments and trailing
  slashes. Paths exclude absolute paths, traversal/dot/empty segments,
  backslashes, colons and ASCII controls. Compare identities exactly; never
  URL-decode paths or silently repair them.
- A `local` source requires `originalName`, the original basename with no path,
  colon or ASCII controls. It has no Git fields. Consumers must not manufacture
  repository or commit facts for uploads.
- `sha256` is the 64-digit lowercase SHA-256 of original file bytes, before text
  decoding, newline changes or parsing. A Git blob ID instead hashes Git's object
  representation. Both remain separate from a future normalized design digest.
  Producers must compute/verify these identities from the actual source; schema
  validation checks syntax and does not fetch bytes or attest their truth.
- Core objects reject unknown fields, including design/calculation/campaign
  state. No numbers occur in this slice. Optional `metadata` entries have a
  namespaced `name` such as `org.example:note` and opaque string `value` only.
  Preserve their order and values without interpretation. Metadata imposes no
  semantic requirements and cannot override core facts; required semantic
  extensions have no representation in this version.

Archive containers and member identities are unsupported and rejected. A future
archive variant must specify container identity/hash, safe member identity, and
original member-byte hash with conformance cases before being accepted. A path
and digest alone do not guarantee source recovery: retain original bytes in an
external content-addressed artifact. This contract does not yet specify bundles
or artifact transport.

## Immutable inventory producer

`scripts/megameklab-conversion/source_provenance.py` calls
`source_inventory.build_inventory` directly; it accepts no external inventory JSON.
The inventory still owns immutable object reads, counts, source discovery and
original-byte hashing. The producer projects every source row in inventory order,
without deduplication, and validates through `schema_gate` against the canonical
JSON Schema. No identity or path is repaired to pass validation. Non-source
metadata is excluded; any inventoried ZIP container causes an explicit failure
listing its path because member coverage cannot be represented in 1.0.0.

```text
npm run provenance:units -- --repo <local-git-repository> --commit <full-commit> --repository https://github.com/MegaMek/mm-data
python -B -m unittest discover -s scripts/__tests__ -p test_source_provenance.py
```

The CLI requires Python with `jsonschema`; its producer tests also need installed
Node development dependencies (`tsx` and Zod) for the independent consumer.
Set `NODE_BINARY` to select a Node executable for that test. The CLI emits UTF-8 JSON to stdout only after
successful validation, and leaves catalogs untouched. Redirect stdout to an
intentional artifact path. Repository identity is asserted by the caller, never
inferred from mutable remote configuration or attested as ownership. It retains
paths, case, format, blob and original-byte SHA-256 from immutable inventory;
modified, missing and untracked working files cannot change its result.

This is a collection of source origins. It supplies neither original bytes nor a
complete portable design, live loader, recovery bundle or parity result. Local
upload capture, migrations and editor/persistence integration need separate
adapters. The inventory report remains a distinct format with counts and modes.

## Executable examples and conformance

[`source-provenance.json`](../../src/types/contracts/__tests__/fixtures/source-provenance.json)
contains synthetic accepted Git SHA-1/SHA-256, local, multiple-row and metadata
examples, plus rejected identities, fields and versions. Its original bytes are
included as hex solely for deterministic hash checks; these examples do not
claim to identify real upstream designs. The generated boundary test checks
lossless parse/JSON round trips over the same documents as the independent
consumer:

```text
python scripts/__tests__/test_portable_source_provenance.py
npm run schema:gen-check
npx jest --selectProjects unit --runInBand --runTestsByPath src/types/contracts/__tests__/source-provenance.contract.test.ts
```

The Python consumer needs `jsonschema` and reads only the published JSON schema
and fixtures. It imports no application, React, Zustand or source-parser code.
Terminal-newline cases enforce equivalent identity rejection across JavaScript
and Python regular-expression engines. Regenerate TypeScript validators with
`npm run schema:gen`; never edit generated validators directly.
