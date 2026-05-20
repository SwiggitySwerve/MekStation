# Roadmap — Post-Wave 6.x

**Date**: 2026-05-20
**Status**: Authored at the close of Wave 6.x; the Waves 1-5 system is functionally complete (every shipped subsystem reachable + observable + validated).

This is the queue of big-rock candidates for the next development phase. None of these are required to ship today — they are the "what comes after the system is feature-complete at the Waves 1-5 level" candidates. Each is sized at the OpenSpec-change level so it can be picked up independently.

---

## Big-rock candidates

### 1. Full Combat Parity beyond Wave 1-5 — `combat-parity-wave-7` (XL)

Wave 1 nailed the core combat loop (movement / firing / heat / damage / piloting rolls / objectives / morale). MegaMek-parity gaps remain in areas that didn't surface during the smoke matrix:

- **Battle Armor combat** — `GameplayUIInterfaces.ts` carries a Wave-2 TODO for BA-specific damage allocation rules. Not exercised by current swarm configs.
- **Aerospace + dropship combat** — current engine targets ground combat only. Aerospace assets exist in the unit catalog but cannot be deployed.
- **Engineer / VTOL / hover-specific MP modifiers** — implemented partially; full rule set would close ~12 known rule deltas vs MegaMek.
- **Indirect fire + spotter network** — LRMs without LOS to a spotter currently miss the indirect-fire path entirely.

**Recommended approach**: One spec per combat subsystem; ship incrementally. Each ~1-2 week of work.

### 2. AI Tier-5 Elite-plus — `ai-tier-5-elite-plus` (L)

Current AI tiers cap at Tier 4 (Elite). Tier 5 would add:

- **Long-horizon planning** — multi-turn objective scheduling rather than per-turn greedy.
- **Coordinated maneuvers** — lance-level positioning rather than per-unit independent decisions.
- **ECM-aware positioning** — Tier-4 AI doesn't consider ECM coverage; Tier-5 should treat ECM as a positional asset.
- **Indirect-fire orchestration** — pair-with-spotter behavior for LRM boats.

**Recommended approach**: Single OpenSpec change building on `add-tactical-ai-difficulty-tiers`; ship as a new `AiTier.Veteran` constant + difficulty-tier branch.

### 3. Three-or-more-player Co-op — `coop-3plus-players` (L)

The current co-op surface supports exactly one host + one guest. Three-or-more-player support requires:

- **N-way proposal ordering** — current `host-review` arbitration handles a single guest queue. Multi-guest needs FIFO + per-guest rate limiting.
- **Per-guest visibility scopes** — current guest sees the full campaign state; three guests with different force pools need scoped views.
- **Disconnect handling at N>2** — current pause-on-disconnect is fine for 1+1; with N guests, the host needs to pick a behavior (wait / kick / promote).

**Recommended approach**: One spec covering `coop-3plus-players` + a backward-compat fast path for N=2; ship after Wave 6 stabilizes.

### 4. PvP Campaigns — `pvp-campaigns` (XL)

Host vs guest forces fighting each other on the same campaign timeline. Different from co-op (where host + guest fight a shared enemy):

- **Force ownership** — campaign state currently has a single `playerFaction`; PvP needs two.
- **Mission resolution** — the post-battle processor currently applies outcome to one force; PvP needs symmetric application.
- **Activity-log scoping** — each player sees their faction's events, not the opponent's.

**Recommended approach**: Author the spec but keep it on ice until the 3+ player co-op decision lands.

### 5. Host Migration on Disconnect — `host-migration` (M)

Current behavior: when host disconnects, the session pauses. Host-migration would:

- Promote a guest to host on a quorum-vote or first-to-claim basis.
- Re-key the GM-arbiter to the new host.
- Re-broadcast the canonical state baseline so all surviving guests get a consistent view.

**Recommended approach**: One OpenSpec change. Reuses existing `MatchRecovery.rebuildSessionFromEvents` infrastructure.

### 6. Write Actions for Track-C Subsystem Stubs — `track-c-write-actions` (M-L per subsystem)

Wave 6.1.C shipped 9 read-only UI stubs. Each is a follow-up candidate for write actions:

- `ContractNegotiationPanel` — negotiate counter-offers + signing bonuses
- `FactionStandingPanel` — gift / bribe / contract-side-effects
- `RandomEventsLog` — operator-driven event acceptance (vs auto-resolve)
- `UnitMarketPanel` — buy/sell mechs + parts on the unit market
- `MaintenanceCheckLog` — schedule preventative maintenance ticks
- Four `PersonnelSidePanel` extensions — hire-from-pool / fire / promote / retire

**Recommended approach**: One spec per stub; ship over multiple waves. Lowest priority of the big-rock candidates.

### 7. Cross-Subsystem Integration Specs — `cross-subsystem-coverage` (M)

Current subsystem specs cover each subsystem in isolation. End-to-end flows like:

- Hire → assign → mission → XP gain
- Order part → wait → deliver → repair complete
- Contract sign → mission complete → faction-standing delta

are not covered by any single spec. A "cross-subsystem coverage" capability would add specs that span them.

### 8. Unified Campaign-Feature-Coverage CI Gate — `feature-coverage-gate` (S)

Current CI runs 19 subsystem specs but doesn't enforce that every shipped subsystem has one. A coverage gate would:

- Auto-discover new components under `src/components/campaign/`
- Auto-discover new store actions under `src/stores/campaign/`
- Fail CI if a new subsystem ships without a matching `playtest-subsystem-*.spec.ts`

Proposed once the subsystem spec count stabilizes (likely 1-2 waves into next phase).

---

## Tactical follow-ups (smaller items)

- **Visual regression snapshots for new components** — Storybook stories cover the visual surface, but a Chromatic-style snapshot gate would catch unintended regressions.
- **OpenSpec proposal-arbitration modes beyond `auto-approve` / `host-review`** — third mode "delegate to one guest" for host-AFK scenarios.
- **`useCampaignStore.ts` file-size refactor** — the action set has grown to 510 lines; consider extracting `travelToSystem` + `appendActivityLogEntry` + outcome-processing actions into separate files.
- **Inner Sphere seed dataset expansion** — current dataset has 40 systems. MekHQ ships ~3000. Expand once the starmap surface becomes a primary navigation surface.

---

## Stop conditions for adopting any of these

Each big-rock candidate should pass the same gate Wave 6.x passed:

1. OpenSpec proposal authored + spec deltas validate `--strict` clean
2. Tasks list at ≥3 sub-tasks; each task scoped to ≤1 day
3. Council Lean+ verdict run for any candidate at L or XL scope
4. PR-by-PR sequential to main; never `--no-verify`; never AI attribution

---

**Roadmap authored**: 2026-05-20 at Wave 6.5 closeout.
