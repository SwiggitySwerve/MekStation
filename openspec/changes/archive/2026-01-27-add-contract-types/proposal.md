# Change: Contract Types Expansion

## Why

MekStation currently has 5 basic contract types (Garrison, Recon, Raid, Extraction, Escort). MekHQ provides 19 AtB contract types with type-specific rules including variable lengths, operations tempo multipliers, combat role assignments, and parts availability modifiers. This expansion adds strategic depth to contract selection and integrates with scenario generation, acquisition systems, and faction standing.

Without expanded contract types, campaigns lack:

- Contract variety and strategic choice
- Type-specific gameplay mechanics (ops tempo, parts availability)
- Integration with combat roles (Plan 11)
- Contract negotiation depth (4 clause types)
- Monthly contract events (10 event types)

## What Changes

- **NEW**: 19 AtB contract types with type-specific definitions
- **NEW**: Variable contract length formula (constantLength × 0.75 + random(constantLength × 0.5))
- **NEW**: 4-clause negotiation system (Command, Salvage, Support, Transport)
- **NEW**: 10 monthly contract event types
- **NEW**: Ops tempo multiplier per type (affects scenario frequency)
- **NEW**: Parts availability modifier per type (affects acquisition TN)
- **NEW**: Default combat role per type (imports from Plan 11)
- **MODIFIED**: Contract market generation uses all 19 types
- **MODIFIED**: IContract interface extended with AtB-specific fields

## Impact

### Affected Specs

- `contract-types` (NEW) - 19 contract type definitions and mechanics
- `mission-contracts` (MODIFIED) - Contract interface and market generation

### Affected Code

- `src/types/campaign/contracts/contractTypes.ts` - 19 type enum and definitions
- `src/lib/campaign/contracts/contractLength.ts` - Variable length calculation
- `src/lib/campaign/contracts/contractNegotiation.ts` - 4-clause negotiation
- `src/lib/campaign/contracts/contractEvents.ts` - 10 monthly event types
- `src/lib/campaign/contractMarket.ts` - Updated for 19 types
- `src/types/campaign/Contract.ts` - IContract interface extended

### Breaking Changes

None. Existing 5 contract types map to AtB equivalents. New fields are optional for backward compatibility.

### Migration Notes

- Existing contracts continue to work (5 types map to AtB types)
- New `atbContractType` field optional on IContract
- Ops tempo defaults to 1.0 for legacy contracts
- Parts availability modifier defaults to 0 for legacy contracts
- Contract events only fire for AtB contracts (opt-in)
- No migration needed — system is backward compatible
