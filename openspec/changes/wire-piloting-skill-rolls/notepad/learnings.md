# Learnings — wire-piloting-skill-rolls

## Infrastructure already in place (pre-existing on main post-#340)
- `src/utils/gameplay/pilotingSkillRolls.ts` + `pilotingSkillRolls/` module
- `src/utils/gameplay/fallMechanics.ts` with `resolveFall`
- `src/utils/gameplay/gameSessionPSR.ts` — `checkAndQueueDamagePSRs`, `resolvePendingPSRs`, `attemptStandUp`
- Events: `PSRTriggered`, `PSRResolved`, `UnitFell`, `UnitStood`, `PilotHit` (UPPERCASE PSR casing)
- `psrQueue` / `pendingPSRs` exists on `IUnitGameState`
- Seeded `D6Roller` / `DiceRoller` threaded through

## Conventions
- Event enum uses UPPERCASE `PSR` (PSRTriggered / PSRResolved), NOT `Psr`
- Windows husky: commit with `--no-verify`; run `sh .husky/pre-commit` manually
- Format: `npx oxfmt --write <files>` before commit

## Key integration gaps (audit findings)
1. **`GameEngine.phases.ts` `runInteractivePhaseAdvance` never calls `checkAndQueueDamagePSRs` or `resolvePendingPSRs`** — End phase just advances.
2. **`InteractiveSession.advancePhase` never calls them either** — End phase only checks gameover.
3. **`applyPhaseChanged` does NOT clear `pendingPSRs`** (task 1.3) — only clears `damageThisPhase`.
4. **Simulation runner has `runPSRPhase` (post-combat phase)** — this already works correctly on that path.
5. **`createDamagePSR` is called in `weaponAttack.ts` and `physicalAttack.ts` (sim runner only)** — not wired to interactive weapon/physical phases.
6. **`IPSRTriggeredPayload` reducer** (`applyPSRTriggered`) correctly pushes onto `pendingPSRs` — the event-level contract is sound.
7. **Head-breach pilot damage** — no code currently reacts to a LocationDestroyed for head by applying pilot damage + PSR.
8. **Stand MP cost (9.1)** — `attemptStandUp` helper does not deduct MP.
9. **Queue-clear-on-fall for same-phase same-unit (resolve.ts `resolveAllPSRs`)** already handles this via `clearedPSRs`.
