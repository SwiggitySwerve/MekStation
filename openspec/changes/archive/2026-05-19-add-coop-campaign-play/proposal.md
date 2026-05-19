# Change: Add Co-op Campaign Play

## Why

`add-shared-campaign-state` (CO1) gives two friends one shared, server-authoritative campaign ledger — a campaign event log, a host-as-single-writer, and a read-only guest mirror. But CO1 is only the transport. It deliberately stops short of the two things that make a co-op campaign actually *playable*:

1. **Co-op mission launch.** A campaign mission today launches one player's force into one encounter. A co-op campaign needs both players' forces in a single encounter, and it needs to handle the case where one player wants to fight while the other stays in the "command HQ" — managing the bay, reviewing contracts, watching the battle — without being forced onto the map.
2. **The host-as-GM authority model.** CO1 defined the *transport* for campaign intents (`HirePilot`, `AcceptContract`, `SpendFunds`, …) and that the host validates them. It did not define the *gameplay model*: that the host is the campaign's Game Master, that guest campaign actions are *proposals* the host arbitrates against current balance and faction standing, and how the host approves, auto-approves, or vetoes them.

This change builds both, on top of CO1's loop. It is the former CO2 (co-op mission launch) and CO3 (campaign authority model) merged, because the authority model only has meaning once there is co-op gameplay to authorize.

## What Changes

- ADDED co-op mission launch: a campaign mission can be launched with both players' forces composed into one `IEncounter` / `GameSession`, routed through the existing `ServerMatchHost` server-authoritative combat loop
- ADDED a per-mission participation choice: each player chooses to **deploy** (their force joins the encounter and they play it on the map) or to remain in **command HQ** (their force may still be auto-resolved or sit out, and they keep access to campaign-management surfaces while the battle runs)
- ADDED the host-as-GM authority model: the host is the campaign Game Master; guest campaign actions are proposals the host arbitrates
- ADDED GM arbitration modes for guest intents: **auto-approve** (intent committed immediately if it passes CO1 validation), **host-review** (the host sees the proposal and explicitly approves or vetoes), and an explicit **veto** result that returns a typed rejection without committing
- ADDED a guest-facing intent surface: guest "hire pilot" / "accept contract" / "spend" controls send proposals instead of mutating state, and show a pending-proposal indicator until the host's broadcast resolves them
- ADDED a host-facing GM review surface: the host sees incoming guest proposals with the campaign context (current balance, standing) needed to approve or veto
- ADDED co-op post-battle reconciliation: the encounter's campaign consequences (salvage, funds, roster, XP) are emitted as CO1 campaign events so both players' campaign views converge

## Dependencies

- **Requires**: `add-shared-campaign-state` (CO1) — the campaign event log, `CampaignMatchHost` validate-commit-broadcast loop, and read-only guest mirror this change builds its gameplay and authority model on
- **Requires**: `add-campaign-combat-loop` (Wave 4 CP1) — the mission→encounter launch and post-battle→campaign bridge that co-op mission launch extends to two forces
- **Requires** (transitively, via CO1): `harden-multiplayer-transport` (Wave 3 M2) and `add-campaign-persistence` (Wave 4 CP0)

## Impact

- Affected specs: `coop-campaign-sync` (the capability created by CO1) — this change ADDs the co-op-play and GM-authority requirements onto it, keeping all co-op campaign behavior in one capability
- Affected code: `src/lib/campaign/` (co-op mission composition, post-battle reconciliation into campaign events), `src/lib/multiplayer/server/` (`CampaignMatchHost` extended with GM arbitration modes; co-op encounter launch through `ServerMatchHost`), `src/types/campaign/` (participation choice, GM arbitration types), `src/components/campaign/` (guest proposal surface, host GM review surface), `src/components/gameplay/` (co-op encounter with both forces)
- New types: `CoopParticipationChoice` (`deploy` | `command-hq`), `GmArbitrationMode` (`auto-approve` | `host-review`), `IGuestProposal`, `GmDecision` (`approve` | `veto`)
- No new transport — co-op mission launch reuses `ServerMatchHost`; campaign proposals reuse the CO1 campaign event-broadcast loop
- No database migrations

## Non-Goals

- The campaign event log, `CampaignMatchHost` transport, and guest mirror mechanics — all owned by CO1; this change consumes them
- Three-or-more-player co-op campaigns — the host/guest pair remains the scope
- A dedicated co-op AI director or scaling of encounter difficulty to two forces beyond composing both rosters — encounter generation tuning is out of scope
- Campaign-tier host migration — if the host disconnects, CO1's pause behavior stands; this change does not add host handoff
- PvP campaign play (the two players' forces fighting *each other*) — co-op means cooperative; both forces share a side against the encounter's OpFor
- Spectator seats for the co-op encounter — that consumes `add-matchmaking-and-spectator` (Wave 3 M3) and is a later integration
