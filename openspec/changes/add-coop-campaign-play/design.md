# Design: Add Co-op Campaign Play

## Context

`add-shared-campaign-state` (CO1) established the co-op campaign substrate: a server-authoritative campaign event log, a `CampaignMatchHost` running the `intent → validate → commit → broadcast` loop, and a read-only guest campaign mirror. CO1 proved the *transport* is correct — a guest's campaign action is an intent the host validates against the authoritative ledger.

What CO1 deliberately did not build is the *game*:

- A co-op campaign mission still launches one force into one encounter. There is no path to put both players' forces into a single battle, and no notion of a player who wants to skip the map this mission and manage the campaign instead.
- CO1 said "the host validates campaign intents". It did not say *who the host is in gameplay terms* (the Game Master), nor *how* arbitration works beyond the mechanical balance check — there is no host-review step, no veto, no guest-facing pending-proposal feedback.

This change supplies both. It is the merge of the roadmap's CO2 (co-op mission launch) and CO3 (campaign authority model) — merged because the authority model is meaningless without co-op gameplay to authorize, and co-op gameplay is unsafe without an authority model.

Combat itself does not need re-architecting: `ServerMatchHost` already runs an authoritative `GameSession` for any number of seats across sides. Co-op mission launch is *composition* (build one encounter from two rosters) plus *routing* (send it through the existing combat host), not new netcode.

## Goals / Non-Goals

**Goals:**

- Launch a campaign mission as one encounter containing both players' forces, on a shared side against the encounter OpFor.
- Let each player choose, per mission, to deploy onto the map or remain in command HQ.
- Define the host as the campaign Game Master and guest campaign actions as proposals the host arbitrates.
- Provide GM arbitration modes (auto-approve, host-review) and a typed veto.
- Give the guest pending-proposal feedback and the host a review surface.
- Reconcile the co-op encounter's outcome back into the shared campaign as CO1 campaign events.

**Non-Goals:**

- The CO1-owned transport (event log, `CampaignMatchHost` loop, mirror).
- 3+ player campaigns, host migration, PvP campaign play, co-op spectators, co-op AI directing.

## Decisions

### D1. Co-op mission launch composes two rosters into one encounter

A co-op campaign mission launch builds one `IEncounter` whose force roster is the union of both players' selected forces, all assigned to the same `GameSide` against the encounter's OpFor side. The resulting `GameSession` is run by the existing `ServerMatchHost` — co-op combat is *not* a new combat path. Each deploying player occupies seats for their own units; the host validates unit ownership exactly as `ServerMatchHost` already does (an intent for a unit the player does not own is rejected). The campaign mission→encounter bridge from `add-campaign-combat-loop` (CP1) is extended to accept a two-force composition rather than rebuilt.

### D2. Per-mission participation choice — `deploy` vs `command-hq`

Before a co-op mission launches, each player makes a `CoopParticipationChoice`:

