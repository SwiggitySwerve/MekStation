# Add Combat Environment Context Rule Reference Context

## Why

Combat hover tooltips already explain represented environment restrictions such
as non-torpedo weapons firing at underwater targets or torpedo paths leaving
water. The shared combat projection carries MegaMek-backed combat rule
references, but the environment context row exposes only local blocked weapon
ids and reasons. A player, test, or accessibility inspector should be able to
connect those environment explanations to the same shared projection evidence
that drives weapon availability and target legality.

## What Changes

- Pass the shared tactical projection into combat environment context rows.
- Expose combat-channel source and rule-reference metadata on environment
  context rows.
- Add a browser harness scenario for underwater environment restrictions so the
  source-pinned row is covered outside JSDOM.

## Out Of Scope

- Recalculating underwater, torpedo, range, arc, LOS, or target legality.
- Changing combat preview, attack validation, or committed attack resolution.
- Adding new environment attack rules.
