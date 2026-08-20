> Completed 2026-08-20 (reconciliation): implemented and delivered by the CAMP-01G wave (product PR #1240 (merge commit #1242)); attested by the durable reviewed-head + exact-main + cleanup receipts (full durable index readmitted 23/23 through validator plus all four anchors after CAMP-R1, 2026-08-12) and the council review at `openspec/council-decisions/2026-08-12-camp01-wave-execution-review.md`.

## 1. Source-aware Mech Bay resolution

- [x] 1.1 Resolve `unitSource=custom` entries by exact saved-design `unitRef` after cold reload without stock-catalog fallback or identity rewrite.
- [x] 1.2 Preserve roster-instance id and cached safe name/tonnage; expose BV as honestly available or unavailable.

## 2. Missing-source recovery

- [x] 2.1 Keep deleted, missing, malformed, or unavailable saved sources visible with an explicit unresolved state and no borrowed stock facts.
- [x] 2.2 Exclude unresolved and unsupported custom entries from mission readiness and launch side effects while allowing retry of the same source reference.
- [x] 2.3 Extend the exact receipt-pinned `e2e/campaign-customizer-handoff.spec.ts` test across resolved and unresolved cold-reload paths and publish the closed Mech Bay authority report.

## 3. Verification and delivery

- [x] 3.1 Run the row-resolved Mech Bay Jest, readiness-stable QC, campaign-customizer-handoff Playwright, Node 22 gates, strict OpenSpec validation, and OpenSpec CI QC.
- [x] 3.2 After CAMP-01F exact-main cleanup, use the CAMP-01G controller register/proof gates and pass the 7-file/350-line cap; then SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01H.
