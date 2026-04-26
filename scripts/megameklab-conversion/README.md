# MegaMekLab Conversion Scripts (PostgreSQL Version)

This directory contains the PostgreSQL-based version of the MegaMekLab data conversion scripts. These scripts were used for initial development but have been superseded by the SQLite version in the `mekstation-app/data` directory.

## Files

- `data_converter.py` - Converts MegaMekLab MTF/BLK files to JSON format
- `schema.sql` - PostgreSQL database schema for storing units and equipment
- `populate_db.py` - Populates PostgreSQL database with converted JSON data (NOT IMPLEMENTED)
- `run_validation.py` - Validates units against BattleTech construction rules
- `run_schema_validation_only.py` - Validates JSON files against schema only
- `validator.py` - Core validation logic
- `extract_types.py` - Utility to extract unique equipment types
- `update_json_files_for_new_schema.py` - Updates JSON files to match schema changes

## Current Status

**DEPRECATED**: The mekstation-app now uses SQLite instead of PostgreSQL. The active conversion scripts are located in:

- `mekstation-app/data/populate_db.py` (SQLite version)
- `mekstation-app/data/schema_sqlite.sql` (SQLite schema)

These PostgreSQL scripts are kept for reference only.

## Usage (Historical)

These scripts were originally designed to:

1. Convert MegaMekLab data files to JSON
2. Populate a PostgreSQL database
3. Validate unit construction rules

The conversion process is still used but now targets SQLite for easier deployment.

---

## Schema gate (cross-language schema bridge)

Three files in this directory implement the Python side of the
cross-language schema bridge introduced by PR-A1:

- `schema_gate.py` — wraps `jsonschema.Draft7Validator` with one
  compiled validator per shape (`weapon`, `unit`, `ammunition`,
  `electronics`, `misc_equipment`, `physical_weapon`). Lazy compilation
  per shape; cached for the life of the process. Each
  `validate_<shape>(data)` call returns a list of error strings (empty
  on success). Used by both `blk_common` write helpers and
  `run_schema_validation_only.py`.

- `blk_common.py` — adds `write_weapon_json` / `write_unit_json` /
  `write_equipment_json` choke points. Validation is **enabled by
  default**: every write checks the JSON Schema and raises `ValueError`
  on drift. Set `MEKSTATION_VALIDATE_WRITES=0` (or `false`/`no`/`off`)
  to disable for legacy data-regeneration runs that need to tolerate
  pre-bridge drift.

- `run_schema_validation_only.py` — corpus harness used by the
  `schema-bridge` CI job. Walks
  `public/data/equipment/official/<shape>/*.json`, validates every
  `items[]` entry, writes a JSON report to
  `validation-output/schema-bridge-report.json`. Flags:
  - `--shape weapon` (default in PR-A1) — repeat to enable additional
    shapes; `--shape all` enables every shape. PR-A2's CI gate uses
    `--shape all --strict`.
  - `--strict` — exit non-zero on any failure.

`validator.py` exposes the same harness via a thin `--strict --shape`
CLI so callers used to `python validator.py` find the new gate without
having to learn a new file name. The legacy PostgreSQL helpers in
`validator.py` are still importable but `psycopg2` is now optional.

### Local invocation

```bash
# Default: weapon corpus only, non-strict (matches the PR-A1 CI gate).
python scripts/megameklab-conversion/run_schema_validation_only.py

# All 4 equipment shapes, strict (matches the PR-A2 target gate).
python scripts/megameklab-conversion/run_schema_validation_only.py --shape all --strict

# Equivalent via the validator alias.
python scripts/megameklab-conversion/validator.py --strict --shape weapon

# Validate a single dict programmatically.
python -c "
import sys; sys.path.insert(0, 'scripts/megameklab-conversion')
from schema_gate import validate_weapon
print(validate_weapon({'id': 'x'}))
"
```

### Write-time validation (default ON)

`blk_common.write_*_json` validates by default — every write through
the helpers raises `ValueError` on drift before serialising. Normal
conversion runs need no env flag:

```bash
npm run convert:blk
```

The historical opt-out is still available for legacy data-regeneration
runs that need to bypass the gate (e.g. importing a known-bad corpus
for diff inspection):

```bash
MEKSTATION_VALIDATE_WRITES=0 npm run convert:blk
```

Accepted disable values: `0`, `false`, `no`, `off` (case-insensitive).
Anything else — including unset, empty, `1`, `true`, `yes`, `on` — keeps
validation enabled. The default flipped after PR #429 verified the
entire 5-shape corpus rounds-trip clean and the `--strict` CI gate
turned green.

### Source of truth

The canonical schemas live at `public/data/equipment/_schema/*.json`.
Both Python (`jsonschema`) and TypeScript (Zod via `npm run schema:gen`)
consume the same files. Do NOT edit
`src/types/contracts/generated/*.zod.ts` by hand — the `schema-bridge`
CI job runs `npm run schema:gen-check` and fails on drift; regenerate
with `npm run schema:gen` and commit the result.
