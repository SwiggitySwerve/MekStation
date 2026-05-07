## ADDED Requirements

### Requirement: AttackResolved Side-Effect Chain Ordering

When a weapon attack resolves with `hit: true`, the simulation runner SHALL emit the resulting events in causal-deterministic order so consumers can replay the cascade without ambiguity. The canonical ordering for a single resolved hit is:

1. `attack_resolved` (the GATOR-validated outcome of the to-hit roll)
2. `damage_applied` (one event per location that takes damage; for cluster weapons, one per cluster after the cluster-hits-table roll)
3. `location_destroyed` (if the location's structure dropped to 0; carries `viaTransfer: false` for the directly-hit location)
4. `transfer_damage` (if there is residual damage to transfer to a parent location)
5. `damage_applied` (cascade — repeats steps 2-4 for each transfer until a location absorbs the residual or the unit is destroyed)
6. `critical_hit` (one event per crit roll triggered by the damage chain)
7. `critical_hit_resolved` (one event per slot resolved by the crit)
8. `component_destroyed` (one event per destroyed component slot)
9. `unit_destroyed` (if the cascade caused unit destruction; carries the canonical `cause`)

For cluster / multi-location attacks (LRMs, SRMs, LB-X, etc.), the runner SHALL repeat steps 2-8 once per cluster in the order produced by the per-cluster location rolls.

For misses (`hit: false`), the runner SHALL emit `attack_resolved` and SHALL NOT emit any of the side-effect events 2-9.

#### Scenario: Hit producing direct damage with no transfer emits the minimum chain

- **GIVEN** a weapon attack that hits with damage less than the location's armor remaining
- **WHEN** the runner resolves the attack
- **THEN** the event log SHALL contain `attack_resolved` (hit=true) followed by `damage_applied` for the hit location
- **AND** the runner SHALL NOT emit `location_destroyed`, `transfer_damage`, `critical_hit`, or `unit_destroyed` for this hit

#### Scenario: Hit destroying a location triggers the transfer chain

- **GIVEN** a weapon attack whose damage exceeds the hit location's combined armor + structure
- **WHEN** the runner resolves the attack
- **THEN** the events SHALL appear in order: `attack_resolved`, `damage_applied` (hit location), `location_destroyed` (`viaTransfer: false`), `transfer_damage` (toLocation = parent), `damage_applied` (parent location)
- **AND** if the parent location also destroys, the chain SHALL continue (`location_destroyed` with `viaTransfer: true` for the parent), terminating either when residual damage is absorbed or when the unit is destroyed

#### Scenario: Cluster weapon emits per-cluster damage events

- **GIVEN** an LRM-20 attack that hits with the cluster-hits-table producing 11 missiles
- **WHEN** the runner resolves the attack
- **THEN** the events SHALL contain exactly one `attack_resolved`
- **AND** the events SHALL contain at least 11 `damage_applied` events (one per cluster), distributed by the per-cluster location roll
- **AND** the cluster's per-location damage chain (steps 3-8) SHALL repeat for each cluster that destroys a location

#### Scenario: Miss emits only attack_resolved

- **GIVEN** a weapon attack with `roll < toHitNumber`
- **WHEN** the runner resolves the attack
- **THEN** the event log SHALL contain exactly one `attack_resolved` event with `hit: false`
- **AND** the event log SHALL NOT contain any of `damage_applied`, `location_destroyed`, `transfer_damage`, `critical_hit`, `critical_hit_resolved`, `component_destroyed`, `unit_destroyed` causally attributable to this attack
