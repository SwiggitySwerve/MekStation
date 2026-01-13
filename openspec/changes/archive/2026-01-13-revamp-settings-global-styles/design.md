## Context

The settings page allows users to customize appearance (accent color, font size, UI theme), but these settings are stored in Zustand without being applied to the DOM. The Toggle component also has visual bugs with alignment and styling.

**Constraints:**
- No new dependencies (use existing Tailwind + React)
- Settings must apply immediately on change
- Must work with SSR (Next.js)

## Goals / Non-Goals

**Goals:**
- Fix Toggle component alignment and styling
- Make accent color selection actually work
- Make UI theme selection apply theme classes
- Establish pattern for future style customization

**Non-Goals:**
- Full theme system with dark/light mode (app is dark-only)
- Per-component theme overrides
- CSS-in-JS migration

## Decisions

### Decision 1: Use CSS Custom Properties for Dynamic Styles

Apply settings via CSS variables on `:root`:
```css
:root {
  --accent-primary: #f59e0b;
  --accent-hover: #d97706;
  --accent-muted: rgba(245, 158, 11, 0.15);
}
```

**Why:** Native CSS, no runtime overhead, works with Tailwind's arbitrary value syntax `bg-[var(--accent-primary)]`.

**Alternatives considered:**
- Tailwind CSS variables plugin - adds complexity, overkill for 3 variables
- Context-based style props - requires refactoring all components
- CSS-in-JS (styled-components) - adds dependency, SSR complexity

### Decision 2: GlobalStyleProvider Component

Create a provider component that:
1. Subscribes to `useAppSettingsStore`
2. Updates `document.documentElement.style` when settings change
3. Applies theme class to `document.body`

**Why:** Centralized, single place to manage all style application. Easy to extend.

### Decision 3: Rectangular Toggle Design

Replace pill-shaped toggle with flat rectangular style:
- Track: `h-6 w-11` with `rounded-md`, `border border-slate-600`
- Knob: `h-4 w-4` with `rounded-sm`, absolute positioned
- Translation: `translate-x-5` (20px) when checked

**Why:** Matches tactical/angular aesthetic of the app, fixes alignment math.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| SSR hydration mismatch | Use `useEffect` for DOM updates, not render |
| Performance on rapid setting changes | CSS variables update is O(1), negligible |
| Breaking existing hardcoded colors | Gradual migration, not blocking |

## Migration Plan

1. Add GlobalStyleProvider (no breaking changes)
2. Fix Toggle component in settings page
3. Update settings page to use CSS variables
4. Future: migrate other components to use variables

## Open Questions

None - design is straightforward.
