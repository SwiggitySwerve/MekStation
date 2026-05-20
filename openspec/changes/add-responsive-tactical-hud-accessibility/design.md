## Context

Existing specs define breakpoints, touch targets, and accessibility utilities. The tactical HUD needs product-specific rules for how a dense command shell adapts without losing common combat actions.

## Goals / Non-Goals

**Goals:**

- Preserve map-first interaction on every viewport.
- Keep primary combat commands reachable within one gesture/click.
- Support keyboard-only, touch-only, hybrid, and screen-reader users.
- Make animation and panel density configurable.

**Non-Goals:**

- No separate mobile-only route.
- No requirement for native mobile wrappers.
- No controller-specific full implementation, only gamepad-ready focus and command ordering.

## Decisions

- **Responsive behavior is slot reallocation.** Same shell slots move/collapse rather than rendering unrelated mobile components.
- **One bottom sheet on mobile.** Only one of actions, inspector, feed, or lenses may be expanded at a time.
- **Input parity is required.** Any command available by mouse must have keyboard and touch access unless explicitly impossible.
- **Settings are user-facing.** Animation speed, minimap size, tooltip delay, auto-cycle, and panel density are not hard-coded.

## Risks / Trade-offs

- **Too many viewport variants** -> verify representative breakpoints rather than every pixel width.
- **Keyboard focus fights map panning** -> define roving focus modes for map, dock, trays, and sheets.
- **Reduced motion hides feedback** -> substitute static state changes for animations.

## Open Questions

- Should phone combat require landscape orientation warning for dense phases?
- Should hotkeys be user-remappable in this milestone or only documented defaults?