- **`deploy`** — the player's force enters the encounter and the player plays it on the tactical map through `ServerMatchHost`.
- **`command-hq`** — the player does not take the map. Their force either sits the mission out or is fielded under host/AI control (the host's choice), and the player retains full access to campaign-management surfaces (bay, contracts, finances) while the battle runs.

At least one player MUST choose `deploy` — a mission with both players in HQ has no one to fight it and SHALL be blocked at launch. A `command-hq` player still receives the co-op campaign events the battle produces (salvage, funds) through their CO1 mirror, so their campaign view stays current.

### D3. The host is the campaign Game Master

The host of a shared campaign (the CO1 single-writer) is, in gameplay terms, the **Game Master**. This is a naming and authority decision, not a new role: it is the same peer that CO1 already designated the authoritative campaign writer. Making it explicit lets the UX and the arbitration rules speak of "the GM" coherently. The guest is a co-op *player*, not a co-GM; the guest never holds campaign-write authority.

### D4. Guest campaign actions are proposals, not commits

Under CO1, a guest campaign action is an `ICampaignIntent` the host validates. This change refines what that means at the gameplay layer: a guest action is a **proposal** (`IGuestProposal`) — a request the GM arbitrates. A proposal carries the underlying `ICampaignIntent` plus proposal metadata (`proposalId`, the requesting guest, a timestamp). The host resolves each proposal to a `GmDecision` and only an `approve` decision proceeds to CO1's commit-and-broadcast. A `veto` returns a typed rejection and commits nothing.

### D5. GM arbitration modes — `auto-approve` and `host-review`

The campaign carries a `GmArbitrationMode` the host sets:

- **`auto-approve`** — a guest proposal that passes CO1's mechanical validation (balance, standing, roster checks) is committed immediately, with no host interaction. This is the low-friction default for trusting co-op partners; the host still gets the *outcome* as a broadcast campaign event.
- **`host-review`** — every guest proposal is surfaced to the host, who explicitly issues `approve` or `veto`. CO1's mechanical validation still runs first: a proposal that fails validation is rejected before it ever reaches the host's review queue (the host is never asked to approve an over-balance spend).

In both modes the mechanical validation from CO1 is the floor — the GM can never approve a proposal that violates the ledger invariant. `host-review` adds a *discretionary* gate on top of the *mechanical* one.

### D6. Veto is a typed, non-committing result

A `veto` GM decision resolves a proposal without committing any campaign event. The guest receives a typed rejection (`code: 'PROPOSAL_VETOED'`) distinct from CO1's mechanical `INVALID_CAMPAIGN_INTENT`, so the guest UI can tell "the GM chose no" apart from "this was impossible". The connection stays open and the guest may submit a different proposal — same open-connection contract as CO1's intent rejection.

### D7. Guest pending-proposal feedback and host review surface

- **Guest side** — when a guest submits a proposal, the guest UI shows a *pending* indicator on that action and disables a duplicate submit until the proposal resolves (committed event, or `veto`, or mechanical rejection arrive on the CO1 broadcast channel).
- **Host side** — in `host-review` mode the host sees a review surface listing pending guest proposals, each with the campaign context needed to decide: current C-bill balance, relevant faction standing, the roster effect. The host approves or vetoes from this surface.

Both surfaces are driven entirely by the CO1 campaign event-broadcast channel and the proposal/decision messages; no new transport is introduced.

### D8. Co-op post-battle reconciliation emits CO1 campaign events

When a co-op encounter resolves, its campaign-level consequences — salvage, funds change, roster change, pilot XP — are reconciled into the shared campaign by emitting CO1 campaign events (`SalvageAllocated`, `FundsChanged`, `RosterUnitChanged`, etc.) through the `CampaignMatchHost`. Because both players' campaign views are CO1 mirrors fed by the same event log, the deploying player and the command-HQ player converge on the same post-battle campaign state. The co-op encounter's combat event log (from `ServerMatchHost`) and the campaign event log stay separate and linked by id, per CO1 D2.

### D9. Type contracts

```typescript
// Per-mission, per-player participation choice.
type CoopParticipationChoice = 'deploy' | 'command-hq';

// How the GM arbitrates guest proposals for this campaign.
type GmArbitrationMode = 'auto-approve' | 'host-review';

// A guest campaign action awaiting GM arbitration.
interface IGuestProposal {
  readonly proposalId: string;       // client-generated, for correlation
  readonly campaignId: string;
  readonly proposingPlayerId: string;
  readonly ts: string;
  readonly intent: ICampaignIntent;  // the CO1 intent the GM arbitrates
}

// The GM's resolution of a proposal.
type GmDecision = 'approve' | 'veto';
```

## Risks / Trade-offs

- **[Risk] Both players choose `command-hq` and the mission cannot be fought** → Mitigation: D2 — a launch with zero `deploy` players is blocked at launch with a clear error; at least one player must deploy.
- **[Risk] `auto-approve` lets a guest drain the campaign treasury** → Mitigation: CO1's mechanical validation is the floor in both modes — a guest can never spend past the balance; `auto-approve` only removes the *discretionary* host gate, never the *invariant* gate. A host who wants spend control sets `host-review`.
- **[Risk] A host-review proposal is never answered (host AFK)** → Mitigation: the proposal stays pending and the guest sees the pending indicator; the host-review surface is the host's responsibility. A timeout-to-veto policy is an Open Question, not silently auto-approved.
- **[Risk] Scope creep — co-op combat re-architecting** → Mitigation: D1 — co-op mission launch is roster composition + routing through the *existing* `ServerMatchHost`; no combat netcode is added. If two-force composition surfaces a genuine engine gap, that is a flagged question for a combat-layer change, not silent expansion here.
- **[Risk] Command-HQ player's campaign view drifts from the battle outcome** → Mitigation: D8 — post-battle consequences are CO1 campaign events; the command-HQ player's CO1 mirror receives them exactly like the deploying player's.
- **[Trade-off] `host-review` adds friction to every guest action** → Accepted and made a choice: `auto-approve` is the low-friction default; `host-review` is opt-in for hosts who want tighter campaign control.

## Migration Plan

Purely additive on top of CO1. A solo campaign is unaffected — no participation choice, no GM arbitration, no proposals. A shared campaign created under CO1 alone (transport only) continues to work; this change adds the co-op-play and GM-authority behavior when a co-op mission is launched. New types (`CoopParticipationChoice`, `GmArbitrationMode`, `IGuestProposal`, `GmDecision`) are additive. No database migration — proposals and decisions ride the CO1 campaign event-broadcast channel; co-op encounters use the existing `ServerMatchHost` store. Rollback = revert the change-set; CO1's shared campaign transport remains intact and solo campaigns are untouched.

## Open Questions

- Should an unanswered `host-review` proposal time out, and if so to `veto` or to `auto-approve`? Proposed: time out to `veto` (the safe default — no campaign mutation on host silence), with the timeout window configurable. Confirm during apply.
- Should a `command-hq` player's force be auto-resolved into the encounter, fielded under host control, or simply sit out? Proposed: configurable per mission, defaulting to "sit out"; auto-resolve depends on a battle auto-resolver that may not exist — flag if so rather than expand scope.
- Granularity of `GmArbitrationMode` — one mode per campaign, or per intent kind (e.g., auto-approve `AdvanceDay` but host-review `SpendFunds`)? Proposed: one mode per campaign for this change; per-kind granularity is a later refinement.
