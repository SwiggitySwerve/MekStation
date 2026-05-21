# Spec Delta: Co-op Campaign Sync

## ADDED Requirements

### Requirement: Host-Review Proposal Timeout

The host-as-GM arbiter SHALL auto-veto a `pending` guest proposal that sits unanswered for longer than a configurable timeout, so the guest's pending-proposal indicator resolves even if the host disconnects or simply forgets to decide.

**Priority**: Medium

#### Scenario: Unanswered proposal auto-vetoes after timeout

**GIVEN** a host-mode co-op campaign with `arbitrationMode: 'host-review'`
**AND** a guest has submitted a proposal that has been `pending` for longer than the configured `proposalTimeoutMs` (default 5 minutes)
**WHEN** the arbiter's timeout watchdog fires
**THEN** the system SHALL resolve the proposal with `{ decision: 'veto', reason: 'host-review-timeout' }`
**AND** the guest's `<GuestProposalSurface>` SHALL transition from pending to vetoed with the timeout reason surfaced
**AND** the auto-veto SHALL be visually distinct from a host-driven veto (different reason badge)

#### Scenario: Timeout is configurable per arbiter instance

**GIVEN** an integrator constructs `new CampaignGmArbiter({ proposalTimeoutMs: 30_000 })`
**WHEN** a proposal sits pending for 35 seconds
**THEN** the arbiter SHALL auto-veto with `reason: 'host-review-timeout'`
**AND** the same proposal under the default 5-minute timeout SHALL still be pending

#### Scenario: A host decision before the timeout fires prevents the auto-veto

**GIVEN** a proposal is pending
**WHEN** the host clicks `approve` or `veto` before the timeout fires
**THEN** the arbiter SHALL emit the host's decision normally
**AND** the timeout watchdog SHALL NOT fire (the proposal is no longer pending)
