# Change: Fix Navigation And Playability Dead-Ends

## Why

The 2026-06-12 full codebase review (Cluster U + UX/playability mediums) found a
set of dead-ends where the navigation surface advertises destinations the app
cannot honor and where real backend capability sits behind hardcoded demo
stubs. These are not subtle drift — a first-time player following the visible
affordances lands on 404s, fake data, and unexplained gates.

- **U-1** — `/gameplay` is a 404. There is no `src/pages/gameplay/index.tsx`
  (Glob confirmed: no file), yet the mobile bottom-nav "Gameplay" tab routes to
  `/gameplay` (`src/components/common/MobileBottomNav.tsx:38`) and 17 breadcrumbs
  resolve there. Tapping the primary mobile gameplay tab fails.
- **U-2** — The multiplayer hub `/multiplayer` is orphaned. The desktop sidebar
  `gameplayItems` list (`src/components/common/TopBar.tsx:70`) contains Quick
  Game, Pilots, Forces, Campaigns, Encounters, Games — but no Multiplayer entry.
  The hub is reachable only by typing the URL.
- **U-3** — The games list is a hardcoded demo stub. `gameplay/games/index.tsx`
  renders a single fake `DEMO_GAMES` entry (`src/pages/gameplay/games/index.tsx:34`)
  while a real reader, `listMatchLogs` (`src/services/matchLog/MatchLogService.ts:135`),
  exists and is unused. A player's real matches never appear.
- **U-4** — Quick Game is auto-resolve only. `QuickGamePlay` auto-fires
  `startBattle()` on mount when a game is Active
  (`src/components/quickgame/QuickGamePlay.tsx:100`) and renders a results
  table; the only interactive path is "Watch AI Battle" (spectator). The
  advertised "learn the mechanics" on-ramp never puts the learner on the hex
  board.
- **Medium (campaign multi-campaign)** — The campaign store holds exactly one
  `campaign` (`set({ campaign: ... })`, `src/stores/campaign/useCampaignStore.ts:95`),
  so the list can never show more than one and "New Campaign" clobbers the
  active one. A real multi-campaign backend exists: `GET /api/campaigns`
  returns `ICampaignSummary[]` via `listCampaignSummaries`
  (`src/pages/api/campaigns/index.ts:4`), unused by the list UI.
- **Medium (dashboard reactivity)** — The campaign dashboard reads stores via
  `store.getState().getCampaign()` at render time
  (`src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.tsx:54`),
  which is non-reactive; the list page already fixed this exact bug.
- **Medium (onboarding)** — No in-app onboarding/tutorial/glossary. The home
  `navigationCards` array (`src/pages/index.tsx:23`) omits any first-run
  guidance, and core jargon (BV, gunnery/piloting, heat, PSR) has no inline
  surface.
- **Medium (vault friction)** — Multiplayer entry is blocked behind an
  unexplained "Vault password required" section with no setup path or guest
  option from that page (`src/pages/multiplayer/index.tsx:216`).

## What Changes

- Add a `/gameplay` hub index page (or a redirect to a representative gameplay
  landing) so the mobile bottom-nav tab and the 17 breadcrumbs resolve to a real
  page instead of a 404 (U-1).
- Add a Multiplayer entry to the desktop Gameplay navigation list and the mobile
  menu so `/multiplayer` is reachable from the nav surface, not just by URL (U-2).
- Replace the `DEMO_GAMES` stub in the games list with a read from the existing
  `listMatchLogs` reader, including a real `EmptyState` when no matches exist
  (U-3).
- Resolve Quick Game's auto-resolve-only surface (U-4) via the explicit decision
  in `design.md` D4: relabel the current auto path as "Auto-Resolve" AND add a
  low-friction interactive Skirmish on-ramp that lands the learner on the hex
  board.
- Wire the campaign list to the multi-campaign `GET /api/campaigns` backend and
  add a campaign switcher so creating a campaign no longer clobbers the active
  one.
- Make the campaign dashboard reactive (subscribe via store selectors) instead
  of reading `getState()` at render.
- Add a first-run onboarding/tutorial entry and an inline glossary surface for
  core jargon.
- Add a setup path / guest affordance to the multiplayer entry page so the vault
  gate explains itself and offers a route forward.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `app-navigation`: gains a Gameplay Hub Route requirement (the `/gameplay`
  index/redirect resolves the mobile tab + breadcrumbs), a Multiplayer
  Navigation Entry requirement (the orphaned hub is linked from the nav
  surface), a Games List Real Data requirement (the list reads real match logs
  with an empty state), an Onboarding And Glossary Entry Point requirement, and
  a Multiplayer Entry Setup Path requirement.
- `quick-game-ui`: gains an Interactive Skirmish On-Ramp requirement and an
  Auto-Resolve Labeling requirement so the auto-resolve path is honestly named
  and an interactive alternative exists.
- `campaign-management`: gains a Multi-Campaign List requirement (multiple
  campaigns coexist and a switcher selects the active one) and a Reactive
  Campaign Dashboard requirement (the dashboard re-renders on store change).

## Impact

- `src/pages/gameplay/index.tsx` (new hub index or redirect — U-1).
- `src/components/common/TopBar.tsx` (`gameplayItems` Multiplayer entry — U-2),
  `src/components/common/MobileBottomNav.tsx` (mobile menu Multiplayer entry — U-2).
- `src/pages/gameplay/games/index.tsx` (replace `DEMO_GAMES` with `listMatchLogs`
  read + `EmptyState` — U-3).
- `src/components/quickgame/QuickGamePlay.tsx` and the Quick Game setup surface
  (relabel auto-resolve + add interactive Skirmish on-ramp — U-4).
- `src/stores/campaign/useCampaignStore.ts` (multi-campaign list state + switcher
  action), the campaign list page, and `GET /api/campaigns`
  (`src/pages/api/campaigns/index.ts`) consumption.
- `src/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.tsx`
  (reactive selectors instead of `getState()` at render).
- `src/pages/index.tsx` (`navigationCards` onboarding/glossary entry) and a new
  onboarding/glossary surface.
- `src/pages/multiplayer/index.tsx` (vault setup path / guest affordance).

## Non-goals

- No change to the multiplayer transport, auth model, or vault implementation —
  this change only makes the vault gate self-explanatory and the hub reachable;
  whether networked play actually functions is the `multiplayer-server` /
  `coop-campaign-sync` truthfulness cluster (MP-1/MP-2), tracked separately.
- No tutorial *content authoring* beyond the entry point and glossary scaffold;
  the depth of the lesson is follow-on product work.
- No campaign persistence-layer rework — the multi-campaign backend
  (`GET /api/campaigns`) already exists; this change consumes it.
- No reconciliation of the two parallel multiplayer lobby stacks (P2P
  `/gameplay/lobby` vs server `/multiplayer/lobby`) — that is a separate
  architectural decision outside this navigation pass.
