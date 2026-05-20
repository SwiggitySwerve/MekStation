# Spec Delta: Combat Resolution — Indirect Fire Dispatch

## ADDED Requirements

### Requirement: Indirect-Fire Dispatch

The combat resolver SHALL invoke `InteractiveSession.computeIndirectFireContext` before `computeToHit` whenever an attack's weapon mode is `'Indirect'` OR the attacker has no line of sight to the target. The returned `IIndirectFireResolution` SHALL be folded into the attack record and the `toHitPenalty` SHALL be added to the running to-hit number.

#### Scenario: Indirect mode triggers dispatch

- **GIVEN** attacker A has weapon W toggled to `mode: 'Indirect'`
- **WHEN** A declares an attack against hex H
- **THEN** the resolver SHALL call `computeIndirectFireContext(A.id, W.id, H)` before `computeToHit`
- **AND** the resolution SHALL be attached to the attack record as `attackRecord.indirectFire = IIndirectFireResolution`

#### Scenario: No LOS triggers dispatch even when mode is Direct

- **GIVEN** attacker A has weapon W in `mode: 'Direct'`
- **AND** A has no line of sight to target hex H
- **WHEN** A declares an attack against H
- **THEN** the resolver SHALL call `computeIndirectFireContext` to check whether indirect resolution is available
- **AND** if the resolution is `{ permitted: true, isIndirect: true }`, the attack SHALL proceed as indirect
- **AND** if the resolution is `{ permitted: false }`, the attack SHALL be rejected with the resolution's `reason` field

#### Scenario: LOS + Direct mode bypasses dispatch

- **GIVEN** attacker A has line of sight to target T
- **AND** weapon W is in `mode: 'Direct'`
- **WHEN** A declares an attack against T
- **THEN** the resolver SHALL NOT call `computeIndirectFireContext`
- **AND** the attack SHALL resolve via the existing direct-fire pipeline

### Requirement: Indirect-Fire Event Coverage

The typed combat event log SHALL emit one of four event variants whenever an indirect-fire resolution is computed: `IndirectFireSpotterSelected` (basis='los'), `IndirectFireNarcOverride` (basis='narc' or 'inarc'), `IndirectFireForwardObserver` (FO SPA cancelled the spotter-walked penalty), or `IndirectFireSpotterLost` (spotter destroyed before damage resolution).

#### Scenario: LOS spotter selected — emits IndirectFireSpotterSelected

- **GIVEN** an indirect attack resolves with a friendly LOS spotter elected
- **WHEN** `computeIndirectFireContext` completes
- **THEN** an `IndirectFireSpotterSelected` event SHALL be emitted with fields `{ attackerId, spotterId, weaponId, ammoId, targetHex, toHitPenalty, basis: 'los' }`

#### Scenario: NARC override — emits IndirectFireNarcOverride

- **GIVEN** an indirect attack resolves via NARC override (no LOS spotter, target NARC-marked by friendly team)
- **WHEN** `computeIndirectFireContext` completes
- **THEN** an `IndirectFireNarcOverride` event SHALL be emitted with fields `{ attackerId, spotterId: null, weaponId, ammoId, targetHex, toHitPenalty, basis: 'narc' | 'inarc' }`

#### Scenario: Forward Observer SPA active — emits IndirectFireForwardObserver

- **GIVEN** an indirect attack with a walking spotter whose pilot has the `FORWARD_OBSERVER` SPA
- **WHEN** the resolver cancels the +1 spotter-walked penalty
- **THEN** an `IndirectFireForwardObserver` event SHALL be emitted with fields `{ attackerId, spotterId, weaponId, basis: 'los', penaltyCancelled: 1 }`
- **AND** this event SHALL be emitted in addition to (not instead of) the `IndirectFireSpotterSelected` event

#### Scenario: Spotter destroyed mid-attack — emits IndirectFireSpotterLost

- **GIVEN** a spotter elected at to-hit time
- **WHEN** the spotter is destroyed by an intervening attack before damage resolution
- **THEN** an `IndirectFireSpotterLost` event SHALL be emitted with fields `{ attackerId, spotterId, weaponId, ammoId, targetHex, reason: 'Spotter destroyed before resolution' }`
- **AND** the attack outcome SHALL be `'auto-miss'` with ammo + heat still consumed

#### Scenario: Event log replay round-trips indirect events

- **GIVEN** an indirect-fire attack with all four event types in the JSONL event log
- **WHEN** the replay loader replays the log
- **THEN** the four event types SHALL be parsed without loss
- **AND** the columnar formatter SHALL render each with its stable fields per the line-format suite

### Requirement: Spotter-Fire Penalty on Elected Spotter

The spotter unit elected for an indirect-fire attack SHALL receive a +1 to-hit modifier on any of its OWN direct-fire attacks during the same turn, mirroring MegaMek's `ComputeAttackerToHitMods.java:172-177` rule. This penalty SHALL apply for the entire turn once the spotter has been elected, even if a subsequent indirect attack invalidates the spotter via liveness check.

#### Scenario: Spotter takes its own attack — +1 penalty

- **GIVEN** spotter S was elected for attacker A's indirect attack
- **WHEN** S subsequently fires its own direct attack on a different target
- **THEN** S's to-hit calculation SHALL include `+1 spotting-fire` modifier
- **AND** the modifier SHALL be tagged in the to-hit breakdown as `'Spotting for indirect fire'`

#### Scenario: Penalty persists after spotter-lost auto-miss

- **GIVEN** S was elected as spotter and S was subsequently destroyed before A's damage step
- **WHEN** S's earlier own-attacks are replayed
- **THEN** the +1 spotting-fire penalty SHALL still apply (the penalty is fixed at election time, not retroactively cancelled)
