Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

## 1. Canonical Effect Identity and Digest — PR 1

- [ ] 1.1 Define the server-derived effect ID/type/version and versioned semantic-command contract; map `CombatOutcomeFinalized.outcomeId` to `effectId` and `outcomeVersion` to `effectVersion`, and reject client-supplied effect or target scope.
- [ ] 1.2 Implement shared `EffectCommandCanonicalizer` v1 using RFC 8785 UTF-8 bytes containing effect ID/type/version, source stream/ID/branch/event/generation, target campaign/binding revision, command-schema/canonicalizer versions, and the complete semantic command.
- [ ] 1.3 Add fixed source/target fixtures proving shuffled object keys yield identical bytes/lowercase SHA-256, every included-field mutation changes the digest, array order is preserved, and non-finite or unsupported values reject.
- [ ] 1.4 Run focused canonicalizer tests, typecheck/lint/format, strict OpenSpec validation, and independent integrity review.
- [ ] 1.5 After merge, rerun exact-main canonicalizer fixtures and prune the merged branch/worktree.

## 2. Source Outbox and Delivery Admission Storage — PR 2

- [ ] 2.1 Add additive outbox and delivery-attempt/admission tables plus typed store interfaces carrying immutable canonical bytes, effect identity, source identity/generation, target campaign/binding, versions/digest, `pending|leased|admitted|delivered|superseded|blocked` state, lease token/expiry, and durable admission token.
- [ ] 2.2 Persist source fact plus outbox atomically and round-trip exact bytes/versions through cold reopen; never regenerate a pending command from projections.
- [ ] 2.3 Implement durable leases, source-generation fences, and the atomic lease-to-admitted transition; prove both serialized orders of admission versus fence, lease expiry, stale generation, and unsupported stored versions.
- [ ] 2.4 Run focused real-SQLite source/outbox/restart tests and independent durability review.
- [ ] 2.5 After merge, rerun exact-main source/admission receipts and prune the merged branch/worktree.

## 3. Target Inbox and Receipt Storage — PR 3

- [ ] 3.1 Add additive target inbox/effect-receipt tables and typed store interfaces keyed by `(targetCampaignId, effectType, effectId, effectVersion)` and carrying effect/source identity, resolved target branch, versions/digest, and resulting event range.
- [ ] 3.2 Persist a new target receipt plus consequence event batch atomically using expected-head compare-and-append.
- [ ] 3.3 Return a matching duplicate receipt before current-head comparison, but reject identity reuse with a different effect type, source identity, version, canonical bytes, or digest without target mutation.
- [ ] 3.4 Prove failed target commits leave neither receipt nor event range and cold reopen preserves receipt idempotency.
- [ ] 3.5 Run focused real-SQLite target/receipt tests and independent durability/integrity review.
- [ ] 3.6 After merge, rerun exact-main target receipt proofs and prune the merged branch/worktree.

## 4. System Effect Principal and Dispatcher — PR 4

- [ ] 4.1 Implement the nominal non-serializable system-effect principal as a server-internal capability minted only from a committed admission and bound to complete effect/source/target/generation/token/binding/version/digest identity.
- [ ] 4.2 Implement the bounded outbox dispatcher; keep projectors/replay unable to dispatch and require target ingestion to re-resolve source binding plus the current active target branch rather than accept a caller-selected branch.
- [ ] 4.3 Prove a valid admitted effect survives human membership revocation, while client/lease fabrication, cross-effect/target/generation/token/binding/version/digest reuse, or use on viewer/private/history/branch/other-command surfaces rejects without disclosure or mutation.
- [ ] 4.4 Run focused dispatcher/principal tests and independent effect-authority/security review.
- [ ] 4.5 After merge, rerun exact-main principal/admission receipts and prune the merged branch/worktree.

## 5. Combat Outcome Enqueue — PR 5

- [ ] 5.1 Write `CombatOutcomeFinalized` and its canonical outbox row in the terminal match transaction with `outcomeId` as `effectId`.
- [ ] 5.2 Run in shadow mode against legacy reconciliation and compare server-derived target scope plus semantic consequence digests without dispatching from replay.
- [ ] 5.3 Prove crash-after-source-commit/cold-restart preserves one immutable pending command and operator-visible delivery state.
- [ ] 5.4 Run focused combat terminal/restart tests and independent combat-authority review.
- [ ] 5.5 After merge, rerun exact-main terminal enqueue receipts and prune the merged branch/worktree.

## 6. Campaign Reconciliation and Recovery — PR 6

- [ ] 6.1 Re-resolve authoritative match-to-campaign binding and current active target branch, verify admitted identity/bytes/versions/digest, and commit the campaign consequence plus target receipt.
- [ ] 6.2 Inject crash-before-admission, crash-after-admission, crash-after-target-commit, lost acknowledgement, duplicate delivery, changed-content collision, unsupported version, and misrouted target; prove the original stored command applies once or enters typed non-admitted/integrity/blocked state without target mutation.
- [ ] 6.3 Compare receipt-backed consequences with legacy reconciliation, then enable the receipt path for new outcomes while preserving rollback to a compatible worker.
- [ ] 6.4 Run focused combat/campaign reconciliation suites and independent recovery/effect-authority review.
- [ ] 6.5 After merge, rerun exact-main combat-to-campaign receipt proof and prune the merged branch/worktree.

## 7. Authorized Cross-Entity Timeline — PR 7

- [ ] 7.1 Add viewer-authorized timeline projection for source event, delivery attempts/state, target receipt, resolved target branch, and target event range without duplicating authority.
- [ ] 7.2 Prove each owned record is independently authorized and canonical command bytes/digests plus private facts never enter viewer output.
- [ ] 7.3 Run focused timeline/privacy tests and independent code/security review.
- [ ] 7.4 After merge, rerun exact-main timeline receipts and prune the merged branch/worktree.

## 8. Progression Gate and Delivery Feedback — PR 8

- [ ] 8.1 Gate scenario N+1 until the active outcome version has a matching target receipt and the campaign projection is current.
- [ ] 8.2 Add pending/retrying/blocked/applied feedback that remains visible and accessible at desktop and narrow viewports.
- [ ] 8.3 Run focused campaign progression, viewport/accessibility, and independent visual review.
- [ ] 8.4 After merge, rerun exact-main progression receipts and prune the merged branch/worktree.

## 9. Post-Battle Browser Evidence — PR 9

- [ ] 9.1 Run an isolated combat-to-campaign journey through terminal outcome, delivery/retry status, reload, next-scenario readiness, and post-battle persistence.
- [ ] 9.2 Pair screenshots with source event, outbox/admission, target receipt/event range, projection, route/API/store, and reload proof.
- [ ] 9.3 Run campaign-long browser proof plus applicable deep-audit and independent visual/security review.
- [ ] 9.4 After merge, rerun exact-main post-battle regression, archive evidence, and prune the merged branch/worktree.
