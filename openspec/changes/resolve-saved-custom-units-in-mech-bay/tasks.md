## 1. Source-aware Mech Bay resolution

- [ ] 1.1 Resolve `unitSource=custom` entries by exact saved-design `unitRef` after cold reload without stock-catalog fallback or identity rewrite.
- [ ] 1.2 Preserve roster-instance id and cached safe name/tonnage; expose BV as honestly available or unavailable.

## 2. Missing-source recovery

- [ ] 2.1 Keep deleted, missing, malformed, or unavailable saved sources visible with an explicit unresolved state and no borrowed stock facts.
- [ ] 2.2 Exclude unresolved and unsupported custom entries from mission readiness and launch side effects while allowing retry of the same source reference.
- [ ] 2.3 Extend the exact receipt-pinned `e2e/campaign-customizer-handoff.spec.ts` test across resolved and unresolved cold-reload paths and publish the closed Mech Bay authority report.

## 3. Verification and delivery

- [ ] 3.1 Run the row-resolved Mech Bay Jest, readiness-stable QC, campaign-customizer-handoff Playwright, Node 22 gates, strict OpenSpec validation, and OpenSpec CI QC.
- [ ] 3.2 After CAMP-01F exact-main cleanup, use the CAMP-01G controller register/proof gates and pass the 7-file/350-line cap; then SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01H.
