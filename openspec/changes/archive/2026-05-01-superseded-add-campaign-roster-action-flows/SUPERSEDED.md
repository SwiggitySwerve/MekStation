# SUPERSEDED — Do Not Implement

**Status:** Canceled 2026-05-01
**Superseded by:** Council decision at [openspec/council-decisions/2026-05-01-personnel-architecture-path.md](../../council-decisions/2026-05-01-personnel-architecture-path.md)
**Replacement changes:**
1. (immediate) `add-pilot-xp-spend-from-campaign` — narrow XP-spend wiring via vault join
2. (after 1-day spike) `decide-campaign-personnel-architecture` — design-only ADR for substrate decision
3. (after #2) `migrate-personnel-to-roster-employment` — collapse `IPerson` + `ICampaignPilotInstance` into single roster type, repoint 13 broken subsystems

## Why this change was canceled

After 3 review rounds (Codex × 2 + OMO Council × 1) and a follow-up exploration with 5+ investigation agents, this change was found to rest on **false premises**:

1. **The proposal claimed the panel callbacks "never reach the API routes."** Reality: `usePilotStore.improveGunnery/improvePiloting/purchaseSPA` already POST to the correct routes. The proposed `usePilotImprovement` hook would have duplicated existing functionality.

2. **The proposal assumed the campaign personnel page was a working entry point.** Reality: the page reads `IPerson[]` from `usePersonnelStore`, which **starts empty in every campaign because nothing seeds it**. The page renders an EmptyState by default. Wiring action callbacks into an empty surface has no user value.

3. **The proposal called `CampaignInstanceAssignmentOperations` from client code.** Reality: that service is server-only (imports `better-sqlite3`/`fs`/`path`) and has no API route. The actual working assignment route is `/api/forces/assignments/[id]` via `ForceService`, operating on Force slot IDs and vault pilot IDs.

4. **The proposal's spec scenarios mixed up `IPerson`, `IPilot`, and `ICampaignPilotInstance`** without recognizing they are three separate types with overlapping fields and different lifecycles. Codex's third HIGH finding caught this.

5. **Most critically:** investigation revealed `IPerson` / `usePersonnelStore` is load-bearing for **13 silently-broken production features** (salary, healing, turnover, vocational training, awards, life events, prisoner events, food/housing tax, daily cost summary, day-pipeline salary deduction, personnel roster UI, post-battle wound sync). All silently produce zero results in production today because nothing seeds the store. This is an active production bug masking 13 subsystems — bigger than the original spec was scoped for.

## What was preserved

- Domain understanding of the four-layer data model (Vault, ICampaignPilotState, IPerson, ICampaignPilotInstance)
- The user's explicit domain rule: PCs vault-wide, NPCs campaign-scoped, XP-spend through existing PilotService
- Discovery that 13 production features depend on `IPerson` being populated
- Oracle's synthesis (vault = identity, roster = employment) as the destination architecture

These are captured in the council decision document linked above.

## Files in this directory (do NOT execute)

- `proposal.md` — superseded; encoded false premises about panel/API wiring
- `design.md` — superseded; "thin coordinator" pattern was a band-aid on the dual-store split
- `tasks.md` — superseded; included tasks for a `usePilotImprovement` hook that duplicates `usePilotStore`
- `specs/pilot-system/spec.md` — superseded; SPA scenario spec body was patched twice but still incoherent
- `specs/campaign-ui/spec.md` — superseded; assignment scenarios reference `IPerson.unitId` which is never written in production

This directory is kept as historical record. Do not run `/opsx:apply` against it.
