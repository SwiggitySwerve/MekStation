# Customizer Armor Diagram Visual Audit — 2026-05-14

> Profile: A-lite (post-merge verification of the customizer armor parity wave: PRs #572-#576)
> Output mode: Categorized findings + screenshots → `.audit/`
> Commit: `7ddf2161` (post-PR2 merge tip)
> Baseline: partial (Jest-only — no Playwright in repo; see `.audit/snapshot-blocked.md`)

## TL;DR

- **The mech `ArmorDiagram` baseline renders correctly via Storybook** ([screenshot](05-storybook-mech-default.png)).
- **The 4 per-unit-type armor diagrams** (`AerospaceArmorDiagram`, `VehicleArmorDiagram`, `BattleArmorPipGrid`, `ProtoMechArmorDiagram`) **cannot be visually confirmed today** due to two blockers:
  1. `/customizer` throws a runtime error on every fresh load (pre-existing, not from PRs #572-576).
  2. None of the 4 per-type diagrams have Storybook stories.
- **Behavioral correctness IS verified** — 39/39 per-type diagram Jest tests pass, all 23857 unit tests green on `main`, BV parity preserved at 4187/4196 within 1%.
- **2 blocking findings + 1 major coverage gap surfaced.** Categories per `ui-remedy-triage`.

## Findings

### Finding 1 — Category 2 (functional break) — BLOCKING

`/customizer` route throws `Error: useUnitStoreApi must be used within a UnitStoreProvider. Component: App` on every fresh load.

**Evidence:** [`00-customizer-landing.png`](00-customizer-landing.png) — full-screen error boundary, "Try Again (1/3)".

**Root cause:** `CustomizerWithRouter.tsx:86` calls `useAutoSaveIndicator()` unconditionally. That hook calls `useUnitStoreApi()` at `useAutoSaveIndicator.ts:8`. But `UnitStoreProvider` is only mounted around `BattleMechEditor` inside `UnitTypeRouter.tsx:224`. When the customizer first mounts with no active unit (or with a non-mech active unit), there is no provider ancestor → the hook throws.

**Provenance:** Predates PRs #572-576 (none of those PRs touched `CustomizerWithRouter`, `UnitStoreProvider`, or `useAutoSaveIndicator`). Verified via `git log --oneline -5` against the three files.

**Impact:** Visual verification of every per-unit-type customizer armor diagram is blocked at the route level. Users cannot reach the customizer from a cold start.

**Routing:** Escalate to user — this is unrelated to the just-shipped wave and needs its own change. Suggested fix: lift `UnitStoreProvider` to wrap `CustomizerWithRouter`, OR gate `useAutoSaveIndicator()` on `activeTabId != null && isMechType(activeTab.unitType)`.

### Finding 2 — Category 4 (escalate — spec drift / coverage gap) — MAJOR

The 4 per-unit-type armor diagrams have **zero Storybook stories**.

**Evidence:** `find src -name "*.stories.tsx" | xargs grep -l "AerospaceArmorDiagram|VehicleArmorDiagram|BattleArmorPipGrid|ProtoMechArmorDiagram"` returns no matches. Only `ArmorDiagram.stories.tsx` exists (mech baseline only — 6 stories).

**Impact:** Exactly the components changed by PRs #574/#575/#576 have no visual harness for design review or smoke verification. The CI Storybook build wouldn't catch a visual regression in any of them.

**Substitute coverage:** All 4 diagrams have unit tests under `src/components/customizer/{aerospace,vehicle,armor,armor}/__tests__/` (39/39 pass) — but those exercise behavior in JSDOM, not visual rendering.

**Routing:** Escalate as a follow-up change `chore(storybook): add per-unit-type armor diagram stories`. Would add 4 story files mirroring `ArmorDiagram.stories.tsx`. Each should cover at minimum: default, empty allocation, max allocation, weight-class edge cases (BA: PA(L) vs Assault; Vehicle: VTOL vs ground vs secondary turret; Aerospace: ASF vs Small Craft).

### Finding 3 — Category 6 (deferred / known limitation) — DOCUMENTED

Small craft side-arc routing is deferred (audit P1).

**Evidence:** `AerospaceLocation` enum in `src/types/construction/UnitLocation.ts:55-66` has no `LEFT_SIDE` / `RIGHT_SIDE` members. The PR2 enum bridge `mapAerospaceLocationToArc()` maps `LEFT_WING` → `AerospaceArc.LEFT_WING`. For small craft, `AerospaceArc.LEFT_WING` yields 0 cap (small craft replaces wings with sides). The PR2 test suite explicitly asserts this: _"small craft via the wing-location bridge: wings yield 0 (sides are AerospaceArc-only)"_.

**Impact:** Users editing a small craft today see 0-cap left/right wing arcs. Functionally correct (matches the arc-factor table) but UX-confusing (the diagram labels still say "Left Wing").

**Routing:** Documented in audit P1 + PR2 tests + plan deferred items. No new action needed in this wave; tracked for the small-craft routing change.

### Finding 4 — Category 1 (minor — empty state) — POLISH

`/units` page shows "Loading custom units..." indefinitely when no custom units exist.

**Evidence:** [`02-units-list.png`](02-units-list.png) — spinner + label after >10s wait.

**Impact:** New users have no way to know the list is empty vs still loading. No CTA to "create your first unit".

**Routing:** Minor UX polish, not a blocker. Surface as a follow-up if the empty-state pattern needs to be standardized.

## What was verified

- **Mech `ArmorDiagram` baseline:** [`05-storybook-mech-default.png`](05-storybook-mech-default.png) shows the 7-location front+rear layout (HD 9, CT 31/14, LT 22/10, RT 22/10, LA 17, RA 17, LL 26, RL 26) rendering correctly in Storybook.
- **Per-type diagrams render behaviorally:** 39/39 Jest tests pass in `AerospaceArmorDiagram.test.tsx`, `VehicleArmorDiagram.test.tsx`, `BattleArmorPipGrid.test.tsx`, `ProtoMechArmorDiagram.test.tsx`, `ArmorDiagramForType.test.tsx`.
- **PR1 fix held:** `BattleArmorPipGrid` renders exactly `armorPerTrooper` per trooper — tests at `BattleArmorPipGrid.test.tsx:98-141` cover the 3 regression scenarios (above-class, below-class, undefined fallback).
- **PR3 plumbing held:** `getTotalVehicleArmor` 1/2/3-arg backwards compatibility verified by 10 new tests in `useVehicleStore.secondaryTurret.test.ts`; `setHasSecondaryTurret` toggle + zero-on-disable verified.
- **PR2 cap correction held:** `maxArcArmorPointsForLocation` golden tests confirm 50t ASF nose = 14 (was 140), wings = 10 (was 100), aft = 6 (was 60).

## Methodology

1. **Phase -0.5 snapshot:** partial (no Playwright). Captured Jest test count + commit SHA. Documented in `snapshot-blocked.md`.
2. **Phase 0 intent:** extracted Intent Statements from the audit doc + `ArmorDiagramForType.tsx` dispatcher. 5 routable diagram types identified.
3. **Phase 1 visual inventory:** spun up dev server on :3600, attempted to navigate to `/customizer` — hit the `UnitStoreProvider` error. Pivoted to `/units`, `/compendium/units/[id]`, then Storybook static on :6006. Successfully screenshotted the mech baseline.
4. **Phase 2-4 cross-cutting:** unable to walk per-type flows without working customizer route. Substituted with Jest test verification — 39/39 pass.
5. **Phase 5 triage:** 4 findings categorized + this report written.

## Audit artifacts

- [`00-customizer-landing.png`](00-customizer-landing.png) — `/customizer` error boundary
- [`01-home.png`](01-home.png) — `/` home page (renders fine)
- [`02-units-list.png`](02-units-list.png), [`02b-units-loaded.png`](02b-units-loaded.png) — `/units` infinite loading
- [`03-compendium-units.png`](03-compendium-units.png) — `/compendium/units` works
- [`04-unit-detail.png`](04-unit-detail.png), [`04b-unit-detail-full.png`](04b-unit-detail-full.png) — `/compendium/units/[id]` works (flat armor grid, not the diagram component)
- [`05-storybook-mech-default.png`](05-storybook-mech-default.png) — mech baseline `ArmorDiagram` visual ✓
- [`snapshot-blocked.md`](snapshot-blocked.md) — Phase -0.5 partial-baseline rationale
- [`snapshot-commit.txt`](snapshot-commit.txt) — `7ddf2161`
- [`snapshot-tests-count.txt`](snapshot-tests-count.txt) — `966`

## Recommendations

1. **Fix the `/customizer` route crash first** — this is a hard blocker for any real visual audit going forward. Suggested change: gate `useAutoSaveIndicator()` on `activeTab` presence + mech-type check, OR lift `UnitStoreProvider` higher in the tree. Pre-existing, not in the recent wave.
2. **Add Storybook stories for the 4 per-type diagrams** — `chore(storybook): add per-unit-type armor diagram stories` follow-up. Cover default + edge cases per type. Enables visual review on every PR.
3. **Defer:** small-craft side-arc UI routing (audit P1, awaiting design decision).
4. **No regression in the just-merged wave.** All 5 PRs (#572-#576) are behaviorally correct; the gap is in the visual-verification harness, not the implementations.
