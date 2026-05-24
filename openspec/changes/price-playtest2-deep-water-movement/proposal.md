# Price Playtest2 Deep-Water Movement

## Why

MegaMek's Playtest2 water branch prices non-exempt depth-2+ water at +2 MP
instead of the standard +3 MP. MekStation already carries optional rule keys
through movement projection and commit validation, but deep-water MP currently
stays at the standard cost.

## What

- Apply the represented `playtest_2` optional rule to non-exempt deep-water
  movement cost projection.
- Keep depth-1 water, amphibious, frogman, hover, VTOL, WiGE, naval, swim, and
  UMU exemptions unchanged.
- Add preview-to-commit agreement coverage so reachable highlights match
  committed movement resolution.

## Impact

Maps with the Playtest2 optional rule can highlight depth-2+ water destinations
as reachable one MP earlier, while standard-rule games keep the existing +3 MP
deep-water surcharge.
