## ADDED Requirements

### Requirement: Saved Custom Unit Campaign Handoff Trust Anchor Journey

Journey QC SHALL include a browser trust anchor that saves a customized canonical BattleMech, reads its server-issued custom-unit id, selects that exact saved design during campaign creation, and proves the same source identity and source kind through production wizard submission, campaign roster/root-force server persistence, and cold-reloaded campaign surfaces. `camp01-authority-receipt/v1` SHALL provide one strict shared producer/validator whose literal versioned `WAVE_CONTRACTS` table owns each wave and the first-class `proof-02-reproduction` contract's command id, exact normalized argv/digest, declared reporter/test/status/fingerprint rules, typed predicates, writer-created isolated run root, allowed artifacts, and producer/validator arguments. Reviewed-head/exact-main proof SHALL execute from a newly created detached worktree at the verified commit, require matching HEAD/tree plus clean index/tracked/untracked state before and after, run every repo-local writer/runner/test from that checkout, confine artifacts beneath its repo-relative non-reparse run root, reject path/symlink/junction escapes, and retain commit/tree/clean facts without the local path. Before execution the writer SHALL exact-match the candidate command to its row, generate the run id, own `command-result.json`, retain only allowlisted command ids/digests rather than raw argv/environment/path, and reject substituted commands or caller-authored, stale, pre-created, or cross-run artifacts. Before repair child specs/products, writer-produced PROOF-02 reproduction on fetched exact main SHALL record pre-repair SHA/tree, run id, external finalized-receipt digest, the three exact failing ids/statuses/fingerprints, zero unexpected failures, and clean execution facts. CAMP-01H/archive SHALL require fetched `origin/main` checkout/receipt identity, exact-main `qc:command:browser:quick` with zero failures across its complete observed aggregate, exact passed statuses for the same three ids, and writer-generated `proof02-repairs.json` binding each cause to its reproduction receipt plus a separately merged/reviewed/ledgered child OpenSpec whose SHA precedes every reviewed repair-product commit; canonical product authors SHALL be derived from verified PR metadata, match asserted owners, and differ for distinct causes. Failures or missing provenance SHALL remain explicit blockers and SHALL NOT be waived or repaired inside CAMP-01. Screenshots support layout/accessibility but SHALL NOT substitute for API, store, persistence, or reload evidence.

#### Scenario: Saved custom identity enters campaign creation

- **GIVEN** the browser customizes and saves a canonical BattleMech
- **WHEN** the custom-unit API returns `<customId>` and campaign creation loads Saved Designs
- **THEN** the roster step SHALL expose a named control for that exact saved design
- **AND** selecting it SHALL create a distinct roster-instance id whose `unitRef` equals `<customId>`
- **AND** the selected draft entry's `unitSource` SHALL equal `custom`

#### Scenario: Campaign and root force persist separate identities

- **WHEN** the campaign is submitted with the saved custom BattleMech through the production wizard path
- **THEN** the journey SHALL observe the wizard's real server PUT and accepted response without invoking a test-only persistence helper
- **AND** browser roster state and server-backed campaign persistence SHALL contain the same roster-instance id, `<customId>` source ref, and `custom` source kind
- **AND** root-force state SHALL contain the roster-instance id
- **AND** no stock-template fallback id or copied construction payload SHALL appear

#### Scenario: Cold reload preserves the handoff

- **WHEN** the journey cold reloads and visits the campaign dashboard, Forces, Mech Bay, and mission readiness
- **THEN** each applicable surface SHALL reconcile to the same roster-instance id and `<customId>` source ref
- **AND** the Mech Bay SHALL identify the saved design from custom metadata
- **AND** mission readiness SHALL include the custom roster instance without replacing it with a stock unit
- **AND** mission readiness SHALL name that instance's canonical-combat-unavailable reason and mark the custom row non-launchable
- **AND** the custom row SHALL remain unselected while canonical launch-capable rows remain selectable
- **AND** no force/encounter request or game session mutation SHALL occur for the custom row

#### Scenario: Visual and accessibility evidence is paired with authority proof

- **WHEN** the journey inspects the roster step at desktop width and 390×844
- **THEN** it SHALL capture the Stock Templates and Saved Designs groups, saved-unit control names, focus behavior, loading/empty/error recovery, and add/remove feedback
- **AND** the evidence receipt SHALL pair those screenshots with route, custom-unit API, browser store, persisted campaign/force, and post-reload assertions

#### Scenario: Authority evidence is mechanically validated and privacy-safe

- **GIVEN** a wave produces synthetic test results, screenshots, traces, videos, or JSON receipts
- **WHEN** the shared producer publishes one finalized run beneath `.sisyphus/evidence/playtest/camp01*-<sha>/<run-id>/` and the validator checks its run root
- **THEN** detached-worktree HEAD/tree and clean-before/after facts, directory SHA, wave/run/command ids, canonical-argv digest, declared reporter/test/status/fingerprint contracts, artifact names/digests, schema version, and every required per-wave assertion SHALL match
- **AND** an unknown/missing key, undeclared artifact, altered/omitted/substituted command, mismatched digest/SHA/run id, raw argv/environment/payload, private dump, credential, or real-user field SHALL fail validation
- **AND** only allowlisted ids, source kinds, command ids/digests, exact test ids/statuses, equality/boolean results, route/status facts, counters, artifact names/digests, and non-sensitive versions SHALL remain
