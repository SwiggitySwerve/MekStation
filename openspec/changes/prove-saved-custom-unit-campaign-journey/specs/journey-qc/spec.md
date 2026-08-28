## ADDED Requirements

### Requirement: CAMP-01H Proves Three Independent Authority Journeys

Journey QC SHALL prove exactly three independently evidenced session witnesses of campaign behavior the application ships today on one exact SHA and SHALL reconcile the resulting gameplay experience without making custom units combat-capable. REDUCED CLAIM (amended 2026-08-09 per the program owner's 2026-08-08 decision, following the acceptance-decoupling declaration): this requirement REDUCES the original saved-custom-unit boundary claim rather than satisfying it — server-issued custom-unit identity, roster-instance identity, custom source kind without substitution, custom-launch blocking, and the live server-session command/terminal/post-battle consequence chain are NOT attested by the redefined witnesses, remain unbuilt as attestations (measurement re-verified 2026-08-20 per the CAMP-R3 ledger entry: `unitSource` and `RosterUnitSource` now carry 16 and 8 tracked product files respectively from the merged CAMP-01A–H wave series, while `rosterInstanceId` and the entity-id alternation remain at zero tracked product files; the prior 2026-08-09 measurement recorded zero across all four; the amendment updates the measurement only — the boundary attestations remain un-attested and the reduction stands unchanged), and remain owned by the CAMP-01 product wave series. The witness labels `custom-save-reload`, `campaign-mech-bay-readiness`, and `canonical-combat-post-battle` persist solely as machinery identifiers; the receipt machinery's fact-slot contract continues to name the unreduced entities and therefore continues to be fixture-satisfiable only — re-pointing it to the reduced claims is declared product-wave work, never a silent fold here. No green run under this requirement SHALL be cited as satisfying the unreduced claim.

#### Scenario: Three witnesses are independent and continuous

- **WHEN** the CAMP-01H writer starts the parent run
- **THEN** it SHALL issue exactly one `custom-save-reload`, one `campaign-mech-bay-readiness`, and one `canonical-combat-post-battle` witness
- **AND** their child execution ids, browser-context ids, and durable report-digest sets SHALL be pairwise distinct
- **AND** each final witness SHALL contain non-empty route, API, store, persistence, navigation, and cold-reload evidence
- **AND** shared entity or campaign ids MAY prove continuity but SHALL NOT substitute for independent evidence

#### Scenario: Shipped campaign persistence survives save and reload

- **WHEN** the custom save/reload and campaign-readiness witnesses complete
- **THEN** a Mech Bay refit order routed through the campaign customizer SHALL be saved, and mission readiness SHALL refresh its deployment validation on return
- **AND** a player-safe merchant reversal SHALL save to and reload from the server campaign list
- **AND** previewed and approved campaign travel consequences SHALL survive reload
- **AND** the deep-play and layout gates SHALL pass on the shipped campaign Mech Bay and readiness surfaces

#### Scenario: Long-campaign checkpoints persist and reload

- **WHEN** the canonical combat/post-battle witness runs
- **THEN** a ten-contract campaign's accumulated checkpoints SHALL reload and inspect identically
- **AND** the swept campaign and game-session surfaces SHALL pass the viewport layout gates
- **AND** the unreduced combat-chain claim (server session, accepted command, terminal result, post-battle consequence) SHALL remain deferred to the product wave series and SHALL NOT be inferred from this witness

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
