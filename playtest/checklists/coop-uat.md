# v2.2.0 co-op L1: two players and a non-playing GM

This is the human acceptance script for one complete shared mission on one
loopback server. A human must operate and attest to the session. One person may
drive all three seats sequentially; record **"one human operating three seats"**
when that is the arrangement. An agent rehearsal is separate evidence.

Copy [the evidence template](../session-notes/TEMPLATE-v2.2.0-coop-l1.md) to
`playtest/session-notes/<date>-v2.2.0-coop-l1.md`. Record failures and retests,
including any step that could not be completed. This checklist is not a claim
that the release or its manual gate has passed.

## Known L0 defects: do not re-file

| Existing issue | Known behavior  |
| -------------- | --------------- |
| V211-01        | AI hex stacking |
| V211-03        | Prone skip      |
| V211-07        | Per-unit stats  |

Reference these IDs if encountered and record their effect on this session.
Record any new behavior separately in [ISSUES.md](../ISSUES.md). A known issue
that prevents completion still makes the affected step FAIL; do not waive it
silently.

## Entry gates and topology

- [ ] Record the exact release-candidate Main SHA, tag, artifact filename and
      SHA-256. Reserve 60–90 minutes and continue until a mission actually ends
      or a blocking defect is documented.
- [ ] On that SHA, record green `verify:qc:coop-campaign-journey` and
      `ServerMatchHostUnitOwnership.test.ts` receipts. The automated journey
      must cover three contexts (GM plus two players), launch, each player's
      owned-unit action and foreign-unit refusal, terminal combat, outcome and
      reload. A two-browser pre-launch journey or injected outcome is not this
      proof. Do not spend the human session while these prerequisites are red
      or missing.
- [ ] Rehearse this script with three isolated contexts on the same candidate
      and record defects first. If using the packaged application, rehearse on
      that artifact. Keep the separate installer smoke requirement.
- [ ] Start **one server**. Prefer one packaged Electron application as GM,
      with Player 1 and Player 2 browsers using its actual loopback port. The
      alternative is one local development server on port 3600 and browser
      profiles A (GM), B (Player 1) and C (Player 2).
- [ ] Capture the actual `MEKSTATION_LISTENER_READY` line with
      `boundAddress: "127.0.0.1"` and the port. Use the same origin and port in
      all seats. Record **"same-host loopback; remote play not exercised"**.
      Follow the [supported topology](../../docs/releases/v2.2.0-topology.md).
- [ ] Use three distinct identities and storage profiles: GM in Electron or
      profile A, Player 1 in B, Player 2 in C. Separate browser profiles are
      required; multiple InPrivate windows can share storage and are unsuitable.
      Multiple Electron instances each start their own server, so they are
      **not a shared session**. Record seat → profile → identity without tokens.
- [ ] Arrange the three windows side by side. Prepare one owned unit per player
      and a small fog-off mission that permits movement and firing by both
      players, ideally for at least three turns. GM observes and arbitrates
      without deploying or controlling a player unit.

## Human script

For every numbered step, record start/end timestamps with timezone, PASS/FAIL,
actual observations, and evidence paths in the session note. Compare all three
seats after state changes. Keep campaign and match IDs with the server log.

1. **Create campaign.** GM creates a co-op campaign and obtains its invite.
   Record campaign ID. Confirm GM is the non-playing authority seat.
2. **Join Player 1.** Profile B joins by invite. Confirm its distinct identity,
   membership, roster, finances and contract state in all seats.
3. **Join Player 2.** Profile C joins by invite. Confirm both players and GM see
   the same campaign and distinct player identities.
4. **Approve a proposal.** Player 1 proposes an available campaign action. GM
   sees its author and action, approves it, and all three seats see the change
   applied once.
5. **Reject a proposal.** Player 2 proposes another action. GM rejects it. Capture
   the visible rejection; confirm the proposed mutation did not apply in any
   seat.
6. **Launch fog-off.** GM selects/accepts a contract and launches its mission
   with fog disabled. Assign a distinct owned unit to each player. Record match
   ID, player-to-unit mapping and initial state. Capture one launch screenshot
   per seat. GM remains an observer.
7. **Player 1 acts.** In the appropriate phases, Player 1 moves and fires its
   own unit. Record unit, origin/destination, target and observed result. Both
   other seats see the authoritative changes.
8. **Player 2 acts.** Player 2 moves and fires its own unit in the appropriate
   phases. Record the same details and cross-seat agreement.
9. **Player 1 attempts a foreign unit.** Attempt to move or fire Player 2's
   unit through the normal UI. Capture the visible refusal text or disabled
   control explanation exactly. Confirm the attempted action changes no state
   in any seat; a silent no-op is not sufficient evidence.
10. **Player 2 attempts a foreign unit.** Attempt the corresponding action on
    Player 1's unit. Capture its visible refusal and unchanged state in all
    seats. Do not impersonate an identity or edit storage to bypass controls.
11. **Observe as GM.** Verify GM sees both players' accepted actions and the
    resulting shared state without acting as a player. Continue normal play
    for at least three turns when the mission permits.
12. **Disconnect/reconnect mid-mission.** While combat is still active,
    temporarily disconnect only Player 2 using that profile's network controls;
    leave the server, GM and Player 1 connected. Exercise the campaign-sync
    connection as well as mission recovery. Restore connectivity before the
    HP two-retry budget is exhausted and confirm recovery with no terminal
    error, retained identity/ownership and agreement on phase, positions and
    damage. Then disconnect that seat again long enough to exhaust both
    retries. Only after exhaustion expect the inline message:
    **"Campaign sync could not connect. Reload this campaign to try again."**
    Record retry timestamps/logs, any premature error and the actual message.
    Restore connectivity, reload that campaign as instructed, re-enter the same
    active match and resume an owned-unit action. Compare all seats; no duplicate
    action or loss of campaign/match identity is allowed. Record both recovery
    attempts separately.
13. **Complete the mission.** Play to the actual terminal Results state; do not
    inject an outcome or mark the mission complete in storage. Capture one
    mission-end screenshot per seat and the shared result.
14. **Apply outcome.** Follow the available GM outcome flow. All three seats
    must see the same campaign consequences (including displayed damage,
    resources, rewards and mission status), applied exactly once. Record actual
    before/after values; do not assume a particular salvage or XP policy.
15. **Reload all three seats.** Reload GM, Player 1 and Player 2 independently
    using F5 or the client's reload command. Each returns to the same campaign
    and agrees on completed mission, result and consequences, with no duplicate
    application. Capture one after-reload screenshot per seat.
16. **Attempt fog-on create.** Open multiplayer match creation and attempt to
    enable fog. Confirm fog-on creation is unavailable; record the disabled
    control/help text or fixed refusal verbatim. If a fog-on match is created
    and seats are only refused afterward, record FAIL for this availability
    check. Fogged play is outside this release's supported loop.

## Close the session

- [ ] Include all nine required screenshots (GM/Player 1/Player 2 at launch,
      mission end and after reload), foreign-unit refusal evidence, listener
      line and server log excerpt correlated by campaign/match IDs. Remove
      tokens, invite secrets, cookies and other credentials from evidence.
- [ ] List defects with severity, reproduction/evidence, retests and an explicit
      release-blocking verdict. Preserve initial FAILs even if retests pass.
- [ ] Record completion or the exact blocking step and obtain owner sign-off.
      A completed pass with non-blocking defects can be recorded honestly;
      missing steps or unresolved blockers cannot be presented as a clean pass.
