# Draft: Comprehensive UX Audit — MekStation

## Requirements (confirmed)

- **Density balance**: Clean screens — no dead space, not too dense. Intentional use of space.
- **PWA mobile capability**: App must perform well on any device, not just render.
- **Component containment**: No overlapping components, no runoff, no clipping, nothing shoddy.
- **Visual hierarchy**: Eye should know where to go on every screen.
- **Empty states**: "No data" should look intentional, not broken.
- **Content rhythm**: Consistent spacing system throughout.
- **Touch target sizing**: 44px minimum on mobile.
- **Thumb reachability**: Critical actions within thumb zone on mobile.
- **Input adaptation**: Mobile keyboards, dropdowns that work with viewport.
- **Overflow handling**: Long text, wide tables, deep nesting all handled.
- **Z-index discipline**: Modals, dropdowns, tooltips don't fight each other.
- **Layout stability**: No content shift on load.
- **Responsive breakpoint integrity**: Intentional layouts at each breakpoint, not CSS squishing.
- **Loading & transition states**: Skeleton loaders match content, no page jumps.
- **Text truncation**: BattleTech names overflow — every text container needs a strategy.
- **Scroll containment**: No nested scroll traps on mobile.
- **Interactive element sizing**: Precision interactions (armor diagram, hex grid, slots) need mobile treatment.
- **Consistent component appearance**: Same component looks the same everywhere.

## Scope Decisions

- **Coverage**: ALL screens (30+ routes) — comprehensive
- **Viewports**: All three — phone (375px), tablet (768px), desktop (1280px+)
- **Output**: Identify + fix plans (each finding includes concrete remediation with file references)
- **Complex interactions**: Adaptive — allow recommending alternative mobile interaction patterns (not CSS-only)

## Technical Approach

Agent pipeline:
1. **Phase 1 — Discovery**: explore agent (route inventory) + playwright (screenshot every route at 3 viewports)
2. **Phase 2 — Specialist Reviews**: 12+ domain-specific reviewer agents in parallel
3. **Phase 3 — Cross-Cutting Reviews**: ux-auditor, accessibility-auditor, visual-reviewer, interaction-reviewer, navigation-reviewer in parallel
4. **Phase 4 — Synthesis**: oracle (synthesize + prioritize) + momus (critical review of audit)

## Route-to-Reviewer Mapping

| Screen Type | Reviewer Agent | Routes |
|---|---|---|
| Lists/Browse | list-page-reviewer | /compendium/units, /compendium/equipment, /gameplay/pilots, /gameplay/forces, /gameplay/campaigns, /gameplay/games, /gameplay/encounters |
| Detail/View | detail-page-reviewer | /compendium/units/[id], /compendium/equipment/[id], /gameplay/pilots/[id], /gameplay/forces/[id], /gameplay/campaigns/[id], /gameplay/games/[id] |
| Forms/Wizards | form-reviewer | /gameplay/pilots/create, /gameplay/forces/create, /gameplay/encounters/create, /gameplay/campaigns/create |
| Editors/Builders | editor-reviewer | /customizer/[unitId]/[tabId] (5 tabs) |
| Game UI | game-ui-reviewer | /gameplay/quick/* (hex grid, record sheet, heat tracker, phase banners) |
| Replay/Timeline | replay-reviewer | /gameplay/games/[id]/replay, /audit/timeline |
| Comparisons | comparison-reviewer | /compare |
| Settings/Config | settings-reviewer | /settings |
| Navigation/Shell | navigation-reviewer | App shell, TopBar, mobile BottomNavBar |
| Cards/Entities | card-reviewer | UnitCard variants, PilotMechCard |
| Dense Data | density-reviewer | RecordSheetDisplay, RepairCostBreakdown, equipment tables |
| Split Panels | panel-reviewer | Customizer layout, comparison views |

## Audit Focus Areas (per user priorities)

1. **Density & Space** — balanced whitespace, no dead zones, no cramming
2. **Responsiveness** — 3 viewport matrix, intentional layouts at each
3. **Component Containment** — no overlap, clip, bleed, or runoff
4. **Visual Hierarchy** — clear eye flow on every screen
5. **Loading States** — no layout shift, skeleton loaders, transition smoothness
6. **Text & Overflow** — truncation strategy for BattleTech naming
7. **Mobile Interaction** — touch targets, scroll containment, adaptive patterns
8. **Design Consistency** — same component = same appearance everywhere
9. **Empty States** — intentional design when no data present
10. **Z-index & Stacking** — modals, dropdowns, tooltips layered correctly

## Open Questions

None — all critical requirements clarified.
