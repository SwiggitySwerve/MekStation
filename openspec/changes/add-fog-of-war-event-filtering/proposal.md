# Change: Add Fog of War Event Filtering

## Why

**Sub-phase 4c.** Open-information play (both sides see everything) is
the easy default, but competitive multiplayer and double-blind scenario
play require each client to receive only what their own units can
perceive. BattleTech has canonical double-blind rules — units outside
sensor range / line-of-sight are hidden until detected. Because the
server already arbitrates every event in 4b, fog-of-war is a natural
extension: per-event, per-player visibility filtering in the broadcast
path. This change defines the visibility model, the filter rules, and
the minimal event schema so the server can redact or omit events that
a given player must not see.

## What Changes

- Introduce `fog-of-war` spec describing visibility rules:
  per-player LOS (line-of-sight) + sensor range per unit, derived from
  the existing `spatial-combat-system`
- Visibility evaluated once per event: for each connected client, the
  server computes `isVisible(event, player)` and redacts the payload
  (or skips the broadcast entirely) for hidden events
- Four visibility classes per event:
  - `public` — everyone sees (`PhaseChanged`, `GameEnded`, `match_
paused`, initiative-phase announcements without unit detail)
  - `actor-only` — only the controlling player sees (`MovementDeclared`
    by an enemy before it resolves visibly)
  - `observer-visible` — visible if any of the player's units has LOS
    to the target or the actor (`MovementLocked`, `AttackResolved`
    when target or shooter is in LOS)
  - `target-visible` — visible to the player who owns the target even
    when the shooter is not in LOS (damage taken is always known to
    the recipient; the shooter's identity may be redacted)
- Server emits a filtered event stream per client; each client sees a
  coherent narrative for their own side
- Fog-of-war is opt-in per match; `config.fogOfWar: boolean` defaults
  to `false` for backwards compatibility
- Existing sync flow still works without fog — the filter is a no-op
  when disabled

## Dependencies

- **Requires**: `add-multiplayer-server-infrastructure` (server +
  per-client broadcast), `add-authoritative-roll-arbitration` (rolls
  must be embedded so the client can render the visible portion of an
  event), `add-multiplayer-lobby-and-matchmaking-2-8` (side
  assignments), existing `spatial-combat-system` (LOS + range math)
- **Required By**: future advanced-scenarios changes (hidden units,
  recon scenarios, electronic warfare) and Phase 7 presentation
  polish

## Impact

- Affected specs: `fog-of-war` (ADDED — visibility model, event
  classes, filter contract), `multiplayer-server` (MODIFIED — per-
  client broadcast with visibility filter), `multiplayer-sync`
  (MODIFIED — redacted event shape), `spatial-combat-system`
  (MODIFIED — exposes `canPlayerSeeUnit(playerId, unitId, state)` as
  a shared helper)
- Affected code: new `src/server/multiplayer/fogOfWar.ts`, extension
  of `ServerMatchHost` broadcast to run the filter per connected
  client, extension of events with a `visibility` class discriminator,
  extension of `spatial-combat-system`'s line-of-sight helpers with a
  per-player aggregate `canPlayerSeeUnit`
- Non-goals: ECM / ECCM modelling beyond what `ecm-electronic-warfare`
  already defines, sensor-type nuances (active vs passive), stealth
  armor interactions (reuse existing rules), spectator fog
