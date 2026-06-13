# Design: Restore BV Parity Reproducibility

## Context

`scripts/validate-bv.ts` computes per-unit BV with the production engine
(`calculateUnitBV` → `calculateDefensiveBV` / `calculateOffensiveBVWithHeatTracking`)
and compares each unit against a reference BV resolved in priority order:
MegaMek cache → MUL cache → index `bv` field
(`scripts/validate-bv.ts:5217`–`:5220`). Three independent regressions have
combined to hollow the gate:

1. The two reference caches the harness reads
   (`scripts/data-migration/megamek-bv-cache.json`,
   `scripts/data-migration/mul-bv-cache.json`) are absent. Both loads are
   wrapped in `if (fs.existsSync(...))` (`:4677`, `:4700`), so absence is
   silent — the maps stay empty.
2. `index.json` no longer carries a `bv` field (verified: unit keys are
   `id, chassis, model, tonnage, techBase, year, role, rulesLevel, path`), but
   the `IndexUnit` interface still types `bv: number` (`:29`). The final
   fallback `iu.bv` is therefore `undefined`, and `referenceBV` is `undefined`
   for every unit.
3. With `referenceBV` undefined, the `if (!referenceBV || referenceBV === 0)`
   guard (`:5251`) excludes every unit. `calc` (validated count) ends at 0, so
   `w1p/w2p/w3p` are all 0 (`:5323`–`:5325`), the gates print FAIL (`:5337`),
   and `main()` returns normally — the process exits **0**. The audit notes a
   real full run in this state validates only the 389 hardcoded
   `MUL_BV_OVERRIDES` (`:4736`) at 85.9% and still exits 0.

The fix is reproducibility (commit the reference data) plus fail-loud
(exit non-zero on missing reference, below-floor coverage, or gate FAIL) plus a
schema-fidelity correction so the harness can never again silently treat
"reference unavailable" as "everything excluded, gate green".

## Decisions

### D1. Commit a reproducible reference dataset, prefer the full cache, accept a fixture subset as the floor

The harness already reads `megamek-bv-cache.json` (authoritative, supersedes
MUL) and `mul-bv-cache.json` (fallback). **Decision:** restore and commit at
least one reference dataset that covers the represented mech catalog so a clean
clone reproduces the documented "99.8% within 1% (4187/4196)" number. Preferred
artifact is the full MegaMek BV cache (it is what produces the headline figure).
If the full cache cannot be committed (size / provenance), the accepted fallback
is a committed **fixture subset** under version control — anchored by units the
`bv-validation-tooling` spec already names (`atlas-as7-d`) plus a representative
spread across tech bases — with the harness defaulting to the fixture in CI and
the coverage floor set to the fixture's unit count. Rationale: the gate's value
is reproducibility from a clean checkout; an absent external cache is exactly the
failure mode D-1 describes. The artifact lives under `scripts/data-migration/`
(where the harness already looks) or `src/__tests__/fixtures/` if scoped as a
test fixture.

### D2. Three independent fail-loud exit conditions, each with a distinct non-zero code

`validate-bv.ts` MUST exit non-zero when any of:

- **Missing/empty reference dataset** — neither the MegaMek cache nor the MUL
  cache (nor the committed fixture) yields any reference BV. Today this path is
  silent; it MUST become a hard error before any unit is processed, because a
  zero-reference run is meaningless, not "passing".
- **Below-floor coverage** — the count of units with a resolved reference BV
  (`calc` over represented units) falls below a committed minimum-coverage
  threshold. This catches partial-cache corruption (e.g. only the 389 overrides
  load) that today reports a misleading sub-gate pass/FAIL but exits 0.
- **Accuracy gate FAIL** — any of `g1` (within-1% ≥ 95.0), `g2` (within-2% ≥
  99.0), `g3` (within-3% ≥ 99.5) is false (`:5326`–`:5328`). Today these print
  FAIL but do not affect the exit code.

Rationale: distinct conditions need distinct signals so CI logs disambiguate
"data missing" from "engine regressed". Reuse the existing fatal pattern at
`:5447`–`:5449` (catch → `process.exit(1)`) but add explicit pre-/post-checks
inside `main()` so the normal path can exit non-zero too.

### D3. Fix `IndexUnit` to the real schema; resolve reference BV without depending on a dropped index field

Update the `IndexUnit` interface (`:29`) to match the actual `index.json` (drop
`bv` and `cost`, or mark them `bv?: number` / `cost?: number`). Because `index.bv`
is no longer a reliable reference source, the reference-BV resolution
(`:5217`–`:5220`) MUST source reference BV from the committed dataset only; an
index field, if present, MAY be used as a last resort but its absence MUST NOT
silently exclude a unit — it MUST flow into the "no reference available" counter
that D2 fails on. Rationale: the silent `undefined → exclude → green` chain is
the precise mechanism of D-1; typing the interface honestly and routing
"no reference" through the fail-loud counter closes it structurally.

### D4. Own the parity target in `battle-value-system`, enforce it in `bv-validation-tooling`

The documented "99.8% within 1% (4187/4196)" parity claim currently lives only
in narrative (`MEMORY.md`) and as an aside in a tooling requirement. **Decision:**
add an ADDED requirement to `battle-value-system` that states the engine SHALL
hold a documented mech-BV parity rate against committed MegaMek reference data,
reproducible from a clean checkout and enforced by the tooling's exit code. The
mechanism (caches, exit codes, schema) stays in `bv-validation-tooling`. This
keeps single-source-of-truth clean: the engine spec owns the *guarantee*, the
tooling spec owns the *measurement*. Both deltas are ADDED requirements (new
behavior), not MODIFY of the existing tooling requirements, because the
gate-mechanics contract did not exist before.

### D5. Remediation plan only — no engine math touched

This change restores the ability to measure parity; it does not re-tune any
unit's BV. The 9 known outliers and the 99.8% figure are accepted as the target
to *reproduce*, not to improve. If the restored dataset reveals the engine no
longer hits 99.8%, that is a true regression the now-fail-loud gate will surface
— and a follow-up engine change, not part of this remediation.

## Open Questions

(none) — D1 commits to "full cache preferred, fixture subset is the accepted
floor"; the implementer picks based on whether the full cache can be sourced and
committed, and sets the coverage floor accordingly (full-catalog count or
fixture count). Either path satisfies the reproducibility and fail-loud
requirements below.

## Risks

- **Full cache provenance/size** — the MegaMek BV cache was generated from an
  external MegaMek runtime (`Mek.java calculateBattleValue`, per D-1) and may be
  large or hard to regenerate. Mitigation: D1's fixture-subset fallback keeps the
  gate reproducible even if the full cache cannot be committed; the coverage
  floor is set to whatever is committed so the gate never claims more coverage
  than it has.
- **Fail-loud breaks the current CI lane immediately** — once `validate:bv`
  exits non-zero, the existing run (which exits 0 today on zero coverage) will
  start failing CI until the reference dataset lands. Mitigation: land the
  committed dataset and the exit-code change in the same change so the gate goes
  green truthfully, never red-then-suppressed.
- **Reproduced number may differ from 99.8%** — the headline could fail to
  reproduce against freshly committed reference data (e.g. data drift since the
  figure was recorded). Mitigation: D5 — surface it honestly via the fail-loud
  gate and reconcile the `MEMORY.md` / audit D-1 number to the reproduced value
  rather than asserting an unverifiable figure.
