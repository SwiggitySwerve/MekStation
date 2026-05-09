# Design: Sync Encounter and Replay Source-of-Truth

## Technical Approach

This is a **spec-only** change. The deliverable is markdown that
snapshots existing behaviour. No data flow, no architectural choices,
no code paths to design. The "design" decisions are about how the
source-of-truth specs are organised — which spec owns which
requirement, how deltas absorb cleanly, and how to avoid double-coverage
between specs.

## Architecture Decisions

### Decision: New `encounter-system` source-of-truth, NOT absorb into `game-session-management`

**Choice**: Create a new `openspec/specs/encounter-system/spec.md`
domain via the change folder's
`specs/encounter-system/spec.md` (full ADDED suite). Author it as the
canonical home for the encounter entity model, lifecycle, force config,
template enum, map config, victory conditions, validation, broken-ref
helper, list/detail UI, sample seeding, and cleanup script.

**Rationale**: The original `2026-01-18-add-encounter-system` change
explicitly called out `Affected specs: None (new capability)` and
`New specs: encounter-system`. The fact that the spec was never
promoted is a paperwork failure, not a domain-modelling decision.
Re-promoting it preserves the original intent. Conflating the encounter
domain into `game-session-management` would:

1. Mix concerns — `game-session-management` already covers the
   live-game session lifecycle (turn orchestration, phase advancement,
   damage PSR queue, event append, replay/time-travel). Encounters are
   the *config inputs* to a game session; collapsing the two layers
   loses the clean separation.
2. Bloat the `game-session-management` spec — already 2130+ lines on
   `main`. Adding ~25 encounter requirements pushes it past every
   reviewer's working memory.
3. Contradict the existing per-domain pattern — `quick-session` is its
   own spec, `replay-library` is its own spec, `combat-resolution` is
   its own spec. Encounters deserve the same treatment.

**What stays in `game-session-management`**: the seven encounter store /
API requirements that earlier waves already merged
(`Encounter Launch Status Transition`, `Encounter CRUD via API Routes`,
`Encounter Selection and Retrieval`, `Force Assignment`,
`Template Application`, `Encounter Validation`, `Encounter Launch`,
`Encounter Cloning`, `Filtering and Search`) — those describe the store
client interface, not the encounter entity model.

**Alternatives considered**:

- **Promote `encounter-system` and back-port the existing seven store
  requirements out of `game-session-management`** — would require
  REMOVED entries on `game-session-management`, which complicates the
  archive sync. Rejected: leave the existing requirements where they
  are; new behaviour goes to the new spec.
- **Split `encounter-system` into `encounter-entity-model` +
  `encounter-ui` + `encounter-cleanup`** — over-decomposition. The
  encounter domain is small enough to fit in one spec.

### Decision: Repair / cascade / persist additions land on `game-session-management`, NOT the new `encounter-system` spec

**Choice**: The force-deletion cascade, hydration replacement,
encounter game-event-log persistence, `IEncounterMeta` field on
`IGameCreatedPayload`, and the browser persist hook on
`/gameplay/games/[id].tsx` go in the `game-session-management` delta.

**Rationale**:

- The cascade is a `ForceRepository` behaviour that happens to mention
  the `encounters` table. It belongs with the force lifecycle
  (which `game-session-management` already covers via
  `Force Assignment`).
- The hydration replacement is `EncounterService.hydrateEncounter`
  behaviour — same module that already owns
  `Encounter Selection and Retrieval` in `game-session-management`.
- Encounter game-event-log persistence is a session-level concern
  (the game session emits events; the persist boundary fires at
  session terminal state). Mirrors how the spec already covers quick-game
  persistence.
- `IEncounterMeta` lives on `IGameCreatedPayload` — a shape owned by
  `game-session-management`.
- The browser persist hook is on `/gameplay/games/[id].tsx`, the live
  game-session viewer page, also owned by `game-session-management`.

**What goes in `encounter-system`** (the encounter-entity / encounter-UI side):

- The broken-ref helper at `src/services/encounter/encounterBrokenRefs.ts`
  (pure function, encounter-domain).
- The encounter-list broken-pill render and the encounter-detail
  repair-banner render (both are encounter-page UI).
- The sample-seeding API and empty-state seed button (encounter-list
  surface).
- The cleanup script (operates over the encounter table, classifies
  encounters).

