# Explain ECM-Nullified TAG Indirect Fire

## Why

The tactical map already keeps ECM-nullified semi-guided TAG shots aligned
between preview and commit, but the player-facing blocked reason is still a
generic line-of-sight explanation. That hides the actual tactical cause: the
target is TAG-designated, but ECM prevents that designation from enabling
semi-guided indirect fire.

## What Changes

- Surface a dedicated player-facing reason when ECM nullifies a TAG designation
  that would otherwise enable semi-guided indirect fire.
- Preserve the engine rejection code as `NoLineOfSight` while enriching the
  details with the unavailable indirect-fire cause.
- Expose the reason in combat projection data, browser attributes, invalid
  combat badges, accessible reason context, and committed attack-invalid
  events.

## Out Of Scope

- Changing whether TAG attacks themselves hit or miss.
- New ECM/ECCM radius computation.
- New homing artillery or laser-guided bomb targeting behavior.
