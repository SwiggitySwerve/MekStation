# Tasks: Add Co-op Campaign Play

## 1. Co-op Play Types

- [ ] 1.1 Add `CoopParticipationChoice` (`deploy` | `command-hq`) and `GmArbitrationMode` (`auto-approve` | `host-review`) to `src/types/campaign/`
- [ ] 1.2 Add `IGuestProposal` (proposalId, campaignId, proposingPlayerId, ts, the CO1 `ICampaignIntent`) and `GmDecision` (`approve` | `veto`) to `src/types/campaign/`
- [ ] 1.3 Add a runtime validator for `IGuestProposal` and `GmDecision` so malformed proposals/decisions are rejected at the boundary
- [ ] 1.4 Unit tests for the type set and a serialization round-trip for proposals and decisions

## 2. Co-op Mission Launch — Two-Force Composition

- [ ] 2.1 Extend the `add-campaign-combat-loop` mission→encounter bridge to compose one `IEncounter` from both players' selected forces on a shared `GameSide` against the OpFor
- [ ] 2.2 Route the composed co-op encounter through the existing `ServerMatchHost` server-authoritative combat loop — no new combat path
- [ ] 2.3 Confirm seat/unit-ownership validation: each deploying player owns only their own units; an intent for another player's unit is rejected
- [ ] 2.4 Tests: a co-op encounter contains both rosters on the shared side; ownership validation rejects cross-player unit intents

## 3. Per-Mission Participation Choice

- [ ] 3.1 Implement the pre-launch `CoopParticipationChoice` for each player — `deploy` or `command-hq`
- [ ] 3.2 Block a co-op mission launch where no player chose `deploy`, with a clear error
- [ ] 3.3 Implement `command-hq` behavior — the player retains access to campaign-management surfaces while the battle runs and their force sits out (or is fielded per the configured default)
- [ ] 3.4 Tests: a zero-`deploy` launch is blocked; a `command-hq` player keeps campaign-surface access; a mixed deploy/HQ launch composes correctly

## 4. Host-as-GM Authority Model

- [ ] 4.1 Designate the CO1 campaign host as the Game Master in gameplay terms — the single campaign-write authority; the guest is a co-op player with no campaign-write authority
- [ ] 4.2 Implement `IGuestProposal` submission — a guest campaign action is sent as a proposal wrapping a CO1 `ICampaignIntent`, not as a direct intent commit
- [ ] 4.3 Extend `CampaignMatchHost` to resolve each proposal to a `GmDecision` before CO1's commit-and-broadcast — only `approve` proceeds to commit
- [ ] 4.4 Tests: a guest proposal does not commit until approved; an `approve` commits and broadcasts the CO1 campaign event; the GM is the single write authority

## 5. GM Arbitration Modes

- [ ] 5.1 Implement `auto-approve` mode — a proposal that passes CO1 mechanical validation is committed immediately with no host interaction
- [ ] 5.2 Implement `host-review` mode — every proposal that passes CO1 mechanical validation is surfaced to the host for explicit `approve` / `veto`
- [ ] 5.3 Ensure CO1 mechanical validation runs first in both modes — a proposal that fails validation is rejected before the host ever reviews it
- [ ] 5.4 Implement the typed `veto` result — `Error {code: 'PROPOSAL_VETOED'}`, distinct from CO1's `INVALID_CAMPAIGN_INTENT`, committing no event and leaving the connection open
- [ ] 5.5 Tests: `auto-approve` commits a valid proposal with no host step; `host-review` waits for the host; a vetoed proposal commits nothing; an over-balance proposal is rejected before review in both modes

## 6. Guest Proposal Surface

- [ ] 6.1 Wire guest "hire pilot" / "accept contract" / "spend" controls to submit `IGuestProposal`s instead of mutating campaign state
- [ ] 6.2 Show a pending-proposal indicator on a submitted action and disable duplicate submit until the proposal resolves
- [ ] 6.3 Surface the resolution — committed event, `veto`, or mechanical rejection — to the guest, telling a GM veto apart from an impossible action
- [ ] 6.4 Tests: a guest control submits a proposal not a commit; the pending indicator clears on resolution; a veto and a mechanical rejection are visually distinct

## 7. Host GM Review Surface

- [ ] 7.1 Implement the host-side GM review surface listing pending guest proposals (only populated in `host-review` mode)
- [ ] 7.2 Show each proposal with the campaign context needed to decide — current C-bill balance, relevant faction standing, the roster effect
- [ ] 7.3 Wire `approve` / `veto` controls from the review surface to the `CampaignMatchHost`
- [ ] 7.4 Tests: the review surface lists pending proposals with context; approving commits the CO1 event; vetoing commits nothing

## 8. Co-op Post-Battle Reconciliation

- [ ] 8.1 On co-op encounter resolution, reconcile salvage / funds / roster / pilot XP into the shared campaign by emitting CO1 campaign events through the `CampaignMatchHost`
- [ ] 8.2 Confirm a `command-hq` player's CO1 mirror receives the same post-battle campaign events as the deploying player
- [ ] 8.3 Keep the co-op combat event log and the campaign event log separate and linked by id
- [ ] 8.4 Tests: post-battle consequences appear as CO1 campaign events; the deploying and command-HQ players converge on the same post-battle campaign state

## 9. Verification

- [ ] 9.1 Integration test: a host launches a co-op mission with both players deploying — the encounter contains both rosters on the shared side and resolves through `ServerMatchHost`
- [ ] 9.2 Integration test: a co-op mission with one player in `command-hq` — the HQ player keeps campaign-surface access and receives the post-battle campaign events
- [ ] 9.3 Integration test: in `host-review` mode a guest `HirePilot` proposal is approved by the host and both campaign views converge; a second proposal is vetoed and commits nothing
- [ ] 9.4 Integration test: in `auto-approve` mode a valid guest proposal commits with no host step; an over-balance proposal is still rejected
- [ ] 9.5 `npx openspec validate add-coop-campaign-play --strict` is clean; build, lint, and typecheck pass
