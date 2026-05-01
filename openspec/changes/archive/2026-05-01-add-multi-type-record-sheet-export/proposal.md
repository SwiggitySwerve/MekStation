# Change: Add Multi-Type Record Sheet Export

## Why

The `RecordSheetService` + SVG renderer pipeline shipped for BattleMechs and handles nothing else today. Every Phase 6 unit-construction proposal explicitly defers its record-sheet layout (vehicle construction's Non-goals: "Record-sheet PDF layout for vehicles — follow-up work"), and the four sibling types (aerospace, BattleArmor, infantry, ProtoMech) inherit the same deferral by pattern. Without per-type layouts, a player who builds a vehicle in the customizer cannot print or PDF it — breaking feature parity with mechs and preventing Phase 6 from meeting its "each type mirrors the mech work" roadmap goal.

This change extends the record-sheet export pipeline to all 5 non-mech unit types so Phase 6 construction work lands with a printable artifact, not a half-built surface.

## What Changes

- Extend `IRecordSheetData` with a discriminated `unitType` tag and per-type payload variants: `IMechRecordSheetData` (existing, renamed), `IVehicleRecordSheetData`, `IAerospaceRecordSheetData`, `IBattleArmorRecordSheetData`, `IInfantryRecordSheetData`, `IProtoMechRecordSheetData`
- Add per-type SVG renderers under `src/services/printing/svgRecordSheetRenderer/` — one module per type (`vehicleRenderer.ts`, `aerospaceRenderer.ts`, `battleArmorRenderer.ts`, `infantryRenderer.ts`, `protoMechRenderer.ts`) — with layouts matching the canonical Total Warfare / TechManual record sheets
- Extend `RecordSheetService.extractData(unit)` to dispatch on `unit.type` and delegate to type-specific extractors
- Add per-type SVG templates (6–8 vehicle locations, 4 aerospace arcs, BA squad pip grid, infantry platoon block, ProtoMech 5-location compact sheet) — fetched from mm-data CDN where available, falling back to generated layouts
- Add per-type armor pip layout helpers (mirrors mech's `armor.ts` renderer but with per-type geometry)
- Add per-type equipment list renderer (vehicles show Front/Side/Rear/Turret columns; aerospace shows Nose/L-Wing/R-Wing/Aft; BA shows per-trooper; infantry shows platoon weapons + field gun)
- Add per-type crew/pilot block (vehicles: driver + gunner + commander; aerospace: pilot; BA: per-suit troopers; infantry: platoon morale + training; ProtoMech: point pilots)
- Extend `recordsheet/spaSection.ts` (Phase 5) to render correctly against each type's pilot block
- Add Jest snapshot tests for each renderer with representative fixtures

## Non-goals

- Printing/export UI changes — existing `/print` page routes all types through one dispatcher
- PDF engine swap — we keep the current SVG → PDF pipeline, only add per-type SVG output
- Record sheet for DropShips, JumpShips, WarShips, LAMs, QuadVees — out of Phase 6 scope
- Fluff / biography section changes — unchanged from mech layout pattern
- Printed Special Abilities block — Phase 5 already shipped; per-type work just ensures it fits the per-type pilot area

## Dependencies

- **Requires**: `add-vehicle-construction`, `add-aerospace-construction`, `add-battlearmor-construction`, `add-infantry-construction`, `add-protomech-construction` (each needs valid type-specific data flowing into `extractData`)
- **Required by**: none — terminal change in Phase 6 per unit type
- **Phase 5 coupling**: Special Abilities section (shipped) must continue to work across all 5 new layouts

## Ordering in Phase 6

Ship one type's layout immediately after its construction change lands:

```
vehicle-construction    → vehicle-record-sheet    (sub-task of this change)
aerospace-construction  → aerospace-record-sheet
battlearmor-construction → battlearmor-record-sheet
infantry-construction   → infantry-record-sheet
protomech-construction  → protomech-record-sheet
```

Each sub-task is self-contained; agents can parallelize per type once their construction dependency is merged.

## Impact

- **Affected specs**: `record-sheet-export` (ADDED: per-type data model, per-type renderer contracts, per-type snapshot tests)
- **Affected code**: `src/services/printing/RecordSheetService.ts`, `src/services/printing/svgRecordSheetRenderer/*`, `src/types/printing/RecordSheetTypes.ts`
- **New files**: 5 new per-type renderer modules, 5 new per-type extractor modules, 5 fixture sets
- **No schema change**: per-type unit records already exist from their construction changes; this change only reads them
