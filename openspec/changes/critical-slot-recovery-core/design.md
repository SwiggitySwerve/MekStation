## Context

This is the core split of o3a commits 8ed00795d, 0ad7a0edc and 67a7df07c,
based on origin/main 995a870a39db4adafe61a95a88e95bfce1ddcb6c.
Commit 122a0a6fd's marker recovery and hydration are excluded.

## Decisions

`criticalSlotEquipment.ts` remains the owning module. Recognition returns
`{ cells, missing }` from resolved source evidence and actual primary, split and
spread allocations. The existing notice classification owner supplies recovery
kinds using resolved facts. Exact system identities remain vocabulary-owned.

`recoverCriticalSlotEntries` preserves existing admission, sizing, grouping and
reservation contracts. The loader retains component, grouped-weapon and
remaining-kind order, refreshing context between calls. The dispatcher has an
exhaustive switch and a `never` check after it, with no default arm.

Marker kinds explicitly return no mounts. Their cells stay in the residual and
notice exactly as on main until the marker PR. No factory or hydration is added.
Mobility, configuration-system and unclassified kinds also have explicit no-op
arms; adding a kind requires a dispatcher arm and test coverage.

## Verification

Galahad GLH-1D pins all 14 marker cells in the residual and notice and outside
equipment. A contract test derives the kind list from its type declaration and
checks dispatcher arms, rejecting a default. Existing real-unit two-save tests
retain Chain Whip and ISC3Sensors, with a substring-filter mutation check.
Run all owning/importer test directories, all src/**tests**, fixture generation,
guarded typecheck, format/lint and strict OpenSpec validation before committing.

The existing crew generator discarded independently pinned `noticeGroups` and
`groupingSourceCommit`. Preserve both while refreshing loader entries, then apply
the repository formatter. The resulting fixture must match main byte-for-byte
apart from `sourceCommit`; keep the checked-in fixture unchanged.
