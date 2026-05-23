# Playtest Notes: Indirect Fire and Spotter Network

Date: 2026-05-23

## Scope

These notes cover archive-readiness checks for the indirect-fire slices that landed under this change:

- Per-weapon Direct/Indirect mode selection.
- Replay/event-log persistence for `AttackDeclared.weaponAttacks[].mode`.
- Forward Observer and NARC/iNarc explanation paths in map/combat projections.

## Automated Evidence

- UI mode toggle and commit threading:
  - `src/components/gameplay/__tests__/addAttackPhaseUI.smoke.test.tsx`
  - `src/stores/__tests__/useGameplayStore.combatFlows.test.ts`
- Replay mode persistence:
  - `src/utils/gameplay/__tests__/gameEvents.test.ts`
- Engine dispatch, FO, NARC/iNarc, and spotter events:
  - `src/engine/__tests__/InteractiveSession.indirectFire.test.ts`
  - `src/engine/__tests__/InteractiveSession.indirectFire.scenario.test.ts`
  - `src/engine/__tests__/InteractiveSession.attackProjectionAgreement.scenario.test.ts`
  - `src/utils/gameplay/__tests__/declareAttack.indirectFire.test.ts`
  - `src/utils/gameplay/__tests__/indirectFire.fo.test.ts`
  - `src/utils/gameplay/__tests__/indirectFire.narc.test.ts`
  - `src/utils/gameplay/__tests__/resolveAttack.spotterLost.test.ts`

## Manual Playtest Checklist

1. In WeaponAttack phase, select an LRM-family weapon and toggle `Indirect`. The weapon row should show the selected mode, the attack declaration should carry `mode: 'Indirect'`, and the indirect-fire preview should agree with the committed attack.
2. Attempt to toggle `Indirect` on a direct-fire weapon such as AC/20 or Medium Laser. The UI should show the validation message and the engine should still resolve the weapon as `Direct` if the request bypasses UI state.
3. Complete an indirect LRM attack, persist/reload a replay, and inspect the replay event payload. `AttackDeclared.weaponAttacks[].mode` should still contain the mixed Direct/Indirect modes.
4. Use a walking spotter with the Forward Observer SPA. The map/combat explanation should show the FO cancellation path and the committed to-hit penalty should remain base indirect only.
5. Use a NARC/iNarc-marked target without a LOS spotter. The map/combat explanation should identify the beacon basis and the committed event log should emit `IndirectFireNarcOverride`.
6. Have an elected spotter fire a later direct attack in the same turn. The declared attack should include `Spotting for indirect fire +1`.

## Notes

- This docs slice did not run a live browser/manual playthrough; it records the manual checklist and the automated evidence currently covering each behavior.
- Arrow IV, artillery scatter/deviation, counter-battery fire, and aerospace artillery remain out of scope for this change and are tracked in `_followups.md`.
