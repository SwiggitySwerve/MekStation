# Change: Add MTF Parity Validation System

## Why

MekStation's unit data was converted from MegaMek's MTF flat files to JSON. There is no systematic way to verify conversion accuracy or detect when upstream mm-data changes. Units may have incorrect equipment, missing actuators, or critical slot mismatches that compound over time.

## What Changes

- **NEW** MTFParserService: Parse raw MTF files directly from mm-data repository
- **NEW** MTFExportService: Serialize ISerializedUnit back to MTF format
- **NEW** ParityValidationService: Orchestrate round-trip validation (MTF → JSON → MTF → diff)
- **NEW** ParityReportWriter: Generate per-unit issue files, manifest, and console output
- **NEW** CLI script for running validation: `scripts/validate-parity.ts`
- **NEW** mtf-parity-validation spec defining requirements

## Impact

- Affected specs: serialization-formats (adds MTF export), NEW mtf-parity-validation capability
- Affected code: `src/services/conversion/` (new services)
- New dependencies: None (uses existing Node.js fs APIs)
- Output directory: `validation-output/` (gitignored)

## Success Criteria

- Round-trip validation produces actionable per-unit issue reports
- Discrepancies are categorized (equipment, actuator, slot, armor, etc.)
- Console output shows summary statistics
- Manifest file enables agent-driven iteration on fixes
