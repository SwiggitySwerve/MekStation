# Design: MTF Parity Validation System

## Context

MekStation maintains BattleMech unit data in JSON format, originally converted from MegaMek's MTF (MechTech File) format. The mm-data repository (`../mm-data`) contains ~4,200+ canonical MTF files that serve as the source of truth.

**Stakeholders**: Developers maintaining data accuracy, agents iterating on conversion fixes.

**Constraints**:
- Must work with existing ISerializedUnit schema
- Must not modify mm-data repository (read-only)
- Output must be agent-friendly (small, focused files)

## Goals / Non-Goals

**Goals**:
- Validate that JSON units accurately represent MTF source data
- Identify specific discrepancies with actionable suggestions
- Support iterative fixing workflow (run → fix → re-run)
- Enable upstream sync detection (mm-data updates)

**Non-Goals**:
- Automatic fix application (manual iteration preferred)
- Real-time validation during app usage
- Supporting non-BattleMech unit types initially

## Decisions

### Decision 1: Round-Trip Validation Approach

**What**: Parse MTF → ISerializedUnit → serialize to MTF → diff against original

**Why**: This tests the complete data pipeline. Any data lost or transformed incorrectly appears as a diff in the output. Simpler than maintaining parallel comparison logic.

**Alternatives considered**:
- Field-by-field comparison: More targeted but requires maintaining mapping logic for each field
- Hash-based comparison: Fast but doesn't identify what differs

### Decision 2: Per-Unit Issue Files

**What**: Generate one JSON file per unit with issues (`issues/archer-arc-2r.json`)

**Why**: Agents can process one unit at a time, mark as resolved, and track progress. Better than monolithic report for iterative workflows.

**Alternatives considered**:
- Single large report: Overwhelming for agents, hard to track progress
- Batched by issue type: Less granular, complicates parallel work

### Decision 3: Service Module Architecture

**What**: New services in `src/services/conversion/`:
- `MTFParserService.ts` - Parse raw MTF text to ISerializedUnit
- `MTFExportService.ts` - Serialize ISerializedUnit to MTF format
- `ParityValidationService.ts` - Orchestration and diffing
- `ParityReportWriter.ts` - File output generation

**Why**: Keeps logic in service layer, testable, reusable. CLI script is thin wrapper.

### Decision 4: Discrepancy Categories

**What**: Categorize issues for targeted fixing:
- `UNKNOWN_EQUIPMENT` - Equipment ID not in catalog
- `EQUIPMENT_MISMATCH` - Equipment parsed differently
- `MISSING_ACTUATOR` - Actuator in MTF missing from JSON
- `EXTRA_ACTUATOR` - Actuator in JSON not in MTF
- `SLOT_MISMATCH` - Critical slot contents differ
- `SLOT_COUNT_MISMATCH` - Slot array length differs
- `ARMOR_MISMATCH` - Armor values differ
- `ENGINE_MISMATCH` - Engine type/rating differs
- `MOVEMENT_MISMATCH` - Walk/jump MP differs

**Why**: Categories guide where to fix (parser vs serializer vs equipment catalog).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| MTF format variations | Start with 3039u era, expand coverage iteratively |
| Large output volume | Per-unit files + manifest for filtering |
| mm-data path hardcoded | Accept path as CLI argument with default |

## File Structure

```
validation-output/           # Gitignored
├── manifest.json            # Index of all units + status
├── summary.json             # Stats for console output
├── generated/               # Re-serialized MTF files
│   └── 3039u/
│       └── Archer ARC-2R.mtf
└── issues/                  # Per-unit issue files
    ├── archer-arc-2r.json
    └── ...
```

## Open Questions

- None remaining (addressed in brainstorming)
