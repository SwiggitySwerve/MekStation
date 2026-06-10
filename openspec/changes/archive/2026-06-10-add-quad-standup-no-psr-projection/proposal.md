# Add Quad Stand-Up No-PSR Projection

## Why

MegaMek treats an intact Quad Mek standing from prone as an automatic success:
the unit still spends stand-up MP, but it does not need a piloting skill roll
when all four legs are present and the gyro is intact. MekStation was projecting
and resolving every prone stand-up as PSR-required, which made the tactical map
overstate risk and made commit resolution roll dice for a case MegaMek waives.

## What Changes

- Carry a represented stand-up leg profile on movement capability data.
- Import ordinary Quad / Quad Omnimech configurations as quad stand-up profiles.
- Project intact quad stand-up as stand-up MP with no PSR, including a visible
  no-PSR reason on hex metadata, badges, tooltips, and tactical projection text.
- Keep damaged quad-leg cases on the normal stand-up PSR path.
- Align committed movement with preview by standing intact quads without
  emitting or rolling an AttemptStand PSR.

## Out Of Scope

- QuadVee conversion-mode stand-up behavior beyond existing conversion pins.
- New actuator-damage modeling for individual quad legs beyond represented
  destroyed-location state.
- General destroyed-gyro stand-up impossibility cleanup.
