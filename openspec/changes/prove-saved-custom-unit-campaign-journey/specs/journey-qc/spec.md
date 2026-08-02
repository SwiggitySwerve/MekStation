## ADDED Requirements

### Requirement: CAMP-01H Proves Three Independent Authority Journeys

Journey QC SHALL prove the saved-custom-unit campaign boundary through exactly three independently evidenced session witnesses on one exact SHA and SHALL reconcile the resulting gameplay experience without making custom units combat-capable.

#### Scenario: Three witnesses are independent and continuous

- **WHEN** the CAMP-01H writer starts the parent run
- **THEN** it SHALL issue exactly one `custom-save-reload`, one `campaign-mech-bay-readiness`, and one `canonical-combat-post-battle` witness
- **AND** their child execution ids, browser-context ids, and durable report-digest sets SHALL be pairwise distinct
- **AND** each final witness SHALL contain non-empty route, API, store, persistence, navigation, and cold-reload evidence
- **AND** shared entity or campaign ids MAY prove continuity but SHALL NOT substitute for independent evidence

#### Scenario: Custom source reaches readiness without launch substitution

- **WHEN** the custom save/reload and campaign-readiness witnesses complete
- **THEN** their saved-design, roster-instance, campaign, and mission identities SHALL match the authoritative source chain
- **AND** the custom row SHALL remain visible after cold reload
- **AND** unsupported custom launch SHALL be blocked before encounter or session side effects
- **AND** no canonical unit SHALL replace the custom source

#### Scenario: Canonical witness proves battle and post-battle persistence

- **WHEN** the canonical combat witness runs
- **THEN** an admitted stock selection SHALL launch a real server session
- **AND** a player command SHALL be visible and accepted
- **AND** session navigation and reload SHALL preserve authority
- **AND** a terminal result SHALL be observed before campaign return
- **AND** an accepted post-battle consequence SHALL remain present after a cold reload
- **AND** the saved custom design SHALL remain unchanged

#### Scenario: Experience reconciliation is source-backed

- **WHEN** CAMP-01H reconciles the three witnesses
- **THEN** each session SHALL record source-linked positives and findings
- **AND** findings SHALL distinguish confirmed defects, inferred risks, coverage gaps, and environment limits
- **AND** desktop, mobile, accessibility, visibility, feedback, recovery, cognitive load, playability, and enjoyment SHALL be assessed
- **AND** every reproducible Critical/Major SHALL have a verified focused repair or explicit external blocker while lower severity remains ranked
- **AND** screenshots alone SHALL NOT prove authority or persistence

#### Scenario: Complete failure observation cannot satisfy final proof

- **GIVEN** all six immutable commands were attempted in order with ordinary exit codes
- **WHEN** a report or authority fact fails
- **THEN** a schema-complete observation MAY publish only when every unavailable fact binds the exact failed or missing report observation and fingerprint
- **AND** every cause SHALL map to one repair, blocker, or lower-severity disposition
- **AND** the observation SHALL remain follower-ineligible
- **AND** abnormal exit or incomplete reports SHALL publish no authoritative observation

#### Scenario: Final requires a fresh post-repair run

- **WHEN** every required repair and cleanup or explicit blocker is complete
- **THEN** CAMP-01H SHALL rerun all six row-ordered commands from fresh exact-main contexts
- **AND** every invocation, report, wave assertion, witness, combat fact, and reconciliation fact SHALL pass
- **AND** the controller SHALL reject reused evidence, narrative command expansion, or unresolved observation history
