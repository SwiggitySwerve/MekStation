# coop-campaign-sync — Delta for route-coop-battle-reconciliation

## ADDED Requirements

### Requirement: Host Post-Battle Reconciliation Routes Over the Campaign-Sync Transport

When a co-op campaign **host** resolves a battle, the post-battle campaign consequences — the funds change, salvage value, and roster changes derived as `ICoopBattleConsequences` — SHALL be reconciled into the shared campaign by sending a single `ReconcileBattle` host-intent over the campaign-sync transport to the **server-resident** `CampaignMatchHost`, and SHALL NOT be applied to a browser-local `CampaignMatchHost`. The server SHALL decompose the `ReconcileBattle` intent through the authoritative `reconcileCoopBattle` path so the resulting `FundsChanged`, `SalvageAllocated`, and `RosterUnitChanged` events are appended to the shared campaign event log and broadcast to every connected guest mirror.

The reconciliation SHALL be idempotent per resolved battle: a duplicate `ReconcileBattle` for a battle already reconciled on the server SHALL commit no additional campaign events. `ReconcileBattle` SHALL be carried on the host-intent wire frame only and SHALL NOT be added to the guest-facing campaign-intent validation set.

When no host-role campaign-sync transport is connected, the host reconciliation SHALL degrade to a locally-persisted outcome plus a surfaced notice, and SHALL NOT route the reconciliation into a disconnected browser-local `CampaignMatchHost`. A single-player campaign SHALL be unaffected by this routing.

#### Scenario: Host reconciliation reaches the guest mirror live

- **GIVEN** a co-op campaign with a host and a connected guest in a separate browser process
- **AND** an active host-role campaign-sync transport for the match
- **WHEN** a co-op battle resolves and the host reconciles its outcome
- **THEN** the host SHALL send a single `ReconcileBattle` host-intent over the transport rather than mutating a browser-local `CampaignMatchHost`
- **AND** the server-resident `CampaignMatchHost` SHALL commit the resulting `FundsChanged`, `SalvageAllocated`, and `RosterUnitChanged` events to the shared campaign event log
- **AND** those events SHALL be broadcast to the guest so the guest mirror converges on the same post-battle funds, salvage pool, and roster **without a reload**

#### Scenario: Duplicate reconciliation is idempotent

- **GIVEN** a host that has already reconciled a resolved battle's outcome over the transport
- **WHEN** a second `ReconcileBattle` host-intent for the **same** resolved battle reaches the server (for example after a host reconnect or a duplicated frame)
- **THEN** the server SHALL treat it as a no-op acknowledgement
- **AND** no additional `FundsChanged`, `SalvageAllocated`, or `RosterUnitChanged` events SHALL be committed
- **AND** the guest mirror's funds, salvage pool, and roster SHALL be unchanged from the first reconciliation

#### Scenario: No-transport reconciliation degrades without touching a disconnected registry

- **GIVEN** a host-mode co-op campaign whose host-role campaign-sync transport is not connected
- **WHEN** a co-op battle resolves and the host reconciles its outcome
- **THEN** the outcome SHALL remain locally persisted and a notice SHALL be surfaced to the host that the live push is unavailable
- **AND** the reconciliation SHALL NOT be applied to a disconnected browser-local `CampaignMatchHost`
- **AND** when the transport reconnects or the guest rejoins, the guest SHALL converge on the host's post-battle state via the snapshot/refetch path

#### Scenario: Single-player campaign is unaffected

- **GIVEN** a single-player campaign with `coopSession === undefined`
- **WHEN** a battle resolves and its outcome is reconciled into the campaign
- **THEN** the reconciliation SHALL proceed through the existing single-player post-battle path
- **AND** no `ReconcileBattle` host-intent SHALL be sent
- **AND** the campaign's funds, salvage, and roster SHALL update exactly as they did before this change
