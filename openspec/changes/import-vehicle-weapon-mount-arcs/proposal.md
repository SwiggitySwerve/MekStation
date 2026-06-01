# Proposal: Import Vehicle Weapon Mount Arcs

## Why

Vehicle and VTOL handlers preserve weapon mount metadata such as `equipmentId`,
location, turret, and sponson flags, but the combat adapter only consumed a
generic `id` field and a single optional firing arc. That can drop vehicle
weapons entirely or flatten multi-arc mounts before the tactical map projection
and committed attack validation see them.

## What Changes

- Read represented vehicle equipment IDs from `equipmentId` / `weaponId` /
  `id` / `name` in adapter order.
- Import represented vehicle mount arcs from front, left, right, rear, body,
  turret, secondary turret, and sponson metadata.
- Add multi-arc mount support for projection, attack planning, AI selection,
  and committed attack validation.
- Cover preview/commit agreement and top-down firing-arc overlay behavior for
  represented multi-arc mounts.

## Source Of Truth

MegaMek `Tank.getWeaponArc` (`Tank.java:1039-1103`) routes body/front, side,
rear, turret, and sponson vehicle mounts into firing arcs. MegaMek `Mounted`
(`Mounted.java:1462-1469`) exposes the sponson turret mount flag consumed by
that routing.
