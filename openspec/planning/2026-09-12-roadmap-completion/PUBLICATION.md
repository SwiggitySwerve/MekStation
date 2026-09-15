# Roadmap publication sequence

R0.publish delivers the local roadmap and inventory after their dependencies exist on main. The inventory JSON was published in PR1646; the remaining documentation prefixes are local. File counts below are the 2026-09-12 admission audit, not current publication measurements. Refresh content, counts and dependencies before staging. R1 implementation receipts stay with their owning delivery records.

## Two named documentation allowances

The inventory JSON (4,781 lines at review) and roadmap JSON (8,758 lines at review) are human-authored data. They cannot each fit a 500-line PR without cutting a valid document or disguising it through compressed formatting. Permit only these two named files to exceed the default line target after independent content/accounting review:

- `docs/audits/2026-09-12-customizer-spec-reconciliation/inventory.json`
- `openspec/planning/2026-09-12-roadmap-completion/roadmap.json`

Keep the 15-file limit and the 500-line target for other human-authored content. These allowances do not amend any product package cap or apply to source code, tests, CI, migrations or future documents. Capture final hashes and distinguish generated snapshots/command receipts from authored requirements.

## Buildable publication order

1. Publish the inventory JSON as its own reviewed audit-data PR. Preserve its initial state; later disposition progress belongs to roadmap triage.
2. Publish `inventory-overview.md` (365 lines at review) after its required links exist. Complete any required audit-link prerequisite first; do not activate dangling navigation.
3. Publish the planning contracts: `DISCOVERY.md`, `DELIVERY.md`, `PR-SLICES.md` and `WORKERS.md` (263 lines at review), with links limited to already published files or the same PR.
4. Publish the validated ledger as one coherent prefix: `README.md`, `PROGRESS.md`, `roadmap.json`, `validate-roadmap.mjs`, `evidence/admission-snapshot.json` and the small review/validation/accounting receipts those documents actually reference. Keep at most 15 files. The inventory input, delivery/worker contracts and every live ownership path must exist on the candidate. If source packages or canonical paths are still local-only, deliver those foundation slices first. Do not relax the validator to accept missing live ownership.
5. Publish `ACTIVE-CHANGES-ROADMAP.md` with `evidence/2026-06-30-roadmap-index.md` only after the README, overview and historical targets all resolve.
6. Publish the current handoff and product receipt batches after their own references exist. Record ignored raw logs as local exported evidence identified by hash; do not force-add ignored logs or claim a raw log is available in Git when only its receipt is published.

## Verification and lifecycle

At each admission, inspect the exact file manifest, changed-line counts and links against fetched main. Run strict specification, purpose, terminology and active-ledger checks plus normal required remote checks. Run the roadmap validator as soon as its entire required input set is present; do not claim it passed in an earlier partial prefix. Recheck the exact merged commit.

The validator retains original task paths and source hashes in the immutable admission snapshot. When an accepted package is archived, update that node's current ownership navigation to its verified archive path and preserve the original path/hash in its receipt. Never rewrite the baseline to make lifecycle changes disappear.

Do not copy the initiating checkout's mixed active-change ledger or unrelated printable-model research into an R0 publication. R1.specs and R1.references are complete with their scoped exact-main and cleanup receipts. Routing, its archive, Infantry, and the loader, validation-order, manifest-sync and hydration-safety repairs are also delivered. The remote customizer gate and the three original archive publications remain open. Seven exact publication payloads await answers recorded in HANDOFF.md; their contents must not be exported through a documentation prefix or another branch.

The 2026-09-13 readiness audit found that the inventory overview still links to the removed active routing package, and several required audit, CI-package and original-archive targets are absent from fetched main44b94ad. The local overview correction must use the verified routing archive path. Missing publication prerequisites must be delivered before its navigation is enabled. Planning contracts also reference the unpublished roadmap, admission snapshot, publication policy and routing receipts in plain text; zero broken Markdown links alone does not make that prefix self-contained. Retain the coherent-input and 15-file/500-line gates; remeasure the exact proposed tree rather than publishing the current four-file contract set on its own.
