## 1. Intervention Types

- [x] 1.1 Add typed campaign correction payloads, projected effects, public effects, and intervention state aliases for post-combat/base economy domains.
- [x] 1.2 Export the campaign intervention types from the intervention type barrel.

## 2. Campaign Implementer

- [x] 2.1 Add a shared campaign intervention preview builder for salvage allocation, repair ticket, funds transaction, inventory lot, and base unit state/configuration corrections.
- [x] 2.2 Add projection/apply helpers that replay projected campaign effects into `ICampaign` roots.
- [x] 2.3 Add a factory/register helper for `post-combat`, `economy`, `repair`, and `salvage` implementers.
- [x] 2.4 Export the new implementer and projection helpers from the intervention library barrel.

## 3. Regression Coverage

- [x] 3.1 Add focused tests for ready previews, approval replay, action-ledger append, and public/private redaction.
- [x] 3.2 Add focused tests for rejection/manual takeover and malformed or missing target handling.
- [x] 3.3 Update deferred-boundary tests so `time` remains deferred while registered campaign domains no longer defer.

## 4. Validation And Closure

- [x] 4.1 Run focused intervention tests.
- [x] 4.2 Run `openspec.cmd validate add-post-combat-base-economy-fixes --strict`.
- [x] 4.3 Run the broader verification surface required before PR.
- [x] 4.4 Archive the OpenSpec change after verification passes.
- [ ] 4.5 Commit, push, open PR, merge after green checks, and clean local state.
