# Change: Unit Export & Integration

## Why

With customizer UIs for all unit types, users need the ability to export units back to BLK format, generate record sheets, and have a unified unit browser experience.

## What Changes

- Add BLK export for all unit types
- Create record sheet templates for vehicles, aerospace, BA, infantry
- Update unit browser with type filtering and icons
- Add comprehensive documentation

## Impact

- Affected specs: unit export, record sheets, unit browser
- Affected code: `src/services/exporters/`, `src/components/recordsheet/`, `src/components/browser/`
- Dependencies: Requires customizer UIs for each unit type