This split keeps every requirement on the spec whose code-side
"home module" matches.

**Alternatives considered**:

- **All repair behaviour on `encounter-system`** — would yank the
  cascade out of force-lifecycle context. Rejected.
- **All repair behaviour on `game-session-management`** — would put
  the encounter UI surfaces (broken pills, repair banner, seed empty
  state) under a session-management heading where they don't naturally
  fit. Rejected.

### Decision: Replay-library delta uses MODIFIED for the four existing requirements, ADDED for the new manifest-variant requirement

**Choice**:

- `MODIFIED` — `ReplaySource Enum` (4→5 values), `IReplayManifestEntry
  Discriminated Union` (4→5 members), `Filesystem Partition Layout`
  (4→5 partitions), `Backfill Scan` (encounter case), `Replay Library
  Page` (6-button strip + Encounter row metadata).
- `ADDED` — none. The `IEncounterReplayManifestEntry Variant`
  requirement collapses into the union requirement (modified) and the
  enum requirement (modified); a standalone added requirement would
  duplicate constraints already covered by the modified versions.

**Rationale**: Each delta directive in the modified requirement is a
small, self-contained widening. OpenSpec's MODIFIED directive carries
the new full requirement text plus all preserved scenarios — that
matches the shipped behaviour without splitting concerns across two
requirements (one "general union" + one "Encounter-specific").

**Alternatives considered**:

- **Author `IEncounterReplayManifestEntry Variant` as a standalone
  ADDED requirement** (per the original `link-encounters-to-replays`
  delta). Considered; rejected because the source-of-truth spec already
  has the union requirement, and adding a sibling requirement that
  re-asserts "the union has the Encounter member" duplicates the
  modified version.

### Decision: Snapshot summary strings stored as strings, not structured objects

**Choice**: The encounter-system spec's launch-snapshot requirement and
the replay-library spec's manifest variant requirement both pin
`playerForceSummary` and `opponentSummary` as strings (e.g.
`"Wolf's Dragoons (4500 BV, 4 units)"`).

