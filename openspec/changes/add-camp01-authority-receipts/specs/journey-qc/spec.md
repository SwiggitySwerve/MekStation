## ADDED Requirements

### Requirement: CAMP-01 Immutable Authority Command Registry

Journey QC SHALL provide a strict `camp01-authority-receipt/v1` registry whose source-controlled rows bind each CAMP wave to one command id, deterministic repo-relative run-root template, exact ordered command arrays, UTF-8 `JSON.stringify` SHA-256 digest, child OpenSpec, reporter/observation contracts, assertions, artifacts, predecessors, and `product-pr|audit-pr|none` cap subject with compatible file/changed-line caps. The registry SHALL include `camp-proof`, `proof-02-reproduction`, `proof-02-triage`, and `camp-00` through `camp-01h` with the exact roots, sequences, predecessor graph, cap subjects/caps, and digests in this change's design, plus exactly one later source-controlled cause-derived product row for every distinct repair-required PROOF triage or H observation cause.

#### Scenario: Known row executes its immutable sequence

- **WHEN** the writer receives a known wave and matching command id
- **THEN** it SHALL recompute the row's canonical digest before execution
- **AND** the caller run root SHALL equal the row template after its sole `<sha>` token is replaced by the expected SHA
- **AND** it SHALL spawn each exact sequence element in order with `shell:false`

#### Scenario: Command substitution fails before execution

- **WHEN** a caller supplies command text or a row has altered, omitted, reordered, substituted, chained, digest-mismatched argv, or a non-canonical run root
- **THEN** the writer SHALL reject the run before bootstrap or command execution

#### Scenario: CAMP-PROOF waits for every child specification

- **WHEN** a reviewed-head or exact-main `camp-proof` write begins
- **THEN** the controller SHALL require the exact ten-name `PROGRAM_CHILD_CHANGES` set and one approved merge tuple per name
- **AND** it SHALL verify every child directory and ledger entry at its merge SHA on freshly fetched canonical main
- **AND** any missing, extra, unmerged, unapproved, or unledgered child SHALL fail before the product command executes

#### Scenario: Repair registration derives an unknown row from its merged spec

- **WHEN** a cause-derived PROOF or H repair row is not yet present on main and its pre-edit product target is registered
- **THEN** the controller SHALL load only the canonical `camp01-repair-row.json` from the verified ledgered repair child merge and require its closed source receipt/observation/cause tuple to match exactly one reopened `repair-required` disposition
- **AND** reviewed-head proof SHALL require the implemented registry row, namespace-derived id, predecessor array, and command digest to match that declaration exactly
- **AND** a caller row, alternate path, duplicate declaration, arbitrary/stale/cross-observation source, cause/fingerprint/id mismatch, or declaration drift SHALL fail

#### Scenario: Predecessor and PR caps gate every row

- **WHEN** a row begins reviewed-head or exact-main proof
- **THEN** every concrete predecessor receipt and applicable cleanup receipt SHALL validate
- **AND** the PROOF and H dynamic required-repair row sets SHALL separately match their durable triage/observation causes exactly, H SHALL include its named virtual predecessor, and every required row SHALL have validated reviewed-head, exact-main, and cleanup receipts
- **AND** a product/audit row's reviewed-head base-to-owned-PR-head diff SHALL stay within its caps
- **AND** exact-main SHALL require the matching reviewed-head receipt and recompute that retained base-to-head count/digest rather than derive a post-merge base
- **AND** the no-PR reproduction row SHALL instead use clean fetched exact main and inherited validated CAMP-PROOF provenance
- **AND** missing predecessors, oversized/binary diffs, or bundled later-wave work SHALL fail

### Requirement: CAMP-01 Writer-Owned Receipt Identity

The authority writer SHALL create a cryptographically random parent run id, an exclusive temporary artifact directory, and a writer-owned `command-result.json`. It SHALL accept only the row-declared wave, byte-exact resolved run root, expected SHA, provenance tuples, and mode-specific disposition inputs; reject unknown/duplicate fields, root-template mismatch, and pre-existing finalized roots; require every recorder output to carry the writer's run identity; validate all declared predicates; and atomically publish exactly one finalized child below the run root.

