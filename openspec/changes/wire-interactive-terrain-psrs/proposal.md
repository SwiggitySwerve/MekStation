## Why

Only the standalone simulation runner produces movement terrain PSRs (swamp
bog-down, rubble, water entry and exit, ice, skid, building collapse).
Interactive sessions, the AI, `GameEngine` autonomous phases and
`runToCompletion`, the multiplayer server and P2P never queue one. No unit can
bog down or fall to terrain in live, multiplayer or auto-resolved play, and the
C6b movement-start recovery roll exists only in the runner.

`runToCompletion` (QuickResolve, quick game, pre-battle auto-resolve, campaign
fast-forward) also never drains the PSR queue, so every PSR it queues is
dropped at the next turn boundary.

## What Changes

Five sequential PRs.

1. Extract one shared producer, with no behaviour change:
   `planMovementTerrainEffects` (`utils/gameplay/movement/terrainPsrTriggers`)
   and the recovery helpers (`utils/gameplay/movement/stuckRecovery`). The
   runner keeps thin adapters that emit byte-identical events.
2. Gate the fall-producing terrain PSRs (water, rubble, skid, ice) on the
   MegaMek `Mek.canFall` rule: a BattleMech-like unit that is not prone. Water
   entry also excludes hover, naval, UMU, VTOL, WiGE and swim movement modes.
3. Wire the shared producer into every interactive movement commit path
   (session, AI, `GameEngine` movement, P2P host translation). Queued PSRs
   resolve in the existing End-phase drain. A failed ground bog-down grants
   jump eligibility exactly as in the runner. Interactive events stamp
   `movement-step:<n>` from the canonical decomposition of the declared path;
   `MovementDeclared` payloads are unchanged.
4. Roll the movement-start recovery for stuck units in the session and engine
   paths, from the shared helpers.
5. Drain pending PSRs at the End phase of `runToCompletion`.

## Impact

Affected capability: piloting-skill-rolls.

Replay and schemas: no schema-pack, payload or persisted-format change. Every
event type and field used already exists (`swamp_unstuck` and
`UnitStuck.canUnstickByJumping` since C6b). Old journals contain no terrain
PSRs and replay never runs producers, so they replay identically. New journals
carry the resolved rolls.

Seeded runs: PRs 1 to 4 change no committed fixture or digest (full-suite
probe, 2026-11-08). PR 5 changes the committed C4 auto-resolve digest and the
outcomes of seeded auto-resolve suites that queue PSRs; Root approved that as
a deliberate rule change for PR 5 only.

Rules: MegaMek 48fcb2f64. `Entity.checkWaterMove` (L9615-L9675),
`checkRubbleMove` (L9539-L9572), `checkBogDown` (L9574-L9612), `checkSkid`
(L9459-L9535), `checkRecklessMove` (L9241-L9290), `Mek.canFall`
(L2154-L2156), `MovePathHandler` bog-down (L3904-L3949) and jump entry
(L1669-L1673), `TWGameManager.doTryUnstuck` (L31368-L31419).

## Non-goals

Recorded as separate parity items:

- Terrain rule fixes: exiting water and running through rough terrain have no
  MegaMek basis; water entry should roll on every water hex entered; ice should
  follow reckless-movement semantics; ultra-rubble is +1.
- Per-step immediate PSR resolution with move truncation (MegaMek
  `doSkillCheckWhileMoving`); both paths keep queue-then-resolve.
- Vehicle terrain outcomes (motive damage, vehicle bog-down).
- Interactive damage, control and enhancement movement PSRs (damaged hip or
  gyro, sideslip, flanking-and-turning, MASC and Supercharger failure).
