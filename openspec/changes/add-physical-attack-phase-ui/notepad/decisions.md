# Decisions — add-physical-attack-phase-ui

## 2026-04-23 — IPhysicalAttackOption shape

Because the spec ADDED requirement demands `{attackType, limb?, toHit, damage, selfRisk, restrictionsFailed: string[]}`, we introduce `IPhysicalAttackOption` in `src/utils/gameplay/physicalAttacks/types.ts` with:

```ts
export interface IPhysicalAttackOption {
  readonly attackType: PhysicalAttackType;
  readonly limb?: PhysicalAttackLimb;
  readonly toHit: IPhysicalToHitResult;
  readonly damage: IPhysicalDamageResult;
  readonly selfRisk: IPhysicalAttackSelfRisk;
  readonly restrictionsFailed: readonly string[];
}

export interface IPhysicalAttackSelfRisk {
  readonly damageToAttacker: number;
  readonly legDamagePerLeg: number;
  readonly pilotingSkillRoll: { trigger: string; required: boolean } | null;
  readonly onMiss: 'AttackerFalls' | 'None' | null;
}
```

`restrictionsFailed` is `readonly string[]` (the `reasonCode`s from the restriction validators), matching the spec scenario `restrictionsFailed: ["WeaponFiredThisTurn"]`.

## 2026-04-23 — getEligiblePhysicalAttacks lives alongside restrictions.ts

A new module `src/utils/gameplay/physicalAttacks/eligibility.ts` houses `getEligiblePhysicalAttacks(attacker, target, context)`. It consumes `IUnitGameState` for attacker + target (the spec uses `IUnitGameState`) plus an optional `IEligibilityContext` (tonnages, weapons fired per arm, etc.) since `IUnitGameState` alone doesn't carry tonnage/piloting (those live on `IGameUnit`). Keeping context on the caller matches `declarePhysicalAttack`'s existing signature.

## 2026-04-23 — Adjacency detection uses hexDistance

`getEligiblePhysicalAttacks` computes `hexDistance(attacker.position, target.position)`; non-adjacent (> 1) returns empty list per spec scenario "Non-adjacent target returns empty list".

## 2026-04-23 — Intent arrows: SVG overlay rendered by HexMapDisplay

Map overlays `PhysicalAttackIntentArrow` lives in a new `overlays/` subfolder under `src/components/gameplay/`. Rendered as an absolute-positioned SVG `<polyline>` / `<path>` within the map viewport. Colors use the existing side-color tokens; dashed pattern for DFA, solid for charge, ghost hex for push.

## 2026-04-23 — isPhysicalAttackPhase selector

Added as a standalone exported function in `src/stores/useGameplayStore.ts` alongside `useSelectedUnit`. Non-blocking: derives from `session?.currentState.phase === GamePhase.PhysicalAttack`. Since the orchestrator brief said to avoid editing `useGameplayStore.ts` where possible, we add the selector in `useGameplayStore.combatFlows.ts` (which already holds combat-flow hooks) or as a freestanding helper.

Final choice: freestanding named export in `useGameplayStore.combatFlows.ts` because that's where phase-scoped combat flow hooks live (`usePhysicalAttackPlanStore` is already here).
