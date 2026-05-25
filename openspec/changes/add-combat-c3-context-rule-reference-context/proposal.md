# Add Combat C3 Context Rule Reference Context

## Why

Combat hover tooltips already explain when C3 spotting improves the displayed
effective range band and target number. The shared combat projection carries
MegaMek-backed combat rule references, and the C3 to-hit modifier row already
uses that evidence, but the C3 context row itself still exposes only local
spotter metadata. A player, test, or accessibility inspector should be able to
inspect the C3 range-benefit row and connect it to the same shared projection
evidence that drives the target range and to-hit projection.

## What Changes

- Pass the shared tactical projection into combat C3 context rows.
- Expose combat-channel source and rule-reference metadata on the C3 context
  row.
- Preserve the existing C3 spotter, spotter range, effective range, visible
  label, and attack behavior.

## Out Of Scope

- Recalculating C3 network membership, spotter choice, effective range, target
  numbers, or modifier values.
- Changing combat preview, attack validation, or committed attack resolution.
- Adding new C3 rules.
