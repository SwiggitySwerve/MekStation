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
BA and infantry have no pinned-source contract adapter here and retain reasons.

Totals must be positive integers and match exactly. Both aggregate values must
be positive and finite; their relative tolerance is `1e-9 * max(1, |a|, |b|)`
to accommodate order-dependent Java floating-point sums. Capital defense-only
results compare defense alone and always count as incomplete. `within1Pct`
includes exact totals; both signed 1% boundaries are inclusive. `farther` excludes
invalid, unsupported, unjoined and incomplete results, which have separate counts.

Exit zero requires every expected family, complete hash joins, valid figures,
exact totals and matching aggregates. Every gap exits one. Sorted JSON/JSONL
reports contain no timestamps and are byte deterministic for the same inputs.
