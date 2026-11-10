# Mech BV rule ownership

This package owns Mech BV calculation and the shared construction inputs it
consumes. The rule contract is `openspec/specs/battle-value-system/spec.md`;
`TRACE_RULES.md` describes diagnostic projections. CLI execution, filesystem
traversal, corpus selection and reports belong in `scripts/`. Compatibility
modules there only re-export the product owner for existing CLI/test callers.

`legacyUnitOverrides.ts` retains the existing HD gyro and RISC override-kit ID
sets. `legacyClanChassisUnits.ts` retains the existing mixed-chassis ID set.
These tables remain compatibility inputs with their existing precedence; moving
them does not establish that unit identity is the underlying construction fact.
Replacing each fallback requires a separate behavior change and proof of the
corresponding structured fact through its callers. No list is removed here.

Capital equipment facts have one generated home:
`src/utils/construction/equipmentBV/data/capital-bv.json`, produced by
`scripts/equipment-catalog/generate.mjs`. The equipment-BV owner loads those
facts. Product modules must not import tooling or its compatibility shims;
`scripts/__tests__/product-script-import-boundary.test.ts` enforces that boundary
for every non-test source module, including type-only dependencies.