#### Scenario: Fresh valid run publishes atomically

- **WHEN** every immutable command, reporter, predicate, provenance, and artifact requirement passes
- **THEN** the writer SHALL rename one complete temporary run into `<run-root>/<run-id>/`
- **AND** the validator SHALL observe exactly that one finalized child and its allowlisted artifacts

#### Scenario: Stale or cross-run evidence is rejected

- **WHEN** an artifact is caller-authored, pre-created, stale, from another run, missing the writer run id, duplicated, altered, extra, or incomplete
- **THEN** publication SHALL fail without a finalized receipt

### Requirement: Exact-SHA and Canonical-Provenance Execution

Reviewed-head and exact-main authority proof SHALL run from a new detached worktree at the verified commit with matching `HEAD`/tree, clean state, and expected outside-root manifest. The controller SHALL pin GitHub repository `1014984218`/`R_kgDOPH9uGg`/`SwiggitySwerve/MekStation`, base `main`, and literal HTTPS fetch URL; use the verified absolute Git binary plus zeroed config/environment to fetch into a writer-owned empty bare proof repository; require fetched head/main OIDs to equal canonical GitHub API OIDs; verify PR heads/merges and ancestry; and accept only a non-dismissed exact-head approval by a non-author with `WRITE|MAINTAIN|ADMIN`.

#### Scenario: Reviewed head binds spec and product provenance

- **WHEN** reviewed-head proof validates
- **THEN** the receipt SHA SHALL equal the product PR head
- **AND** the product commit SHALL descend from the ledgered child spec merge
- **AND** both exact PR heads SHALL have independently verified non-author approvals

#### Scenario: Audit and no-PR rows use their own provenance subjects

- **WHEN** reviewed-head triage or exact-main reproduction validates
- **THEN** triage SHALL bind its owned audit PR while reproduction SHALL reject any owned PR tuple or target
- **AND** both SHALL inherit the validated CAMP-PROOF spec/product predecessor provenance

#### Scenario: Exact main is fetched from canonical identity

- **WHEN** exact-main proof validates after merge
- **THEN** fetched canonical main and receipt SHA SHALL equal the row's owned product or audit merge SHA
- **AND** a no-PR reproduction row SHALL accept no owned tuple/target and SHALL inherit validated CAMP-PROOF provenance
- **AND** a renamed/rewritten remote, local/system/global Git config, credential/proxy input, fork, wrong base, API-to-fetch OID drift, wrong merge/head, dismissed/self/unauthorized review, or nonliteral transport SHALL be rejected

### Requirement: Pinned CAMP-01 Execution Environment

Windows authority proof SHALL use Node `22.22.0`, npm `11.6.2`, Git `2.54.0.windows.1`, absolute verified Node/npm/Git/System32 binaries, logical `@node|@npm` registry tokens, and verified `@npm ci --fund=false --audit=false` against the exact lockfile. Each child environment SHALL be built from zero with only verified OS/tool roots, writer-owned temp/profile directories, writer-owned empty npm user/global configs, and declared `CAMP01_*`; the receipt SHALL bind safe tool/config/bootstrap/lockfile/environment-value digests without retaining paths or values.

#### Scenario: Ambient execution drift is rejected

- **WHEN** bootstrap is omitted/fails, a token expands through PATH/CWD, a tool/version/path/config/lockfile/environment digest changes, or ambient credentials, proxies, Git/Node/npm/CI/cloud/product/Playwright input survives the closed allowlist
- **THEN** authority publication SHALL fail

### Requirement: Privacy-Bounded CAMP-01 Evidence

