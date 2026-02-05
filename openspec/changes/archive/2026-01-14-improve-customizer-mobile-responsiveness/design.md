# Design: Customizer Mobile Responsiveness

## Context

The customizer is a complex multi-panel interface with:

1. Multi-unit tabs (top)
2. Section tabs (Overview, Structure, Armor, Equipment, Criticals, Fluff, Preview)
3. Info banner (stats summary)
4. Main content area (tab-specific forms/diagrams)
5. Loadout sidebar (equipment list)

On mobile/tablet, these compete for limited horizontal space, causing:

- Tabs to be cut off
- Content to overflow
- Loadout sidebar blocking main content

## Goals

- Make customizer usable on mobile devices (320px+)
- Maintain desktop experience without degradation
- Follow platform conventions (bottom sheets on mobile, sidebars on desktop)
- Keep core functionality accessible at all sizes

## Non-Goals

- Redesigning the entire customizer UI
- Adding new features for mobile
- Supporting offline mobile usage (separate PWA concern)

## Decisions

### 1. Tab Label Visibility

**Decision**: Show icon-only tabs below `sm` (640px), icon+label at `sm` and above.

**Rationale**: Icons are recognizable and save significant horizontal space. Labels are already defined with icons in `CustomizerTabs.tsx`.

**Implementation**:

```tsx
// Already exists but may need reinforcement:
<span className="hidden sm:inline">{tab.label}</span>
```

### 2. Sidebar Width Strategy

**Decision**: Use fluid responsive widths with auto-collapse.

| Breakpoint         | Behavior                                |
| ------------------ | --------------------------------------- |
| < md (768px)       | Bottom sheet (already implemented)      |
| md-lg (768-1024px) | Sidebar collapsed by default, 40px wide |
| lg+ (1024px+)      | Sidebar expanded, 240px wide            |

**Rationale**: Tablet users often work in portrait mode where 200px sidebar leaves little room for two-column content. Auto-collapse gives them full content width with a visible toggle.

### 3. Content Overflow Strategy

**Decision**: Use `overflow-hidden` + `min-w-0` on flex containers.

**Rationale**: Flexbox items with content wider than their container won't shrink below content size unless `min-w-0` is set. This is the standard fix for flex overflow issues.

### 4. Breakpoint Adjustments

**Decision**: Shift two-column breakpoint from `md` to `lg` in sidebar-adjacent contexts.

**Rationale**: When the sidebar is present on medium screens, two columns + sidebar = too narrow. On preview tab (no sidebar), keep `md`.

## Risks / Trade-offs

| Risk                                   | Mitigation                                       |
| -------------------------------------- | ------------------------------------------------ |
| Too many breakpoints create complexity | Use consistent Tailwind breakpoints (sm, md, lg) |
| Auto-collapse may confuse users        | Show clear toggle button with tooltip            |
| Touch targets too small                | Enforce 44px minimum on mobile                   |

## Migration Plan

1. Update CSS classes - no data migration needed
2. Changes are additive (new responsive classes)
3. Rollback: revert CSS class changes

## Open Questions

1. Should we add a "compact mode" user preference for power users on small screens?
2. Should bottom sheet default to half-expanded or collapsed when first opened?
