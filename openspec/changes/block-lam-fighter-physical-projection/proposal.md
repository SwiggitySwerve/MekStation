# Block LAM Fighter Physical Projection

## Why

MegaMek marks LAM fighter mode as ineligible for normal Physical Attack phase
attacks; ramming is handled separately in the movement phase. MekStation already
threads runtime LAM conversion state into physical charge projection. The same
conversion state must suppress punch, kick, push, DFA, and melee-weapon rows so
the tactical map does not highlight impossible fighter-mode physical attacks.

## What Changes

- Add a shared LAM fighter-mode physical restriction for represented Mek
  physical attacks.
- Surface a typed `AttackerCannotUsePhysical` restriction reason for non-charge
  fighter-mode LAM rows.
- Keep charge's existing `AttackerCannotCharge` reason while making every
  non-charge physical row reject from the same runtime conversion state.

## Impact

- Physical Attack phase projection, forecast, and declaration validation only.
- No movement-phase LAM ramming, aerospace weapon fire, or charge damage changes.
