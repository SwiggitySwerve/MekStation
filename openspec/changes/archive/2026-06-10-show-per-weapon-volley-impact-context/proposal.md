# Show Per-Weapon Volley Impact Context

## Why

The map already exposes aggregate volley heat, damage, and ammo impact, but players need to see which weapons contribute those numbers. The tactical map audit still calls per-weapon volley display a remaining weapon-range/attack-preview gap.

## What Changes

- Add per-weapon impact details to combat hover and combined tactical hover context.
- Expose machine-readable weapon ids, names, heat, damage, ammo consumed, and post-shot ammo remaining for the projected available volley.
- Reuse the existing combat projection's `availableWeaponImpacts`; do not calculate legality or impact locally in UI.

## Out of Scope

- Changing weapon selection, attack commitment, to-hit calculation, or damage resolution.
- Adding per-weapon hit probability or cluster resolution.
