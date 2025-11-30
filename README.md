# BattleTech Editor

A modern, spec-driven web application for constructing and customizing BattleTech combat units. Built with Next.js 16, React 19, and TypeScript with a focus on accuracy to official construction rules.

<div align="center">

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)

</div>

---

## Overview

BattleTech Editor is a comprehensive unit construction application that implements the official BattleTech TechManual rules. The project uses an **OpenSpec-driven architecture** where domain specifications serve as the single source of truth, ensuring accurate rule implementation and maintainable code.

### Key Features

- **Unit Customization** — Full BattleMech construction with real-time validation
- **Equipment Browser** — Browse and filter weapons, equipment, and components
- **Multi-Unit Workspace** — Edit and compare multiple units simultaneously
- **Critical Slot Management** — Drag-and-drop equipment placement with location validation
- **Armor Allocation** — Visual diagram for distributing armor points
- **Heat Management** — Track heat generation and dissipation in real-time
- **Tech Base Support** — Inner Sphere, Clan, and Mixed Tech configurations
- **Era Filtering** — Filter equipment by historical availability

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage report |

---

## Architecture

The application follows a **spec-driven development** approach where OpenSpec specifications define domain rules before implementation.

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
| Testing | Jest + React Testing Library |
| Language | TypeScript 5.8 |

### Project Structure

```
megamek-web/
├── openspec/               # Specifications (domain truth)
│   ├── specs/              # 47 capability specs
│   │   ├── armor-system/
│   │   ├── engine-system/
│   │   ├── weapon-system/
│   │   └── ...
│   └── changes/            # Active change proposals
├── src/
│   ├── components/         # React UI components
│   │   ├── common/         # Shared components
│   │   └── ui/             # Design system primitives
│   ├── pages/              # Next.js pages & API routes
│   │   ├── api/            # REST API endpoints
│   │   ├── customizer/     # Unit construction UI
│   │   ├── compendium/     # Equipment browser
│   │   └── compare/        # Unit comparison
│   ├── services/           # Business logic layer
│   │   ├── construction/   # Construction services
│   │   ├── equipment/      # Equipment services
│   │   └── units/          # Unit services
│   ├── types/              # TypeScript definitions
│   │   ├── core/           # Base interfaces
│   │   ├── enums/          # TechBase, Era, RulesLevel
│   │   ├── construction/   # Engine, Gyro, Armor types
│   │   └── equipment/      # Weapons, ammo, electronics
│   └── utils/              # Calculation utilities
│       ├── construction/   # Engine, armor, movement calc
│       └── equipment/      # Equipment property calc
├── public/data/            # JSON data files
│   ├── units/              # 4200+ unit files
│   └── equipment/          # Equipment catalogs
└── docs/                   # Development documentation
```

---

## OpenSpec System

This project uses [OpenSpec](openspec/AGENTS.md) for specification-driven development. All BattleTech construction rules are documented in machine-readable specifications before implementation.

### Viewing Specifications

```bash
# List all specifications
npx openspec list --specs

# View a specific spec
npx openspec show engine-system --type spec

# List active changes
npx openspec list
```

### Specification Categories

| Category | Specs | Examples |
|----------|-------|----------|
| **Construction** | 12 | Engine, Gyro, Armor, Structure, Heat Sinks |
| **Equipment** | 8 | Weapons, Ammunition, Electronics, Physical Weapons |
| **Validation** | 4 | Construction Rules, Validation Patterns, Data Integrity |
| **UI Components** | 9 | Critical Slots Display, Armor Diagram, Equipment Browser |
| **Data & Services** | 8 | Unit Services, Equipment Services, Persistence |
| **Core Types** | 6 | Entity Types, Enumerations, Tech Base Rules |

---

## API Reference

REST API endpoints for accessing unit and equipment data:

### Units

| Endpoint | Description |
|----------|-------------|
| `GET /api/units` | List units with filtering & pagination |
| `GET /api/catalog` | Unit catalog with search |
| `GET /api/custom-variants` | Custom unit variants |
| `GET /api/custom-variants/[id]` | Specific variant details |

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

---

## BattleTech Rules

This project implements official BattleTech construction rules from the TechManual. The `constants/BattleTechConstructionRules.ts` file serves as the code-level single source of truth.

### Key Rules Quick Reference

| Component | Formula |
|-----------|---------|
| **Engine Rating** | Walk MP × Tonnage |
| **Engine Weight** | Lookup table by rating + type modifier |
| **Gyro Weight** | ceil(Engine Rating / 100) × type modifier |
| **Structure Weight** | Tonnage × 0.10 (Standard), × 0.05 (Endo Steel) |
| **Max Armor** | Structure Points × 2 (Head = 9) |
| **Internal Heat Sinks** | floor(Engine Rating / 25) |
| **Run MP** | ceil(Walk MP × 1.5) |
| **Jump MP** | ≤ Walk MP (standard jets) |

### Critical Slot Allocations

| Location | Slots |
|----------|-------|
| Head | 6 |
| Center Torso | 12 |
| Side Torsos | 12 each |
| Arms | 12 each |
| Legs | 6 each |
| **Total** | **78** |

---

## Development

### Adding Features

1. **Check OpenSpec** — Review existing specifications
2. **Create Change Proposal** — Use `openspec/changes/` for new features
3. **Implement** — Follow types from `src/types/`
4. **Test** — Add tests matching spec scenarios
5. **Validate** — Run `npm run validate:refactor`

### Code Standards

- **Type Safety** — No `as any` or `as unknown as` casting
- **SOLID Principles** — Services for business logic, components for UI
- **Naming** — Services end with `Service`, Validators with `Validator`
- **Constants** — Use enums and constants, no magic strings

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

---

## Data

The project includes comprehensive BattleTech data:

- **4,200+ Unit Files** — Converted from MegaMekLab format
- **Equipment Catalogs** — Weapons, ammo, electronics, misc equipment
- **Era Data** — Age of War through Dark Age availability

### Converting Units

```bash
# Convert MTF files to JSON
npm run convert:mtf

# Extract equipment data
npm run extract:equipment
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Review relevant OpenSpec specifications
4. Follow code standards (no `as any`, use types)
5. Add tests for new functionality
6. Submit a pull request

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Project Structure](docs/architecture/project-structure.md) | Codebase organization |
| [Getting Started](docs/development/getting-started.md) | Development setup |
| [Coding Standards](docs/development/coding-standards.md) | Code style guidelines |
| [OpenSpec Guide](openspec/AGENTS.md) | Specification system |

---

## Roadmap

### Current Focus
- 🔨 UI Recreation — Rebuilding customizer interface with spec-driven components
- 📋 Equipment Browser — Enhanced filtering and search
- 🎨 Design System — Consistent color and styling

### Upcoming
- 💾 Persistence — Save/load custom units
- 📤 Export — MTF and other format export
- 🖥️ Desktop App — Electron wrapper for offline use

---

## License

This project is licensed under the Apache License 2.0 — see [LICENSE](LICENSE) for details.

---

<div align="center">

**BattleTech is a registered trademark of The Topps Company, Inc.**

*This project is a fan-made tool and is not affiliated with or endorsed by Catalyst Game Labs or The Topps Company.*

</div>
