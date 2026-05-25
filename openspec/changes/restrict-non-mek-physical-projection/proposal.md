# Restrict Non-Mek Physical Projection

## Why

The tactical map and command dock consume `getEligiblePhysicalAttacks` to decide
which adjacent enemy tokens can be selected during the Physical Attack phase.
That projection must not turn Battle Armor or other non-mek units into ordinary
Mek physical attackers. MegaMek keeps standard punch and kick actions Mek-only,
and Battle Armor anti-mek attacks route through dedicated LegAttack, SwarmAttack,
and Vibroclaw actions instead.

## What Changes

- Block generic punch, kick, DFA, and mech-melee weapon projection rows for
  represented non-mek attackers.
- Preserve disabled projection rows with `AttackerNotMek` so command surfaces
  can explain why the action is unavailable.
- Add focused projection coverage proving Battle Armor no longer creates a
  generic physical target highlight from punch/kick/DFA rows.

## Impact

- Physical Attack phase projection and command availability only.
- No damage, to-hit math, movement, or Battle Armor-specific handler changes.
