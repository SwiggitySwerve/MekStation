# Pin Isometric Rotation Occluder Handoff

## Why

Isometric readability depends on camera rotation changing which elevated hex is
in front of a unit. Existing tests prove an occluder can disappear when the
camera rotates away from it, but they do not pin the handoff case where a
different tall hex becomes the current occluder. That leaves room for stale
occlusion highlights or hover facts to survive a rotation.

## What Changes

- Add a focused component fixture with a unit between two tall building hexes.
- Assert the occluder highlight, token boost metadata, and hover explanation
  move from the first building to the opposite building after a 180-degree
  isometric rotation.
- Update the tactical map source matrix to record the stronger rotation
  coverage.

## Out Of Scope

- Changing isometric projection math or occlusion heuristics.
- Adding new browser visual coverage in this slice.
