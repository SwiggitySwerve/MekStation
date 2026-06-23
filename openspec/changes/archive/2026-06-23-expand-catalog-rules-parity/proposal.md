## Why

MekStation already has a large BattleMech combat validation substrate, but the next leverage point is to make official catalog/rules parity harder to regress and easier to audit on demand. Catalog-backed weapons, ammunition, physical weapons, and special modes need one repeatable proof surface that distinguishes supported mechanics from explicit gaps without static fallback data hiding failures.

## What Changes

- Add a catalog/rules parity capability that defines the official combat catalog matrix, validation commands, evidence artifacts, and explicit gap accounting.
- Expand equipment catalog requirements so official ranged weapons, ammunition, and physical weapons must load and map to runtime support or an explicit classified gap.
- Expand weapon-resolution requirements for catalog-driven UAC, RAC, LB-X, Streak, Artemis, NARC, TAG, AMS, cluster, and MML-style behavior coverage.
- Expand ammunition requirements for compatible ammo mapping, special ammo modes, and no-fallback failure handling.
- Expand physical-weapon requirements so every official physical entry is classified as a standalone runtime attack, modifier-only equipment, construction-only/out-of-scope entry, or explicit unsupported gap.
- Add validation tasks that run the existing combat validation suite and gap exporter, then add focused tests for newly covered catalog rows.

## Non-goals

- Do not rewrite the combat runner, tactical UI, or journey runner.
- Do not claim support for non-BattleMech systems inside this matrix unless they are split into separate explicit specs.
- Do not remove known limitations wholesale; audit and narrow them only when targeted tests prove the gap is actually closed.
- Do not add synthetic fallback equipment to make catalog parity pass.

## Capabilities

### New Capabilities

- `combat-catalog-rules-parity`: Defines the BattleMech official combat catalog parity matrix, validation evidence, gap taxonomy, and no-fallback proof rules.

### Modified Capabilities

- `equipment-database`: Requires official ranged weapon, ammunition, and physical weapon catalog entries to load and map to runtime support or explicit gap classifications.
- `weapon-resolution-system`: Requires catalog-driven coverage for special ranged weapon behavior, cluster behavior, and unsupported-mode accounting.
- `ammunition-system`: Requires official ammunition compatibility and special ammo behavior to map without static fallback masking failures.
- `physical-weapons-system`: Requires every official physical weapon entry to be classified against runtime attack/modifier/out-of-scope support.

## Impact

- Affected code: `src/data/equipment/**`, `src/lib/equipment/**`, `src/simulation/runner/**`, `src/simulation/core/**`, and focused Jest tests under `src/simulation/**/__tests__/`.
- Affected commands: `npm.cmd run validate:combat:gaps`, `npm.cmd run validate:combat`, `npm.cmd run verify:rules`, and any focused catalog parity Jest tests added in this wave.
- Affected specs: new `combat-catalog-rules-parity` plus deltas for equipment, weapon resolution, ammunition, and physical weapons.
- No new runtime dependency is expected.
