# Project review — 2026-10-18

## Assessment

MekStation has a real shipped foundation and substantial domain engineering. It is beyond a prototype. My assessment is that it is an early released product with uneven journey reliability, while its next shared-play milestone remains under construction. I would continue investing in it, but prioritize consolidation over expanding the feature surface.

The largest risk is the distance between a locally correct subsystem and a dependable experience for a player. The next useful milestone is an ordinary user completing a supported session, recovering from interruption, and trusting the saved result. More implementation and more closure receipts help only insofar as they shorten that distance.

This review covers checkout `87c0f1508c859fe1386595c02c53501d9446b861` on `t3/5ebf9dd4`. Findings below distinguish inspected source, remotely observed CI, recorded evidence, and judgment. No product code was changed.

## What is working in the project's favor

**There is a product to consolidate.** GitHub lists published releases through [v2.1.3](https://github.com/SwiggitySwerve/MekStation/releases/tag/v2.1.3). The recorded v2.1.1 Windows portable run completed the customizer → save → restart → PDF → battle → results → reload loop. That run was agent-operated through the packaged Electron window, not a human acceptance session and not fresh v2.1.3 proof, but it is meaningful evidence of an integrated application.

**The difficult engineering receives serious attention.** Inspected paths separate authoritative intent handling, durable event history, viewer projection, and recovery. The recent spectator change explicitly checks current seat membership when deciding whether a viewer owns a sealed choice. That is substantive privacy behavior, not merely UI hiding. Source PR #2264's [CI run](https://github.com/SwiggitySwerve/MekStation/actions/runs/39125901935) has 32 successful jobs, including type checks, six unit shards, customizer regressions, seam checks, and desktop build tests.

**The team fixes problems discovered in use.** Commit `38481839a` fixes the v2.1.1 playtest's AI occupancy, victory reload, and prone-turn problems and adds regression coverage. v2.1.3 also documents text-data repairs, desktop icons, and restrictions on full match metadata. It would be inaccurate to repeat the older playtest's AI stacking and prone skipping as newly established current defects.

**The specifications and evidence are valuable.** The roadmap validator passed in this checkout, and its 86 tests passed. The program explicitly distinguishes source completion from runtime and release acceptance. Preserve that distinction, especially for authority, privacy, persistence, and migration work.

## What is not ready

### 1. Broad regression confidence is weaker than focused CI confidence

The [October 18 nightly run](https://github.com/SwiggitySwerve/MekStation/actions/runs/39129982940) failed its full Chromium suite: 922 passed, 15 failed, one flaky, 11 skipped, and five did not run. Failures span campaign economy and persistence, customizer state and presentation, tactical privacy, navigation, replay, and saved-custom-unit combat launch.

Scenario recapture also failed for six packs: navigation briefing, personnel roster, pilot experience, combat midbattle, co-op host review, and co-op guest proposal. The statistical/performance job, coverage job, and six subsystem lanes passed. This is mixed evidence, not a uniformly broken project.

Those failures are not proof of 15 independent product bugs. Logs include request aborts, missing UI elements, and an equality mismatch; separating actual regressions from harness and fixture defects requires reproduction. They do establish that the broad acceptance signal is red.

The nightly tested `1b8558625`; every intervening change through this review's HEAD is under the roadmap directory. Application code, tests, dependencies, and workflows are unchanged. Its result therefore remains directly relevant to this checkout.

The current-head [Build and Release run](https://github.com/SwiggitySwerve/MekStation/actions/runs/39132558772) is successful, but its actual build, artifact preparation, Docker, and release jobs were skipped. Do not read that workflow-level green as proof of a newly built current candidate. The earlier source PR's successful build jobs are separate, positive evidence.

**Judgment:** repairing the reliability signal and the failures behind it should compete directly with new development for priority. A large passing test count cannot substitute for passing the small set of journeys promised to users.

### 2. The first shared mission is still a delivery milestone, not an available promise

The L1/v2.2.0 release checklist remains pending. Its ordinary setup prerequisite is real in current source:

- The normal vault identity endpoint refuses creation of a second identity with HTTP 409.
- Multiplayer token issuance reads the server's active identity.
- Separate browser profiles alone do not create separate server identities.
- The local-seat credential units remain blocked in the ledger.

The planned human session needs GM plus two player identities, a complete mission, interruption recovery, and agreement after reload. Guarded E2E identity seeding does not prove users can achieve that through the shipped UI.

**Judgment:** completing that exact path is the most useful next multiplayer milestone. Additional multiplayer breadth before it works would increase the support burden faster than demonstrated user value.

### 3. Multiplayer privacy and deployment claims need to stay narrow

The match creation UI explicitly disables fog and says it is unavailable in multiplayer. The server constrains the listener to loopback. These are real supported-scope boundaries.

Inspected lobby discovery authenticates callers, but its joinable and spectatable queries do not exclude co-op metadata. Joinable rows include room codes and match IDs; spectatable rows include match IDs. B15-PRIV already registers the exclusion work. This is an authenticated discovery boundary concern, not evidence that anonymous callers can fetch all private state.

**Judgment:** describe the current offering as constrained local operation. Do not imply mature private multi-user hosting or working double-blind multiplayer. Complete the relevant boundary work before widening deployment claims.

### 4. Process complexity is becoming a delivery risk

The last 100 non-merge commit subjects include 42 documentation changes, 21 fixes, 15 tests, 13 chores, eight features, and one other commit. The unit ledger contains 240 entries; the L1 checklist now names 33 units. These counts do not establish waste or an effort-based completion percentage. Some of that documentation is necessary security and release evidence.

However, the volume makes it easy to optimize for closing named units while the player-visible milestone moves slowly. The existing light/full/ledger proof classes are a good response; apply them consistently instead of treating every routine change as an authority change.

The current co-op checklist also still labels AI stacking and prone skipping as known defects, although their recorded fixes are already in this checkout. Old reports are useful history, but current operator instructions need reconciliation.

**Judgment:** maintain one short, current product-status view: what a user can do today, the next usable outcome, its actual blockers, and candidate evidence. Keep detailed receipts behind that view. Measure progress by successful journeys and recovery, with administrative closures supporting those outcomes.

### 5. Complexity is concentrated in sensitive runtime paths

The inspected checkout has runtime files of roughly 1,500–1,900 lines in `DurableMatchStore`, campaign socket binding, `ServerMatchHost`, campaign persistence, and the multiplayer client. Those are precisely the places where state, ordering, recovery, and permissions interact.

Line count alone does not establish a defect, and a broad rewrite would create unnecessary regression risk. The project's existing modularity guidance already gives a sensible direction.

**Judgment:** extract responsibilities when changing these paths for a concrete reliability fix. Preserve facade APIs and behavior tests. Avoid a separate architecture overhaul while the release journey is unfinished.

## Recommended order

1. **Establish a trustworthy current baseline.** Reproduce and classify the failing nightly cases, repair product defects and invalid fixtures separately, and obtain a clean relevant browser/scenario run without weakening assertions or merely raising retries.
2. **Finish one ordinary shared mission.** Land the necessary privacy, authority, and local-seat prerequisites; prove GM plus two players can set up, play, reconnect, finish, and reload through supported UI. Preserve the existing distinction between automation and human attestation.
3. **Gate the candidate on its packaged experience.** Rehearse the actual installer and supported topology, then conduct the recorded human session. A portable agent run, a source test, and an installer test answer different questions.
4. **Consolidate before expanding.** Keep building, saving, exporting, fighting, and recovering dependable. Delay optional feature breadth that does not help these supported journeys.

My opinion: the project does not need a restart or a more ambitious feature list. It needs a smaller set of promises fulfilled consistently. The engineering already present makes that plausible; the current acceptance evidence does not yet justify calling the whole experience dependable.

## Verification and limits

Fresh local checks: roadmap validation passed (`82 nodes, 13 packages, 381 tasks, 40 triage rows`); roadmap validator tests passed 86/86. These are ledger checks, not gameplay tests. Inventory and Git queries were read-only.

I inspected live GitHub release/job data and failed-job logs, relevant runtime source, current roadmap state, and historical packaged-session evidence. I did not independently rerun Jest, type checking, the complete browser suite, a production build, or the installer. This checkout has no installed dependencies; the neighboring checkout has a different compiler/dependency lock, and the machine gate reported existing shared processes. The local preview attempt returned `net::ERR_CONNECTION_REFUSED` on port 3600. No existing server was stopped or repurposed.

Useful local sources:

- [Shared-session checklist](../../playtest/checklists/coop-uat.md)
- [Recorded packaged v2.1.1 session](../../playtest/session-notes/2026-10-17-v2.1.1-windows-portable-l0.md)
- [Current unit and release ledger](../../openspec/planning/2026-09-12-roadmap-completion/units.json)
- [Delivery contract](../../openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md)
- [Identity creation](../../src/pages/api/vault/identity/index.ts) and [token issuance](../../src/pages/api/multiplayer/auth/token.ts)
- [Authenticated lobby API](../../src/pages/api/multiplayer/lobbies.ts) and [discovery projections](../../src/lib/multiplayer/server/joinableLobbies.ts)
- [Sealed-choice ownership](../../src/lib/multiplayer/server/projection/MatchWireSealedChoices.ts)
- [Modularity guidance](../FILE_MODULARITY_SPEC.md)
