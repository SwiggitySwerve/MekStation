# Runtime-parity census library

The shared library behind the runtime ports: `scripts/runtime-path-bv` (measure `load`) and `scripts/runtime-roundtrip`
(measure `reopen`). It covers the join and plan (`join.mjs`), the census orchestration (`census.mjs`), the per-unit rows
(`rows.mjs`, documented in `ROW-SCHEMA.md`), the gated facts (`facts.mjs`) and the nightly gate (`gate.mjs`, documented in
`BASELINE-SCHEMA.md`).

**Ownership:** C2 owns this library and `facts.mjs`. A change from another lane comes to C2 as a small batched PR.

## Families

Every run, facts file, baseline and gate covers exactly **one family** (`--family`, default `battlemechs`), so families
never collide.

- **Rows:** each family's rows go to its own `--out` directory.
- **Baselines:** each family has its own files (`baselinePath` / `baselineSetsPath` in `family-names.mjs`, re-exported by `gate.mjs`). Battlemechs keep the
  `baseline-<measure>` names; every other family uses `baseline-<family>-<measure>`.
- **Gate:** the gate fails closed if the run, the facts, the facts-meta or a baseline unit key belongs to another family.
- **Registered today:** `battlemechs` (both measures). `vehicles` has its row shape and fact table, and its capture
  registers in V2.

## Family names

`family-names.mjs` is the one owner of family ids and the file names they map to.

- **Ids:** a family id matches `FAMILY_ID_PATTERN`, `^[a-z][a-z0-9-]*$` (lowercase letters, digits and dashes, starting
  with a letter). The default family is `DEFAULT_FAMILY` (`battlemechs`).
- **File names:** `baselinePath` and `baselineSetsPath` give each family's baseline files.
- **No copies:** the gate, the census, the deriver provenance and the hosted family registry
  (`scripts/ci/parity-runtime-families.mjs`, `config/parity-runtime/families.json`) read these and keep no copy.
  `family-names.test.mjs` checks that the registry's baseline paths agree.
- **Imports nothing:** so the registry's plan step, which runs without `npm ci`, can import it.

## Adding a family

A family adds only its own parts. No gate, baseline-format or census change is needed.

1. **Row shape (`rows.mjs`).**
   - Add the family's `ok` variants to `RowSchema`, one per measure it supports, with `family: z.literal('<family>')` and
     its own `load` / `reopen` block.
   - Error rows are shared and need nothing.
   - If the shape has rules JSON Schema can't express, add them as a `<family>CrossChecks(row)` called from `crossChecks`
     for that family only.
   - Regenerate the schema: `node scripts/lib/runtime-parity/rows.mjs --write-schema`, then `npx oxfmt` the two schema files.
   - Document the shape in `ROW-SCHEMA.md`.
2. **Fact table and derivers (`facts-<family>.mjs`, registered in `facts.mjs`).**
   - Create `facts-<family>.mjs` (the name must be the family name; provenance finds the file by it). It holds the
     family's `<FAMILY>_FACT_DEFS` and `<FAMILY>_REPORTED_DEFS` (`{load: {...}, reopen: {...}}`, each fact `bool`,
     `distance` or `set`) and one pure deriver per measure, taking `(row, javaReferenceRow)` and returning facts.
     - Build the identity with `identity(row)` from `facts-core.mjs`.
     - An error row has every fact `null`: `unknownOf(<FAMILY>_FACT_DEFS.<measure>)`.
   - Register it in `facts.mjs`: add it to `FAMILY_FACT_DEFS` and `FAMILY_REPORTED_DEFS`, and re-export its derivers.
     `facts.mjs` is wiring only and isn't fingerprinted, so registering a family rebaselines nobody else.
   - Document the facts in `BASELINE-SCHEMA.md` under "Families".
   - **What rebaselines what.** Each family's gate checks two fingerprints, owned by `fingerprints.mjs` (`coreDeriverSha()`, `familyDeriverSha(family)`). That module imports only Node built-ins, so the hosted pre-dispatch check calls the same functions before `npm ci`:
     - `familyDeriverSha`, the git blob of `facts-<family>.mjs`. Editing it fails **that family's** gate closed
       (`FACTS_DERIVER_CHANGED`) until that family gets a header-only rebaseline.
     - `coreDeriverSha`, the git blob of `facts-core.mjs` (the fact kinds, the facts-row schema, the shared helpers).
       Editing it fails **every family's** gate closed until every family gets a header-only rebaseline, so batch core
       changes into one PR to C2 that lists every family's rebaseline.
     - A header-only rebaseline changes 0 unit lines; only `sha`, the changed fingerprint and a new note change.
3. **Capture and port entry (`run.mjs` of each port).**
   - Add a `families.<family>` entry: `{capture, toRow, summarize, facts, differencesFile}`.
   - `capture` is a `jestCapture({config, contextEnv})` over the family's own Jest capture file and config. Use a file
     name that is not `*.test.*`, so default discovery never runs it.
   - `toRow` maps a captured record to the family's row; `summarize` gives the family's headline.
   - Read the app the way the editor does: real open, real store, the editor's own read points, never a recomputation.
4. **Tests.**
   - Rows: the shape validates; its cross-checks reject bad lists; a mech-shaped block is rejected under the new family.
   - Facts: each fact, error rows unknown, and `validateFacts` against the family's own table.
   - Census: an unsupported family is refused until registered.
   - These are `node --test` files: `node --test scripts/lib/runtime-parity/*.test.mjs scripts/runtime-*/*.test.mjs`.
5. **First baseline.** C5 writes it with the port's `--write-baseline --family <family> --reason ...`, naming every known
   difference in `notes[]`. The first run is the baseline: a ratchet, not an acceptance.

The hosted workflow and its two helpers (`scripts/ci/parity-runtime-last-green.mjs` and `parity-runtime-summary.mjs`)
still assume one family per measure leg. Running more families there is the hosted per-family census's change, not part
of this library.
