# Live Playtest Review — Single-Player Campaign, Multiplayer/Co-op, GM Surfaces

> Date: 2026-07-07 · Method: live manual play through headless Chrome (CDP) against `npm run dev` (port 3600), two isolated browser clients for multiplayer · Screenshots: `./screenshots/` (numbered in play order)
> Artifacts left in dev DB for inspection: SP campaign `campaign-1783459565382-uzpocfi` ("Grave Talon Irregulars"), co-op campaign `campaign-1783461381786-y1uzy3d` ("Co-op Campaign XFCL6G"), match lobby `GY2SAD`, game `4498cb10-d4a1-4618-9f9d-2bb99386ccfe`.

## TL;DR

The campaign shell (wizard → dashboard → contract → mission launch) and the GM campaign ledger are in good shape — last audit's critical fixes (0 C-bills, lost pilots, missing launch affordance) all verified fixed. But **the core play loop is broken at the handoff into battle**: the mission roster collapses to 1 placeholder unit with no pilot, the battle soft-locks in Initiative phase with no player control to advance, and the GM's Advance Phase intervention only updates the display — the engine stays in Initiative and the next real action crashes. **All networked multiplayer (co-op campaign join AND 1v1 lobby) fails at the socket handshake** (`1008 unknown-campaign-match` / `unknown-match`) while the in-process validation script passes — the "proven" co-op path never exercises the real server transport.

## CRITICAL — blocks play

**C1. SP campaign battle soft-locks in Initiative phase; no player-facing advance control.**
The single-player game surface (`/gameplay/games/<id>`) has `phase-name` = Initiative but no `advance-phase-button` (that testid exists only in `NetworkedGameSurface.actionbar.tsx:267`). The TacticalActionDock registers no commands for Initiative (`TacticalActionDock.01.test.tsx:246` documents this). Every other phase has End Phase controls — Initiative is the only dead phase, and every battle starts there. Clicking any hex while stuck throws an unhandled `Error('Not in movement phase')` from `gameSessionCore.movement.ts:55` into the Next.js overlay. Screenshots 22–29.

**C2. GM "Advance Phase (GM)" approval is display-only — engine state doesn't change.**
Opening the same battle with `?gm=1`, Advance Phase (GM) → Approve flips the turn rail to MOVEMENT (with a "2 pending" badge) and the full movement composer appears (path ledger, Walk/Run budgets, posture, facing). But Lock In then throws the same `Not in movement phase` from `declareMovement` — the InteractiveSession's real phase never left Initiative. GM interventions report success while committing nothing to the engine. Combined with C1, campaign battles cannot be played manually at all. Screenshots 61–65.

**C3. All live networked multiplayer fails at the socket handshake on the dev server.**

- Co-op campaign: host creates match (`POST /api/multiplayer/matches` 201), but the host's own campaign-channel socket is accepted then immediately closed `code=1008 reason=unknown-campaign-match`. Guest resolves invite `XFCL6G` fine, connects, same 1008 close → "Timed out waiting for the host campaign snapshot". Host UI shows a healthy "CO-OP SESSION: HOST" badge the whole time (silent failure).
- Networked 1v1: same signature on the combat channel — `1008 unknown-match`; host lobby hangs forever on "Joining lobby... Status: closed."
- Likely root cause: `[InMemoryMatchStore] dev-only store in use` logs **twice** (boot + match creation) — the REST route bundle and the socket server hold separate store instances, so the socket layer can't find REST-created matches.
- **False proof:** `npm run validate:multiplayer:coop-runtime` passes (`ok: true`) because it calls `openCoopRuntimeSession` in-process — it never traverses the real HTTP match API + socket upgrade. Screenshots 49–55.
- **Scope refinement (from harness planning, UNVERIFIED live):** the qc:ux-audit Playwright webServer runs with `MULTIPLAYER_STORE=durable` (+ `NEXT_PUBLIC_E2E_MODE=true`, playwright.config.ts:152–164), under which the handshake reportedly works — which would explain why e2e multiplayer passes while manual dev play fails. C3 is then specifically the **in-memory store default of plain `npm run dev`** (split store instances across the route bundle and socket server). Fix options: share one store instance across bundles, or default dev to the durable store. Either way the manual-dev experience — where everyone actually playtests — is broken today.

**C4. Mission launch roster does not reach the encounter.**
Mission Launch showed 4/4 units selected, eligible, "Ready to launch". The encounter/pre-battle then shows Player Force = **1 unit ("Slot 1"), 0 BV** and a warning "Player: Unit has no assigned pilot"; the battle is 1v1 Atlas vs Marauder regardless of the selected lance. Both the unit count and pilot assignments are lost in the campaign→encounter handoff. Screenshots 16–20.

