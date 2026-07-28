# Components

## OVERVIEW

- React UI layer: 1,448 files across domain, shell, primitive, and test surfaces.
- Pages Router mounts the global shell from `src/pages/_app.tsx`.
- Most files are TSX; tests and Storybook stories are colocated with components.
- `gameplay` and `customizer` are the two large, independently evolving UI systems.

## STRUCTURE

- `ui/`: reusable primitives (`Button`, `Card`, `FormField`, `DialogTemplate`, `PageLayout`).
- `common/`: app shell, navigation, error boundaries, pagination, mobile chrome.
- `gameplay/`: tactical map, turn/action surfaces, unit tokens, overlays, campaign pages.
- `customizer/`: unit-type editors, armor diagrams, tabs, critical slots, loadout panels.
- `campaign/`, `vault/`, `simulation-viewer/`, `multiplayer/`: domain feature surfaces.

## WHERE TO LOOK

- `GlobalStyleProvider.tsx`: Zustand appearance/accessibility state to CSS variables/classes.
- `../styles/globals.css`: Tailwind v4 tokens, global colors, forms, scrollbars, print hooks.
- `gameplay/TacticalAccessibility/`: live regions and tactical focus order.
- `customizer/styles.ts`: shared class bundles for editor panels/forms/dialogs.

## CONVENTIONS

- Prefer existing primitives from `ui/` and shell components from `common/` before adding markup.
- Use semantic Tailwind tokens (`bg-surface-*`, `text-text-theme-*`, `border-border-theme*`).
- Preserve 44px minimum touch targets and visible focus rings on interactive controls.
- Keep accessibility behavior explicit: labels, keyboard order, `aria-*`, live regions, focus handling.
- Keep tactical announcements under `gameplay/TacticalAccessibility/`; mount once in the tactical shell.
- Keep customizer class bundles in `customizer/styles.ts` or an existing local style helper.
- Add focused tests beside behavior; add a Storybook story when a component is a reusable visual primitive.
- Follow existing domain folder and filename patterns; split large components into adjacent `.parts`, `.helpers`, or `.model` files.

## ANTI-PATTERNS

- Do not duplicate `Button`/`Card`/form primitives or bypass their accessibility states without need.
- Do not hard-code theme colors when a CSS token or existing style constant expresses the intent.
- Do not put API/database initialization, SQLite imports, or route parsing in presentational components.
- Do not move tactical state orchestration into generic `ui/` primitives.
- Do not create a second global theme/accessibility mechanism outside `GlobalStyleProvider` and its stores.
- Do not add broad component abstractions solely to remove a few lines from unit-type editors.

## COMMANDS

- Focused tests: `npm test -- src/components/<path>`.
- Shared gates: `npm run typecheck`, `npm run lint`, and `npm run format:check`.
