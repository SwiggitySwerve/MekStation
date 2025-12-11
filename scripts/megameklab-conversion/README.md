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
