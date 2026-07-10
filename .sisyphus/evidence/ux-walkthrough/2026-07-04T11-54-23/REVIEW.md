# UX Walkthrough Review — run 2026-07-04T11-54-23

Reviewer basis: all 58 step screenshots from this run (7 journeys, dev build,
1440x1000 desktop + 375x667 mobile), plus the failure evidence from the
previous run (2026-07-04T11-50-04) and targeted source reads to confirm root
causes. Command: `npm run qc:ux-audit`. Zero console/page errors were recorded
across all steps.

Severity scale: **Critical** = a normal user's flow breaks or the first-session
experience is nonsensical. **Major** = wrong-but-survivable behavior, missing
affordance, or trust-damaging inconsistency. **Minor** = friction/confusion.
**Polish** = cosmetic.

---

## Critical

### C1. Accepted mission is a dead end — no way to launch it from the UI

Evidence: `06-campaign-create-to-launch/14-see-the-mission-on-the-missions-page.png`, `15-open-the-mission-launch-screen.png`

After accepting a contract in the Contract Market, the mission appears on the
Missions page as an **inert card** — no Launch button, no link, nothing
clickable. The well-designed Mission Launch screen (readiness panel, pilot
warnings, "Launch with warnings") exists but is reachable **only by typing the
URL** (`/gameplay/campaigns/<id>/missions/<missionId>/launch`). The walkthrough
had to `goto()` it directly. A player completes the entire
create-campaign → accept-contract loop and then hits a wall.

Suggested fix: mission card (status ACTIVE) gets a primary "Launch" action
routing to the launch page.

### C2. First-session campaign economy is dead on arrival

Evidence: `06/.../08-land-on-the-campaign-dashboard.png`, `12-browse-the-contract-market.png`

A brand-new campaign on the **default "standard" preset** starts with
**0.00 C-bills** and greets the player with a **Critical "Finance runway low —
0 days"** alert before they have done anything. The Contract Market then offers
five contracts that **all pay 0.00 C-bills** with "Salvage: None" — the player
is broke, warned about being broke, and given no way to earn. Either starting
funds aren't applied from the preset, or the offer generator produces
placeholder pay — both read as a broken economy in the first five minutes.

### C3. First quick-game battle auto-resolves into a nonsensical outcome

Evidence: `04-quick-game-auto-resolve/07-auto-resolve-the-battle.png`, `06-review-scenario.png`

Auto-resolving the very first battle (2 mechs vs 3, Recon, turn limit 9)
produced: **"Defeat — Turn Limit"** with **Turns Played: 1**, Duration 0 min,
0 losses on both sides, 65 damage dealt / 0 taken. Every number contradicts the
verdict: the turn limit was 9 but 1 turn played; nobody died; the player
out-damaged the enemy — and lost. If Recon objectives can't be scored by
auto-resolve, the result screen needs to say why; as shipped, the new-player
funnel ends in an unexplained instant defeat.

---

## Major

### M1. Pilot added in the campaign wizard never reaches the campaign

Evidence: `06/.../06-add-a-starting-unit-and-pilot.png` (wizard shows "Pilots (1) — MechWarrior 1") vs `08-land-on-the-campaign-dashboard.png` ("0 pilots") and `15-open-the-mission-launch-screen.png` ("Pilot: Unassigned … No pilot assigned. Assign one before launch.")

The Roster step accepted the pilot, the dashboard Force Snapshot reports
**0 pilots**, and launch readiness warns about the missing pilot. Either the
wizard's pilot isn't persisted, or it lands somewhere the dashboard/readiness
don't read. Also worth folding in: the wizard doesn't auto-assign the lone
pilot to the lone unit ("No pilot" dropdown), which is the obvious default.

### M2. The Gameplay hub is an internal QC dashboard

Evidence: `01-first-visit-navigation/04-visit-gameplay-hub.png`

`/gameplay` leads with "Validated Gameplay Flows" — a QC matrix of route
sequences, **npm commands** (`npm.cmd run verify:qc:character-build …`), and
inspection notes. This is developer tooling on the primary player route; the
actual gameplay cards are below the fold. A first-time player looking for
"where do I play" gets a test-coverage table.

### M3. The dashboard has no Gameplay entry

Evidence: `01/.../01-land-on-dashboard.png`

