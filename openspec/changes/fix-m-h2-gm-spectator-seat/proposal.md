# M-H2 GM spectator seat

## Why

A co-op campaign seats its GM host in a `kind: 'spectator'` seat, and match
membership is derived from owned seats. The Wave 2 detach (#3040) released any
spectator seat when its holder's last socket dropped, so a GM who disconnected
from an active match lost its seat and its membership and could not bind again.
In a lobby the roster masked it. The same rule would also have been applied by a
boot sweep of spectator seats.

## What Changes

- One shared predicate in `lobby/spectatorSeats.ts`,
  `isAutoReleasableSpectatorSeat` / `holdsAutoReleasableSpectatorSeat`: a spectator
  seat held by `meta.hostPlayerId` is the GM's seat and automatic cleanup does not
  release it while the match is live.
- It applies to automatic cleanup only (the last-socket detach, and later the boot
  sweep). It grants no general immortality: a completed match releases the GM's
  seat like any other, the seat primitives (`removeSpectatorSeat`) are unchanged,
  and explicit close (`DELETE`, `closeMatch`) ends the match rather than editing
  seats.
- `ServerMatchHost.handleSocketDropped` releases only what the predicate allows. A
  GM drop then follows the normal host path, where migration is refused for a
  campaign GM.
- A test pins the assumption the rule rests on: a normal host holds a playing
  seat, a host holds a spectator seat only when it asks for one, and a player with
  a playing seat cannot register as a viewer.

## Impact

Authoritative multiplayer server detach path only. No SQLite DDL, no wire change,
no persisted shape change, and no change to co-op mission creation or launch.

## Non-goals

The boot sweep and the spectator client's re-registration (the next change), and
`pruneExpiredMatches`.
