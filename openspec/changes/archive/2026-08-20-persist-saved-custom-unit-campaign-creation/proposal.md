## Why

A correct roster draft is not durable until the production wizard submit path receives server acceptance. CAMP-01F prevents local success, duplicate campaign ids, and silent conflict overwrite from masquerading as persistence.

## What Changes

- Submit the assembled campaign through the existing production persistence store and server `PUT`.
- Wait for an accepted `saved` result before success feedback or dashboard navigation.
- Preserve campaign, roster-instance, source-design, source-kind, and root-force identity in the accepted record.
- Keep failures and conflicts on an honest recovery surface; retry the same campaign id and never auto-overwrite a `409`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-persistence`: Make campaign creation success contingent on an accepted server commit with stable source identity.

## Non-goals

- Changing conflict-resolution policy, adding a second persistence API, or resolving custom metadata downstream.
- Treating browser-local state or a test-only helper as server acceptance.

## Impact

- Affected contracts: production wizard submit, campaign persistence store, campaign API result handling, recovery feedback, and the campaign-customizer handoff journey.
- Delivery remains one later product PR capped at 8 files and 400 changed lines; this specification PR changes no runtime behavior.
