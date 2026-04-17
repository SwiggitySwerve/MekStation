# Tasks: Add SPA Display on Pilot Sheet and Unit Card

## 1. Shared Badge Component

- [ ] 1.1 Create `src/components/spa/SPABadge/SPABadge.tsx` with props
      `{ spa: ISPADefinition, designation?: ISPADesignation,
    variant: "compact" | "expanded" }`
- [ ] 1.2 Badge renders category color accent, displayName, optional
      designation text
- [ ] 1.3 Badge exposes a tooltip on hover/focus showing the full
      `description`, source rulebook, and XP cost
- [ ] 1.4 Create `index.ts` re-exporting the badge and props

## 2. Pilot-Mech Unit Card Integration

- [ ] 2.1 In `src/components/pilot-mech-card/PilotSection.tsx`, add a
      compact SPA badge row below the wounds indicator
- [ ] 2.2 Badges resolve each ability id via `getSPADefinition()`;
      unknown ids SHALL be skipped silently
- [ ] 2.3 Layout wraps badges to the next line when the pilot owns more
      than fits a single row
- [ ] 2.4 Cards for pilots with zero abilities render no badge row (no
      empty container, no placeholder)

## 3. Pilot Sheet Section

- [ ] 3.1 Add a "Special Abilities" section to
      `src/pages/gameplay/pilots/[id].tsx`, alongside the existing
      career-stats block
- [ ] 3.2 Abilities are grouped by category (Gunnery, Piloting, …)
      with a section header per category
- [ ] 3.3 Each ability renders as an expanded badge
      (`variant="expanded"`) showing displayName, designation,
      description, source
- [ ] 3.4 Empty state: "No special abilities." when the pilot has none

## 4. Record-Sheet PDF Export

- [ ] 4.1 Extend `src/services/printing/svgRecordSheetRenderer/
    template.ts` to emit a Special Abilities block below the pilot
      block
- [ ] 4.2 Block renders each ability as `displayName (designation)` on
      its own line with a one-line truncated description
- [ ] 4.3 Empty-case: omit the block entirely when the pilot has zero
      abilities
- [ ] 4.4 Block respects the page layout — no overflow past the record
      sheet border

## 5. Data Extraction for Print

- [ ] 5.1 Extend `src/services/printing/recordsheet/dataExtractors.ts`
      with a new `extractAbilities(unit)` helper that reads the
      pilot's abilities and resolves each to an `ISPADefinition` plus
      designation tuple
- [ ] 5.2 Helper returns an ordered list grouped by category
- [ ] 5.3 Helper skips unknown ids defensively (same rule as the
      badge)

## 6. Category Color Tokens

- [ ] 6.1 Define a category-color map in
      `src/components/spa/SPABadge/categoryColors.ts` — one accent per
      category (gunnery, piloting, defensive, toughness, tactical,
      infantry, bioware, edge, miscellaneous)
- [ ] 6.2 Colors follow the existing app palette (pull tokens from the
      theme rather than inventing new ones)
- [ ] 6.3 Map is the single source of truth — the record sheet, unit
      card, and pilot sheet all import it

## 7. Spec Compliance

- [ ] 7.1 Add `spa-ui` spec delta for badge layout, tooltip, and unit
      card embedding
- [ ] 7.2 Add `pilot-system` spec delta for the pilot sheet section
- [ ] 7.3 Add `record-sheet-export` spec delta for the PDF abilities
      block
- [ ] 7.4 Every new requirement has at least one GIVEN/WHEN/THEN
      scenario
- [ ] 7.5 Run `openspec validate add-spa-display-on-pilot-sheet-and-
    unit-card --strict` clean

## 8. Tests

- [ ] 8.1 Unit test: badge renders category color, displayName, and
      designation
- [ ] 8.2 Unit test: badge tooltip exposes full description and source
- [ ] 8.3 Unit test: PilotSection renders zero badges when pilot has
      no abilities (no empty container)
- [ ] 8.4 Unit test: PilotSection skips unknown ability ids silently
- [ ] 8.5 Unit test: extractAbilities groups by category
- [ ] 8.6 Snapshot test: record sheet PDF contains the Special
      Abilities block when pilot has abilities
- [ ] 8.7 Snapshot test: record sheet PDF omits the block when pilot
      has none
