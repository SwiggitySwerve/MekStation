# Pinned-MegaMek reference exporter (vehicle, aerospace, capital)

`VehicleAeroReferenceExporter.java` loads each BLK source through the pinned MegaMek runtime (`48fcb2f64a1b3f2d575707ce5653dad64927b587`, mm-data `50f7efef0c9f775b0258f8283525ed4f906e1985`) and writes one JSONL row per unit: BV total and raw aggregates (`defensiveValue`, `offensiveValue`, `baseBV`, `tagBV`, `adjustedBV`), the verifier's `*Weight*` terms and validity, SI and fuel (`Aero.getOSI`, `getOriginalFuel`), engine, per-location armor and internals. It follows `LoadedEntityProbe` (BV mode `ignoreC3=true,ignoreSkill=true,ignoreTAG=true`, weight-method capture) and `CorpusLoadProbe` (loader entry, one row per source). The weight terms overlap; never sum them.

`../java_reference_exporter.py` stages nothing: it reads the read-only snapshot, verifies the pinned jars and classes against `runtime-reference/pinned-results`, runs the 12 known references first (the plan's eight plus Union, Comitatus, Crucible, Aegis) and stops if any BV, class or source hash differs, then runs all 2,458 family sources and fails if any row's source sha256 differs from `runtime-reference/corpus/manifest.json` or the rows don't match the source list. `UnitVerifierOptions.xml` is read from `--mekfiles` without a hash check. The snapshot is checked out with CRLF; the exporter parses and hashes the LF bytes, which equal the pinned git blobs.

```powershell
python -B scripts/megameklab-conversion/java_reference_exporter.py --mekfiles <mm-data>/data/mekfiles --out-dir <scratch outside the repo> [--selfcheck-only] [--fixture <file>]
```

The committed `scripts/__tests__/fixtures/java_reference_vehicle_aero_capital.json` is a 39-unit slice of that output, written byte-for-byte as committed; the full output stays outside the repo.

Limits:

- **Reproducibility is per source list.** Runs over the same sorted full list give identical artifact hashes. Changing the list's order or composition can move the raw double aggregates (`baseBV`, `offensiveValue`) of DropShip, JumpShip, WarShip and SpaceStation rows by 1–2 ulp. Pinned `LargeAeroBVCalculator` accumulates over an identity-hashed `HashMap` (`LargeAeroBVCalculator.java:65`). Integer BV totals and `adjustedBV` are stable. Compare raw aggregates with a tolerance (for example 1e-9), and artifact hashes only between runs of the same list.
- `tagBV` is the `-1.0` sentinel in this BV mode.
- Load failures are counted in `summary.json` but do not fail the run; drift, missing pinned sources and unreconciled paths do.
- Only `.blk` sources are exported; the three `.bfs` Battlefield Support files under `vehicles/` are out of scope.
