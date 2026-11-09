## ADDED Requirements

### Requirement: Pinned OpenSpec validation entrypoint

The repository SHALL provide `openspec:validate` using
`npx --yes @fission-ai/openspec@1.5.0 validate --all --strict`. The rules gate,
roadmap main proof, and executable QC catalogs SHALL invoke this script without
adding a dependency or changing the lockfile.

#### Scenario: Strict validation uses the approved scoped CLI

- **WHEN** the rules gate, roadmap main proof, or a QC catalog validates all
  OpenSpec items
- **THEN** it SHALL invoke `openspec:validate`
- **AND** the script SHALL resolve the scoped CLI at version 1.5.0

### Requirement: Unique active delta operation headers

The OpenSpec CI quality validator SHALL reject any active change delta at
`openspec/changes/*/specs/**/spec.md` that contains more than one heading for the
same ADDED, MODIFIED, REMOVED, or RENAMED operation. It SHALL report the file,
operation, and line numbers. PR static checks SHALL run this validator and its
Node regression tests for code, docs-only, and OpenSpec-only pull requests.

#### Scenario: An active delta repeats an operation

- **GIVEN** an active delta with two `## ADDED Requirements` headings
- **WHEN** the CI quality validator runs
- **THEN** it SHALL fail and identify both heading lines in that file

#### Scenario: Clean active deltas and historical archives

- **GIVEN** at most one heading per operation in each active delta
- **AND** duplicate headings exist only in an archive or non-delta file
- **WHEN** the duplicate-header check runs
- **THEN** it SHALL pass
- **AND** headings in separate files SHALL be counted independently

#### Scenario: A pull request changes only documentation or OpenSpec

- **WHEN** Detect Changes classifies the pull request without code changes
- **THEN** PR static checks SHALL still run the validator and its Node tests