**Rationale**: Documents the existing immutability semantics. The
shipped code at `src/replay-library/types.ts:117-127` and the meta type
at `src/types/gameplay/GameSessionInterfaces.ts:423-429` both store
strings. The rationale lives in the
`link-encounters-to-replays` design.md
("snapshot baked at write-time so a force renamed/deleted post-write
does not change the historical row"). The spec text MUST repeat the
contract so future readers don't try to "improve" it into structured
objects.

### Decision: Cleanup script described as a behaviour spec, NOT a CLI contract

**Choice**: The cleanup script's requirement language pins the
classification taxonomy (`abandoned-empty` / `orphaned-force-reference` /
`still-valid`), the manifest-before-DELETE ordering, the idempotency
guarantee, and the two CLI flags (`--manifest-only`, `--cwd`). It does
NOT pin the exact JSON envelope, the file path beyond the directory,
or the prose of the manifest reason strings.

**Rationale**: Behaviour specs are durable; CLI envelope details
change. The task brief from `repair-broken-encounter-drafts` already
locked the JSON shape (full-row plus `classification` and
`classificationReason`). The spec asserts what matters: the manifest
exists, contains every encounter, classifies them per the taxonomy,
and is written before any DELETE. The exact JSON fields are
implementation. The two CLI flags ARE pinned because they are part of
the behavioural contract (tests inject `--cwd`; ops use `--manifest-only`).

## Spec Organisation

```
encounter-system (NEW source-of-truth)
├── Encounter Entity Model              # entity, status enum, force-ref shape
├── Encounter Status Lifecycle          # Draft / Ready / Launched / Completed transitions
├── Force Configuration                 # explicit refs vs opForConfig + null-vs-undefined
├── Map Configuration                   # radius, terrain, deployment zones
├── Victory Conditions                  # 5-type enum, turn limit semantics
├── Scenario Templates                  # 4-template enum + built-in templates
├── Encounter Launch Snapshot Metadata  # launch-time stamp onto GameCreated payload
├── Broken-Reference Detection Helper   # pure helper at encounterBrokenRefs.ts
├── Encounter List Broken-Pill UI       # yellow pill on missing-force slots
├── Encounter Detail Repair Banner      # banner + clear actions
├── Sample Encounter Seeding            # POST /api/encounters/seed-samples + button
└── Cleanup Script                      # 3-class taxonomy + manifest-before-delete

replay-library (delta — all MODIFIED)
├── ReplaySource Enum                   # 4 → 5 values
├── IReplayManifestEntry Discriminated Union  # 4 → 5 members
├── Filesystem Partition Layout         # adds simulation-reports/encounter/ partition
├── Backfill Scan                       # adds encounter-metadata recovery
└── Replay Library Page                 # 6-button filter + Encounter row metadata

game-session-management (delta — all ADDED)
├── Force-Deletion Cascade to Encounter References
├── Hydration-Boundary Orphaned Reference Replacement
├── Encounter Game Event Log Persistence
├── Encounter Metadata in GameCreated Event Payload
└── Browser-Side Encounter Persist Hook
```

## File Changes

- **NEW** `openspec/changes/sync-encounter-and-replay-source-of-truth/proposal.md`
- **NEW** `openspec/changes/sync-encounter-and-replay-source-of-truth/design.md` (this file)
- **NEW** `openspec/changes/sync-encounter-and-replay-source-of-truth/tasks.md`
- **NEW** `openspec/changes/sync-encounter-and-replay-source-of-truth/specs/encounter-system/spec.md`
  (full ADDED suite — promotes the new spec)
- **NEW** `openspec/changes/sync-encounter-and-replay-source-of-truth/specs/replay-library/spec.md`
  (delta — MODIFIED widening from 4 → 5 sources)
- **NEW** `openspec/changes/sync-encounter-and-replay-source-of-truth/specs/game-session-management/spec.md`
  (delta — ADDED requirements for cascade, hydration, persist, encounter-meta, browser hook)
- **NEW** `openspec/changes/sync-encounter-and-replay-source-of-truth/notepad/README.md`
  (cross-delegation wisdom for the operator)
- **ZERO** changes to `openspec/specs/<domain>/spec.md` files in this PR.
  All source-of-truth merges happen at archive time via `openspec archive`.

## Risk + Mitigation

- **Risk**: replay-library MODIFIED scenarios subtly mismatch the
  existing source-of-truth scenario text and fail the archive merge.
  **Mitigation**: every MODIFIED requirement carries the FULL replacement
  text — no partial edits. The delta header `## MODIFIED Requirements`
  signals to OpenSpec that the requirement (and all its scenarios)
  replaces the existing one wholesale.
- **Risk**: the encounter-system source-of-truth already has stale
  authoring noise from `2026-01-18-add-encounter-system` (e.g. "MVP:
  clear terrain only"). **Mitigation**: this change snapshots
  *current behaviour*, not the original 2026-01-18 description. Where
  the shipped code differs, the spec text reflects the shipped
  behaviour.
- **Risk**: cited file paths drift after this change ships and the next
  refactor moves them. **Mitigation**: cite paths inline only when they
  add specificity (e.g. "the helper at
  `src/services/encounter/encounterBrokenRefs.ts`"). Where the path is
  not load-bearing for the requirement, omit it.
- **Risk**: archive sync needs to create the new
  `openspec/specs/encounter-system/` directory; if `openspec archive`
  doesn't auto-create the directory the sync fails.
  **Mitigation**: the `tasks.md` final wave directs the operator to
  verify directory creation in the archive step and create it manually
  if needed before re-running. No `--skip-specs` fallback.

## Open Questions

- **Q**: Should the encounter-system spec absorb the seven encounter
  store / API requirements currently living in `game-session-management`?
  **A**: Defer. They work where they are; back-porting them would
  require REMOVED directives and complicate this change. A future
  consolidation change can do the migration if it's worth the churn.

- **Q**: The replay-library `Replay Library Page` requirement on `main`
  is silent on the exact button strip count. Should the delta version
  REQUIRE 6 buttons, or just MUST contain an Encounter button?
  **A**: REQUIRE the explicit count. The shipped code lays out exactly
  6 (`All` + 5 sources) and the test at
  `src/__tests__/pages/replay-library.test.tsx` asserts the count.
  Documenting the count gives future readers a sharp invariant.

- **Q**: Do we author scenarios for the deferred IndexedDB local-buffer
  follow-on?
  **A**: No. Out of scope per the proposal. The current spec describes
  what ships; the IndexedDB work will land on its own change.
