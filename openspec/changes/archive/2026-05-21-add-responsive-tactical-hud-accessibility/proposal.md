## Why

The tactical command shell must work on ultrawide desktop, laptop, tablet, phone, touch laptops, and reduced-motion/accessibility configurations. Without a dedicated responsive/accessibility spec, the border UI risks becoming desktop-only and burying core commands on small screens.

## What Changes

- Add tactical HUD breakpoint behavior for desktop, laptop, tablet, phone, ultrawide, and constrained-height screens.
- Define touch, mouse, keyboard, gamepad-ready, and screen-reader interaction paths for map and shell controls.
- Add reduced-motion, high-contrast, tooltip delay, minimap size, auto-cycle, quick animation, and panel density settings.
- Require layout intent tests and screenshot checks across representative viewports.

## Capabilities

### New Capabilities

- `responsive-tactical-hud-accessibility`: Tactical HUD layout breakpoints, adaptive shell behavior, input modes, and accessibility obligations.

### Modified Capabilities

- `mobile-interaction-patterns`: Adds tactical shell-specific responsive and touch behavior.
- `accessibility-system`: Adds tactical map and command shell accessibility behavior.

## Impact

- Affected UI: tactical shell, action dock, trays, map controls, minimap, drawers, feed, replay controls.
- Affected settings: panel density, minimap size, tooltip delay, reduced motion, auto-cycle, quick movement/combat animation.
- Test impact: Playwright viewport matrix and accessibility checks.
