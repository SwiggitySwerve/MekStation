# MekStation Overview

MekStation is a comprehensive unit construction application that implements official BattleTech TechManual rules using an OpenSpec-driven architecture. This document contains the detailed background that was removed from the root README.

## Key Features

- Complete BattleMech customizer with tabbed workflow (Overview, Structure, Armor, Equipment, Criticals, Fluff, Preview)
- Multi-unit workspace for comparing builds
- Equipment browser with advanced filtering
- Critical slot drag-and-drop with validation and auto-assignment
- Armor allocation with visual diagram and auto-allocation
- Record sheet live preview and PDF export using MegaMek templates
- SQLite-backed custom unit persistence with version history and JSON export
- Unit metrics: BV 2.0, C-Bill cost, rules level
- Tech base support: Inner Sphere, Clan, Mixed
- Era filtering across all canonical eras

## Recent Capabilities

### Record Sheet Export (December 2025)
- SVG template rendering with MegaMek assets
- Live preview (20%-300% zoom)
- PDF export with full armor pip rendering

### Custom Unit Persistence (December 2025)
- SQLite backend replacing IndexedDB
- Version history with revert
- Canonical protection and clone naming
- JSON export for sharing

### Unit Metrics System (December 2025)
- Battle Value 2.0 calculations
- C-Bill cost formulas per TechManual
- Rules level classification (Intro, Standard, Advanced, Experimental)

## Architecture

Spec-driven flow:

```
OpenSpec Specs → TypeScript Types → Services → Components
     ↓                 ↓              ↓           ↓
  (Rules)          (Contracts)    (Logic)      (UI)
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 |
| UI | React 19 + Tailwind CSS 4 |
| State | Zustand 5 |
| Drag & Drop | react-dnd |
| Search | MiniSearch |
| Database | SQLite (better-sqlite3) |
| PDF | jsPDF |
| Testing | Jest + React Testing Library |
| Language | TypeScript 5.8 |

### Project Structure (summary)

```
megamek-web/
├── openspec/               # Specifications (domain truth)
│   ├── specs/              # Capability specs
│   └── changes/            # Proposals (active & archived)
├── src/                    # App code
│   ├── components/         # React UI
│   ├── pages/              # Next.js pages & API routes
│   ├── services/           # Business logic
│   ├── types/              # Types and enums
│   └── utils/              # Calculations and helpers
├── public/                 # Data + record sheet assets
└── docs/                   # Documentation
```

See `docs/architecture/project-structure.md` for the complete tree.

## OpenSpec System

This project uses [OpenSpec](../openspec/AGENTS.md) as the single source of truth for BattleTech rules.

```bash
# List all specifications
npx openspec list --specs

# View a specific spec
npx openspec show engine-system --type spec

# List active changes
npx openspec list
```

### Specification Categories

| Category | Examples |
|----------|----------|
| Foundation | Core entity types, enumerations, eras, weight classes |
| Construction | Engine, gyro, armor, structure, heat sinks, movement |
| Equipment | Weapons, ammunition, electronics, physical weapons |
| Validation | Construction rules, validation patterns, data integrity |
| UI Components | Critical slots, armor diagram, equipment browser |
| Services | Unit services, equipment services, persistence, construction |
| Data Models | Unit serialization, database schema |

## API Reference (summary)

### Units

| Endpoint | Description |
|----------|-------------|
| `GET /api/units` | List units (filter + paginate) |
| `GET /api/catalog` | Unit catalog with search |
| `GET /api/custom-variants` | Custom unit variants |
| `GET /api/custom-variants/[id]` | Specific variant |
| `POST /api/custom-variants` | Save custom unit |
| `PUT /api/custom-variants/[id]` | Update custom unit |
| `DELETE /api/custom-variants/[id]` | Delete custom unit |

### Equipment

| Endpoint | Description |
|----------|-------------|
| `GET /api/equipment` | List equipment with filtering |
| `GET /api/equipment/catalog` | Equipment catalog |
| `GET /api/equipment/filters` | Available filter options |

### Metadata

| Endpoint | Description |
|----------|-------------|
| `GET /api/meta/categories` | Unit categories |
| `GET /api/meta/unit_eras` | Available eras |
| `GET /api/meta/unit_tech_bases` | Tech base options |
| `GET /api/meta/equipment_categories` | Equipment categories |
| `GET /api/meta/unit_weight_classes` | Weight class definitions |

## BattleTech Rules Quick Reference

| Component | Formula |
|-----------|---------|
| Engine Rating | Walk MP × Tonnage |
| Engine Weight | Lookup by rating + type modifier |
| Gyro Weight | ceil(Engine Rating / 100) × type modifier |
| Structure Weight | Tonnage × 0.10 (Standard) / × 0.05 (Endo Steel) |
| Max Armor | Structure Points × 2 (Head = 9) |
| Internal Heat Sinks | floor(Engine Rating / 25) |
| Run MP | ceil(Walk MP × 1.5) |
| Jump MP | ≤ Walk MP (standard jets) |

### Critical Slot Allocations

| Location | Slots |
|----------|-------|
| Head | 6 |
| Center Torso | 12 |
| Side Torsos | 12 each |
| Arms | 12 each |
| Legs | 6 each |
| **Total** | **78** |

## Development Workflow

1. Check OpenSpec for relevant specs.
2. Create a change proposal in `openspec/changes/` for new capabilities.
3. Implement with concrete types from `src/types/`.
4. Add tests matching spec scenarios.
5. Validate with `npm run validate:refactor`.

### Code Standards (highlights)

- No `as any` or `as unknown as`.
- Apply SOLID; keep business logic in services.
- Use enums/constants; avoid magic strings.
- Prefer explicit interfaces and concrete types.

### Test Commands

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Data & Conversions

- 4,200+ unit files (converted from MegaMek MTF)
- Equipment catalogs, era data, record sheet SVG assets

Useful scripts:

```bash
npm run convert:mtf       # Convert MTF files to JSON
npm run extract:equipment # Extract equipment data
npm run generate:index    # Generate unit index with metrics
```

## Roadmap (snapshot)

- UI polish and equipment browser enhancements
- Record sheet completeness
- Vehicle and aerospace support
- Desktop app improvements
- Multi-user/shared libraries

## Credits & Attribution

- Inspired by **MegaMek** (https://megamek.org). Data/assets licensed CC-BY-NC-SA-4.0; original code GPLv3.
- Built by **SwerveLabs** as a modern TypeScript/React implementation with OpenSpec-driven rules.
- Non-commercial use for derived data per CC-BY-NC-SA-4.0 and MegaMek content policy.

BattleTech trademarks are owned by their respective holders. This is an unofficial, fan-created tool.

