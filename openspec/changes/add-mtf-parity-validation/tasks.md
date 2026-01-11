# Tasks: Add MTF Parity Validation

## 1. Core Types and Interfaces

- [x] 1.1 Create `src/services/conversion/types/ParityValidation.ts` with:
  - `DiscrepancyCategory` enum
  - `IDiscrepancy` interface
  - `IUnitValidationResult` interface
  - `IParityValidationOptions` interface
  - `IParityReport` interface

## 2. MTF Parser Service

- [x] 2.1 Create `src/services/conversion/MTFParserService.ts`
- [x] 2.2 Implement header parsing (chassis, model, config, techbase, era, mass)
- [x] 2.3 Implement engine/structure/myomer parsing
- [x] 2.4 Implement heat sinks and movement parsing
- [x] 2.5 Implement armor parsing (type and per-location values)
- [x] 2.6 Implement weapons list parsing with locations
- [x] 2.7 Implement critical slot section parsing per location
- [x] 2.8 Implement actuator detection (hand/lower arm presence)
- [x] 2.9 Implement quirks parsing
- [x] 2.10 Implement fluff text parsing (overview, capabilities, history, etc.)
- [ ] 2.11 Add unit tests for MTFParserService (deferred - validation working)

## 3. MTF Export Service

- [x] 3.1 Create `src/services/conversion/MTFExportService.ts`
- [x] 3.2 Implement header section generation
- [x] 3.3 Implement structural components section (mass, engine, structure, myomer)
- [x] 3.4 Implement heat sinks and movement section
- [x] 3.5 Implement armor section generation
- [x] 3.6 Implement weapons list generation with location mapping
- [x] 3.7 Implement critical slot sections per location
- [x] 3.8 Implement equipment ID to MTF name mapping (reverse of import)
- [x] 3.9 Implement quirks section generation
- [x] 3.10 Implement fluff text section generation
- [ ] 3.11 Add unit tests for MTFExportService (deferred - validation working)

## 4. Parity Validation Service

- [x] 4.1 Create `src/services/conversion/ParityValidationService.ts`
- [x] 4.2 Implement `validateUnit(mtfPath)` method
- [x] 4.3 Implement line-by-line diff logic
- [x] 4.4 Implement discrepancy categorization
- [x] 4.5 Implement suggestion generation per category
- [x] 4.6 Implement `validateAll(options)` method with unit discovery
- [ ] 4.7 Add unit tests for ParityValidationService (deferred - validation working)

## 5. Report Writer

- [x] 5.1 Create `src/services/conversion/ParityReportWriter.ts`
- [x] 5.2 Implement per-unit issue file generation (`issues/{unit-id}.json`)
- [x] 5.3 Implement generated MTF file output (`generated/{era}/{unit}.mtf`)
- [x] 5.4 Implement manifest.json generation
- [x] 5.5 Implement summary.json generation
- [x] 5.6 Implement console output formatting

## 6. CLI Integration

- [x] 6.1 Create `scripts/validate-parity.ts` CLI entry point
- [x] 6.2 Implement argument parsing (--mm-data, --output, --verbose)
- [x] 6.3 Add npm script: `"validate:parity": "tsx scripts/validate-parity.ts"`

## 7. Configuration

- [x] 7.1 Add `validation-output/` to `.gitignore`
- [x] 7.2 Update `src/services/conversion/index.ts` to export new services

## 8. Validation

- [x] 8.1 Run validation on single unit (Archer ARC-2R) to verify round-trip
- [x] 8.2 Run validation on 3039u era (~229 units) to identify common issues
- [x] 8.3 Document initial findings and known gaps

## Initial Findings (3039u Era - 229 Units)

**Top Issues Identified:**

1. **SLOT_COUNT_MISMATCH (681 occurrences) - FIXED**
   - Original MTF files pad all locations to 12 slots
   - Our exporter was outputting actual slot counts (6 for head/legs)
   - Fix: Added padding to 12 slots per location in MTFExportService

2. **ENGINE_MISMATCH (160 occurrences) - FIXED**
   - mm-data has inconsistent formats: "Fusion Engine" vs "Fusion Engine(IS)"
   - Fix: Added normalizeEngineString() to treat both formats as equivalent

**Current Results (After Fixes):**
- Units validated: 229
- Units passed: 226 (98.7%)
- Units with issues: 3 (all Quad mechs)

**Remaining Issues - Quad Mech Support:**
The 3 remaining failures are Quad mechs (Goliath, Scorpion x2) which require:
- Different location names: `Front Left Leg:`, `Rear Left Leg:` etc.
- Different armor codes: `FLL`, `FRL`, `RLL`, `RRL`
- No arm locations

**Known Gaps:**
- Unit tests deferred for initial implementation
- Quad mech support not yet implemented
- Equipment name reverse-mapping needs expansion for full coverage

**Next Steps:**
1. Add Quad mech support to parser and exporter
2. Expand validation to full BattleMech corpus
3. Add unit tests for edge cases discovered
