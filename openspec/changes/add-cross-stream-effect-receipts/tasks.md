Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

Work-path trace: this leaf follows both independently gated combat and campaign authority leaves and precedes `add-authoritative-history-branches` in `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`.

## 0. Dual-Authority Admission — Pre-Implementation Receipt

- [ ] 0.1 Before PR 1, verify on fetched exact main that both `adopt-combat-event-journal-authority` and `adopt-campaign-event-journal-authority` are synced and archived; their task 4.6 and 7.5 terminal evidence pass; both active ledger entries/directories are absent; and both merged branches/worktrees are pruned. Record both predecessor merge SHAs and fail closed on missing or contradictory evidence.
- [ ] 0.2 Before PR 1, re-review every PR seam in this file against the then-current codebase for the 500-line/15-file cap and one-behavior-seam rule, and re-confirm seam ownership against `../harden-gm-two-player-campaign-sessions/event-history-wave-map.md`; if any seam no longer fits or ownership has drifted, split or reassign it through a spec-only OpenSpec update before implementation, and fail closed on unresolved ownership conflicts.

## 1. Canonical Effect Identity and Digest — PR 1

- [ ] 1.1 Define the server-derived effect ID/type/version and versioned semantic-command contract; map `CombatOutcomeFinalized.outcomeId` to `effectId` and `outcomeVersion` to `effectVersion`, and reject client-supplied effect or target scope.
- [ ] 1.2 Implement shared `EffectCommandCanonicalizer` v1 using RFC 8785 UTF-8 bytes containing effect ID/type/version, source stream/ID/branch/event/generation, target campaign/binding revision, command-schema/canonicalizer versions, and the complete semantic command.
- [ ] 1.3 Add fixed source/target fixtures proving shuffled object keys yield identical bytes/lowercase SHA-256, every included-field mutation changes the digest, array order is preserved, and non-finite or unsupported values reject.
- [ ] 1.4 Run focused canonicalizer tests, typecheck/lint/format, strict OpenSpec validation, and independent integrity review.
- [ ] 1.5 After merge, rerun exact-main canonicalizer fixtures and prune the merged branch/worktree.

## 2. Linear Effective Generation Registry — PR 2

- [ ] 2.1 Add additive effective-head generation storage initialized to positive safe integer `1` for every new, imported, or cut-over linear journal stream.
- [ ] 2.2 Make initialization/backfill idempotent across cold reopen and repeated migration; never reset a stored generation or derive it from stream revision.
- [ ] 2.3 Expose generation-checked reads and fence identity keyed by stream, branch, and generation while leaving generation increments to verified branch activation.
- [ ] 2.4 Prove new-stream, legacy-import, repeated-backfill, cold-reopen, zero/non-safe-integer rejection, and no-revision-derivation behavior with real SQLite.
- [ ] 2.5 Run focused generation storage tests and independent durability/integrity review.
- [ ] 2.6 After merge, rerun exact-main generation receipts and prune the merged branch/worktree.

## 3. Source Outbox and Delivery Admission Storage — PR 3

- [ ] 3.1 Add additive outbox and delivery-attempt/admission tables plus typed store interfaces carrying immutable canonical bytes, effect identity, source identity/generation, target campaign/binding, versions/digest, `pending|leased|admitted|delivered|superseded|blocked` state, lease token/expiry, and durable admission token.
- [ ] 3.2 Persist source fact plus outbox atomically and round-trip exact bytes/versions through cold reopen; never regenerate a pending command from projections.
- [ ] 3.3 Implement durable leases, stream/branch/generation fences, and the atomic lease-to-admitted transition; prove both serialized orders of admission versus fence, lease expiry, stale generation, and unsupported stored versions.
- [ ] 3.4 Run focused real-SQLite source/outbox/restart tests and independent durability review.
- [ ] 3.5 After merge, rerun exact-main source/admission receipts and prune the merged branch/worktree.

## 4. Target Inbox and Receipt Storage — PR 4

- [ ] 4.1 Add additive target inbox/effect-receipt tables and typed store interfaces keyed by `(targetCampaignId, effectType, effectId, effectVersion)` and carrying effect/source identity, resolved target branch, versions/digest, and resulting event range.
- [ ] 4.2 Persist a new target receipt plus consequence event batch atomically using expected-head compare-and-append.
- [ ] 4.3 Return a matching duplicate receipt before current-head comparison, but reject identity reuse with a different effect type, source identity, version, canonical bytes, or digest without target mutation.
- [ ] 4.4 Prove failed target commits leave neither receipt nor event range and cold reopen preserves receipt idempotency.
- [ ] 4.5 Run focused real-SQLite target/receipt tests and independent durability/integrity review.
- [ ] 4.6 After merge, rerun exact-main target receipt proofs and prune the merged branch/worktree.

