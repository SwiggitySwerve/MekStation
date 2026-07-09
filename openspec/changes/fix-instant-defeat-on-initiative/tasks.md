## 1. Root-cause investigation (D1 — no edits until cause pinned)

- [x] 1.1 Headless repro: script or test that builds a fresh campaign 4v4 exactly as the battle page does (materialize → launch snapshot → InteractiveSession via preBattleSessionBuilder path), dumps each unit's armor/structure/heat at session start, advances Initiative once, and captures the outcome-decision inputs. Write findings (failing values + producing file:line) to notes/root-cause.md in this change folder.
- [x] 1.2 Diff-confirm the regression window: verify the identified producer changed in iteration-3 rounds 2-3b (or name the actual culprit commit) — one paragraph in notes/.

## 2. Fix at the producer (D2)

- [x] 2.1 Implement the root fix per the investigation (candidate surfaces: preBattleSessionBuilder unit stat sourcing, force/assignment stat adapter, ForceRepository.helpers/.server.ts resolution, or GameOutcomeCalculator predicate if H2). No outcome-calculator masking of zero-HP-at-start data.
- [x] 2.2 Red-green: add the launch-integrity test (D3) BEFORE the fix lands in the same wave, observe it fail against the bug, then pass with the fix. Test asserts: post-launch all units armor>0 and structure>0 matching canonical; after one Initiative advance phase==Movement, 8 alive, no terminal outcome.
- [x] 2.3 Table test on the outcome predicate over alive/partially-destroyed/fully-destroyed force shapes (guards H2 regardless of root cause).

## 3. Verification

- [x] 3.1 `npm run typecheck && npm run lint` clean; touched suites + full `npm run test:stable` once; quick-game/1v1 paths unregressed.
- [x] 3.2 Live smoke (orchestrator): fresh campaign 4v4 → Roll Initiative & Begin → Movement phase with 8 living units → move+lock → End Phase into WeaponAttack without terminal outcome; screenshots to evidence. (Skipped by worker.)
- [x] 3.3 Journey evidence: `npm run qc:ux-audit:deep -- e2e/ux-deep-play-audit.spec.ts` deep run — journey 08 must not record a new instant-defeat finding.
