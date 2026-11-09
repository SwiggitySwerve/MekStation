# M-H2 GM spectator seat

## Why

A co-op campaign seats its GM host in a `kind: 'spectator'` seat, and match
membership is derived from owned seats. The Wave 2 detach (#3040) released any
spectator seat when its holder's last socket dropped, so a GM who disconnected
from an active match lost its seat and its membership and could not bind again.
In a lobby the roster masked it. The same rule would also have been applied by a
boot sweep of spectator seats.

## What Changes

- One shared predicate in `lobby/spectatorSeats.ts`, `isViewerRegistrationSeat` /
  `isViewerRegistration`: a spectator seat held by `meta.hostPlayerId` is the GM's
  seat, never a viewer registration.
- `ServerMatchHost.handleSocketDropped` releases only viewer registrations. A GM
  drop then follows the normal host path, where migration is refused for a
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
