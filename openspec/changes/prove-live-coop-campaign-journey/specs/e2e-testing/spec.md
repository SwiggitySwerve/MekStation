# e2e-testing — Delta for prove-live-coop-campaign-journey

## ADDED Requirements

### Requirement: Two-Browser Co-op Campaign Continuity Journey

The system SHALL provide a Playwright end-to-end spec that proves live co-op campaign play across **two real browser contexts** (a host context and a guest context), modeled on the existing two-context pattern in `e2e/multiplayer-live-vault-auth.spec.ts`. The spec SHALL be runnable via a dedicated `verify:qc:coop-campaign-journey` npm script, SHALL run green locally against the `server.js` WebSocket transport booted by the Playwright `webServer` config, and SHALL cover the co-op campaign flow from host creation through post-battle propagation and reload. Any step that remains blocked by a transport limitation the wave could not close SHALL be asserted at the maximum honestly provable point and its residual filed as an explicit follow-up, never faked by reaching into both pages' JS heaps to bridge them.

#### Scenario: Host creates and guest joins a co-op campaign by room code

- **GIVEN** a host browser context and a guest browser context with distinct vault identities
- **WHEN** the host creates a co-op campaign from the UI and the guest joins with the host's room code
- **THEN** the host SHALL land on the campaign dashboard with the `Co-op session: Host` badge
- **AND** the guest SHALL land on the campaign dashboard with the `Co-op session: Guest` badge
- **AND** the guest dashboard SHALL display the host's campaign state (funds and roster) rather than an empty campaign

#### Scenario: Both sides converge on shared campaign state

- **GIVEN** a host and a guest joined to the same co-op campaign
- **WHEN** the host commits a campaign mutation that the flow exercises
- **THEN** the guest mirror SHALL reflect the mutation over the transport
- **AND** the guest's displayed state SHALL match the host's for the mutated value

#### Scenario: Mission launch, participation, and outcome propagate to both sides

- **GIVEN** a co-op campaign with a launchable mission
- **WHEN** the host selects or creates the encounter, both players choose participation, and the encounter resolves
- **THEN** the launch gate SHALL enable only after both participation choices converge
- **AND** the resolved outcome SHALL reconcile into the host's campaign
- **AND** the reconciled post-battle campaign events SHALL propagate to the guest mirror

#### Scenario: Reload preserves the public/private authority split

- **GIVEN** a guest with synced co-op campaign state
- **WHEN** the guest reloads
- **THEN** the guest SHALL re-hydrate its mirror from the host over the transport
- **AND** GM-private host controls and data SHALL remain hidden from the guest after reload
- **AND** the guest's public campaign state SHALL remain consistent with the host's

### Requirement: Co-op Campaign Journey UI Audit Coverage

The system SHALL run a UI audit pass over the exact co-op campaign flow set exercised by the two-browser journey, following the repo's existing UX-audit / command-evidence harness pattern (`qc:ux-audit`, `qc:command-evidence`). The audit SHALL capture per-flow evidence and assert, for each audited co-op surface: screen fit (no overflow/clipping at the target viewport), clickability (interactive controls are reachable and enabled when their action is available), private/public visibility (guest surfaces omit GM-private controls and data), and action completion (each primary co-op action reaches a resolved terminal state, not a silent no-op).

#### Scenario: Co-op flow set produces an evidence bundle

- **WHEN** the co-op campaign UI audit runs
- **THEN** it SHALL produce a per-run evidence bundle for the audited co-op surfaces (create, join, dashboard host, dashboard guest, mission launch)
- **AND** the audit SHALL fail if any audited surface has a screen-fit, clickability, visibility, or action-completion violation

#### Scenario: Guest surfaces pass the private/public visibility check

- **WHEN** the audit inspects the guest-mode co-op surfaces
- **THEN** GM-private controls and data SHALL be absent from the captured guest evidence
- **AND** the guest public campaign projection SHALL be present
