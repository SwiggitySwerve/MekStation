## 1. Approval Atomicity

- [x] 1.1 Add regression coverage proving unsupported approval appends no intervention record and no action ledger record.
- [x] 1.2 Update the GM cascade approval pipeline to apply first and append only after successful application.

## 2. Ledger Snapshot Hardening

- [x] 2.1 Add intervention-ledger tests proving read snapshots cannot mutate canonical record fields.
- [x] 2.2 Add action-ledger tests proving raw reads and public/private projections cannot mutate canonical record fields.
- [x] 2.3 Update ledger read/projection helpers to return immutable top-level record snapshots.

## 3. Validation

- [x] 3.1 Run targeted intervention ledger Jest tests.
- [x] 3.2 Validate the OpenSpec change strictly.
- [x] 3.3 Run the broader QC/OpenSpec validation surface needed before archive and PR.
