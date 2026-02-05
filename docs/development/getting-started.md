# Getting Started

Quick guide to setting up and running the MekStation locally.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** - Included with Node.js
- **Git** - [Download](https://git-scm.com/)

## Setup

```bash
# Clone the repository
git clone <repository-url>
cd mekstation

# Install dependencies
npm install

# Fetch record sheet assets from CDN
npm run fetch:assets

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Asset Management

Record sheet templates and armor pips are externalized to MegaMek's [mm-data](https://github.com/MegaMek/mm-data) repository. You have two options for asset workflow:

### Option 1: Fetch from CDN (Recommended)

Best for most developers. Assets are downloaded from jsDelivr CDN:

```bash
npm run fetch:assets         # Download pinned version from CDN
npm run fetch:assets:force   # Re-download all (ignore cache)
```

Assets are saved to `public/record-sheets/` and tracked via `mm-data-version.json`.

### Option 2: Local mm-data Repository

Best for active mm-data development or when modifying templates:

```bash
# Clone mm-data as sibling directory
git clone https://github.com/MegaMek/mm-data.git ../mm-data

# Use local repo instead of CDN
npm run fetch:assets:local
```

This copies assets from `../mm-data/data/images/recordsheets/` instead of downloading.

### Version Pinning

Assets are pinned to a specific mm-data version in `config/mm-data-assets.json`:

```json
{
  "version": "v0.3.1",
  "repository": "MegaMek/mm-data",
  "basePath": "data/images/recordsheets",
  "cdnBase": "https://cdn.jsdelivr.net/gh",
  "rawBase": "https://raw.githubusercontent.com",
  "directories": ["biped_pips", "templates_us", "templates_iso"],
  "patterns": {
    "biped_pips": ["Armor_CT_{1-51}_Humanoid.svg", "..."],
    "templates_us": ["mek_biped_default.svg", "..."],
    "templates_iso": ["mek_biped_default.svg", "..."]
  }
}
```

**Config fields:**
| Field | Description |
|-------|-------------|
| `version` | Git tag or branch (e.g., `v0.3.1`, `main`) |
| `repository` | GitHub repo path |
| `basePath` | Path within repo to assets |
| `directories` | Asset subdirectories to fetch |
| `patterns` | File patterns with range expansion (`{1-51}`) |

**Updating to a new mm-data version:**

1. Check available releases: https://github.com/MegaMek/mm-data/releases
2. Edit `version` in `config/mm-data-assets.json`
3. Force re-fetch all assets:
   ```bash
   npm run fetch:assets:force
   ```
4. Test record sheet functionality:
   - Open a unit in the compendium
   - Click "Export Record Sheet" (if available)
   - Verify armor pips render correctly
5. Commit the config change with the new version

**Verifying assets:**

```bash
# Check what version is currently fetched
cat public/record-sheets/mm-data-version.json

# Test CDN accessibility
npm run test:cdn-access
```

## Project Structure

```
mekstation/
├── src/
│   ├── components/      # React UI components
│   ├── pages/           # Next.js pages and API routes
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions and calculations
├── config/
│   └── mm-data-assets.json  # Asset version pinning
├── public/
│   └── record-sheets/   # Fetched mm-data assets (git-ignored)
├── openspec/
│   ├── specs/           # Domain specifications (source of truth)
│   └── changes/         # Change proposals
├── data/
│   └── megameklab_converted_output/  # Unit data files
└── docs/                # This documentation
```

## Key Commands

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run fetch:assets    # Download mm-data assets from CDN
npm run lint            # Run ESLint
npm run test            # Run tests
npx tsc --noEmit        # Type check without building
npm run storybook       # Start Storybook dev server
npm run storybook:build # Build Storybook for production
```

## Storybook

Storybook provides an isolated environment for developing and testing UI components.

```bash
# Start Storybook development server (opens at http://localhost:6006)
npm run storybook
```

### What's in Storybook

- **UI Components**: Button, Card, Badge, Input, StatDisplay, etc.
- **Common Components**: ControlledInput, ErrorBoundary, Pagination
- **Armor Components**: ArmorLocation with interactive controls
- **Gameplay Components**: AmmoCounter, HeatTracker, ArmorPip
- **Shared Components**: Toast notifications, ActionSheet
- **Design System Docs**: Colors, Typography, Spacing reference

## Development URLs

- `/` - Home page
- `/compendium` - Unit browser
- `/equipment` - Equipment database

## Understanding the Codebase

### Domain Logic

All BattleTech construction rules are documented in OpenSpec:

```bash
# List all specifications
npx openspec list --specs

# View a specific spec
npx openspec show engine-system --type spec
```

### Type System

Core types are in `src/types/`:

```typescript
// Import from core
import { TechBase, RulesLevel } from '@/types/enums';
import { IEntity, ITechBaseEntity } from '@/types/core';
```

### Services

Business logic is in `src/services/`:

- `catalog/` - Unit catalog management
- `equipment/` - Equipment data access
- `integration/` - Service orchestration

## Next Steps

1. Read [Coding Standards](./coding-standards.md) for development guidelines
2. Explore OpenSpec specs for domain knowledge
3. Check `.cursorrules` for project-specific rules
