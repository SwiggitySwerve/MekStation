# Report force assignment swap failures

## Why

The force detail page discards a failed swap result and refreshes the store, clearing its error without showing feedback.

## What Changes

- Reuse the existing assignment-result helper for swap feedback after refresh.
- Show an error toast for failure and a success toast for success.
- Verify both results through the ForceBuilder callback on the force detail page.

## Impact

- Affected spec: `force-management`.
- Affected code: `ForceDetailPage` and its existing component test suite.
- The force store, swap API, service, repository, and ForceBuilder callback contract remain unchanged.

## Non-goals

No changes to swap rules, persistence, schemas, gameplay authority, technology availability, or tech bases.
