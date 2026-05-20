## Context

The tactical map is already capable, but combat information is distributed across components without a unifying layout contract. Civilization-style strategy UIs keep the map central and use persistent borders for status, actions, panels, minimap, and notifications; MekStation needs the same principle adapted to BattleTech combat density.

## Goals / Non-Goals

**Goals:**

- Make the map the first visual priority at every size.
- Assign each combat concern to a named shell slot.
- Support desktop, tablet, mobile, replay, spectator, and GM overlays from the same shell contract.
- Keep panels dense, utilitarian, and non-marketing-like.

**Non-Goals:**

- No change to movement, attack, LOS, or heat calculations.
- No Canvas/WebGL migration.
- No campaign strategic map redesign.

## Decisions

- **Slot-based composition over page-specific free layout.** The shell owns named slots so panels can move responsively without losing meaning.
- **One primary home per fact.** Phase and active unit live in top/bottom command areas; detailed unit state lives in inspectors; replay/event history lives in feed/replay surfaces.
- **Map remains unframed.** Border UI surrounds the SVG/interactive map without placing the map inside a decorative card.
- **Mode overlays are additive.** Combat, replay, spectator, and GM tools switch available slots, not separate page architectures.

## Risks / Trade-offs

- **Panel sprawl** -> enforce the primary-home rule and deny duplicate permanent panels.
- **Mobile map starvation** -> one bottom sheet open at a time and collapsible edge trays.
- **Implementation churn** -> migrate existing components into slots gradually while preserving current props.

## Open Questions

- Should GM tools be available inside the same shell chrome or behind a distinct referee mode toggle?
- Should the shell remember tray state per match, per route, or globally?
