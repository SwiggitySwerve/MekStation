# Local market offer lifecycle

`offerLifecycle.ts` owns local admission, eligibility, identity and recovery.
The day processors own generation cadence. `FinanceService.recordTransaction`
owns finance arithmetic. Store actions own local commit and enrollment rollback.
No rendering code decides eligibility or computes purchase/hire costs.

- Local actions and initial page seeding refuse any `coopSession` and an active
  day-advance lock. Existing co-op proposals and source authority are unchanged.
- A declined contract stays declined until replaced by a new market cycle.
  Accepted mission evidence wins over stale offer/decline records on reload.
  Accepting consumes the offer and its decline marker.
- Personnel/unit explicit expiration dates are inclusive. Contracts have mission
  dates rather than a separate offer deadline: monthly refresh replaces the
  pool; a contract whose end date is past cannot be accepted.
- A hire checks funds, records payment and consumes the offer before adding the
  pilot. A synchronous enrollment failure restores campaign and roster state.
  Reentrant/repeated attempts see the consumed offer. Finance loan fields survive.
- A unit purchase returns finances, force enrollment and consumed market together.
  It records a transaction through the existing finance service. Missing root
  force, existing enrollment, stale offers and insufficient funds cannot charge.
- Recovery only prunes. Existing mission membership, force enrollment and stable
  payment IDs prove consumption; a matching bound personnel roster additionally
  blocks hiring. Personnel roster state is separately persisted, so loaders do
  not infer it from another campaign's currently mounted roster. They use the
  same persisted force/payment evidence. Recovery never creates a transaction,
  changes money or fabricates enrollment. It is idempotent.
- Co-op source record recovery is left to K14b; local loaders do not rewrite its
  market state. No saved formats, events or replay fixtures change.

## Pinned MekHQ parity

Read with `git -C E:/Projects/Personal/mekhq show e7adc2c:<path>` (paths
below are relative to `MekHQ/src/mekhq/`):

- `campaign/mission/contract/utilities/ContractAcceptance.java:98-105` removes
  the market offer before setting ACTIVE and registering its mission.
- `gui/dialog/markets/contractMarket/ChaosContractMarketDialog.java:687-694`
  deletes a declined/deleted offer from both market and dialog; there is no
  independent declined-state flag. MekStation retains its existing hidden-offer
  representation and enforces equivalent ineligibility.
- `gui/dialog/markets/personnelMarket/PersonnelMarketDialog.java:547-566`
  debits the market cost before `recruitPrepaidPerson`, then removes applicants.
- `gui/panes/UnitMarketPane.java:490-576` checks funds, debits UNIT_PURCHASE,
  acquires units and removes their offers.

## K14b boundary

The source-authoritative acceptance path still ignores declined IDs. Co-op hire
proposals still contain a synthetic recruit and 12,000 cost, trusted by host
validation. K14a blocks local bypasses; K14b must bind proposals to source offers,
validate prices and consume them atomically. No proposal controls change here.
