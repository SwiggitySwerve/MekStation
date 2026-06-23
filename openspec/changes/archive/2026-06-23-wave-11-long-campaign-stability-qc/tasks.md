## 1. QC Wiring

- [x] 1.1 Add a long-campaign metadata validator for package scripts, registry surface, catalog bounds, UI flow linkage, graph nodes, source anchors, and stale OpenSpec refs.
- [x] 1.2 Wire `qc:campaign-long:validate` and `verify:qc:campaign-long` through `package.json`.
- [x] 1.3 Include `verify:qc:campaign-long` in the top-level `verify:qc` command.

## 2. QC Registry And Catalog

- [x] 2.1 Add a first-class `long-campaign-stability` surface to the QC registry.
- [x] 2.2 Remove stale campaign root active-change references.
- [x] 2.3 Add the long-campaign 10-contract maximum to the journey scenario catalog.
- [x] 2.4 Update the QC validation graph and human QC map for the new validator.

## 3. Tests And Verification

- [x] 3.1 Add focused tests for the long-campaign QC metadata validator.
- [x] 3.2 Run focused long-campaign validator, stability, and Jest checks.
- [x] 3.3 Run registry, journey, global QC, type, format, and OpenSpec validation.
