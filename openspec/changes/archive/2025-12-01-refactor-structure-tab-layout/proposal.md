# Change: Refactor Structure Tab to Movement-First Design

## Why

The Structure tab needed a cleaner layout with movement-first design similar to MegaMekLab, where Walk MP selection drives engine rating calculation rather than the reverse.

## What Changes

- Reorganize Structure tab into two-column layout:
  - Left: Combined System Components panel (Engine, Gyro, Structure, Cockpit in compact table)
  - Right: Movement panel with Walk MP input (drives engine rating), Run MP (calculated), Jump MP, Jump Type
- Walk MP selection now determines engine rating (rating = tonnage × walkMP)
- Engine rating is displayed as derived info rather than direct input
- Jump MP, Jump Type, and Mech J. Booster placeholders prepared for future equipment system

## Impact

- Affected specs: `customizer-tabs`
- Affected code: `StructureTab.tsx`
