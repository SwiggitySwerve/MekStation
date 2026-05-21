# Change: Wave 6.2 — Gap Polish Batch

## Why

The Waves 1-5 playtest closeout logged 12 gaps in `playtest/CLOSEOUT.md` "Gaps logged" section. Wave 6.1 closed gap #8 (co-op route surface) via `wire-coop-campaign-route`. Of the remaining 11, six are small-effort polish items that can ship as one batched implementation PR (vs the larger known-limitation gaps deferred to Wave 6.3) — and three of them close currently-open PT-xxx defects in the ledger.

The six items:

| Gap ref | Title | Closes ledger row |
|---|---|---|
| #3 | Host-review proposal timeout (auto-veto after T seconds) | — |
| #4 | AI-tier UI selector on Quick Game setup | — |
| #6 | Quick Game scenario-type selector | — |
| #7 | StateCycleDetector positional scope | **PT-001** (P2, open) |
| #11 | Force generator high-BV unitCount widening | **PT-010** (P3, open) |
| #12 | TurnLimit tuning for r20 maps | **PT-003** (P3, open) |

Without these, the operator's manual UAT is incomplete (Quick Game has no AI-tier or scenario picker — they must edit JSON configs to test variants); the Phase-1 smoke matrix reports false positives (PT-001's StateCycleDetector fires on 96% of runs because the snapshot doesn't include position); the r20 maps draw 100% on 50-turn limit (PT-003); the 10k-BV force generator fails (PT-010).

Each item is a single-file change or a small additive UI surface. The batch ships as one OpenSpec change so the spec deltas, the implementation, and the ledger updates land together.

## What Changes

### Spec deltas (multiple capabilities)

- ADDED `quick-game-ui`: scenario-type Select + AI-tier Select on the Quick Game setup screen (gaps #4 + #6)
- ADDED `coop-campaign-sync`: auto-veto on host-review proposals after a configurable timeout (gap #3)
- MODIFIED `simulation-system`: extend StateCycleDetector snapshot to include unit positions (gap #7 — closes PT-001)
- MODIFIED `force-generator`: widen unitCount fallback at high BV bands (gap #11 — closes PT-010)
- MODIFIED `simulation-system`: raise default turnLimit on r20+ maps to 75 (gap #12 — closes PT-003)

### Code

- `src/components/quick-game/QuickGameSetup.tsx` — add scenario-type Select (`Annihilation | CTF | Defend | Breakthrough`) and AI-tier Select (`Green | Regular | Veteran | Elite`); persist into `useQuickGameStore.scenarioConfig`
- `src/lib/multiplayer/server/CampaignGmArbiter.ts` — add `proposalTimeoutMs` config (default 5min); when a proposal sits `pending` for longer than the timeout, the arbiter emits an auto-veto decision so the guest's pending overlay resolves
- `src/simulation/detectors/StateCycleDetector.ts` — extend the snapshot key to include each unit's `position` field, not just `heat`. Closes the 96% false-positive rate.
- `src/lib/forceGenerator/forceGeneratorEngine.ts` — when `BudgetUnsatisfiableError` fires at the requested `unitCount`, retry once at `unitCount + 1` before throwing. Closes PT-010 at 10k BV.
- `src/simulation/generator/ScenarioGenerator.ts` — default `turnLimit` is now `mapRadius * 4` (was 50). r20 maps get turnLimit 80; r12 stays at 48-50.

### Ledger updates

- Close PT-001, PT-003, PT-010 in `playtest/ISSUES.md` referencing this PR
- Trim the matching gap entries from `playtest/CLOSEOUT.md` (only gaps that remain open after this wave + Wave 6.3 stay listed)

## Dependencies

- **Requires (already shipped)**: `add-coop-campaign-play` (Wave 5) for the host-review arbiter
- **Requires (already shipped)**: `wire-coop-campaign-route` (Wave 6.1.A) so the auto-veto path has a UI surface to resolve
- **No new transport, no new types beyond the timeout config field**

## Impact

- Affected specs: `quick-game-ui`, `coop-campaign-sync`, `simulation-system`, `force-generator`
- Affected code:
  - `src/components/quick-game/QuickGameSetup.tsx`
  - `src/lib/multiplayer/server/CampaignGmArbiter.ts`
  - `src/simulation/detectors/StateCycleDetector.ts`
  - `src/lib/forceGenerator/forceGeneratorEngine.ts`
  - `src/simulation/generator/ScenarioGenerator.ts`
  - `playtest/ISSUES.md` (3 row closures)
  - `playtest/CLOSEOUT.md` (gap trim)
- No database migrations
- No new components beyond the two Select controls on QuickGameSetup

## Non-Goals

- Gap #1 (ECM core-engine to-hit modifier) — design gap, larger scope; deferred to Wave 6.3
- Gap #2 (recovered-session adapted-units) — recovery edge case, design needed; deferred to Wave 6.3
- Gap #5 (`biome=none` placeholder) — data + balance work; deferred to Wave 6.3
- Gap #9 (co-op scripted E2E) — blocked on vault-auth two-identity; remains gap
- Gap #10 (multiplayer scripted E2E) — same blocker; remains gap
- Full proposal-arbitration mode UI (operator-configurable timeout per campaign) — Wave 6.2 ships a global default; per-campaign config is a follow-up
- Combat-engine tuning beyond the turnLimit + force-generator fixes — Wave 6.2 is mechanical fixes, not balance work
