# Change: Add Scenario and OpFor Generators

## Why

To support automated and semi-automated gameplay, MekStation needs generator systems similar to MekHQ's "Against the Bot" (AtB) and StratCon modes. These generators create:

1. **Scenarios** - Battle setups with objectives, terrain, and conditions
2. **OpFor (Opposition Forces)** - Enemy units scaled to player force strength
3. **Modifiers** - Random or facility-based battle conditions

This enables both quick skirmish games and full campaign play without requiring manual setup for every battle.

## What Changes

- Add Scenario template system with objective types and victory conditions
- Add OpFor generator using Random Assignment Tables (RATs) with BV scaling
- Add Modifier system for battle conditions
- Add Terrain/Map generator based on biome and conditions
- Integrate generators with Encounter creation flow

## Impact

- Affected specs: New `scenario-generation` capability
- Related specs: `force-management` (player force BV), `campaign-system`, encounter pages
- Affected code:
  - `src/services/generators/` (new)
  - `src/types/scenario/` (new)
  - `src/data/` (RATs, scenario templates, modifier tables)

## Dependencies

- `force-management` spec (for player force BV calculation)
- Unit data system (for RAT lookups)

## Sequencing

This is a complex feature. Recommend implementing in phases:
1. Basic scenario templates (manual selection)
2. OpFor generator with BV scaling
3. Modifier system
4. Full automated generation
