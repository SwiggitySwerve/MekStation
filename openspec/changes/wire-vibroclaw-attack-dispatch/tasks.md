# Tasks: wire-vibroclaw-attack-dispatch

## 1. Dispatch wiring (engine)

- [ ] 1.1 Read the PR-L3 `LegAttack` dispatch path end-to-end (declaration action id → interactive-session command → `baCombat` dispatch → damage events) as the shape to mirror
- [ ] 1.2 Wire `resolveVibroClawAttack` into the battle-armor physical-attack dispatch in `src/lib/combat/baCombat.ts`, keyed off the squad's `vibroClaws ≥ 1` and adjacency; update the stale "§7 deferred to PR-L4" doc comment
- [ ] 1.3 Add the interactive declaration path (action id + engine command + availability legality: adjacency, squad alive, `vibroClaws ≥ 1`), mirroring the leg-attack declaration
- [ ] 1.4 Dispatch-level tests: declaration → resolution → `DamageApplied` events with cluster-table damage matching the resolver's own unit-test expectations; illegal-declaration rejections (non-adjacent, zero claws)

## 2. UI gating (tactical surface)

- [ ] 2.1 Expose the vibroclaw command on the physical-attack surface, gated so it does not render when the active squad's `vibroClaws === 0` (equipment-reality pattern from MASC/Supercharger gating; context flag + builder filter)
- [ ] 2.2 UI test: command present for a 2-claw squad, absent for a 0-claw squad

## 3. Verification battery

- [ ] 3.1 Full battle-armor suites (`src/utils/gameplay/battlearmor`, `src/lib/combat`), physical-attack suites, dock command tests
- [ ] 3.2 MegaMek parity spot-check: damage values for 4-trooper/2-claw and degraded-squad cases against the resolver's canonical table
- [ ] 3.3 `openspec validate --strict`; evidence capture for command-screen regressions
