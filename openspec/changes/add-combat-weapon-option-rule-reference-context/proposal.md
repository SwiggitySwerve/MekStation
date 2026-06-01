# Add Combat Weapon Option Rule Reference Context

## Why

Combat hover tooltips already summarize each selected weapon's projected range
band, arc state, environment legality, availability, target number, expected
damage, and blocked reason. The aggregate combat hex now carries MegaMek-backed
rule-reference evidence, but the individual weapon option rows remain plain
text. A player, test, or accessibility inspector should be able to connect a
specific blocked or available weapon option directly to the shared combat
projection rule surface.

## What Changes

- Pass the shared tactical projection into combat weapon option rows.
- Expose combat-channel source and rule-reference metadata on the option row
  group.
- Render each weapon option as an inspectable row with the same combat-channel
  rule-reference metadata plus its existing range, arc, availability, and
  blocked-reason state.

## Out Of Scope

- Recalculating weapon range, firing arcs, LOS, target numbers, or availability.
- Changing attack command validation or committed attack resolution.
- Adding new combat rule coverage.