## 5. System Effect Principal and Dispatcher — PR 5

- [ ] 5.1 Implement the nominal non-serializable system-effect principal as a server-internal capability minted only from a committed admission and bound to complete effect/source/target/generation/token/binding/version/digest identity.
- [ ] 5.2 Implement the bounded outbox dispatcher; keep projectors/replay unable to dispatch and require target ingestion to re-resolve source binding plus the current active target branch rather than accept a caller-selected branch.
- [ ] 5.3 Prove a valid admitted effect survives human membership revocation, while client/lease fabrication, cross-effect/target/generation/token/binding/version/digest reuse, or use on viewer/private/history/branch/other-command surfaces rejects without disclosure or mutation.
- [ ] 5.4 Run focused dispatcher/principal tests and independent effect-authority/security review.
- [ ] 5.5 After merge, rerun exact-main principal/admission receipts and prune the merged branch/worktree.

## 6. Combat Outcome Enqueue — PR 6

- [ ] 6.1 Write `CombatOutcomeFinalized` and its canonical outbox row in the terminal match transaction with `outcomeId` as `effectId`.
- [ ] 6.2 Run in shadow mode against legacy reconciliation and compare server-derived target scope plus semantic consequence digests without dispatching from replay.
- [ ] 6.3 Prove crash-after-source-commit/cold-restart preserves one immutable pending command and operator-visible delivery state.
- [ ] 6.4 Run focused combat terminal/restart tests and independent combat-authority review.
- [ ] 6.5 After merge, rerun exact-main terminal enqueue receipts and prune the merged branch/worktree.

## 7. Campaign Reconciliation and Recovery — PR 7

- [ ] 7.1 Re-resolve authoritative match-to-campaign binding and current active target branch, verify admitted identity/bytes/versions/digest, and commit the campaign consequence plus target receipt.
- [ ] 7.2 Inject crash-before-admission, crash-after-admission, crash-after-target-commit, lost acknowledgement, duplicate delivery, changed-content collision, unsupported version, and misrouted target; prove the original stored command applies once or enters typed non-admitted/integrity/blocked state without target mutation.
- [ ] 7.3 Compare receipt-backed consequences with legacy reconciliation, then enable the receipt path for new outcomes while preserving rollback to a generation-compatible worker.
- [ ] 7.4 Run focused combat/campaign reconciliation suites and independent recovery/effect-authority review.
- [ ] 7.5 After merge, rerun exact-main combat-to-campaign receipt proof and prune the merged branch/worktree.

## 8. Authorized Cross-Entity Timeline — PR 8

- [ ] 8.1 Add viewer-authorized timeline projection for source event, delivery attempts/state, target receipt, resolved target branch, and target event range without duplicating authority.
- [ ] 8.2 Prove each owned record is independently authorized and canonical command bytes/digests plus private facts never enter viewer output.
- [ ] 8.3 Run focused timeline/privacy tests and independent code/security review.
- [ ] 8.4 After merge, rerun exact-main timeline receipts and prune the merged branch/worktree.

## 9. Progression Gate and Delivery Feedback — PR 9

- [ ] 9.1 Gate scenario N+1 until the active outcome version has a matching target receipt and the campaign projection is current.
- [ ] 9.2 Add pending/retrying/blocked/applied feedback that remains visible and accessible at desktop and narrow viewports.
- [ ] 9.3 Run focused campaign progression, viewport/accessibility, and independent visual review.
- [ ] 9.4 After merge, rerun exact-main progression receipts and prune the merged branch/worktree.

## 10. Post-Battle Browser Evidence — PR 10

- [ ] 10.1 Run an isolated combat-to-campaign journey through terminal outcome, delivery/retry status, reload, next-scenario readiness, and post-battle persistence.
- [ ] 10.2 Pair screenshots with source event, outbox/admission, target receipt/event range, projection, route/API/store, and reload proof.
- [ ] 10.3 Run campaign-long browser proof plus applicable deep-audit and independent visual/security review.
- [ ] 10.4 After merge, rerun exact-main post-battle regression, archive evidence, and prune the merged branch/worktree.
