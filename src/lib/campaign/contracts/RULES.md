# Contract lifecycle rules

`ContractLifecycleRules.ts` owns the version axis and persisted lifecycle shape.
Absent and 1 mean legacy; only supported version 2 enables staged rules. The
writer remains 1. Never compare numeric lifecycle versions in consumers.

`contractCompletion.ts` owns pure staged readiness, lifetime recommendations,
installment planning and final settlement. It has no production callers in S1.
The saved end controls readiness; original termDays controls installment count.
`contractLengthToDays` owns 30-day contract-month conversion. Scheduled payments
are floor(base/N) cents for months 1 through N-1 from saved startDate; completion
keeps the remainder. Existing PaymentTerms and MissionStatus own payout columns.
Financial operations reject cents at or above 2^50: the existing Money owner
converts through C-bills at every addition, so this conservative boundary keeps
its rounding error below half a cent. Persisted integer shape validation alone
does not establish that an amount is safe for that arithmetic.

Settlement subtracts max(record, deterministic-ledger-evidenced credits).
Ledger/receipt evidence prevents duplicate final payment. A receipt without its
ledger transaction returns a mismatch. S4 owns installment writes, the four-row
disagreement reconciliation and visible warnings. S1 never persists results.

At term, complete history scores victory +2, defeat -2, draw/unscored zero;
nonnegative scores recommend SUCCESS, negative scores FAILED. Unscored entries
are counted explicitly; incomplete history yields insufficient-history. Early
termination, victory-point targets and ROUTED rules remain outside S1.

Mission hydration validates known version 2 and preserves original bytes.
Unknown versions retain their opaque block and return unsupported through the
owner. Existing processors do not yet consult it: S1b/S2 add reader admission;
the dark writer is the current production protection.
