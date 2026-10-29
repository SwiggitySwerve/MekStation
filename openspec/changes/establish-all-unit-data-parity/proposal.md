# Complete source-unit data parity before customizer expansion

## Why

The upstream cross-check of 2026-10-28
found incorrect serialized engine codes, lost construction subtypes, displaced
armor locations and disconnected canonical loading, editor and save paths.
Matching a displayed total can conceal compensating component errors.

The owner authorized using this cross-check to implement all source unit
families, with numerical differences strictly below 1% and correct subtype
layouts, skeletons and forms. Data readiness precedes UI expansion.

## What changes

- Inventory every pinned source definition, including MTF, BLK and BFS, without
  assuming that a directory identifies its construction family.
- Establish compatible, reproducible MegaMek/MegaMekLab loaded-entity references.
- Preserve exact source identity, subtype, locations and equipment semantics in
  existing types, import services, validators and persistence contracts.
- Publish a documented, versioned interchange contract suitable for independent
  modern applications, with legacy formats isolated behind compatibility adapters.
- Correct construction and BV calculations with per-unit, per-term comparisons.
- After data readiness, connect canonical load, edit, save, reload and print for
  each family, using the appropriate forms and location diagrams.

## Capabilities

### Modified capabilities

- `unit-services`: immutable source inventory and family-aware loading/persistence.
- `unit-entity-model`: lossless source semantics and construction-family identity.
  Portable document versions, schema validation and migration extend this owner.
- `mtf-parity-validation`: reference provenance, all-format coverage and round trips.
- `battle-value-system`: strict all-family numerical parity without weakening existing regression checks.
- `customizer-tabs`: subtype forms, diagrams and lifecycle integration after data readiness.
- `protomech-unit-system`: source-backed engine rating and consistent reactive movement fields.

## Impact and delivery

Extend the current conversion package, domain types, construction helpers, unit
services, stores, BV adapters and customizer registry. Domain owners retain rules;
components consume their results. Per-family rule changes receive focused deltas
and source citations before their implementation. Do not manufacture a parallel
unit schema or calculate business rules in rendering.

Deliver small, test-first PRs (15 files / 500 counted lines; existing support-code
exemptions apply). Consolidation precedes behavior changes with separate proof.
Each exact head requires Opus and GPT Sol review plus green applicable checks
before Root merges. Catalog regeneration still requires owner approval after a
concrete impact report is available.

## Non-goals

This change does not expand tactical gameplay support, replace MekStation's main
customizer form, or implement MekHQ campaign management. Preserve design/instance
identity boundaries; campaign journal work remains with its existing owners.

## Risks

Same-date upstream pins may not form a compatible build. Missing equipment or
unsupported entity classes can make apparently green reports vacuous. Legacy
data needs explicit migrations rather than silent subtype coercion. Numerical
parity and visual/interaction fidelity require different evidence.