Authority receipts SHALL retain only bounded ids/digests/status/provenance/manifest facts and exact fixture-safe PNGs where declared. They MUST NOT retain raw argv, environment values, paths, errors/stacks, reporter payloads, credentials, or non-fixture user/game data. Any PNG row SHALL use a writer-created empty browser profile/storage/runtime database seeded only from exact source-controlled fixture ids/aliases and a frozen capture contract mapping its command-sequence index to a fixed invocation id and exact sorted PNG paths; it SHALL retain one closed, sorted, digest-only attestation per contracted PNG that binds invocation/path/digest to equal guarded pre/post canonical state and mutation-counter digests plus pinned fixture-allowlist/barrier-policy digests. Waves without a capture contract require no PNGs or attestations; failure/cause fingerprints SHALL hash only bounded allowlisted canonical fields.

#### Scenario: Unsafe payload cannot enter a receipt

- **WHEN** a caller/reporter provides unsafe fields, a pre-existing profile/database/storage/privacy sentinel can reach JSON, PNG, HTML, trace, video, or another durable artifact, or a PNG capture attestation is missing, extra, reordered, substituted, or tampered
- **THEN** the writer SHALL reject the payload rather than retain or hash it

### Requirement: Durable Export and Creation-Bound Cleanup

After in-worktree validation, the controller SHALL copy only the finalized allowlisted artifact set into an exclusive sibling staging directory beneath the initiating checkout's non-reparse `.sisyphus/evidence/playtest` store, recompute every byte digest and the self-excluding `receipt-manifest.json` sorted relative-path/type/size/SHA-256 entries, externally supply/recompute the manifest-byte receipt digest, atomically rename the staging directory, and reopen and revalidate the durable export before removing the proof worktree.

The controller SHALL retain separate target records. The detached `proofTarget` SHALL contain canonical non-reparse path, Git administrative id, and expected detached HEAD with no branch ref. A PR-owning row SHALL record a subject-matched `ownedTarget` before its first product/audit edit with canonical path, administrative id, starting HEAD, exact local ref, and old OID; a no-PR row SHALL have no owned target. Pre-edited, unregistered, or wrong-subject adoption SHALL fail.

CAMP-PROOF alone MAY bootstrap its missing owned product target during reviewed-head validation. The controller SHALL derive all target facts from one explicitly selected registered worktree and require non-reparse/non-initiating identity, clean tracked/index state, the registry-pinned literal ref `refs/heads/codex/implement-camp01-authority-receipts`, `HEAD` and branch OID equal to the verified product PR head, the complete ten-child preflight, and no prior bootstrap record.

For CAMP-PROOF, reviewed-head validation SHALL derive `ownedDiffBaseSha` from the verified product head and freshly fetched canonical main, enforce its `15/500` cap, retain base/head/count/manifest-digest facts, and atomically persist the bootstrap owned target before proof-worktree creation. Exact-main SHALL require that durable reviewed-head receipt and recompute its retained base-to-head facts; deriving a post-merge base or accepting zero-diff substitution SHALL fail. Caller-authored target facts, repeated/exact-main bootstrap, bootstrap by another row, binary/alternate ranges, or any mismatch SHALL fail.

Cleanup SHALL re-read zero-delimited worktree porcelain, revalidate the proof and optional owned identities independently, advance only the owned target's expected HEAD/ref OID from matching subject-specific provenance, require clean state/manifests, use non-force removal for only recorded worktrees, compare-delete only the owned ref at its verified final OID, and publish writer-owned `wave-cleanup.json`. Every follower SHALL require all predecessor cleanup predicates to be true.

#### Scenario: Durable evidence survives proof-worktree removal

- **WHEN** a validated run is exported
- **THEN** later exact-main, repair, H, and archive consumers SHALL validate only the reopened durable bytes
- **AND** validation SHALL still pass after the proof worktree is absent

#### Scenario: Cleanup identity drift fails closed

- **WHEN** the proof or optional owned target is initiating, durable, unrecorded, dirty, reparse-backed, path/ref/HEAD/OID-drifted, mixed with another target, or selected through a glob, prefix, force flag, or recursive deletion
- **THEN** no worktree, branch, or durable evidence SHALL be deleted

