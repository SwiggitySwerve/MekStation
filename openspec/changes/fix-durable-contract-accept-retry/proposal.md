# Recognize committed contract-accept retries

## Why

A durable `AcceptContract` consumes its source offer. Retrying that committed
command currently reads the reduced market first and returns `offer-not-durable`
instead of the existing successful `duplicate` result. This closes K14b task 16
from `add-coop-hire-offer-authority`.

## What Changes

- Check the durable command receipt before reading the contract offer, following
  the existing `HireOffer` ordering.
- Replace the source-row test's incorrect retry expectation first, then prove
  unchanged journal and source state through a cold database reopen.
- Preserve genuine offer-durability refusals and the existing HTTP duplicate
  response. Keep shared authority, rebuild, conflict and artifact admission gates.

## Capabilities

### New Capabilities

- `campaign-authority`: durable contract-accept retry recognition, extending the
  command requirements in
  `../design-campaign-authority-and-sync/specs/campaign-authority/spec.md`.

## Impact

Only the durable contract-accept command and its source-row regression suite
change. The HTTP route already returns HTTP 200 for `duplicate`. Co-op match-host
doors already replay committed intent identity before market validation. Combat,
simulation, campaign creation and market generation are unchanged. No event,
wire, database or persisted-envelope shape changes. One draft PR; Root merges.
