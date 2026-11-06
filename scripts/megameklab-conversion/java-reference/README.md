# Pinned-MegaMek reference exporter (all in-scope unit families)

`VehicleAeroReferenceExporter.java` loads each MTF/BLK source through the pinned MegaMek runtime (`48fcb2f64a1b3f2d575707ce5653dad64927b587`, mm-data `50f7efef0c9f775b0258f8283525ed4f906e1985`) and writes one JSONL row per unit: BV total and raw aggregates (`defensiveValue`, `offensiveValue`, `baseBV`, `tagBV`, `adjustedBV`), the verifier's `*Weight*` terms and validity, SI and fuel (`Aero.getOSI`, `getOriginalFuel`), engine, per-location armor and internals. It follows `LoadedEntityProbe` (BV mode `ignoreC3=true,ignoreSkill=true,ignoreTAG=true`, weight-method capture) and `CorpusLoadProbe` (loader entry, one row per source). The weight terms overlap; never sum them.

`../java_reference_exporter.py` stages nothing: it reads the read-only snapshot, verifies the pinned jars and classes against `runtime-reference/pinned-results`, runs 24 known references first (the original 12 plus three each for mechs, battle armor, infantry and ProtoMechs) and stops if any BV, class or source hash differs. It then exports the sorted corpus and fails if any row's source sha256 differs from `runtime-reference/corpus/manifest.json`, pinned sources are missing, or the rows don't match the source list. `UnitVerifierOptions.xml` is read from `--mekfiles` without a hash check. The snapshot is checked out with CRLF; the exporter parses and hashes the LF bytes, which equal the pinned git blobs.

Source selection is `meks/**/*.mtf` plus BLKs under `battlearmor`, `infantry`, `protomeks`, `vehicles`, `fighters`, `convfighter`, `smallcraft`, `dropships`, `jumpships`, `warship` and `spacestation`. Owner-excluded `ge`, `advancedbuildings`, `handheld` and `battlefieldsupport` directories are never walked. `summary.json` reconciles pinned, discovered and emitted counts per directory; `failures.json` retains each load/stage failure and its reason. On the pinned snapshot the four added directories contain 4,263, 1,188, 1,820 and 86 sources respectively, giving 9,815 sources overall.

New families additionally carry `familyFacts` from MegaMek's public APIs: BV movement MP, mech structure/cockpit/gyro/heat/signature facts, infantry squad and anti-mech facts, battle armor protection, conventional infantry weapons/specializations/damage divisor, and ProtoMech glider/quad/main-gun flags. These are selected calculator inputs, not a complete entity serialization or per-term BV trace. Existing families retain their row schema.

The runner uses the recorded JDK 21 and classpath and launches Java from `runtime-reference/build-inputs/megamek/megamek`, which contains `mmconf/milestoneReleases.yml`. The exporter sets `Configuration.setUnitsDir` to the supplied pinned mm-data directory before loading equipment or verifier options.

```powershell
python -B scripts/megameklab-conversion/java_reference_exporter.py --mekfiles <mm-data>/data/mekfiles --out-dir <scratch outside the repo> [--selfcheck-only] [--fixture <file>]
```

The committed `scripts/__tests__/fixtures/java_reference_vehicle_aero_capital.json` retains the original 39-unit slice. `java_reference_mek_infantry_proto.json` adds the 12 new references captured from pinned Java. `--fixture` writes their combined selection. The full oracle stays outside the repo, under `unit-loading/UL-16b/oracle/full.jsonl` for this lane; the UL-16 coord-r3 oracle is preserved.

Limits:

- **Reproducibility is per source list.** Runs over the same sorted full list give identical artifact hashes. Changing the list's order or composition can move the raw double aggregates (`baseBV`, `offensiveValue`) of DropShip, JumpShip, WarShip and SpaceStation rows by 1–2 ulp. Pinned `LargeAeroBVCalculator` accumulates over an identity-hashed `HashMap` (`LargeAeroBVCalculator.java:65`). Integer BV totals and `adjustedBV` are stable. Compare raw aggregates with a tolerance (for example 1e-9), and artifact hashes only between runs of the same list.
- `tagBV` is the `-1.0` sentinel in this BV mode.
- Load failures are counted in `summary.json` but do not fail the run; drift, missing pinned sources and unreconciled paths do.
- Only the declared MTF/BLK formats are exported; the three `.bfs` Battlefield Support files under `vehicles/` are out of scope.

## Construction quantities (`--construction-terms`)

This opt-in adds fields under `construction` and preserves `weightMethods`,
`valid`, `diagnostics` and every BV field. `weightTerms` is a flat numeric map
in tons, keyed by native method name. `weightTotal` is native
`calculateWeightExact`; `weightRemainder` is that total minus the term sum.
`reconstruction` records `ok`, `absoluteTolerance` (1e-9 t) and
`relativeTolerance` (1e-12). The runner rejects failed captures or reconstruction.
The check proves the captured sum, not local construction parity.

Audited sources at MegaMek `48fcb2f64` in `megamek/src/megamek/common/verifier/`:
`TestEntity.java:1011-1032`, `TestSupportVehicle.java:773-775`,
`TestAero.java:1099-1118`, `TestSmallCraft.java:837-854`,
`TestAdvancedAerospace.java:982-1005`, `TestBattleArmor.java:1293-1313`.
Support fuel is additive; patchwork selects allocated armor. BA keys retain the
native loop's indices as `trooper.<index>.<method>` and a separate native rounding
contribution. Controls already include cockpit/gyro; misc already includes its
native subtotals. Those overlapping methods and design capacity are never added.

Infantry's static `TestInfantry.java:565-702` calculation needs a detailed probe.
Its `weightTermsStatus` has `status: unsupported` and a reason; `reconstruction.ok`
is false, and no map or remainder is fabricated. Unsupported rows are listed
separately in `construction-reconstruction.json` and never counted as passes.
Row 1.3 remains open for infantry terms and further verifier checks.

`verifierQuantities` provides `{value, unit}` for exact/rounded/design weights
(`t`), armor (`points`) and critical capacity (`slots`). Failed getters retain
`{status: failed, reason, unit}` and fail the runner. Zero remains a numeric value.
`settings` records effective zero-argument `TestEntityOption` values, game year
and ammo tech level. `verifier-config.json` records the actual XML path/hash;
this records the input rather than asserting a pinned XML hash. Artifact hashes
include that receipt, the adapter source/bytecode and reconstruction report.
Use `--per-term --construction-terms` to retain both BV and construction details.
