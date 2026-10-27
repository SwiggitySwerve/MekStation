## Why

Construction validation does not warn about weapons without ammunition, and equipment year filters ignore extinction and reintroduction.

## What Changes

- Add one non-blocking warning per weapon definition requiring external ammunition when the loadout has no positive-weight compatible ammunition.
- Reuse the ammunition compatibility owner and Equipment category navigation.
- Use one temporal predicate throughout equipment year filtering and preserve temporal metadata through catalog conversion.
- Record missing source dates rather than inventing dates or hand-editing generated catalogs.
- Resolve MegaMek internal ammunition names through the equipment registry's ammunition aliases, preserving bin size and munition variants, and recover critical-slot bins without duplicating serialized ammunition.

## Impact

Affected capabilities: unit-validation-framework, era-temporal-system, equipment-database, equipment-services, unit-services. No save behavior or construction legality changes. Other workers own the customizer presentation.
