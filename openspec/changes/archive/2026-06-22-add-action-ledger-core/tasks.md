## 1. Action Ledger Core

- [x] 1.1 Add shared action ledger types for normal, GM intervention, and system records.
- [x] 1.2 Implement append-only action ledger ordering and read projections.
- [x] 1.3 Add player-public and GM-private projection helpers with GM metadata redaction.

## 2. GM Approval Integration

- [x] 2.1 Extend GM cascade approval to optionally append approved GM intervention actions to the action ledger.
- [x] 2.2 Ensure blocked, rejected, deferred, unsupported, or manual-takeover previews append no action ledger record.

## 3. Validation

- [x] 3.1 Add focused tests for normal action preservation, GM action append, causality, and projection redaction.
- [x] 3.2 Run focused intervention tests, OpenSpec validation, typecheck, and QC validation.
