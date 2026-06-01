# Proposal: Align Movement Colors with MegaMek

## Why

The tactical map movement overlay was using green for Walk and blue for Jump. MegaMek's movement phase reference uses a different BattleTech-established convention: Walk is cyan, Run is yellow, Jump is red, and illegal/over-capacity path sections are dark gray.

Aligning the palette makes the top-down movement overlay easier for MegaMek players to read and gives us a rules-source-backed visual convention for walk/run/jump range work.

Source checked: https://github.com/MegaMek/megamek#movement-phase

## What Changes

- Change Walk movement range tint from green to cyan.
- Keep Run movement range tint yellow.
- Change Jump movement range tint from blue to red while preserving its jump hatch pattern.
- Change blocked/unreachable movement projection tint from red to dark gray.
- Update the MP legend swatches and palette smoke test to match.

## Out of Scope

- Changing movement pathfinding or movement legality.
- Changing heat, MP, elevation, or terrain cost calculations.
- Changing attack-range colors.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/constants/hexMap.ts`, `src/components/gameplay/HexMapDisplay/*`
- Tests: palette smoke test plus focused map legend/render coverage
