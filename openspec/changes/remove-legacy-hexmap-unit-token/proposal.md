# Proposal: Remove Legacy Hex Map Unit Token

## Why

HexMapDisplay now renders map tokens through `UnitTokenForType`, which owns
per-type token rendering, event projection, movement animation, fog metadata,
isometric visibility hints, and combat-projected valid-target chrome. The
superseded `HexMapDisplay/UnitToken.tsx` component only remains because one
damage-feedback smoke test imported it directly.

Keeping the legacy renderer leaves an unused token-local path that can drift
from the shared map projection contracts. In particular, it still derives
target rings directly from `IUnitToken.isValidTarget`, bypassing the newer
combat-projection override path used by the production dispatcher.

## What Changes

- Migrate the remaining damage-feedback smoke coverage to `UnitTokenForType`.
- Delete the superseded `HexMapDisplay/UnitToken.tsx` compatibility renderer.
- Keep damage, critical-hit, pilot-wound, and destroyed overlays covered through
  the same dispatcher path that the tactical map uses in production.

## Out of Scope

- Changing damage-feedback animation behavior or event projection semantics.
- Changing physical attack, weapon range, LOS, fog, or movement rules.
- Removing the legacy `IUnitToken.isValidTarget` field from public token data.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code:
  `src/components/gameplay/__tests__/addDamageFeedbackPolish.smoke.test.tsx`,
  `src/components/gameplay/HexMapDisplay/UnitToken.tsx`
- Tests: focused damage-feedback and token-dispatcher Jest coverage
