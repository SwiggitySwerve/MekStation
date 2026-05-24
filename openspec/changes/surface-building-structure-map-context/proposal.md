# Surface Building Structure Map Context

## Why

The tactical map spec already requires building construction factor to be shown when available. Building id now reaches map context, and terrain/elevation source detail includes level and CF, but hover/action context still only displays the id. Players need the represented building height/CF alongside the identity when judging cover, LOS, and physical attack context.

## What Changes

- Expose building levels and construction factors on rendered hex metadata when building terrain carries them.
- Show building level and CF in terrain hover and action hover terrain context.
- Keep projection legality untouched; this is display and inspection metadata only.

## Out of Scope

- Deriving construction factor when terrain data does not provide it.
- Changing building terrain generation or physical attack validation.
