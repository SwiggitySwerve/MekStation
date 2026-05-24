# Surface Underwater Weapon Environment Context

## Why

Represented underwater and torpedo attack legality is already computed in the
shared combat projection and aligned with committed attacks. The current hover
text can show a generic per-weapon "environment blocked" label, but the map
should make the exact water/torpedo rule reason easy to inspect from the
battlefield surface.

## What Changes

- Add combat hover context rows for per-weapon environment restrictions.
- Expose stable machine-readable metadata for environment-blocked weapon ids and
  reasons.
- Cover non-torpedo underwater target blocking and torpedo path-leaves-water
  blocking in focused map hover tests.

## Out Of Scope

- Changing underwater/torpedo legality rules.
- Adding unrepresented underwater elevation envelopes or new weapon import
  behavior.
