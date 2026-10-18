# v2.2.0 co-op L1: two players and a non-playing GM

This is the human acceptance script for one complete shared mission on one
loopback server. A human must operate and attest to the session. One person may
drive all three seats sequentially; record **"one human operating three seats"**
when that is the arrangement. An agent rehearsal is separate evidence.

Copy [the evidence template](../session-notes/TEMPLATE-v2.2.0-coop-l1.md) to
`playtest/session-notes/<date>-v2.2.0-coop-l1.md`. Record failures and retests,
including any step that could not be completed. This checklist is not a claim
that the release or its manual gate has passed.

## PREREQUISITE GAP: three identities block the human session

At the inspected Main base `cf42ab567`, there is **no ordinary-UI procedure to
provision three distinct player identities on one server**. Separate browser
profiles isolate client storage but do not select different server identities.
Do not start the human session until Root registers and lands an identity setup
fix and its exact three-seat UI procedure is verified on the candidate.

The existing ordinary first-identity flow is `/settings` → **Vault & Sharing** →
**Create Your Vault Identity** → fill **Display Name**, **Password** and
**Confirm Password** → **Create Identity**. Once an identity exists, this
surface shows unlock/status instead of a second creation or identity selector.
Opening the same flow in profiles B and C does not create two more identities;
unlocking or changing a display name does not change the signing identity.

Source evidence (file:line at the inspected base):

- `src/components/settings/VaultSettings.tsx:15` and
  `src/components/vault/VaultIdentitySection.tsx:320`: the settings surface and
  create-versus-unlock branch.
- `src/pages/api/vault/identity/index.ts:131`: a second normal
  `POST /api/vault/identity` returns 409, **"Identity already exists. Use unlock
  endpoint."**; PATCH only updates display name/avatar (`:175`).
- `src/pages/api/multiplayer/auth/token.ts:133`: token minting reads
  `repository.getActive()`; `src/services/vault/IdentityRepository.ts:86` reads
  the server-wide SQLite active identity (`:91`), and `setActive` clears all
  other active flags (`:144`).
- `e2e/coop-campaign-two-browser-journey.spec.ts:66`: the inline `seedIdentity`
  helper POSTs to `/api/e2e/vault-identity` with `x-playwright-e2e-run-id`. The
  journey seeds GM/host (`:274`), creates the campaign and captures its token
  (`:308`), then seeds the guest (`:327`) before the guest joins. The helper
  route saves and activates each new server identity
  (`src/pages/api/e2e/vault-identity.ts:143`).
- `src/pages/api/e2e/vault-identity.ts:97`: that route requires
  `NEXT_PUBLIC_E2E_MODE=true`, a configured `PLAYWRIGHT_E2E_RUN_ID` and a matching
  run ID; unauthorized calls return 404 (`:74`). This is a guarded test seam,
  not a packaged human-session setup procedure. Do not enable it or manipulate
  SQLite/tokens to claim an ordinary-UI manual pass.

Unblocking evidence must name the landed fix, exact candidate SHA and executable
UI steps for GM, Player 1 and Player 2 on the same server. Verify three distinct
non-secret `playerId` values at create/join and that each seat retains its
identity through reconnect and reload. Record those IDs, never token values.

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

- [ ] Resolve the identity **PREREQUISITE GAP** above and record its verified
      three-identity setup procedure before following the script below.
- [ ] Record the exact release-candidate Main SHA, tag, artifact filename and
      SHA-256. Reserve 60–90 minutes and continue until a mission actually ends
      or a blocking defect is documented.
- [ ] On that SHA, record green `verify:qc:coop-campaign-journey` and
      `ServerMatchHostUnitOwnership.test.ts` receipts. The automated journey
      must cover three contexts (GM plus two players), launch, each player's
      owned-unit action and UI ownership gating, terminal combat, outcome and
      reload. Record automated server refusal evidence separately: the ownership
      test and E2E-31 in `e2e/gm-two-player-combat.pack1.spec.ts:298` submit a
      foreign-unit intent; the latter checks `AUTH_REJECTED` / `unit-not-owned`
      (`:326`) and unchanged event count. A two-browser pre-launch journey or
      injected outcome is not completed combat proof. Do not spend the human
      session while these prerequisites are red or missing.