The home page's five cards are Onboarding / Compendium / My Units / Unit
Builder / Compare — **the core play loop is absent**. Gameplay is only
discoverable via the top-bar dropdown. For a game, "Play" should be the loudest
card on the landing page.

### M4. Equipment table rows are fake links

Evidence: run 1 `02-compendium-browse/07-…-FAILED.png`; `src/components/compendium/equipment/EquipmentViews.tsx:247-253`

In the default table view, rows navigate via `onClick` +
`window.location.href` — a full page reload, no anchor semantics, invisible to
keyboard users, no middle-click/ctrl-click/new-tab. Grid and list views use
real `<Link>`s. (This is also what made the walkthrough's link-based selector
fail — the harness now clicks the row like a mouse user, but the a11y gap
stands.)

### M5. "Key Moments" panel renders empty

Evidence: `04/.../07-auto-resolve-the-battle.png`

The results Summary shows a "Key Moments" card whose entire content is a
"Show 3 more moments" link — zero moments are listed, yet three are claimed
hidden. Broken initial-visible-count logic.

---

## Minor

- **m1. Success toast lingers across the whole journey.** "Campaign 'Steel
  Vanguards' created successfully!" is still on screen on the dashboard,
  Contract Market, accept-offer, and Missions screenshots — 6+ navigations
  after firing (`06/.../08` through `14`).
- **m2. Review screen shows an empty "Enemy Faction" field** — label with no
  value (`04/.../06-review-scenario.png`).
- **m3. "Salvage Rights: None (43%)"** on the mission card — the value
  contradicts its own parenthetical (`06/.../14`).
- **m4. Replay library cards carry degenerate metadata** — every card reads
  "Turns 0 / BV total 0 / AI variant: unknown / Winner opponent", with raw ISO
  timestamps that wrap mid-string (`2026-05-10T07:35:11.131Z`). 185 cards of
  near-identical zeros make the library useless for finding a replay
  (run 1 `03/.../02-…-FAILED.png`).
- **m5. Replay viewer layout** — the hex map renders as a small white-background
  square centered in a large empty dark canvas; the page title is the raw
  replay ID (`03/.../03-watch-the-first-replay.png`).
- **m6. Hover-open top-bar menus linger over content.** Menus open on
  mouse-enter with no hover intent delay and re-open after navigation if the
  pointer rests on the trigger — captured obscuring onboarding content
  (`01/.../05-read-onboarding-page.png`).
- **m7. Date format inconsistency on the campaign dashboard** — header
  "7/4/2026" vs Day Advance card "2026-07-04" (`06/.../08`).
- **m8. Launch readiness self-contradiction** — badge says "Ready with
  warnings (1)", footer of the same card says "Ready to launch"
  (`06/.../15`).
- **m9. "1 mechs"** pluralization in Force Snapshot (`06/.../08`).

## Polish

- **p1.** `data-testid="compendium-hub"` is passed to `CompendiumLayout` but the
  layout never forwards it — dead testid (`src/pages/compendium/index.tsx:43`).
- **p2.** Quick-game Review's primary button is labeled "Auto-Resolve" while an
  older e2e spec still greps for "Start Battle" (`e2e/quick-play.spec.ts:191`) —
  stale selector worth cleaning.

## What's genuinely good

- **Customizer**: dense, professional, live stat banner with validity badge,
  armor diagram with allocation color coding — the strongest surface in the app.
- **Quick-game setup**: clear 3-step indicator, live BV/tonnage totals,
  skill dropdowns, honest "demo units shown" hint.
- **Mission Launch screen** (once you find it): readiness warnings with an
  inline "Assign pilot" remediation link is exactly right.
- **Empty states**: "No replays yet" (when it fires) and "No custom units yet"
  both offer concrete next-action CTAs.
- **Mobile**: dedicated bottom tab bar + hamburger menu; quick-game welcome is
  fully readable at 375px.
- **Zero console errors** across all 58 steps of both runs.

---

## Re-running this audit

```
npm run qc:ux-audit        # dev server
npm run qc:ux-audit:prod   # production standalone build
```

Each run creates `.sisyphus/evidence/ux-walkthrough/<timestamp>/` with
`index.html` (contact sheet), `manifest.json` (routes, timings, console
errors per step), per-journey screenshots, and this review convention
(`REVIEW.md` written per reviewed run).
