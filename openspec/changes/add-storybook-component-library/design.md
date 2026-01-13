# Design: Storybook Component Library

## Context

MekStation is a Next.js 16 application with React 19 and TypeScript 5.8. The UI layer consists of:
- 9 core UI components (`src/components/ui/`)
- 105 domain-specific components across 12 directories
- Tailwind CSS 4 with CSS variables for theming
- Zustand for state management
- react-dnd for drag-and-drop

Storybook will serve as the component development and documentation platform.

## Goals / Non-Goals

### Goals
- Provide isolated component development environment
- Document all 114 components with interactive examples
- Document design tokens (colors, spacing, typography)
- Enable accessibility auditing during development
- Integrate with existing Jest/RTL testing patterns
- Run Storybook build in CI to catch breaking changes

### Non-Goals
- Visual regression testing (Chromatic) - defer to future iteration
- Storybook deployment to GitHub Pages - defer to future iteration
- Replacing existing Jest tests with Storybook interaction tests
- Creating Figma design sync

## Decisions

### 1. Storybook Builder: Vite (not Webpack)

**Decision**: Use `@storybook/react-vite` builder

**Rationale**:
- Vite is 10-20x faster for dev server startup than Webpack
- Next.js 16 supports Vite-based tooling
- Storybook 8.x has first-class Vite support
- Webpack builder would conflict with Next.js's own Webpack config

**Alternatives considered**:
- Webpack builder: Slower, config conflicts with next.config.ts
- Turbopack: Not yet supported by Storybook

### 2. Story Location: Co-located with Components

**Decision**: Place `*.stories.tsx` files next to their components

```
src/components/ui/
├── Button.tsx
├── Button.stories.tsx    # Co-located
├── Card.tsx
├── Card.stories.tsx
```

**Rationale**:
- Matches existing test file pattern (`__tests__/*.test.tsx` nearby)
- Easier to find and maintain stories
- Component + story + test form a complete unit
- Storybook glob pattern: `../src/**/*.stories.@(ts|tsx)`

**Alternatives considered**:
- Separate `stories/` directory: Harder to maintain, stories drift from components
- `__stories__/` subdirectories: Too much nesting

### 3. Story Organization: Domain-based Hierarchy

**Decision**: Organize stories by component domain matching folder structure

```
Storybook Sidebar:
├── UI/                    # src/components/ui/
│   ├── Button
│   ├── Card
│   └── Badge
├── Armor/                 # src/components/armor/
│   ├── ArmorDiagram
│   └── ArmorLocation
├── Customizer/            # src/components/customizer/
│   ├── Tabs/
│   ├── Equipment/
│   └── Dialogs/
└── Design System/         # Documentation-only
    ├── Colors
    ├── Typography
    └── Spacing
```

**Rationale**:
- Mirrors folder structure (easy mental mapping)
- Scales to 114 components without overwhelming sidebar
- "Design System" section provides token documentation

### 4. Tailwind Integration: Import Global Styles in Preview

**Decision**: Import `globals.css` in `.storybook/preview.ts` and configure CSS variable backgrounds

```typescript
// .storybook/preview.ts
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'surface-base',
      values: [
        { name: 'surface-deep', value: '#0a0a0f' },
        { name: 'surface-base', value: '#121218' },
        { name: 'surface-raised', value: '#1a1a24' },
      ],
    },
  },
};
```

**Rationale**:
- Reuses existing Tailwind config and CSS variables
- Components render identically to production
- Background switcher helps test dark theme variants

### 5. Addon Selection: Essential + A11y + Interactions

**Decision**: Install these addons:

| Addon | Purpose |
|-------|---------|
| `@storybook/addon-essentials` | Docs, controls, actions, viewport, backgrounds, measure, outline |
| `@storybook/addon-a11y` | Accessibility panel with axe-core |
| `@storybook/addon-interactions` | Play function testing, step-through debugging |

**Rationale**:
- Essentials covers 90% of documentation needs
- A11y is critical for gaming UI (contrast, focus management)
- Interactions enables component testing without full E2E

**Deferred**:
- `@chromatic-com/storybook`: Visual regression (adds CI cost)
- `@storybook/addon-designs`: Figma integration (no Figma files exist)

### 6. TypeScript: Strict Types for Stories

**Decision**: Use `satisfies Meta<typeof Component>` pattern

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
```

**Rationale**:
- Full type inference for args
- Catches prop mismatches at compile time
- Matches project's strict TypeScript config

### 7. Component Categories and Story Counts

| Category | Directory | Components | Priority |
|----------|-----------|------------|----------|
| UI (Core) | `ui/` | 9 | P0 - First |
| Common | `common/` | ~5 | P0 |
| Armor | `armor/` | ~8 | P1 |
| Customizer | `customizer/` | ~40 | P1 |
| Equipment | `equipment/` | ~10 | P1 |
| Gameplay | `gameplay/` | ~5 | P2 |
| Critical Slots | `critical-slots/` | ~8 | P2 |
| Mobile | `mobile/` | ~5 | P2 |
| Settings | `settings/` | ~3 | P2 |
| Shared | `shared/` | ~3 | P2 |
| Providers | `providers/` | ~2 | P3 (may skip) |
| PWA | `pwa/` | ~2 | P3 (may skip) |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Vite/Next.js compatibility issues | Use `@storybook/nextjs` framework preset which handles RSC, routing |
| Stories become stale | Enforce story updates in PR review checklist |
| Large bundle from 114 stories | Storybook lazy-loads stories; not a runtime concern |
| Zustand store dependencies | Create mock store wrapper decorator |
| react-dnd context dependencies | Create DnD provider decorator |

## Migration Plan

1. Install dependencies and configure `.storybook/`
2. Create stories for UI components (P0) - validate setup works
3. Add decorators for Zustand and DnD contexts
4. Create stories for remaining components (P1, P2, P3)
5. Add design system documentation pages
6. Add CI build step
7. (Future) Deploy to GitHub Pages
8. (Future) Add visual regression with Chromatic

## Open Questions

1. **Zustand mocking strategy**: Should stories use real stores with preset state, or fully mocked stores?
   - Recommendation: Real stores with `initialState` injection for isolation

2. **DnD in stories**: Should drag-and-drop be functional in stories or mocked?
   - Recommendation: Functional with DnD provider decorator; demonstrates real behavior

3. **Story coverage enforcement**: Should we require stories for new components?
   - Recommendation: Yes, add to PR checklist; consider future lint rule
