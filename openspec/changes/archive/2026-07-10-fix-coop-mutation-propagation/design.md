## Context

Guest join and snapshot delivery work (post-#1016: socket accepted, guest lands on the co-op campaign with the host snapshot). The gap is AFTER join: host mutations don't propagate. Live evidence (walkthrough-2): host Advance Day → host UI 7/9; guest 7/8 both live and after full reload → the server-side campaign record still holds 7/8, so the failure is at PERSISTENCE, not just push. Corroborating: `PUT /api/campaigns/<id> 409` appeared silently in dev logs during the 2026-07-07 playtest — the campaign PUT uses optimistic concurrency and a conflicting/stale version write gets rejected without UI surfacing. Plausible chain: in co-op mode the campaign record's version advances when the co-op session initializes (or the snapshot write bumps it), the host's store still holds the pre-co-op version, its next PUT 409s, the store keeps its local (uncommitted) state → host UI shows the change, server and guest never see it.

## Goals / Non-Goals

**Goals:** host co-op mutations durable in the shared record; guests see them (refetch floor, live push target); persistence failures loud.
**Non-Goals:** redesigning arbitration/proposals; guest write paths beyond existing proposal flow; combat-channel sync.

## Decisions

**D1 — Investigation first.** Trace one mutation end-to-end in co-op mode (day advance): which store action fires, what it writes locally, whether/what it PUTs, the server response, and what the coop runtime session does with the intent. Deliverable notes/root-cause.md naming the exact break (swallowed 409 vs skipped PUT vs wrong record id) with file:line, before edits.

**D2 — Persistence is the floor; push is the ceiling.** Fix ordering: (1) host mutation persists to the shared record (resolve the version conflict correctly — refresh-and-retry once on 409 with the co-op session's authoritative state, or carry the correct version token through the co-op init path); (2) guest visibility on refetch proven by test; (3) live push through the existing campaign sync channel if the wiring already exists (do not build a new channel in this change — if push is absent, record it as follow-up).

**D3 — No silent write failures.** Whatever else: a failed campaign persist surfaces to the acting user (existing toast system), and the local store must not present unpersisted state as committed (either roll back or mark pending). Add a test for the 409 path.

**D4 — Scope discipline.** Day advance is the exercised vertical; the fix should sit in the shared write path so all host mutations benefit, but only day-advance (+ one second mutation as a control, e.g. the GM ledger correction) needs test coverage in this change.

## Risks / Trade-offs

- [409 retry could clobber a concurrent guest proposal] → retry uses the co-op session's host-authoritative merged state; guests mutate via proposals, not direct PUTs, so host-side retry is safe within the current authority model.
- [Live push wiring may be missing entirely] → floor (refetch correctness) still fixes the lie; push gap becomes an honest follow-up.

## Migration Plan

No data migration; revert PR to roll back.

## Open Questions

None blocking — D1 resolves the mechanism with evidence.
