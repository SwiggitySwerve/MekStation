# Change: Revamp Settings Page with Working Global Styles

## Why

The settings page has two key issues:
1. **Toggle components are visually broken** - alignment/sizing math is incorrect, knob doesn't fit properly in track, and styling doesn't match the app's dark slate aesthetic
2. **Global styles don't apply** - changing accent color, UI theme, or font size in settings has no effect because nothing connects the store values to actual CSS

## What Changes

- **Fix Toggle component** - Correct sizing/alignment with rectangular tactical style, proper math for knob positioning
- **Create GlobalStyleProvider** - New component that reads settings and applies CSS custom properties to `:root`
- **Add CSS variables for accent colors** - `--accent-primary`, `--accent-hover`, `--accent-muted` that components can use
- **Add theme classes** - Apply `theme-{name}` class to body based on uiTheme setting
- **Update settings page** - Use CSS variables instead of hardcoded amber colors

## Impact

- Affected specs: `app-settings`
- Affected code:
  - `src/pages/settings.tsx` - Toggle fix, use CSS variables
  - `src/pages/_app.tsx` - Wrap with GlobalStyleProvider
  - `src/styles/globals.css` - Add accent CSS variables
  - `src/components/GlobalStyleProvider.tsx` - New file
