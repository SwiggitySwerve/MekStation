## Why

GM combat interventions already cover movement, damage, heat/ammo, turn order, and lifecycle corrections, but the combat-first control surface still lacks explicit support for fixing attack-resolution and objective-state outcomes. Those are common tactical adjudication cases and need the same preview, approval, ledger, replay, and redaction guarantees as the existing correction families.

## What Changes

- Add GM combat correction families for attack-resolution outcomes and scenario objective state.
- Allow attack-resolution corrections to record the approved hit/miss, roll, to-hit, damage/location, weapon, attacker, target, and related event references without replaying the entire encounter.
- Allow objective corrections to patch existing objective markers or add corrected objective markers when the encounter state was loaded incorrectly.
- Preserve player-facing redaction: players see only the approved net effect, while GM-private reason, default outcome, and hidden notes remain private.
- Keep corrections reducer-compatible by storing projected effects in the intervention domain payload and replaying them through the existing combat intervention projection path.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `gm-combat-interventions`: Extend supported combat-domain intervention corrections to cover attack-resolution and objective-state outcomes.

## Impact

- `openspec/specs/gm-combat-interventions/spec.md`
- `src/types/interventions/GmCombatInterventionTypes.ts`
- `src/lib/interventions/GmCombatInterventionPreview.ts`
- `src/lib/interventions/GmCombatInterventionProjection.ts`
- `src/lib/interventions/GmCombatInterventionImplementer.ts`
- `src/lib/interventions/__tests__/GmCombatInterventionImplementer.test.ts`

## Non-goals

- Do not introduce a second combat ledger.
- Do not re-resolve historical combat dice or rewrite existing event logs.
- Do not add UI forms for these corrections in this slice.
- Do not broaden authority semantics beyond the existing GM-owned game-state model.
