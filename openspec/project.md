# MekStation Project Conventions

**Last Updated**: 2026-01-14

## Overview

MekStation is a spec-driven BattleTech unit construction application implementing TechManual rules. OpenSpec is the single source of truth for all domain logic.

## Project Identity

| Attribute | Value |
|-----------|-------|
| Name | MekStation |
| Domain | BattleTech unit construction |
| Tech Stack | Next.js, React, TypeScript, Zustand, SQLite |
| Source of Truth | `openspec/specs/` |

## Conventions

### Terminology

All specs MUST use canonical terminology from `openspec/TERMINOLOGY_GLOSSARY.md`.

Key conventions:
- Use **weight** (not "tons" or "mass") for property names
- Use **criticalSlots** (not "slots" or "crit slots") for slot counts
- Use **BattleMech** (not "Battlemech" or "mech") in formal definitions
- Use **Inner Sphere** / **Clan** (capitalized) for tech base
- Use **location** (not "section" or "body part") for mech parts

### Naming Patterns

| Type | Pattern | Example |
|------|---------|---------|
| Spec capability | kebab-case noun | `armor-system`, `equipment-browser` |
| Change ID | verb-led kebab-case | `add-exotic-mech-support`, `update-armor-diagram` |
| Interface | `I` + PascalCase | `IEngine`, `IWeaponMount` |
| Enum type | PascalCase | `TechBase`, `MechLocation` |
| Enum value | UPPER_SNAKE_CASE | `INNER_SPHERE`, `CENTER_TORSO` |
| Property | camelCase | `engineRating`, `criticalSlots` |
| Constant | UPPER_SNAKE_CASE | `MAX_TONNAGE`, `MIN_HEAT_SINKS` |

### Spec Writing

1. **Requirements**: Use SHALL/MUST for normative statements
2. **Scenarios**: Use `#### Scenario:` format (4 hashtags, colon)
3. **Deltas**: Use `## ADDED|MODIFIED|REMOVED Requirements` headers
4. **One scenario minimum**: Every requirement needs at least one scenario

### Code Integration

- Types derived from specs live in `src/types/`
- Business logic implementing specs lives in `src/services/`
- Validation rules implementing specs live in `src/utils/validation/`
- UI components live in `src/components/`

## Architecture Patterns

### Spec-Driven Flow

```
OpenSpec Specs → TypeScript Types → Services → Components
     ↓                ↓              ↓           ↓
   (Rules)        (Contracts)     (Logic)      (UI)
```

### State Management

- Global state: Zustand stores (`src/stores/`)
- Component state: React hooks
- Persistence: SQLite via API routes

### Tech Base Handling

- Component-level: `techBase: TechBase` (IS or Clan)
- Unit-level: `unitTechBase: UnitTechBase` (IS, Clan, or Mixed)
- Mixed Tech: Unit can have components from different tech bases

## Key References

| Document | Purpose |
|----------|---------|
| `openspec/TERMINOLOGY_GLOSSARY.md` | Canonical terms and property names |
| `openspec/AGENTS.md` | OpenSpec workflow for AI agents |
| `docs/development/coding-standards.md` | TypeScript and React conventions |
| `docs/overview.md` | Feature overview and API reference |

## Spec Categories

| Category | Examples | Location |
|----------|----------|----------|
| Foundation | Core types, enums, eras | `specs/core-*`, `specs/*-system` |
| Construction | Engine, gyro, armor, structure | `specs/*-system` |
| Equipment | Weapons, ammo, electronics | `specs/equipment-*`, `specs/weapon-*` |
| Validation | Rules, patterns, integrity | `specs/validation-*`, `specs/*-rules` |
| UI | Browser, tray, tabs, dialogs | `specs/*-browser`, `specs/*-tray` |
| Services | Persistence, construction | `specs/*-services` |
| Export | Record sheets, serialization | `specs/record-sheet-*`, `specs/serialization-*` |

## Change Workflow Summary

1. **Proposal**: Create `changes/<change-id>/` with `proposal.md`, `tasks.md`, and spec deltas
2. **Validate**: Run `openspec validate <change-id> --strict`
3. **Implement**: Follow `tasks.md` checklist
4. **Archive**: Move to `changes/archive/YYYY-MM-DD-<change-id>/` after deployment

## Quality Gates

- [ ] All requirements have scenarios
- [ ] Terminology matches glossary
- [ ] `openspec validate --strict` passes
- [ ] Types match spec interfaces
- [ ] Tests cover spec scenarios
