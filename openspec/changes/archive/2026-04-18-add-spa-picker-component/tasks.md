# Tasks: Add SPA Picker Component

## 1. Component Scaffold

- [x] 1.1 Create `src/components/spa/SPAPicker/SPAPicker.tsx` with an
      `ISPAPickerProps` contract (`onSelect`, `excludedIds`, `filterMode`)
- [x] 1.2 Create `src/components/spa/SPAPicker/index.ts` re-exporting the
      component and its prop types
- [x] 1.3 Wire the component to load the catalog via `getAllSPAs()` from
      `@/lib/spa` (do not duplicate the catalog)

## 2. Category Tab Bar

- [x] 2.1 Render a tab bar with the eight UI categories (Piloting, Gunnery,
      Miscellaneous, Infantry, aToW, Manei Domini, Unofficial, Edge)
- [x] 2.2 Each tab shows the count of entries that match the current
      search and source filters
- [x] 2.3 An "All" tab SHALL render entries from every category
- [x] 2.4 Selected tab is visually distinct and persists across search
      changes

## 3. Search & Source Filters

- [x] 3.1 Text search filters by `displayName`, `description`, and
      `source` (case-insensitive substring match)
- [x] 3.2 Source filter chips (`CamOps`, `MaxTech`, `ATOW`,
      `ManeiDomini`, `Unofficial`, `Legacy`) toggle inclusion
- [x] 3.3 Clearing all filters restores the full catalog within the
      active tab
- [x] 3.4 Empty result set shows a "No abilities match these filters"
      empty state

## 4. Entry Row Rendering

- [x] 4.1 Each row shows `displayName`, `description`, XP cost (or
      "Origin-Only" / "Flaw" badge), source badge, category color
      accent
- [x] 4.2 Flaws display with a negative XP value (e.g. "+200 XP")
      since they grant XP rather than cost it
- [x] 4.3 Origin-only entries display an "Origin-Only" tag and a
      disabled state when `filterMode === 'purchase-only'`
- [x] 4.4 Rows that appear in `excludedIds` render disabled with an
      "Already owned" label

## 5. Designation Prompt

- [x] 5.1 Clicking a row where `requiresDesignation === true` opens a
      designation prompt, not an immediate selection
- [x] 5.2 Prompt content is driven by `designationType`:
      `weapon_type` lists known weapon types from the weapon catalog;
      `weapon_category` lists Energy / Ballistic / Missile / Melee;
      `target` takes a free-text or target picker input;
      `range_bracket` lists Short / Medium / Long;
      `skill` lists Gunnery / Piloting;
      `terrain` lists the terrain preset names
- [x] 5.3 Prompt has Confirm and Cancel actions; Cancel restores the
      picker without selection; Confirm emits `{ spa, designation }`
- [x] 5.4 SPAs with `requiresDesignation === false` emit immediately on
      click with `designation = undefined`

## 6. Accessibility

- [x] 6.1 Tab bar is keyboard-navigable (ArrowLeft/ArrowRight,
      Home/End)
- [x] 6.2 Each row has a visible focus ring and activates on Enter
- [ ] 6.3 The designation prompt traps focus until Confirm or Cancel → deferred: focus-trap not explicitly implemented (relies on browser default modal focus); revisit if WCAG audit flags it
- [x] 6.4 Source and category badges have `aria-label` text equivalents

## 7. Spec Compliance

- [x] 7.1 Add new `spa-ui` spec delta with requirements for picker
      layout, search, source filter, row content, and designation flow
- [x] 7.2 Add `pilot-system` spec delta for the picker's pilot-facing
      selection contract
- [x] 7.3 Every new requirement has at least one GIVEN/WHEN/THEN
      scenario
- [x] 7.4 Run `openspec validate add-spa-picker-component --strict`
      clean

## 8. Tests

- [x] 8.1 Unit test: default render shows all 91 entries when no
      filters are applied
- [x] 8.2 Unit test: category tab switches filter the visible entries
- [x] 8.3 Unit test: search "weapon spec" narrows to Weapon Specialist
- [x] 8.4 Unit test: source filter "Unofficial" removes all non-Unofficial
      rows
- [x] 8.5 Unit test: clicking a row with `requiresDesignation === true`
      opens the designation prompt
- [x] 8.6 Unit test: designation Confirm emits the selected designation
      payload
- [x] 8.7 Unit test: entry with id in `excludedIds` renders disabled
- [x] 8.8 Integration test: picker mounted inside a dialog emits
      `onSelect` with the expected `{ spa, designation? }` payload
