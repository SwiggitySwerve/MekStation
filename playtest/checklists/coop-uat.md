# Co-op Campaign UAT Checklist — Phase 5

> **Status: UNBLOCKED (2026-05-20)** — Wave 6.1.A `wire-coop-campaign-route` wired the host create / guest join entry points, the host-review surface, the guest proposal overlays, the co-op session badge, and the mission-launch participation picker into the campaign page tree. The Phase 5 manual UAT is now runnable end-to-end.

Two browser windows. Host (window H) drives a campaign; guest (window G) plays with the host under **host-as-GM authority** (per Council #2 DP2 — not CRDT). File defects to `playtest/ISSUES.md`. Feature gaps → `CLOSEOUT.md` "gaps".

## Smoke pass — shared campaign

- [ ] H creates a new co-op campaign; invite-link / room-code generated
- [ ] G joins via the invite-link / room-code → both see the same campaign roster, finances, contract list
- [ ] H sees G in a "co-pilot" slot; G sees H labeled as host/GM
- [ ] H or G can navigate the bays (read-only for G); state is identical on both windows after any nav round-trip

## Proposal: approve path

- [ ] G proposes a contract pickup (or any state-mutating action: hire pilot, accept contract, queue repair)
- [ ] H sees the proposal in a pending-review queue with G's name + action description
- [ ] H approves → both windows mutate state identically within 1s
- [ ] G can confirm the action took effect on G's view (refresh-safe)

## Proposal: reject path

- [ ] G proposes another action
- [ ] H rejects → G sees rejection notice; campaign state unchanged on both windows
- [ ] Rejection reason field (if implemented) renders on G's side

## Proposal: timeout (known gap)

- [ ] G makes a proposal, H ignores it for 5 minutes
- [ ] Expected: proposal stays `pending` indefinitely (known limitation from `post-roadmap-followups`)
- [ ] **Do NOT file as a defect** — log as a gap in `CLOSEOUT.md`. Note the timeout policy is a Wave-6 candidate.

## Co-op mission launch

- [ ] H accepts a contract; H launches the mission
- [ ] G is invited into the mission lobby
- [ ] Both H and G enter combat together (one lance shared OR two lances side-by-side per spec)
- [ ] Turn order alternates H ↔ G ↔ AI consistently
- [ ] Mission completes; salvage list → both see same items, only H can confirm selection
- [ ] XP awarded to each player's pilots independently; damage to mechs replicated correctly
- [ ] Both clients see the final campaign-state diff applied consistently

## Disconnect / authority resilience

- [ ] Mid-mission, G disconnects → H continues solo, G's units handled per spec (AFK-AI? freeze? abandon?)
- [ ] G reconnects → state survives, G resumes control
- [ ] Mid-proposal, H disconnects → G's proposal stays pending until H returns (no authority-leak to G)

## Event ordering

- [ ] Repeated rapid actions: both clients see events in identical order (event-broadcast loop ordering is the canonical test for host-as-GM authority)
- [ ] No client-side state divergence after 5+ minutes of play

## Asserts (manual observation)

- [ ] Guest's UI clearly distinguishes "I can do this" (proposal triggers review) from "I cannot do this" (host-only)
- [ ] Host's review queue paginates / scrolls cleanly with 5+ pending proposals
- [ ] No authority leak: every state-mutating server message originates from host signature

## Sign-off

- [ ] Final-pass timestamp: `____________`
- [ ] Defect count filed in `ISSUES.md`: `____________`
- [ ] Gaps logged for `CLOSEOUT.md`: `____________`
