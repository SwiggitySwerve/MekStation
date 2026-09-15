# Admission findings and evidence limits

Five independent native Luna/high lanes inspected live source, active OpenSpec packages, local worker routes and read-only GitHub delivery settings on 2026-09-12. This is an admission audit, not a fresh runtime acceptance run. The baseline and all original task text are retained in evidence/admission-snapshot.json.

## Customizer and delivery

The existing local changes include verified explicit-tab precedence, Infantry shared preview, print/export browser proof, a production PR browser gate, 37 existing canonical updates, three new canonical specs, reference cleanup and three approved archives. They must be split into independently buildable PRs. Routing, Infantry, browser proof and CI are separate initial slices; domain reconciliation and post-merge closure follow their own ownership.

Live repository SwiggitySwerve/MekStation main and origin/main matched be7f85b867aa3e8576e5e3d27e309276203bc24b at admission. There were no open PRs. Required contexts are Lint and Test and Build Test / win, mac and linux. Strict branch currency, admin enforcement, conversation resolution and stale-approval dismissal are enabled; general required approvals are zero. The main ruleset is disabled. Re-read live settings before each merge. The new customizer job is enforced through aggregator membership, with remote activation still open.

Ignored raw logs and browser output are not automatically publication artifacts. Commit reviewable JSON/Markdown manifests and hashes; retain source logs durably. Select any required raw log explicitly. Seven-day CI uploads are useful run artifacts, not a substitute for long-lived required closure evidence.

## Campaign receipts and saved combat

scripts/qc/camp01-github-provenance.mjs enforces exact PR/head/merge identity and eligible non-author APPROVED reviews. The narrow solo-maintainer proof exception carries reduced claims and does not waive roster P.2. Existing receipts in the historical proof checkout name older main tips. They can serve only where a validator accepts historical predecessor inputs; they do not establish current supported-custom H or final 9.1 acceptance.

Current custom-combat source includes strict saved construction, server SQLite resolution, source-aware catalog/readiness/materialization, immutable GameCreated snapshots, recovery/replay and redaction seams. e2e/saved-custom-combat.spec.ts stops at campaign persistence and Mech Bay reload. Add actual supported-custom launch, command/terminal and post-battle persistence proof before CAMP-01H. Supported custom definitions remain server-saved biped BattleMechs; local-only/unsupported definitions fail closed and fast-forward remains canonical-only.

src/lib/campaign/sync/JournalCampaignEventStore.ts keeps CAMPAIGN_JOURNAL_AUTHORITY_ENABLED false. E2E opt-in does not prove production cutover. Checked campaign-authority tasks retain client Zustand mutation/cache, debounce loss, host-view staleness and real source-to-replica convergence nonclaims. Audit and reproduce those boundaries before narrowly repairing producer/cache wiring; then prove two independent server processes and durable restart/catch-up.

## Combat journal, effects and branches

src/lib/multiplayer/server/matchJournalAuthority.ts keeps COMBAT_JOURNAL_AUTHORITY_MODE off. ServerMatchHostJournalAuthority.ts still persists enabled-path batches through legacy mp_match_events and the started marker. history/matchStoreBranchSegmentReader.ts documents empty journal branch reads and unsupported non-root suffixes. SQLiteEventJournalWriter exists, but its presence does not mean live combat uses it.

Existing mp_combat_outcome_outbox and campaignCombatOutcomeInbox are older outcome-specific paths. They do not provide the planned immutable semantic bytes, branch/generation admission, target-scoped versioned identity and server-only effect principal. Reuse valid transactions and tests while implementing the missing contracts separately.

Branch PR1 storage/resolver and PR2 candidate scaffolding exist. Production branch selection/creation and rewind still have explicit refusal paths, including no-authoritative-history and fog-preview-unsupported. Parent reviewed the dependency repair: available branch storage precedes cutover; live rewind follows cutover; the September 2 PR1–3 exemption remains; PR4+ requires full cross-stream terminal/archive/prune evidence. No original checkbox or task identifier was changed by this repair.

## Vault, travel and maps

UnitRepository and VersionRepository already provide monotonic custom-unit SQLite versions. RosterUnitProjection and RosterUnitSource already carry explicit source identity, with missing source treated as legacy canonical and invalid values rejected. CreateCampaignPage.submit mints instance IDs. Preserve those implementations; pilot version authority remains a separate decision.

src/lib/campaign/persistence/campaignMigration.ts already occupies schema v2 for authority metadata. The old planned v1-to-v2 provenance migration would conflict. Specify the next compatible rung before implementation, preserve prior readers/data, and update frozen CAMP F/G/H digests through their declared reviewed seam when roster shape changes.

starmapTravelPreview already calculates elapsed days, fees, arrival date and projected day processing. useCampaignStore.dayActions commits the preview and persists travel. Extend authoritative travel/opportunity events, seeded generation, expiry, acceptance and co-op projection; do not rebuild the existing economy from the old zero-cost description.

HexMapDisplay already has SVG 2.5D isometric projection, elevation, camera controls, depth ordering and occlusion. Reuse it for picking/overlay/intent/preference parity and measured 4v4 performance. Retain 2D default/fallback. New renderer dependencies or model acquisition are separate decisions, with rights/provenance required.

## Finite inventory disposition

The 22 needs-proof and 18 preserve-planned rows are all present in roadmap.json. Prior inventory notes are inputs, not current runtime proof. Resolve pointer-only drift with verified source links. Assign a reproduced in-scope behavior gap to a bounded repair. Preserve explicit future/out-of-scope contracts with their source and reason. Do not infer 40 missing features or reopen all 220 capabilities.
