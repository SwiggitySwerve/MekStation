# Change: Add Storybook Component Library

## Why

MekStation has 114 React components across 13 domains with no centralized documentation or isolated development environment. Developers must run the full Next.js app to view/test components, slowing iteration and making it difficult to onboard contributors or maintain design consistency.

## What Changes

- Install Storybook 8.x with Vite builder for Next.js 16 / React 19
- Configure Tailwind CSS integration with existing design tokens
- Create stories for all 114 components organized by domain
- Document design system (colors, spacing, typography) in Storybook
- Add CI build check for Storybook

## Impact

- **Affected specs**: None (new capability)
- **Affected code**:
  - New: `.storybook/` configuration directory
  - New: `*.stories.tsx` files co-located with components
  - Modified: `package.json` (new scripts and devDependencies)
  - Modified: `tailwind.config.ts` (add `.storybook` to content paths)
- **New dependencies**:
  - `@storybook/react-vite` (core)
  - `@storybook/addon-essentials` (docs, controls, actions, viewport, backgrounds)
  - `@storybook/addon-a11y` (accessibility audits)
  - `@storybook/addon-interactions` (interaction testing)
  - `storybook` (CLI)
