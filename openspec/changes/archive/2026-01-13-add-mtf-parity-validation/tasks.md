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
- [x] 2.11 Add unit tests for MTFParserService (172 tests in MTFParserService.test.ts)

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
- [x] 3.11 Add unit tests for MTFExportService (134 tests in MTFExportService.test.ts)

## 4. Parity Validation Service

- [x] 4.1 Create `src/services/conversion/ParityValidationService.ts`
- [x] 4.2 Implement `validateUnit(mtfPath)` method
- [x] 4.3 Implement line-by-line diff logic
- [x] 4.4 Implement discrepancy categorization
- [x] 4.5 Implement suggestion generation per category
- [x] 4.6 Implement `validateAll(options)` method with unit discovery
- [x] 4.7 Add unit tests for ParityValidationService (tests in ParityValidationService.test.ts)

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

## Final Results (Full BattleMech Corpus - 4227 Units)

**Validation Status: 100% PASS RATE**

```
Units validated:     4227
Units passed:        4227 (100.0%)
Units with issues:   0
Units with errors:   0
```

### Issues Resolved

| Issue | Root Cause | Fix | Units Fixed |
|-------|-----------|-----|-------------|
| SLOT_COUNT_MISMATCH | MTF pads to 12 slots | Added padding in MTFExportService | ~681 |
| ENGINE_MISMATCH | Inconsistent formats | Added normalizeEngineString() | ~160 |
| PARSE_ERROR (121) | Empty model field required | Only require chassis in parser | 121 |
| ARMOR_MISMATCH (51) | Missing CL armor for tripods | Added `'CL armor': 'CENTER_LEG'` mapping | 11 tripods |
| ARMOR_MISMATCH (40) | Patchwork armor format | Extract numeric value from `Type:Value` format | 5 units |
| SLOT_COUNT_MISMATCH (11) | Missing CENTER_LEG location | Added `'Center Leg:': 'CENTER_LEG'` header | 11 tripods |
| HEADER_MISMATCH (12) | Clanname used as model fallback | Preserve original empty model field | 12 Clan mechs |

### Exotic Mech Support Added

**Quad Mechs:**
- Parser: Location headers `Front Left Leg:`, `Rear Left Leg:`, etc.
- Parser: Armor fields `FLL armor`, `FRL armor`, `RLL armor`, `RRL armor`
- Exporter: Correct location names and armor labels

**Tripod Mechs:**
- Parser: Location header `Center Leg:`
- Parser: Armor field `CL armor`
- Exporter: Correct location names and armor labels
- Slot count: `CENTER_LEG: 6`

**Patchwork Armor:**
- Parser: Extracts numeric value from `ArmorType:Value` format
- Validator: Normalizes armor values for comparison

**Clan Dual-Names:**
- Parser: Preserves empty model when `clanname:` is present
- Exporter: Outputs empty `model:` with separate `clanname:` field

### Known Gaps

- Equipment name reverse-mapping has good coverage but may need expansion for rare equipment

### Test Coverage

- MTFParserService: 172 tests
- MTFExportService: 134 tests
- ParityValidationService: tests for core functionality
- Total: 306+ tests passing
