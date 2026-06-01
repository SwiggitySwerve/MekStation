# Track Runtime Vehicle Critical Equipment State

## Why

Vehicle critical availability now imports represented target weapon mount facts
at session setup, but committed critical results can change those facts during a
match. MegaMek falls through future critical entries after a weapon has already
been destroyed or jammed and after a stabilizer has already been hit. MekStation
needs the same event-sourced reduction for the represented target state it
already knows, while preserving optimistic behavior when weapon counts are
unknown.

## What Changes

- Store represented vehicle critical outcomes by struck location in derived
  component damage state.
- Carry target weapon availability counts alongside the existing availability
  location lists when adapted vehicle mounts are known.
- Reduce jammable and destroyable weapon availability by prior represented
  weapon-jam / weapon-destroyed criticals when counts are known.
- Use prior represented stabilizer and flight-stabilizer criticals to fall
  through later stabilizer entries.
- Keep unknown counts optimistic instead of inferring that all weapons at a
  location are gone.

## Out Of Scope

- Cargo/passenger import parity for `cargo_hit`.
- Dual-turret split identity beyond the current generic turret location.
- External MegaMek differential sweeps across all vehicle equipment states.
