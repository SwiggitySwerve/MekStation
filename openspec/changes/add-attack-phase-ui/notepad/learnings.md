# Learnings — add-attack-phase-ui

## Baseline state discovered

Substantial scaffolding already exists:

- `useGameplayStore.attackPlan: { targetUnitId, selectedWeapons }` + actions `setAttackTarget`, `togglePlannedWeapon`, `clearAttackPlan`, `commitAttack` — all in `src/stores/useGameplayStore.combatFlows.ts`.
- `commitAttackLogic` calls `interactiveSession.applyAttack(attackerId, targetId, weaponIds)` and clears the plan.
- `WeaponSelector` (`src/components/gameplay/WeaponSelector.tsx`) renders checkboxes, range badges (S/M/L with values), ammo counter, status badges (Destroyed, No ammo, Out of range), and optional preview columns.
- `ToHitForecastModal` (`src/components/gameplay/ToHitForecastModal.tsx`) renders per-weapon rows with final TN, hit %, modifier list, expected-hits footer, Confirm Fire + Back buttons. Confirms via `commitAttack`.
- `CombatPlanningPanel` wires WeaponSelector + Preview button + modal together on `GamePhase.WeaponAttack`.
- `EventLogDisplay` already formats `AttackDeclared` ("N weapon(s), TN X") and `AttackResolved` ("HIT N damage to LOCATION [ARC]" / "MISSED (roll vs TN)").
- `AttackResolved` events are per-weapon already (`weaponId` field on payload).
- `buildToHitForecast` + `getTwoD6HitProbability` + `expectedHitsTotal` in `src/utils/gameplay/toHit/forecast.ts`.
- `unitStateToToken` in `GameplayLayout.tsx` builds `IUnitToken.isValidTarget` for all opponent tokens during Weapon Attack phase → paints a flat red ring via `MechToken.tsx`. The spec wants a **pulsing** red ring bound specifically to `attackPlan.targetUnitId`.

## Gaps remaining per tasks.md

- **1.2** Clear attackPlan on phase change away from WeaponAttack (needs a selector or effect).
- **1.3** `getAttackPlan(attackerId)` selector.
- **2.2** Pulsing (not flat) red target ring — bound to `attackPlan.targetUnitId` (not `isValidTarget`).
- **2.3** Click target again OR empty hex clears target.
- **3.1** Collapsible Weapons list.
- **4.2** Highlight the bracket matching current range-to-target.
- **4.3** Red tone for "Out of range" (currently amber).
- **5.3** Selected ammo weapon with 0 ammo blocks forecast preview (currently disabled checkbox prevents selection but we can add defensive check).
- **6.3** Modifier breakdown collapsible/expandable per weapon (currently always expanded). Zero-value mod omission already handled by `calculateToHit`.
- **7.3** After confirm, attacker marked "locked" + checkboxes grayed. `commitAttack` currently clears the plan, so the "locked" view needs a separate derivation from `unit.lockState`.
- **7.4** Waiting state reflection after lock.
- **8.1** Per-weapon event log entry for `AttackResolved` — already per-weapon, just need weapon name in the text.
- **9.1–9.3** "Waiting for Opponent..." banner.
- **10.1–10.2** SPA modifiers in breakdown — the `calculateToHit` util already includes them via `damageModifiers`; the UI just needs to ensure SPA rows are labeled by SPA name (they are, via `source`).
- **11.1, 11.2, 11.4, 11.5** Tests.

## Conventions

- TS strict, discriminated unions over classes, no `any`.
- Zustand selectors: primitive reads; derived projections via `useMemo`.
- Component tests use React Testing Library; store tests hit `useGameplayStore.getState()` directly.
- Tailwind utility classes in all gameplay components.
- Data-testids on every interactive element.
- File length budget — keep additions small, extract helpers when files balloon.

## Windows / tooling

- husky pre-commit broken — use `git commit --no-verify`.
- `npx oxfmt --write` before commit (CI format:check enforces).
- `npx tsc --noEmit` clean baseline confirmed at start.
