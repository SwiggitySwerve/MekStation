# Disable non-event GM corrections temporarily

## Why

A real seeded InteractiveSession reproduced player heat 0 -> 17 -> 0 on the next advancePhase, before Heat resolution: applyCorrectedState emits no event and the next event fold discards the edit. Coordinator 4 confirmed this on origin/main 33f30fb35a46844148aacb8da43b7a14d102a2e6; see `arch-findings-c4/02-gm-correction-loss.md` in the coordinator audit workspace. Root approved this interim.

## What Changes

Disable Set Position/Facing, Set Damage, Set Heat/Ammo, Set Initiative, Mark Rescued and Set Objective in the tactical GM dock with a visible explanation. Block previews and programmatic approval, including stale ready previews and unrecognized IDs. Keep Advance Phase and existing authority/freshness checks; retain deferred command reasons.

Affected canonical contract: [GM tactical command surface](../../specs/gm-tactical-command-surface/spec.md).

## Impact

The intervention adapter owns the support decision; the dock and tactical surface consume it. No InteractiveSession, event schema, multiplayer, ledger implementation, persisted format or replay fixture changes.

## D-8 R10 follow-up

D-8 R10 must introduce approved correction events with replay and privacy contracts before these controls return. The research receipt is `arch-findings-c4/02-gm-correction-loss.md`, section "R10 first: approved effects must become events", alongside `d8-fidelity/PROPOSAL.md` row R10 in the coordinator audit workspace. This interim does not implement R10.

## Caller coverage

| Entry | Effect |
| --- | --- |
| Local/hot-seat tactical GM dock and approval surface | Six controls and direct/stale approvals blocked; Advance Phase preserved |
| Interactive actions and AI | No adapter change; later event actions remain authoritative |
| GameEngine phases/runToCompletion, QuickResolve, quick game, pre-battle auto-resolve, campaign fast-forward | No tactical correction entry; unchanged |
| Multiplayer dispatch, journal authority, guest mirror/recovery | No production tactical correction intent; unchanged |
| P2P translation and standalone SimulationRunner | Do not consume this GM correction API; unchanged |

## Test-first proof

Each control is disabled, described and visibly explained; mouse/keyboard cannot invoke preview. All six direct and stale-ready approvals return blocked without state, setter, ledger or session writes. Unknown previews refuse. Advance Phase still calls the event-backed engine method and advances. Kill UI re-enable and approval-recheck mutants. Run lane gates without regenerating fixtures.
