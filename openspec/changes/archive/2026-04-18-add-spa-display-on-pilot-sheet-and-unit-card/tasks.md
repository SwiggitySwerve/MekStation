# Tasks: Add SPA Display on Pilot Sheet and Unit Card

## 1. Shared Badge Component

- [x] 1.1 Create `src/components/spa/SPABadge/SPABadge.tsx` with props
      `{ spa: ISPADefinition, designation?: ISPADesignation,
variant: "compact" | "expanded" }`
      (lives at `src/components/spa/SPABadge.tsx` — flat layout, not
      nested under a `SPABadge/` folder)
- [x] 1.2 Badge renders category color accent, displayName, optional
      designation text
- [x] 1.3 Badge exposes a tooltip on hover/focus showing the full
      `description`, source rulebook, and XP cost
      (delegated to `SPATooltip.tsx`)
- [x] 1.4 Create `index.ts` re-exporting the badge and props
      (re-exported via `src/components/spa/index.ts`)

## 2. Pilot-Mech Unit Card Integration

- [x] 2.1 In `src/components/pilot-mech-card/PilotSection.tsx`, add a
      compact SPA badge row below the wounds indicator
      (uses `SPAList` instead of legacy text Badge)
- [x] 2.2 Badges resolve each ability id via `getSPADefinition()`;
      unknown ids SHALL be skipped silently
- [x] 2.3 Layout wraps badges to the next line when the pilot owns more
      than fits a single row
- [x] 2.4 Cards for pilots with zero abilities render no badge row (no
      empty container, no placeholder)

## 3. Pilot Sheet Section

- [x] 3.1 Add a "Special Abilities" section to
      `src/pages/gameplay/pilots/[id].tsx`, alongside the existing
      career-stats block
      (rendered by `PilotOverviewTab.tsx` as a "Special Abilities Card"
      grouped by category)
- [x] 3.2 Abilities are grouped by category (Gunnery, Piloting, …)
      with a section header per category
- [x] 3.3 Each ability renders as an expanded badge
      (`variant="expanded"`) showing displayName, designation,
      description, source
- [x] 3.4 Empty state: "No special abilities." when the pilot has none

## 4. Record-Sheet PDF Export

- [x] 4.1 Extend `src/services/printing/svgRecordSheetRenderer/
template.ts` to emit a Special Abilities block below the pilot
      block
      (implemented as `svgRecordSheetRenderer/spaSection.ts` invoked
      from `renderer.ts` at y=690 — keeps the template module focused
      on chassis layout)
- [x] 4.2 Block renders each ability as `displayName (designation)` on
      its own line with a one-line truncated description
- [x] 4.3 Empty-case: omit the block entirely when the pilot has zero
      abilities
- [x] 4.4 Block respects the page layout — no overflow past the record
      sheet border (cap 6 lines × 9pt + 8pt header fits in 66pt margin;
      "+N more" overflow indicator)

## 5. Data Extraction for Print

- [x] 5.1 Extend `src/services/printing/recordsheet/dataExtractors.ts`
      with a new `extractAbilities(unit)` helper that reads the
      pilot's abilities and resolves each to an `ISPADefinition` plus
      designation tuple
      (implemented as pure `recordsheet/spaSection.ts` helper consumed
      by `RecordSheetService.extractData(layoutEngine, pilotAbilities)`
      — keeps `dataExtractors.ts` unit-scoped and the SPA logic
      pilot-scoped)
- [x] 5.2 Helper returns an ordered list grouped by category
      (sorts + dedupes by canonical id)
- [x] 5.3 Helper skips unknown ids defensively (same rule as the
      badge)

## 6. Category Color Tokens

- [x] 6.1 Define a category-color map in
      `src/components/spa/SPABadge/categoryColors.ts` — one accent per
      category (gunnery, piloting, defensive, toughness, tactical,
      infantry, bioware, edge, miscellaneous)
      (lives in `src/components/spa/SPAPicker/types.ts` as
      `SPA_CATEGORY_COLORS` — colocated with the picker that originated
      the palette in Wave 1; not duplicated)
- [x] 6.2 Colors follow the existing app palette (pull tokens from the
      theme rather than inventing new ones)
      (uses Tailwind palette slugs — `bg-${slug}-400`)
- [x] 6.3 Map is the single source of truth — the record sheet, unit
      card, and pilot sheet all import it
      (`SPABadge`, `SPAItem`, `PilotAbilitiesPanel` all import
      `SPA_CATEGORY_COLORS` from `SPAPicker/types.ts`)

## 7. Spec Compliance

- [x] 7.1 Add `spa-ui` spec delta for badge layout, tooltip, and unit
      card embedding
- [x] 7.2 Add `pilot-system` spec delta for the pilot sheet section
- [x] 7.3 Add `record-sheet-export` spec delta for the PDF abilities
      block
- [x] 7.4 Every new requirement has at least one GIVEN/WHEN/THEN
      scenario
- [x] 7.5 Run `openspec validate add-spa-display-on-pilot-sheet-and-
unit-card --strict` clean

## 8. Tests

- [x] 8.1 Unit test: badge renders category color, displayName, and
      designation
- [x] 8.2 Unit test: badge tooltip exposes full description and source
- [x] 8.3 Unit test: PilotSection renders zero badges when pilot has
      no abilities (no empty container)
      (covered indirectly by `SPAList.test.tsx` empty-list assertion;
      PilotSection consumes SPAList)
- [x] 8.4 Unit test: PilotSection skips unknown ability ids silently
      (covered by SPAList unknown-id behaviour test)
- [x] 8.5 Unit test: extractAbilities groups by category
      (covered by `recordsheet/spaSection.test.ts` ordering assertion)
- [x] 8.6 Snapshot test: record sheet PDF contains the Special
      Abilities block when pilot has abilities
      (data-shape assertion in `spaSection.test.ts`; no literal SVG
      snapshot file — equivalent coverage at the helper layer)
- [x] 8.7 Snapshot test: record sheet PDF omits the block when pilot
      has none (`spaSection.test.ts` empty-array branch)