#### Scenario: CAMP-PROOF bootstrap is single-use and exact-head bound

- **WHEN** CAMP-PROOF has no pre-edit owned product target because it introduces the controller
- **THEN** reviewed-head mode MAY derive one target from the clean registered exact PR-head worktree and atomically persist it before creating proof work
- **AND** a wrong local ref, second use, another command id, exact-main use, caller-authored facts, over-cap/binary/alternate-range committed diff, or identity mismatch SHALL fail without cleanup authority

### Requirement: PROOF-02 Complete Reproduction and Reviewed Triage

The `proof-02-reproduction` row SHALL publish a complete normalized aggregate for ordinary exit 0 or 1, including every observed test id/status/fingerprint, all three parent-declared historical anchors as `passed|failed|missing`, and every non-anchor failure. Passed observations SHALL have null fingerprint; failed and missing observations SHALL have a non-null writer-derived fingerprint, so every non-pass value is triageable, and null/non-null status mismatch SHALL fail. Its finalized JSON SHALL contain no self-digest; `command-result.json` SHALL contain the exact-byte digest and every consumer SHALL recompute it.

The zero-command `proof-02-triage` row SHALL require exactly one independently reviewed disposition per non-pass observation with exact set equality. For each `causeFingerprint`, the lexical-minimum observation id SHALL be the only non-alias root with null `primaryObservationId`, carry group maximum severity, and terminate in repair/blocker for Critical/Major or lower-severity otherwise; every other member SHALL be a same-fingerprint direct alias whose `primaryObservationId` equals that root. Self-reference, chains/cycles, another/nonterminal root, or missing focused repair SHALL fail.

#### Scenario: Fresh failures publish for triage

- **WHEN** the immutable aggregate completes normally with failed, missing, or unexpected tests
- **THEN** the reproduction receipt SHALL publish the complete normalized set instead of masking or vetoing it

#### Scenario: Incomplete triage blocks CAMP-00

- **WHEN** any non-pass observation lacks one valid disposition, a cause group has a self/cyclic/chained/nonterminal alias graph, or a required repair tuple is missing
- **THEN** triage validation SHALL fail
- **AND** CAMP-00 SHALL remain blocked

### Requirement: Isolated CAMP-01H Session Evidence

For `camp-01h`, the writer SHALL create exactly three labeled child execution ids for `custom-save-reload`, `campaign-mech-bay-readiness`, and `canonical-combat-post-battle`. Every witness SHALL carry the common parent run id, its assigned pairwise-distinct child id, a fresh browser-context id, an isolated artifact subtree, and a non-overlapping durable report-digest set. A schema-complete reviewed-head run MAY publish a follower-ineligible failed observation after six row-ordered ordinary exit-0/1 attempts with complete reports when every typed authority fact is present as observed or unavailable, each unavailable value exact-links the same witness's failed/missing report id/fingerprint, and every failed report maps once through the ranked finding/cause set to a deterministic repair source. Each Critical/Major cause SHALL receive one focused repair or blocker before a fresh rebased final H rerun; final requires complete unwrapped type-specific facts, non-empty route/API/store/persistence/navigation/cold-reload evidence, six passing invocations/reports, passed wave, and every H assertion.

#### Scenario: Three independent witnesses validate

- **WHEN** final H supplies exactly one complete witness of each required type
- **THEN** shared entity ids MAY establish continuity and every final authority fact SHALL be observed
- **AND** child execution ids, browser contexts, artifact subtrees, and report digests SHALL remain distinct

#### Scenario: Global, reused, or silently pending evidence cannot satisfy final H

- **WHEN** H reuses an execution id, context, report digest, or global assertion; omits a required fact/wrapper or observation receipt; has an unavailable final fact, abnormal exit, incomplete report, or unmapped/duplicate failed observation; has invalid backlog ranks; or leaves a Critical/Major finding outside the exact verified-repair/external-blocker/shared-cause set
- **THEN** authority validation SHALL fail, although a complete reviewed-head observation with only ordinary mapped failures MAY remain durable solely to source the required repair loop and cannot satisfy final H