**C5. Starmap crashes and cannot recover.**
`/gameplay/campaigns/<id>/starmap` hits the error boundary: `Failed to execute 'drawImage' on 'CanvasRenderingContext2D': the image argument is a canvas element with a width or height of 0`. Try Again re-crashes identically (viewport 1600×900, headless). Screenshots 38-starmap, 39.

## MAJOR — degrades play badly

**M1. Wizard roster produces placeholder entities that break downstream systems.**

- Units are generic weight-class templates ("Light Mech 25t"), never mapped to any of the 4,225 canonical units; Mech Bay shows "Weight: not cataloged | BV: not cataloged"; encounter BV = 0. (The pre-battle screen proves a canonical-unit picker exists — the wizard just doesn't use it.)
- All added pilots are named "MechWarrior 1" (4 identical entries, no rename, no skills shown); pilot detail panel says **"Pilot not found in vault — this campaign may reference a deleted pilot"** — Progression/Abilities/Assignment tabs dead for every wizard pilot. In-battle they surface as "Unknown Pilot". Screenshots 08–09, 36, 38-mech-bay.

**M2. Campaign dashboard widgets don't reflect campaign state.**
After accepting a contract: Active Contract card = "No active contract", Operations Queue = "Choose a contract", while Missions tab shows the contract Active with a Launch button. After the battle: Recent Activity (Battle) = "No battle entries yet". Campaign list cards show 0 Forces / 0 Missions (and on client B, 0 Personnel) for a campaign with 1 force, 1 mission, 4 personnel. Forces (TO&E) shows the root force with **0 units** while Force Snapshot says 4 mechs. Screenshots 14, 31–32, 37, 48.

**M3. Auto-resolve produces a meaningless instant result.**
Atlas vs Marauder auto-resolves as "DRAW — Objective complete", 0 damage both sides, "No MVP — no damage dealt by the winning side" (contradictory copy), both Operational. No scenario debrief reaches the campaign: no payout, no activity entry (mission Scenarios count did tick 0→1). Exit CTA is "Back to Encounter Hub", not back to the campaign. Screenshot 30.

**M4. Finance numbers contradict each other and never post.**
Dashboard Finances card: 600/day (Salaries 200 + Maintenance 400). Finances & Loans page: "Daily cost projection 200.00 — Maintenance 0.00". After Advance Day the balance stays 5,000,000.00 and the transaction ledger remains "No transactions yet" — projected costs are never posted (or the two projections disagree about what would post). Advance Day itself gives zero feedback (no summary, no toast, no new entries). Screenshots 32–34.

**M5. Co-op onboarding dead-ends.**
"Create Co-op Campaign" with no vault fails with "No vault identity configured" — no link to fix it (the identity form lives in Settings → Vault & Sharing; the `/multiplayer` hub does this right with a "Set up vault identity" button — reuse that pattern). Creating a co-op campaign skips the wizard entirely: no name/type/preset/roster choice, you get "Co-op Campaign XFCL6G" with the same placeholder roster. On a shared server, a second browser is prompted to unlock the HOST's identity ("unlock your vault identity as HostAlpha") — the one-identity-per-server model means guests on the same server can't have their own identity through the UI (the e2e suite creates multiple identities via API only). Screenshots 40–48.

## MODERATE — friction and polish

1. **Contract market cards are thin and inconsistent** — employer/pay/duration only; no difficulty, enemy, or location. Every card says "Salvage: None" while the accepted mission shows "Salvage Rights: 49%". Accept gives no feedback and no path to the now-active contract (stay on market, no toast). Screenshots 12–13, 15.
2. **Hex tooltip dumps internal debug text** — "Projection: Neutral - terrain / Movement channel: none; combat channel: none; Projection detail: Hex -2,1; intent terrain; status neutral; ... Sources: terrain/elevation: Rendered map terrain/elevation grid" — and covers a third of the map. Screenshot 25.
3. **Units labeled by slug** — initiative rail and status panel show `atlas-as7-d` / `marauder-mad-3r` instead of display names.
4. **Withdraw panel auto-opens on unit selection** and overlaps the Concede button (bottom-right). Screenshot 23.
5. **UTF-8 mojibake in unit names** — "Alfar AL-D1 'DÃ¶kkÃ¡lfar'" in the pre-battle unit picker (should be Dökkálfar).
6. **Clicking a battle-mode card launches instantly** — no confirm; "Launch Skirmish" button also present, ambiguous.
7. **Duplicate day-advance controls** — header Advance Day/Week/Month AND a Day Advance card with Advance one day/week.
8. **Lobby demands the vault password twice in a row** — mint token on `/multiplayer`, then the lobby page immediately asks again ("Unlock vault — Lobby GY2SAD requires a signed identity"). Screenshot 54.
9. **GM ledger corrections are canned demo scenarios** — 7 fixed types with fixed amounts (+2,500 merchant reversal); a GM cannot enter a custom amount/reason from this surface. Also the time-advance preview showed "Before: Campaign date 2026-07-07" when the campaign was on 07-08 (stale date in preview).
10. **GM mode is query-param-only** (`?gm=1` / `?mode=gm`) — no UI affordance anywhere to enter the GM tactical view.
11. **`/gameplay` hub still shows the internal QC matrix** ("Validated Gameplay Flows" with npm commands) below the player-facing cards; error pages/empty states elsewhere are player-clean.
12. **Wizard polish** — validation is a banner (not inline, no focus move); Review step shows only counts (no pilot assignments, no starting funds preview); campaign-type cards use emoji icons unlike the rest of the app.
13. **First-run hiring pool is empty** ("0 candidates — advance the day to refresh") — fine mechanically, but a new mercenary campaign with nobody to hire on day 1 is odd.

## What worked well

- Campaign wizard flow, empty states, breadcrumbs, and the Mission Launch readiness screen (eligibility badges, refit links, briefing panel).
- Prior audit's critical fixes verified: 5,000,000 C-bills starting funds, 4 pilots survive the wizard, Launch affordance on the mission card, Gameplay card on the dashboard home.
- Battle-state persistence across reload (same round/positions).
- GM campaign ledger end-to-end: correction preview (before/after/result + badges) → approve cascade → balance applied (5,000,000 → 5,002,500) → correct redaction split (sanitized Player Action Log vs GM-private rationale) → conflict variant correctly blocks approval with "requires-manual-takeover".
- Movement composer UX (once reachable): path ledger with per-leg MP, Walk/Run budget cards with heat/to-hit consequences, posture and facing controls, End Phase affordance.
- 404 page and campaign-level error boundaries are player-friendly.
- `/multiplayer` hub's vault explainer + "Set up vault identity" pattern.

## Spec cross-reference (GM) — from openspec/specs/gm-\* digest

- **C2 is a spec violation, not just UX**: `gm-cascade-preview` guarantees that Approve appends exactly one intervention record applied to real state, and that approved records replay deterministically to the same state. Observed: approval updated the turn-rail projection only; the engine session's phase never changed and the next player action crashed. The inverse guarantee (preview = zero mutation) held.
- **GM-mode entry is a confirmed spec gap**: the spec digest found no dedicated route/toggle that flips the tactical shell into GM mode (my `?gm=1` query param is the only entry). Spec expects GM shell mode gated by `campaignAuthority.ts` (SP owner = GM, co-op host = GM, guest = player) — an authority-derived UI toggle is the missing piece.
- **Guest-side redaction checks are blocked by C3**: the spec requires a co-op guest hitting `/gameplay/campaigns/<id>/gm-ledger` directly to get a read-only view (public summaries, no approve/preview, no private fields, surviving reload). Untestable until multiplayer join works — add to the co-op journey for the harness.
- **Spec'd but not yet exercised this session** (queue for next playtest / harness journeys): time-cascade preview's one-ordered-summary-per-projected-day + travel/repair/contract/market/recovery/upkeep changed-state refs; approve→replay determinism; combat correction families beyond advance-phase (reposition, damage/crits, heat/ammo, lifecycle, attack-resolution correction, objective markers, unit reload reconciliation with overlay preservation); stale-cascade blocking (campaign V1→V2 after preview); random-events firing through GM day advancement.
- **By-design friction to not misreport**: time-cascade effects touching roster/vault-owned state (e.g. pilot recovery) intentionally force manual takeover — the "requires-manual-takeover" block I hit on the external-conflict variant is correct behavior per spec.

## Repro quick-reference

| Finding | Repro                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1/C2   | Campaign → accept contract → Missions → Launch → select units → Launch mission → Play Manually → click any hex. GM variant: append `?gm=1`, Advance Phase (GM) → Approve → move → Lock In.  |
| C3      | Two browsers. A: `/multiplayer` → mint token → Create match → watch lobby hang. Or Campaigns → Create Co-op Campaign → B: Join Co-op Campaign with code. Server log shows `1008 unknown-*`. |
| C4      | Any campaign mission launch → pre-battle force cards show 1 unit / 0 BV.                                                                                                                    |
| C5      | Any campaign → Starmap tab.                                                                                                                                                                 |
