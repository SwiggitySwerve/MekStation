# Surface co-op proposal submission failures

## Why

A throwing or rejecting proposal transport leaves the guest action pending indefinitely and leaks an unhandled rejection from the click handler.

## What Changes

- Catch transport failures in the proposal lifecycle hook.
- Record a local submission-failed outcome and show the failure in the proposal feed and announcement.
- Clear the pending control so the guest can retry; retain the existing server outcome contracts.

## Impact

- Affected spec: `coop-campaign-sync`.
- Affected code: `useGuestProposals`, `GuestProposalSurface`, and their existing test suite.
- No protocol, persistence, gameplay authority, mission launch, or participation changes.
