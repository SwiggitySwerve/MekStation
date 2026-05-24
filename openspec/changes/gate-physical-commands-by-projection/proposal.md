# Gate Physical Commands By Projection

## Why

Physical attack previews already surface rules-backed restriction reasons for
blocked punch, kick, charge, DFA, and melee-weapon rows. The command dock should
consume that same projection so players do not see a blocked physical preview
while the matching commit button remains available.

## What Changes

- Add a shared physical attack option projection to tactical command context.
- Disable matching physical commands when the projected attack row is blocked.
- Pass action-dock physical preview inputs into command availability so the
  disabled reason matches the preview reason.

## Impact

- UI command availability and disabled reasons only.
- No changes to physical attack eligibility, to-hit, damage, self-risk, or
  commit validation rules.
