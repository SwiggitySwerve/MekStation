## Context

The legacy document is an object containing `allowedActiveChanges`. The CI
validator previously enforced inventory membership but defaulted missing metadata.
CAMP provenance separately checks legacy membership at a cited merge SHA.

## Goals / Non-Goals

Goals: separate file paths for independent new changes, exact migration of current
entries, strict CI metadata validation, and compatibility with in-flight PRs and
historical citations. Non-goals: application persistence, gameplay, rewriting
archived evidence, or changing the external lane brief in this PR.

## Decisions

### Colocate metadata with each change

Use `.ledger.json` containing `name`, `status`, `reason` and `lastReviewed`. The
name must match the parent change directory. Status and reason must be nonblank
strings; the review date must be a real calendar date in `YYYY-MM-DD` form. Keep
string bytes unchanged during normalization. No new closed status vocabulary is
introduced. Archived directories are excluded from active discovery.

A separate metadata directory would require coordinated archive cleanup. Extending
`.openspec.yaml` would couple accounting to the CLI's schema. Union merging cannot
preserve JSON syntax or detect contradictory metadata.

### Read both formats without choosing a winner

The shared owner parses each format, validates entries and reconciles the two
inventories. Identical entries across formats count once; differing entries fail.
Repeated names within the legacy inventory fail even if identical. Malformed
metadata fails even when the other format could account for the name. Keep existing
manifest fields and inventory/stale-entry errors for automation.

### Preserve revision-bound provenance

CAMP reads both candidate paths at the cited SHA and requires the same revision's
tasks file. Existing legacy-only historical membership checks retain their prior
semantics because new metadata requirements cannot be applied retroactively to
old Git trees. Colocated metadata is fully validated; when both entries name the
cited change, their complete normalized metadata must match.

## Migration Plan

Fetch main immediately before generating metadata. Copy every current legacy entry
into its change directory, then compare both normalized inventories byte for byte.
Keep the legacy document untouched. Entries landing later still work through the
legacy read path; new lanes write only `.ledger.json`. Root updates the external
lane brief after merge. Legacy retirement is not required by this change.

## Risks / Trade-offs

The compatibility file still causes conflicts between old writers until those lanes
adopt the colocated format. Updating the same change's metadata in both formats
requires keeping the copies identical, or removing its legacy entry deliberately.
A missing/archived change's legacy entry remains an error and must be removed on
archive; archived colocated metadata is ignored.
