## Why

The standalone simulation runner and the event reducer reset per-turn unit state through different code, and PR 1 of C7 pinned where they disagree. Four of those disagreements are plain deviations from pinned MegaMek 48fcb2f64 and move no committed value, so this change fixes them.

## What Changes

- **D1, per-phase damage.** The runner zeroes `damageThisPhase` as the Weapon Attack, Physical Attack and Heat phases begin, as MegaMek `TWGameManager.resetEntityPhase` does (TWGameManager.java:1572-1573) and as the reducer already does on every `PhaseChanged`. The 20+ damage PSR reads it per phase (:17850-17856), so Movement mine damage no longer pools with weapon damage.
- **Physical damage.** Runner physical-attack damage increments `damageThisPhase`, as the reducer's `PhysicalAttackResolved` handler already does.
- **D2, EMP interference.** The runner decrements a carried `empInterferenceTurns` at each turn reset, as `Entity.newRound` does (`empInterferenceRounds--`).
- **Heat-shutdown PSR.** The runner rolls queued PSRs after the Heat phase, so the shutdown PSR gets a `PSRResolved` instead of being dropped by the next turn reset.
- **D8, bare TurnStarted.** The reducer's `TurnStarted` handler zeroes `damageThisPhase`. A runner log carries `TurnStarted` but no `PhaseChanged`.

## Not changed

- **D5, turn-1 reset (declined).** MegaMek runs `Entity.newRound` before round 1 (`resetEntityRound` on every INITIATIVE phase, TWPhasePreparationManager.java:77-84). The reducer first resets at turn 2. Making it reset at `GameStarted` moves three committed post-state digest locks (`commandDigestLock`, `decideCommandBatch`, `journalAuthorityPath`), and a guarded variant needs a hand-kept list of seeded fields. Declined as not worth it; see tasks.md.
- Spotting, cargo and the replay-fidelity gaps below are not changed.

## Impact

Affected capabilities: simulation-system, game-state-management. No event fields, payload schemas or persisted field names change. Runner quick-sim outcomes can differ from before for units that take mine damage, physical damage or heat shutdown; no committed replay, digest or golden moves. Any such move is a STOP for Root; do not regenerate.
