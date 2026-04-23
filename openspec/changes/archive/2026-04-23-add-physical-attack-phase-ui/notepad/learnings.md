# Learnings — add-physical-attack-phase-ui

## 2026-04-23 — Engine state of play

- `src/utils/gameplay/physicalAttacks/restrictions.ts` provides `canPunch`, `canKick`, `canMeleeWeapon`, `canDFA`, `canCharge`. Each returns `{ allowed, reason, reasonCode }`.
- `src/utils/gameplay/physicalAttacks/toHit.ts` provides `calculatePhysicalToHit` and per-type helpers (`calculatePunchToHit`, ...). Each returns `{ baseToHit, finalToHit, modifiers, allowed, ... }`. When `allowed=false`, `finalToHit=Infinity`.
- `src/utils/gameplay/physicalAttacks/damage.ts` provides `calculatePhysicalDamage` returning `IPhysicalDamageResult` with `targetDamage`, `attackerDamage`, `attackerLegDamagePerLeg`, `targetPSR`, `attackerPSR`, `hitTable`, `targetDisplaced`.
- `declarePhysicalAttack(session, attackerId, targetId, attackType, context)` in `src/utils/gameplay/gameSessionPhysical.ts` emits `PhysicalAttackDeclared` or `AttackInvalid`.
- `usePhysicalAttackPlanStore` already exists in `src/stores/useGameplayStore.combatFlows.ts`. Exposes `physicalAttackPlan`, `setPhysicalAttackTarget`, `setPhysicalAttackType`, `clearPhysicalAttackPlan`, `commitPhysicalAttack`.
- `PhysicalAttackPanel`, `PhysicalAttackTypePicker`, `PhysicalAttackForecastModal` components exist as v1 implementations. They mostly cover tasks 2.x + 4.1, 4.4-4.5, 5.1-5.2, 5.4, 6.x.
- Smoke tests live in `src/components/gameplay/__tests__/addPhysicalAttackPhaseUI.smoke.test.tsx` and cover tasks 10.1-10.3 + 10.5.
- `IPhysicalAttackOption` does NOT yet exist — we need to create it as the UI-facing projection (spec ADDED requirement).
- `getEligiblePhysicalAttacks` does NOT yet exist.
- `isPhysicalAttackPhase` selector does NOT yet exist on the gameplay store.
- `ActionBar.tsx` does not need changes — the sub-panel switching is done in `CombatPlanningPanel`/`PhysicalAttackPanel`, which are the phase-gated surfaces.
- Intent arrow overlay components do NOT yet exist.

## Conventions observed

- Component-level `data-testid` with kebab-case: `physical-attack-row-${type}`, `physical-attack-button-${type}`.
- Stores use Zustand via `create`. Minimal-slice selectors: `useGameplayStore((s) => s.field)` to avoid re-renders.
- Tailwind utility classes with theme tokens: `bg-surface-base`, `text-text-theme-primary`, `border-gray-200`.
- Tests use `@testing-library/react` + `jest-dom`. Per-change smoke test pattern with `addXxxxxx.smoke.test.tsx` naming.
- File headers include a block comment describing the change + a `@spec openspec/changes/<change-name>/...` tag.
- Prefer named exports; modules also expose `export default`.

## Type references

- `IPhysicalAttackInput`, `PhysicalAttackType`, `PhysicalAttackLimb`, `IPhysicalToHitResult`, `IPhysicalDamageResult`, `IPhysicalAttackRestriction` all live in `src/utils/gameplay/physicalAttacks/types.ts`.
- `IUnitGameState`, `IComponentDamageState`, `GamePhase`, `IHexCoordinate`, `GameEventType`, `IPhysicalAttackDeclaredPayload` live in `src/types/gameplay/*`.
