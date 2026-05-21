## Context

The combat engine already owns movement and attack legality. The UI needs a command grammar that can show available commands, preview outcomes, and route commit/cancel through existing session methods.

## Goals / Non-Goals

**Goals:**

- Put primary active-unit commands in one action dock.
- Use overflow menus for rare or mode-specific commands.
- Explain disabled actions with engine-derived reasons.
- Keep confirmation lightweight but explicit for irreversible commits.

**Non-Goals:**

- No new combat rules.
- No custom scripting language for abilities.
- No radial menu requirement; radial presentation is optional if the same command contract is used.

## Decisions

- **Command objects are UI adapters over engine actions.** Each command has id, label, icon, phase constraints, availability, preview, commit, and disabled reason.
- **Preview before commit.** Movement path, facing, to-hit, heat, ammo, and physical attack consequences show before irreversible action.
- **Context menus are secondary.** Right-click/long-press menus duplicate or filter bottom dock commands for the selected map object.
- **Disabled is informative.** A command with known invalidity remains visible when it teaches the player why an action is unavailable.

## Risks / Trade-offs

- **Menu overload** -> group by phase and keep the dock to the current unit's valid domain.
- **Stale previews** -> previews must subscribe to selected unit, phase, target, heat, ammo, and terrain state.
- **Duplicate action paths** -> all command surfaces dispatch through the same command object.

## Open Questions

- Should the action menu support queued orders for simultaneous-turn modes now, or defer that to multiplayer?
- Should GM commands live in the same command registry with a `requiresRole` gate?
