# Decisions Log — add-blk-import-per-type

## 2026-04-25 apply

### Path resolution

- Default mm-data root resolution moved into `enum_mappings.default_mm_data_root()`, so all 5 BLK converters share one helper.
- `MM_DATA_ROOT` env var overrides; otherwise `E:\Projects\mm-data\data` on Windows, `/e/Projects/mm-data/data` elsewhere.
- The original `Path("/e/Projects/...")` defaults silently broke on Windows because `Path` collapses the leading `/e/` to `\e\`.
- Vehicle converter previously had a buggy `Path(__file__).parent.parent.parent / "E:/Projects/..."` default that resolved to a nonsense path.

### Filename sanitisation (vehicles)

- Vehicle BLK chassis can contain `/` (e.g. `AC/2 Carrier`, `AC/20`, `Ultra/5`). Path interprets that as a directory separator, so the writer crashes.
- Fix: `re.sub(r"[\\/:*?\"<>|]", "-", name)` before constructing the output path.
- Aerospace / BattleArmor / infantry / ProtoMech converters already had `safe_name`; vehicle was the outlier.

### Parity targets

- Each converter now ships **10 canonical fixtures** (was 3-5). Parity values were sourced by scanning the freshly-converted manifest and cross-checking against MUL conventions.
- Notable corrections:
  - Siren ProtoMech is 3 tons, not 5-7.
  - Savannah Master / Scorpion / Demolisher chassis names in BLK include the qualifier (e.g. "Demolisher Heavy Tank") — short names didn't match.
  - Aerospace `Eagle` / `Lucifer` / `Slayer` / `Hellcat` / `Sabre` / `Sholagar` added.
- Tonnage / squad-size only — BV parity is **DEFERRED** until per-type BV calculators land in wave 5.

### Run logs and parity reports

- Each converter now writes BOTH:
  - `validation-output/blk-<type>-run-log.json` (counts, errors, parity_failures)
  - `validation-output/blk-<type>-parity.json` (per-fixture comparison records)
- The parity report path matches the spec scenario (`blk-vehicle-parity.json`).
- All converters exit non-zero on parity regression OR errors (task 7.4).

### Manifest size budget

- Largest manifest: infantry at 836 KB. Budget is 5 MB. Plenty of headroom.
- Each converter asserts `manifest_path.stat().st_size <= 5*1024*1024` and bumps the error counter if exceeded.

### Deferreds

- **Task 8.2** (`App loads manifest first`): outside this change scope. The build-time manifest is in place; UI integration belongs to the per-type customizer change. Pickup: `src/components/units/UnitCatalogService.ts` once that proposal lands.
- **Spec: Parity Validation BV column**: deferred to wave 5 once `validate-bv` covers non-mech types. Tonnage / equipment-count parity is implemented today.
- **Spec: Per-Type Unit Manifest BV field**: same deferral — manifest entries currently have `bv: null` for all non-mech units.

### Files touched

- `scripts/megameklab-conversion/blk_vehicle_converter.py`
- `scripts/megameklab-conversion/blk_aerospace_converter.py`
- `scripts/megameklab-conversion/blk_battlearmor_converter.py`
- `scripts/megameklab-conversion/blk_infantry_converter.py`
- `scripts/megameklab-conversion/blk_protomech_converter.py`
- `scripts/megameklab-conversion/enum_mappings.py` (added `default_mm_data_root()`)
- `scripts/megameklab-conversion/BLK_QUIRKS.md` (NEW — task 1.4)
- `openspec/changes/add-blk-import-per-type/tasks.md` (flipped 12 tasks to done with rationale)
- `openspec/changes/add-blk-import-per-type/specs/unit-data-import/spec.md` (annotated 2 SHALLs with DEFERRED blockquotes)
- `validation-output/blk-*-{run-log,parity}.json` (10 generated artefacts)
- `public/data/units/{vehicles,aerospace,battlearmor,infantry,protomechs}/*.json` (5099 generated unit files + 5 manifests)
