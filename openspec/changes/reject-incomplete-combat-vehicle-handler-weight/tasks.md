## 1. Implemented by S11

- [x] 1.1 Prove that the original Tank/VTOL handlers return incomplete subtotals with failing tests (S11 red.log).
- [x] 1.2 Route both handlers through one explicit incomplete-weight helper while preserving parsing and support totals (#2549).
- [x] 1.3 Preserve engine-identity contribution tests at their owning boundary and kill both handler numeric-fallback mutants (S11 evidence).

## 2. Documentation and future boundary

- [ ] 2.1 Verify the moved requirement is text-identical, singular, structurally valid and linked from the helper; publish this package.
- [ ] 2.2 Restore a numeric combat total only with complete authoritative construction mass and independent numerical evidence; this remains outside S09/S11.
