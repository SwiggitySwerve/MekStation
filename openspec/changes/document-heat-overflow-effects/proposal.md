# Proposal: Document Heat Overflow Effects

## Change ID
`document-heat-overflow-effects`

## Summary
Create comprehensive documentation and type definitions for BattleTech heat overflow effects on in-game mechanics including movement penalties, to-hit modifiers, shutdown risks, and ammunition explosion chances.

## Problem Statement
The current `heat-management-system` spec has placeholder content for heat effects. While `src/types/validation/HeatManagement.ts` contains the heat scale data, this is not formally documented in the OpenSpec and the existing heat scale table is incomplete (missing granular thresholds at 18-19, 22-24, 26-29).

Heat overflow is a critical BattleTech mechanic that affects:
1. **Movement** - Reduced MP at various heat thresholds
2. **Combat** - To-hit penalties at elevated heat
3. **Shutdown** - Risk of involuntary shutdown at extreme heat
4. **Ammunition** - Risk of ammunition explosions at critical heat
5. **Special Equipment** - TSM activation at 9+ heat

## Proposed Solution
1. Create a dedicated `heat-overflow-effects` spec documenting all heat thresholds and their effects
2. Update the heat scale constants to include all official TechManual thresholds
3. Document equipment interactions (TSM activation, engine shutdown, etc.)
4. Ensure the `calculateEnhancedMaxRunMP` function accounts for heat penalties correctly

## Impact
- **Types**: Update `HeatManagement.ts` with complete heat scale
- **Utils**: Verify movement calculations account for heat penalties
- **UI**: Heat indicators could show current effect level
- **Documentation**: Comprehensive reference for heat mechanics

## Related Specs
- `heat-management-system` - Parent spec for heat tracking
- `heat-sink-system` - Heat dissipation
- `movement-system` - Movement calculations affected by heat
- `ammunition-system` - Ammo explosion risks

## References
- BattleTech TechManual - Heat Scale Table
- Existing implementation: `src/types/validation/HeatManagement.ts`

