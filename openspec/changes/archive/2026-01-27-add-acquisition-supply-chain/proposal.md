# Acquisition & Supply Chain System

## Why

MekStation currently lacks a parts procurement system. Players cannot acquire replacement parts, ammunition, or equipment through gameplay mechanics. This creates a gap between combat damage and repair - units get damaged but there's no way to obtain the parts needed to fix them.

MekHQ implements a comprehensive acquisition system with:

- Availability ratings (A through X) representing how common/rare parts are
- 2d6 roll mechanics with target numbers based on availability
- Planetary modifiers (tech sophistication, industrial capacity, output)
- Delivery time calculations
- Shopping list queue management
- Auto-logistics that scans units and auto-orders needed parts

This system is essential for campaign gameplay and connects the repair system (Plan 3) with actual parts availability.

## What Changes

### New Systems

1. **Availability Ratings**: Enum A-X with target number lookup tables (regular vs consumable parts)
2. **Acquisition Roll**: 2d6 vs TN with modifier stack (negotiator skill, planetary, clan penalty, contract)
3. **Planetary Modifiers**: Tech sophistication + industrial capacity + output ratings
4. **Delivery Time**: Formula `max(1, (7 + 1d6 + availability) / 4)` in configurable units
5. **Shopping List**: Queue with add/remove/retry/cooldown logic
6. **Day Processor**: Daily acquisition attempts and delivery tracking
7. **Auto-Logistics**: Scans units for needed parts and auto-queues requests

### Campaign Options Added (~15 new fields)

- `useAcquisitionSystem: boolean`
- `usePlanetaryModifiers: boolean`
- `acquisitionTransitUnit: 'day' | 'week' | 'month'`
- `clanPartsPenalty: boolean`
- `acquisitionSkillModifier: boolean`
- `useAutoLogistics: boolean`
- `autoLogisticsStockTarget: number`
- Plus planetary rating fields (tech/industry/output)

### Day Pipeline

- New `acquisitionProcessor` registered in day advancement pipeline
- Processes pending acquisitions daily
- Delivers arrived items

## Impact

### Positive

- Enables realistic parts procurement gameplay
- Connects repair system to parts availability
- Adds strategic depth (where to base, which contracts to take)
- Supports campaign logistics management

### Breaking Changes

- None (all new features, opt-in via `useAcquisitionSystem`)

### Migration

- No migration needed
- Existing campaigns default to `useAcquisitionSystem: false`

### Dependencies

- Plan 3 (Repair System) - acquisition results need repair jobs to consume parts
- Plan 7 (Skills) - negotiator skill modifier (stub if not available)

## Implementation Phases

1. Types and availability ratings
2. Roll calculation with modifiers
3. Planetary modifiers
4. Delivery time calculation
5. Shopping list queue
6. Day processor
7. Auto-logistics scanner
8. Campaign integration
9. UI components
