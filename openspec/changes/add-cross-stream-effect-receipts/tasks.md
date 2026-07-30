Every PR in this change MUST stay under 500 non-generated changed lines and 15 files, own one behavior seam, and split through an OpenSpec update before implementation if the cap cannot be met.

## 1. Outbox and Inbox Storage — PR 1

- [ ] 1.1 Add additive outbox, delivery-attempt, inbox, and effect-receipt tables plus typed store interfaces with immutable source match/branch/event/generation, effect type/version and canonical semantic-command digest, `pending|leased|admitted|delivered|superseded|blocked` state, lease token/expiry, durable admission token, and server-derived target campaign plus binding revision.
- [ ] 1.2 Add transaction tests proving a source fact and outbox commit together and a target receipt and event batch commit together.
- [ ] 1.3 Prove matching duplicate target-scoped identity/digest returns the original receipt before current-head comparison, while leased-only or mismatched identity/version/digest, source binding/generation/admission, target campaign, or target branch rejects without mutation.
- [ ] 1.4 Run focused real-SQLite tests, typecheck/lint/format, strict OpenSpec validation, and independent durability/security review.
- [ ] 1.5 After merge, rerun storage receipts on exact main and prune the merged branch/worktree.

## 2. Combat Outcome Delivery — PR 2

- [ ] 2.1 Write `CombatOutcomeFinalized` and its outbox row in the terminal match transaction.
- [ ] 2.2 Implement the bounded outbox dispatcher, generation-fenced lease-to-admission transition, and narrow system-effect principal; re-resolve the authoritative match-to-campaign binding plus durable admission before target append and keep projectors/replay unable to dispatch.
- [ ] 2.3 Commit the versioned campaign outcome receipt and consequence event batch atomically.
- [ ] 2.4 Inject crash-before-admission, crash-after-admission, crash-after-target-commit, lost acknowledgement, duplicate delivery, changed-content identity collision, process restart, lease expiry, stale/fenced source generation, and both serialized orders of `lease admission` versus `source-generation fence`; prove one campaign consequence or a typed non-admitted/integrity rejection.
- [ ] 2.5 Run focused combat/campaign reconciliation suites and independent effect-authority review.
- [ ] 2.6 After merge, rerun exact-main combat-to-campaign receipt proof and prune the merged branch/worktree.

## 3. Cross-Entity Timeline and Progression Gate — PR 3

- [ ] 3.1 Add authorized timeline projection for source event, delivery state, target receipt, and target event range without event duplication.
- [ ] 3.2 Gate scenario N+1 until the active outcome version is received and the campaign projection is current.
- [ ] 3.3 Add pending/retrying/blocked/applied feedback that remains visible and accessible at desktop and narrow viewports.
- [ ] 3.4 Run timeline privacy tests, campaign-long browser proof, viewport/accessibility checks, and independent visual/security review.
- [ ] 3.5 After merge, run exact-main post-battle persistence and next-scenario regression, archive screenshots plus journal/receipt/reload proof, and prune the merged branch/worktree.
