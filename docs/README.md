# MekStation Documentation

## Source of Truth

**OpenSpec is the single source of truth** for all BattleTech construction rules, formulas, and domain logic.

```bash
# List all specifications
npx openspec list --specs

# View a specific specification
npx openspec show construction-rules-core --type spec

# Search for content
rg "MASC" openspec/specs/
```

See [`openspec/specs/`](../openspec/specs/) for 38 comprehensive specifications covering:
- Construction rules (engines, gyros, armor, structure)
- Equipment systems (weapons, electronics, ammunition)
- Validation rules (critical slots, heat management, battle value)
- Data models (unit serialization, database schema)

## Documentation Index

### Development

- [Getting Started](./development/getting-started.md) - Project setup and running locally
- [Coding Standards](./development/coding-standards.md) - TypeScript, React, and code style guidelines
- [Troubleshooting](./development/troubleshooting.md) - Common issues and solutions
- [Overview & Deep Dive](./overview.md) - Features, APIs, rules, roadmap

### Architecture

- [Project Structure](./architecture/project-structure.md) - Current file organization

### Contributing

- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project

## Quick Links

- **Agent Rules**: See [`.cursorrules`](../.cursorrules) for comprehensive development guidelines
- **OpenSpec**: See [`openspec/AGENTS.md`](../openspec/AGENTS.md) for spec-driven development workflow
- **BattleTech Rules**: See [`openspec/specs/`](../openspec/specs/) for all domain specifications

