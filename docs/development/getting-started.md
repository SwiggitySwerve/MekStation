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
cd megamek-web

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
megamek-web/
├── src/
│   ├── components/      # React UI components
│   ├── pages/           # Next.js pages and API routes
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions and calculations
├── openspec/
│   ├── specs/           # Domain specifications (source of truth)
│   └── changes/         # Change proposals
├── data/
│   └── megameklab_converted_output/  # Unit data files
└── docs/                # This documentation
```

## Key Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Run ESLint
npm run test      # Run tests
npx tsc --noEmit  # Type check without building
```

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

