# validation-rules-master Delta — reconcile-spec-source-of-truth

## ADDED Requirements

### Requirement: Spec Source-of-Truth Integrity

The spec-validation tooling SHALL enforce that every capability spec carries a real,
non-placeholder Purpose and that every code home has exactly one authoritative capability.
A spec-purpose lint check SHALL FAIL when a `openspec/specs/<capability>/spec.md` `## Purpose`
body contains the placeholder string `TBD - created by archiving`, is empty, or is a bare
`TBD`. Each code home SHALL be owned by exactly one authoritative capability; any second
capability describing the same code area SHALL either merge into the authoritative capability
or declare its Purpose as an explicit pointer to it. Known legacy violations MAY be carried on
an auditable, drainable allowlist that records the owning change, but a NEWLY introduced
placeholder Purpose or undeclared duplicate owner SHALL fail the gate immediately.

#### Scenario: Placeholder Purpose fails the lint gate

- **GIVEN** a capability spec whose `## Purpose` body contains `TBD - created by archiving`
- **WHEN** the spec-purpose lint check runs and that capability is not on the legacy allowlist
- **THEN** the check SHALL exit non-zero and name the offending capability
- **AND** a real Purpose, or addition to the auditable allowlist with its owning change, SHALL
  be required before the gate passes.

#### Scenario: Real Purpose passes the lint gate

- **GIVEN** a capability spec whose `## Purpose` body is a non-empty sentence that is neither
  `TBD` nor the archive placeholder
- **WHEN** the spec-purpose lint check runs
- **THEN** the check SHALL accept that capability with no finding.

#### Scenario: Duplicate code-home owner is flagged

- **GIVEN** two capabilities (for example `critical-hit-resolution` and `critical-hit-system`)
  that describe the same code home and neither declares its Purpose as a pointer to the other
- **WHEN** the one-spec-per-capability check runs and the pair is not on the duplicate-owner
  allowlist
- **THEN** the check SHALL report a duplicate-authoritative-owner violation
- **AND** the pair SHALL be resolved by merging the second capability or rewriting its Purpose
  as a pointer to the authoritative one before the allowlist entry is removed.

#### Scenario: Allowlisted legacy violations are tracked, not silently exempt

- **GIVEN** the initial run after the guard lands, with 125 capabilities carrying the legacy
  placeholder Purpose and the known duplicate-owner pairs present
- **WHEN** the lint check runs in tracking mode
- **THEN** each allowlisted entry SHALL be reported as tracked source-of-truth debt with its
  owning change recorded
- **AND** removing an entry from the allowlist while the violation remains SHALL fail the gate,
  so the allowlist can only shrink as real Purposes and merges land.
