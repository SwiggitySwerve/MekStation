# Frontend UI Audit - 2026-07-05

Audit scope: current working tree frontend, sampled through normal-user walkthroughs with screenshots.

## Remediation Status

Critical and major findings from this audit have been remediated and re-verified in production mode.

Latest evidence:

- Production UX walkthrough: `.sisyphus/evidence/ux-walkthrough/2026-07-05T13-48-34/index.html`
  - Result: 7 journeys, 58 steps, 0 failed, 0 step console/page errors.
- Production navigation regression spec: `e2e/production-client-navigation.spec.ts`
  - Result: 3 passed.
- Targeted responsive specs:
  - `e2e/compendium.spec.ts` / `Compendium Responsive`: 3 passed.
  - `e2e/mobile-navigation.spec.ts` / bottom navigation and Quick Game primary action: 2 passed.
- Focused component coverage:
  - `CampaignNavigation.test.tsx`, `Toast.test.tsx`, `QuickGameResults.test.tsx`: 42 passed.

## Evidence

- Pre-flight Playwright inventory: `.audit/snapshot-tests.json`
- Baseline commit: `ca8c2c958abeec1883ba93023b54f3b4df1f9184`
- Dev walkthrough: `.sisyphus/evidence/ux-walkthrough/2026-07-05T03-33-23/index.html`
  - Result: 7 journeys, 58 steps, 0 failed, 0 step console/page errors.
- Production walkthrough: `.sisyphus/evidence/ux-walkthrough/2026-07-05T03-40-34/index.html`
  - Result: 7 journeys, 36 captured steps, 4 failed journeys, 4 failed steps, 0 step console/page errors.
  - Build completed successfully before the walkthrough; failures happened during browser navigation.
- Remediated production walkthrough: `.sisyphus/evidence/ux-walkthrough/2026-07-05T13-48-34/index.html`
  - Result: 7 journeys, 58 captured steps, 0 failed journeys, 0 failed steps, 0 step console/page errors.

## Critical

### 1. Production client-side navigation changes the URL while leaving the old page rendered

Status: Resolved.

Evidence:

- `01-first-visit-navigation/04-visit-gameplay-hub-from-dashboard-card-FAILED.png`
- `02-compendium-browse/04-open-the-first-unit-detail-FAILED.png`
- `06-campaign-create-to-launch/02-start-the-campaign-wizard-FAILED.png`
- `07-mobile-navigation/03-navigate-to-quick-game-from-mobile-menu-FAILED.png`

Observed in the production run only. Link-driven navigation moved the browser URL to `/gameplay`, `/compendium/units`, `/gameplay/campaigns/create`, or `/gameplay/quick`, but the prior screen remained rendered. Direct route loads still worked for sampled flows such as Quick Game and Customizer, so this looks like a production route-transition/hydration issue rather than missing pages.

Likely owners:

- `src/pages/_app.tsx`
- `src/components/common/TopBarMobileMenu.tsx`
- `src/pages/index.tsx`
- `src/pages/gameplay/campaigns/index.tsx`
- `next.config.ts`
- `scripts/playwright/run-playwright.mjs`

Next fix target: reproduce with a small production Playwright spec that clicks a `next/link`, asserts both URL and new route landmark, and captures network failures for `/_next/data/*` or chunk loads.

Remediation:

- Removed the custom production client chunk-splitting override in `next.config.ts`.
- Added production route-transition recovery in `src/pages/_app.tsx`.
- Added production regression coverage in `e2e/production-client-navigation.spec.ts`.
- Hardened campaign and unit drilldown links that were still vulnerable to stale production client transitions.
- Re-verified with the production UX walkthrough and focused production navigation spec.

## Major

### 2. Mobile compendium header/search overflows horizontally

Status: Resolved.

Evidence:

- Dev screenshot: `.sisyphus/evidence/ux-walkthrough/2026-07-05T03-33-23/07-mobile-navigation/04-mobile-compendium-hub.png`

At 375px width, the compendium title/subtitle and search action stay in a desktop row. The search box is visibly clipped off the right edge, making the first mobile compendium impression feel broken even though the route loads.

Likely owners:

- `src/components/compendium/CompendiumLayout.tsx`
- `src/pages/compendium/index.tsx`

Next fix target: stack header actions below the title on small screens and give the search input `w-full min-w-0` inside the mobile header.

Remediation:

- Stacked compendium header actions on small screens and constrained title/subtitle text in `src/components/compendium/CompendiumLayout.tsx`.
- Made the compendium hub search control mobile-width aware in `src/pages/compendium/index.tsx`.
- Added responsive Playwright coverage in `e2e/compendium.spec.ts`.

### 3. Mobile bottom navigation covers primary actions and competes with the slide-out menu

Status: Resolved.

Evidence:

- Dev screenshot: `.sisyphus/evidence/ux-walkthrough/2026-07-05T03-33-23/07-mobile-navigation/03-navigate-to-quick-game-from-mobile-menu.png`
- Production screenshot: `.sisyphus/evidence/ux-walkthrough/2026-07-05T03-40-34/07-mobile-navigation/02-open-hamburger-menu.png`

The Quick Game primary CTA lands at the bottom edge behind the fixed bottom nav on mobile. When the hamburger menu is open, the persistent bottom nav remains visible and overlaps the drawer content area, so there are two navigation systems active at once.

Likely owners:

- `src/components/common/Layout.tsx`
- `src/components/common/MobileBottomNav.tsx`
- `src/components/common/TopBarMobileMenu.tsx`
- `src/pages/gameplay/quick/index.tsx`

