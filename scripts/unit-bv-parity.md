# Pinned-source BV comparison

`unit-bv-parity.ts` owns comparison rules for all seven families;
`vehicle-aero-bv-delta.ts` converts inputs and writes reports.
The oracle remains outside the repository. From the repository root:

```text
python -B scripts/megameklab-conversion/export_vehicle_aero_json.py <mekfiles> <scratch> --strict
node node_modules/tsx/dist/cli.mjs scripts/vehicle-aero-bv-delta.ts --converted <scratch>/sources.ndjson --mekfiles <mekfiles> --reference <oracle.jsonl> --out <report-dir>
```

The exporter independently walks every in-scope MTF/BLK source. The runner
rechecks source hashes, then joins path plus SHA-256. Like the pinned Java
exporter, hashing removes CR only when followed by LF. No other bytes change.
Folders `ge`, `advancedbuildings`, `handheld`, `battlefieldsupport` and BFS files
are outside this oracle's scope. There are no per-unit exclusions.

Mechs use `validate-bv-calculator.calculateUnitBV`; `bvAdapter` runtime totals
and exact counts are separate fields. ProtoMechs use the handler's existing
BV breakdown. Vehicle, aerospace and capital contracts use the real dispatcher.
BA and infantry sources go through the BLK parser, their unit handler and the
shared dispatcher, and compare under the same strict rules; the handler total
and its exact count stay separate fields. A source that does not reach a BA or
infantry dispatcher result is counted not-computable with its reason.

Totals must be positive integers and match exactly. Aggregates must be finite
and not negative; a zero aggregate is real (unarmed designs) and matches only
a zero, so a one-sided zero is an aggregate mismatch, not an invalid row. Their
relative tolerance is `1e-9 * max(1, |a|, |b|)`
to accommodate order-dependent Java floating-point sums. Capital defense-only
results compare defense alone and always count as incomplete. `within1Pct`
includes exact totals; both signed 1% boundaries are inclusive. `farther` excludes
invalid, unsupported, unjoined and incomplete results, which have separate counts.

Exit zero requires every expected family, complete hash joins, valid figures,
exact totals and matching aggregates. Every gap exits one. Sorted JSON/JSONL
reports contain no timestamps and are byte deterministic for the same inputs.

Add `--per-term` to the Java exporter and comparator to include unrounded
stage terms. The exporter generates read-only calculator subclasses in the
external output directory; it never patches MegaMek. Reference identity includes
the stage definition, generator, generated Java, compiled probes and pinned
runtime manifests. `reconstruction.json` lists failures and supported counts.
Capital probes replace their identity-keyed weapon HashMap with a LinkedHashMap
in the probe instance only, preserving source order for reproducible sums.
Per-term aggregates use those probe sums after checking the untouched calculator
within `1e-12` relative tolerance; integer totals must match exactly.
The bounded first slice covers mechs, vehicles, aerospace and capital ships;
BA, infantry and ProtoMeks carry `termsUnsupported` and cannot pass term mode.

Each supported row reconstructs defense, offense, base BV, adjustment and rounded
total, and the probe independently checks the normal calculator's aggregates.
Structure includes gyro; defensive equipment includes armored components;
weapon BV is heat-adjusted and excludes arc ammo. Detail keys preserve weapon
location/type totals and available/capped ammo groups, plus capital arc ammo.
Neutral factors on zero pools are recorded as one (speed uses Java's factor).

Term mode compares required stages in calculation order, then every oracle
detail key in sorted order, reporting `firstTermDifference`. Missing or nonfinite
values fail, even when totals match. Existing MekStation breakdowns expose only
some terms; those omissions remain failures rather than inferred neutral values.
Aggregate mode remains available without the flag.