### Requirement: CAMP Runner Integration Remains Opt-In

The Playwright wrapper, configuration, Next configuration, and every H sub-runner SHALL route Next output, runtime databases, Playwright results/HTML/snapshots/traces/videos/screenshots, UX artifacts, and declared run-aware reports below the writer-issued invocation subtree only in CAMP mode; otherwise current behavior SHALL remain unchanged. After normalized reports are written, the writer SHALL remove only the exact declared ephemeral invocation subtree and prove no ignored/untracked output changed outside the finalized run. The viewport package script SHALL invoke one Node orchestrator that owns H's same final three Playwright arrays, spawns them sequentially with `shell:false`, and returns the first failure.

#### Scenario: Default runner behavior is unchanged

- **WHEN** Playwright, UX walkthrough, or viewport commands run without CAMP environment values
- **THEN** they SHALL retain their established output locations and behavior

#### Scenario: Viewport command order cannot drift

- **WHEN** the viewport runner or H command row changes an argv element or order
- **THEN** the focused contract test SHALL fail until both literal arrays and their digest are intentionally updated

#### Scenario: H report bytes remain durable and disjoint

- **WHEN** H completes its six ordered invocations
- **THEN** it SHALL export the six exact normalized reports, two authority/experience reports per witness, and status-specific reconciliation declared in design D8/D10
- **AND** custom-save-reload SHALL own invocation reports `02,04`, campaign-mech-bay-readiness `01,05`, and canonical-combat-post-battle `03,06`
- **AND** every digest SHALL recompute from reopened durable bytes without sharing a report between witnesses

### Requirement: CAMP Receipt Artifacts Use Closed Versioned Schemas

Every artifact/environment payload SHALL satisfy closed D10 canonical schemas; identity derives exactly from observed kind/source facts; cap/manifest linkage SHALL round-trip; H observations use exact observed/unavailable fact wrappers while finals forbid unavailable facts. Failed reports map once through sorted findings to deterministic cause-row sources. Independently of D7's PROOF rule, each H `causeFingerprint` group has one lowest-backlog-rank root with null `primaryFindingId`; every other member directly names it, and self-reference, chains/cycles, another/nonterminal root, or the wrong terminal outcome fails. Manifests/digest ownership follow D10.

#### Scenario: Same-named or structurally incomplete evidence is rejected

- **WHEN** an artifact has an unknown/missing/type-invalid field, noncanonical ordering/bytes, wrong producer/schema/source/status/id set, or digest not owned by its command result
- **THEN** receipt publication and every later consumer SHALL reject it

### Requirement: CAMP Authority Controller Command

Journey QC SHALL expose `scripts/qc/run-camp01-authority-receipt.mjs` through `qc:camp01-authority-receipt:controller`. From a clean non-reparse initiating checkout it SHALL support only `register-pr-target`, `proof`, and `cleanup` with the exact subject/mode-specific arguments in design D9, store internal path-bearing target state only beneath `.sisyphus/evidence/playtest/.camp01-controller/<wave>/`, invoke low-level write/validate only inside exact-SHA proof worktrees, and never export internal state as receipt evidence.

#### Scenario: Reviewed-head and exact-main proof use the controller

- **WHEN** an operator requests authoritative proof
- **THEN** the controller SHALL create and validate the exact-SHA proof worktree, execute the immutable row, durably export/reopen the receipt, and preserve cleanup state
- **AND** direct low-level publication SHALL not satisfy authoritative proof

#### Scenario: Cleanup consumes exact internal state

- **WHEN** `cleanup` receives a validated exact-main receipt identity
- **THEN** it SHALL remove only the recorded proof target plus any subject-matched owned target/ref, publish and reopen `wave-cleanup.json`, then delete the internal target state
- **AND** unknown commands/options or mode-incompatible inputs SHALL fail