Next fix target: reserve bottom safe area for all mobile pages, hide or inert the bottom nav while the drawer is open, and add a regression screenshot around Quick Game mobile first view.

Remediation:

- Reserved mobile bottom safe area in `src/components/common/Layout.tsx`.
- Hid bottom navigation while the mobile drawer is open in `src/components/common/MobileBottomNav.tsx`.
- Tightened Quick Game mobile first-view height in `src/pages/gameplay/quick/index.tsx`.
- Added mobile Playwright coverage for drawer/bottom-nav interaction and Quick Game primary action visibility.

### 4. Campaign navigation is too dense for repeated operational use

Status: Resolved.

Evidence:

- Dev screenshots:
  - `06-campaign-create-to-launch/08-land-on-the-campaign-dashboard.png`
  - `06-campaign-create-to-launch/10-visit-the-starmap.png`
  - `06-campaign-create-to-launch/15-open-the-mission-launch-screen.png`

The campaign surface exposes 15+ destinations as wrapping text tabs. The group labels help, but the whole control reads like a link wall and consumes a large amount of vertical attention before the user reaches the page-specific work.

Likely owner:

- `src/components/campaign/CampaignNavigation.tsx`

Next fix target: promote the top five day-to-day surfaces, collapse Bays and Command into compact grouped controls, and keep the active page + breadcrumbs visible.

Remediation:

- Promoted the five core campaign destinations and collapsed lower-frequency Bays and Command routes into grouped controls in `src/components/campaign/CampaignNavigation.tsx`.
- Preserved active child state in group summaries and updated component coverage.
- Updated production walkthrough navigation steps to exercise the grouped controls.

### 5. Toast placement overlaps campaign work surfaces

Status: Resolved.

Evidence:

- Dev screenshots:
  - `06-campaign-create-to-launch/10-visit-the-starmap.png`
  - `06-campaign-create-to-launch/12-browse-the-contract-market.png`
  - `06-campaign-create-to-launch/15-open-the-mission-launch-screen.png`

The campaign-created toast persists across later screens and occupies the bottom-right quadrant where campaign cards, map controls, and launch context live. The toast is dismissible, but its placement repeatedly competes with real task content.

Likely owner:

- `src/components/shared/Toast.tsx`

Next fix target: move toasts above mobile nav/safe areas, shorten routine success duration, and consider clearing route-scoped success toasts after navigation.

Remediation:

- Moved toast placement to the top safe-area band in `src/components/shared/Toast.tsx`.
- Shortened routine success toast duration while preserving longer warning/error visibility.
- Added component coverage for placement and default success duration.

### 6. Quick Game auto-resolve results are technically correct but low-trust

Status: Resolved.

Evidence:

- Production screenshot: `.sisyphus/evidence/ux-walkthrough/2026-07-05T03-40-34/04-quick-game-auto-resolve/07-auto-resolve-the-battle.png`

The flow completes, but the result reads as "Defeat" with 1 turn, 0 damage, 0 destroyed, 0 minutes, and no key moments. The user can inspect tabs, but the landing summary does not explain why the objective was lost or what happened.

Likely owners:

- `src/components/quickgame/QuickGameResults.tsx`
- `src/components/quickgame/QuickGameResultsSections.tsx`
- `src/components/quickgame/QuickGameKeyMoments.tsx`

Next fix target: surface objective resolution reason, scenario state, and at least one generated "why this ended" event in the summary panel.

Remediation:

- Added a result explanation card in `src/components/quickgame/QuickGameResultsSections.tsx`.
- Added terminal fallback context to `src/components/quickgame/QuickGameKeyMoments.tsx` when no recorded key moments exist.
- Extended Quick Game result coverage for explanation and terminal event context.

## Minor / Polish

### 7. Customizer remains powerful but visually over-dense

Evidence:

- Production screenshots:
  - `05-customizer-new-unit/03-create-a-default-battlemech.png`
  - `05-customizer-new-unit/09-view-record-sheet-preview.png`

The customizer works and has strong domain coverage, but the interaction surface is crowded: summary strip, tabs, side loadout tray, dense form cards, and white native controls all compete at once. The record sheet preview is useful, but it visually jumps from dark tool UI into a large paper artifact without much framing.

Likely owners:

- `src/components/customizer/CustomizerWithRouter.tsx`
- customizer tab components under `src/components/customizer/`

Next fix target: tighten the editing hierarchy around "current task, validation, next action" and reduce side tray prominence when no equipment is loaded.

### 8. Visual language is still very one-note dark slate

Evidence:

- Dashboard, compendium, campaign, and customizer screenshots across both runs.

The app is coherent, but most surfaces are dark navy cards, thin borders, orange active states, and white form controls. This is usable, yet it makes functional hierarchy depend heavily on text and position rather than clear visual roles.

Next fix target: add a small role-based component palette for operational surfaces: navigation, data tables, work panels, critical status, primary action, passive reference.

## What Is Working

- Dev walkthrough completed all sampled normal-user journeys.
- No step-level console/page errors were recorded in either catalog.
- Direct loads for Quick Game, Customizer, empty states, replay library, and several production routes work.
- Production build completed before the browser failures.
- The app has broad route coverage and many task-specific states already wired.

## Recommended Next Wave

1. Polish customizer hierarchy after the structural issues are closed.
2. Broaden the visual role palette so navigation, work panels, critical status, and passive reference areas are easier to distinguish.
3. Keep the production UX walkthrough in the release evidence loop so future route-transition regressions are caught before signoff.
