## Ownership

`src/stores/unitSaveState.ts` owns plain save-state facts and transitions.
`src/stores/unitSaveFingerprints.ts` owns canonical JSON and temporary equipment
identity normalization. `src/stores/unit/unitEditSnapshot.ts` remains the public
mech snapshot/fingerprint facade and supplies the existing mech projections.
`unitEditHistory.ts` retains transaction, undo, redo, and clean-baseline ownership.

The aggregate has independent modification, browser-draft, and library states.
A matching library design can coexist with editor-only changes or a failed
browser write. Only matched/changed library variants carry a receipt.

## Compatibility

The owner does not persist a second status. The existing receipt type moves to
the owner without changing its optional `draftFingerprint` member. Callers keep
their current exports, setState patches, serialization, and storage behavior.
Baseline comparisons preserve the existing missing-baseline-is-modified rule.

The empty-fluff fixture also omits its role. Main already hydrates that absence
as an empty string, so its editor baseline can differ after reload. A probe using
the original main fingerprint implementation confirmed this before accepting the
characterization. This PR preserves that loader behavior and the literal stored
receipt; it does not claim to repair the pre-existing defaulting mismatch.

Canonical JSON retains recursive locale key ordering, array order, JSON omission
of undefined object members, and existing temporary equipment-ID/link handling.
Absent optional fields must remain omitted, including when a snapshot explicitly
includes them with value undefined. Null/default additions require separate
compatibility treatment if they would change old fingerprints.

## Caller paths

| Entry | Boundary |
| --- | --- |
| Mech action slices | Existing edit-history transaction and baseline comparison. |
| Undo/redo and saved-history restore | Existing unitEditHistory and unitEditSnapshot exports. |
| Library save completion | Existing recordUnitLibrarySave facade and identical state patch. |
| Mech custom-library load | Existing createLibrarySaveReceipt export; loader unchanged. |
| Library status UI | Existing getUnitLibraryFingerprint export; UI unchanged. |
| Browser draft hydration | Existing registry and persisted projection; untouched. |
| Other five store families, tab manager, router, browser-write UI | Future adoption; untouched. |
| Engine, AI, runner, authoritative multiplayer, P2P | No direct editor save-state path; untouched. |

## Rollout

This PR provides the owner and preserves mech behavior. PR2 integrates the five
non-mech factories and additive receipt persistence after this PR merges. PR3
updates UI consumers and save completion. Loading E2E de-duplication is owned by
D-11 and is not part of these changes.