- [ ] Record candidate ancestry/proof for **P2CG1HP** and
      [PR #2253](https://github.com/SwiggitySwerve/MekStation/pull/2253). The HP
      inline exhaustion message and disabled fog toggle below are **expected
      once P2CG1HP / PR #2253 land**, respectively; they are not claims about
      current behavior at this document's inspected base. Missing prerequisites
      block these acceptance checks; do not invent observations or mark PASS.
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
      required for storage isolation but do not provision identities; use the
      verified fix procedure above. Multiple InPrivate windows can share storage
      and are unsuitable.
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

1. **Create campaign.** After the identity gap is resolved, GM opens
   `/gameplay/campaigns`, enters **Co-op host vault password** and clicks
   **Create Co-op Campaign**. Record campaign ID and the six-character room
   code. Confirm GM is the non-playing authority seat.
2. **Join Player 1.** In profile B, open `/gameplay/campaigns` → **Join Co-op
   Campaign**. Enter the six-character **Room code** and Player 1's **Co-op guest
   vault password**, then click **Join**. Confirm the minted non-secret
   `playerId` differs from GM's, and compare membership, roster, finances and
   contracts in all seats. Do not navigate an invite link.
3. **Join Player 2.** In profile C, repeat `/gameplay/campaigns` → **Join Co-op
   Campaign** → the same six-character **Room code** plus Player 2's **Co-op
   guest vault password** → **Join**. Confirm its `playerId` differs from both
   other seats and all three see the same campaign. The current join form is
   implemented in `CampaignCoopEntryPanel.tsx:300` under
   `src/pages-modules/gameplay/campaigns/`.
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
9. **Player 1 checks foreign-unit UI gating.** Select Player 1's own unit for
   orders, then click a foreign unit, including Player 2's unit. Verify the UI
   never selects that unit for orders: a foreign-side click selects a target,
   not the commanding unit (`src/components/multiplayer/NetworkedGameSurface.tsx:293`).
   Capture the order/target selection and confirm no foreign movement or firing
   is submitted. If another player's unit becomes selectable for orders, record
   FAIL; shared side is not ownership. Do not force a forbidden command.
10. **Player 2 checks foreign-unit UI gating.** Repeat from Player 2's seat on
    Player 1's unit and a foreign-side unit. Capture target-only/blocked order
    selection, with no foreign action or state change in any seat. The human
    does not need to trigger a server refusal the normal UI cannot reach.
    Server refusal is covered by the automated receipts above. When a rejected
    intent does reach the UI, `intent-error-toast` renders
    **"Action rejected (AUTH_REJECTED): unit-not-owned"**
    (`src/components/multiplayer/NetworkedGameSurface.overlays.tsx:237`); record
    it if observed, rather than requiring it from these clicks.
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
    retries. **Expected once P2CG1HP lands**, only after exhaustion, is the
    inline message:
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
16. **Attempt fog-on create.** **Expected once PR #2253 lands:** open multiplayer
    match creation and attempt to enable fog; confirm its toggle is disabled
    and record the help text verbatim. This disabled toggle is not current
    behavior at the inspected base. Record the landed PR/candidate SHA before
    checking it. If creation succeeds and seats are only refused afterward,
    record FAIL for this availability check. Fogged play is outside this
    release's supported loop.

## Close the session

- [ ] Include all nine required screenshots (GM/Player 1/Player 2 at launch,
      mission end and after reload), human UI ownership-gating captures,
      automated server-refusal receipts, listener line and server log excerpt
      correlated by campaign/match IDs. Remove tokens, invite secrets, cookies
      and other credentials from evidence.
- [ ] List defects with severity, reproduction/evidence, retests and an explicit
      release-blocking verdict. Preserve initial FAILs even if retests pass.
- [ ] Record completion or the exact blocking step and obtain owner sign-off.
      A completed pass with non-blocking defects can be recorded honestly;
      missing steps or unresolved blockers cannot be presented as a clean pass.
