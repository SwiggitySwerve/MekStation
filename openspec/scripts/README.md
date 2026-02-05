# OpenSpec Scripts

Utility scripts for maintaining and validating OpenSpec specifications.

## Terminology Tools

A unified terminology validation and fixing system for enforcing canonical terminology standards defined in `TERMINOLOGY_GLOSSARY.md`.

### Quick Start

```bash
# Validate all spec files
npm run terminology:validate

# Validate with strict mode (exit code 1 on errors)
npm run terminology:validate:strict

# Fix violations automatically
npm run terminology:fix

# Preview fixes without making changes
npm run terminology:fix:dry-run
```

---

## Unified Terminology Tool (Recommended)

**Script**: `terminology-tool.ts`
**Config**: `terminology.config.json`

A comprehensive TypeScript-based tool that combines validation, fixing, and reporting into a single unified interface.

### Features

- ✅ **Smart context detection** - Skips code blocks, comments, deprecated examples
- ✅ **Auto-fix capability** - Automatically fixes violations with backups
- ✅ **Configurable rules** - All rules defined in `terminology.config.json`
- ✅ **Multiple output formats** - Human-readable and JSON
- ✅ **Git integration** - Check only changed files
- ✅ **TypeScript source support** - Check both specs and source code

### Usage

```bash
# Basic validation
npx ts-node openspec/scripts/terminology-tool.ts validate

# Validation with strict mode (fails on errors)
npx ts-node openspec/scripts/terminology-tool.ts validate --strict

# Show what would be fixed (dry run)
npx ts-node openspec/scripts/terminology-tool.ts fix --dry-run

# Fix violations automatically
npx ts-node openspec/scripts/terminology-tool.ts fix

# Check only files changed in git
npx ts-node openspec/scripts/terminology-tool.ts validate --changed-only

# Include TypeScript source files
npx ts-node openspec/scripts/terminology-tool.ts validate --source

# Output as JSON
npx ts-node openspec/scripts/terminology-tool.ts validate --json
```

### Commands

| Command    | Description                                |
| ---------- | ------------------------------------------ |
| `validate` | Check for terminology violations (default) |
| `fix`      | Fix violations automatically               |
| `report`   | Generate detailed report                   |

### Options

| Option            | Description                                       |
| ----------------- | ------------------------------------------------- |
| `--fix`           | Apply fixes automatically (with validate command) |
| `--dry-run`       | Show what would be fixed without making changes   |
| `--json`          | Output results as JSON                            |
| `--changed-only`  | Only check files changed in git                   |
| `--source`        | Include TypeScript source files                   |
| `--specs-only`    | Only check spec.md files                          |
| `--strict`        | Exit with error code on any violation             |
| `--verbose`, `-v` | Show detailed output                              |
| `--config PATH`   | Use custom config file                            |

---

## Configuration

### `terminology.config.json`

All terminology rules are defined in a single configuration file that can be used by all tools.

```json
{
  "version": "2.0",
  "deprecatedTerms": [
    {
      "id": "technology-base",
      "deprecated": "technology base",
      "canonical": "tech base",
      "severity": "warning",
      "pattern": "\\btechnology base\\b",
      "flags": "gi",
      "preserveCase": true
    }
  ],
  "propertyViolations": [...],
  "capitalizationRules": [...],
  "skipPatterns": {...},
  "filePatterns": {...}
}
```

### Rule Properties

| Property       | Type                     | Description                          |
| -------------- | ------------------------ | ------------------------------------ |
| `id`           | string                   | Unique identifier for the rule       |
| `deprecated`   | string                   | Human-readable deprecated term       |
| `canonical`    | string                   | What should be used instead          |
| `severity`     | `"error"` \| `"warning"` | How serious is the violation         |
| `pattern`      | string                   | Regex pattern to match               |
| `flags`        | string                   | Regex flags (e.g., "gi")             |
| `preserveCase` | boolean                  | Preserve original casing when fixing |
| `skipContexts` | string[]                 | Skip in specific contexts            |
| `context`      | string                   | Additional context for the rule      |

### Skip Contexts

The tool intelligently skips violations in certain contexts:

- **deprecated-examples**: Lines with ❌, "Deprecated", "Do not use"
- **comparisons**: Lines with ≠ or !=
- **rule-descriptions**: Lines with "**Rule**:" or "could mean"
- **rationale**: Lines with "**Rationale**:"
- **changelog**: Lines documenting changes
- **code blocks**: Property violations only checked in code

---

## What It Checks

### 1. Deprecated Terms

| ❌ Deprecated              | ✅ Canonical                   |
| -------------------------- | ------------------------------ |
| "crit slots"               | "critical slots"               |
| "component mass"           | "component weight"             |
| "technology base"          | "tech base"                    |
| "Tournament" (rules level) | "Advanced"                     |
| "internal heat sinks"      | "engine-integrated heat sinks" |
| "tech level"               | "rules level"                  |
| "gyroscope"                | "gyro"                         |
| "heatsink"                 | "heat sink"                    |

### 2. Property Naming

| ❌ Incorrect    | ✅ Correct              |
| --------------- | ----------------------- |
| `tons: number`  | `weight: number`        |
| `mass: number`  | `weight: number`        |
| `slots: number` | `criticalSlots: number` |
| `introYear:`    | `introductionYear:`     |
| `faction:`      | `techBase:`             |

### 3. Capitalization

| ❌ Incorrect   | ✅ Correct     |
| -------------- | -------------- |
| "Battlemech"   | "BattleMech"   |
| "Battle Mech"  | "BattleMech"   |
| "inner sphere" | "Inner Sphere" |
| "centre torso" | "Center Torso" |
| "armour"       | "armor"        |

---

## Example Output

```
🔍 OpenSpec Terminology Tool v2.0

Found 21 file(s) to scan

specs/gyro-system/spec.md (4 violations)

ERROR specs/gyro-system/spec.md:923:3
  Found: "slots: 4,"
  Should be: "criticalSlots: 4,"
  Context: property definition
  slots: 4,

WARN specs/tech-base-rules-matrix/spec.md:156:15
  Found: "technology base"
  Should be: "tech base"
  Component technology base is...

══════════════════════════════════════════════════
Summary
══════════════════════════════════════════════════
  Files scanned:          21
  Files with violations:  4
  Errors:                 4
  Warnings:               12
  Total violations:       16
```

---

## Integration

### package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "terminology:validate": "npx ts-node openspec/scripts/terminology-tool.ts validate",
    "terminology:validate:strict": "npx ts-node openspec/scripts/terminology-tool.ts validate --strict",
    "terminology:fix": "npx ts-node openspec/scripts/terminology-tool.ts fix",
    "terminology:fix:dry-run": "npx ts-node openspec/scripts/terminology-tool.ts fix --dry-run"
  }
}
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npx ts-node openspec/scripts/terminology-tool.ts validate --strict --changed-only
if [ $? -ne 0 ]; then
  echo "❌ Terminology validation failed. Please fix violations before committing."
  exit 1
fi
```

### CI/CD (GitHub Actions)

```yaml
- name: Validate Terminology
  run: npx ts-node openspec/scripts/terminology-tool.ts validate --strict
```

---

## Legacy Scripts

The following legacy scripts are still available but the unified tool is recommended:

### `validate-terminology.js` (Legacy)

Original JavaScript validator. Use `terminology-tool.ts validate` instead.

```bash
node openspec/scripts/validate-terminology.js
```

### `fix-terminology.sh` (Legacy)

Bash script for fixing terminology. Use `terminology-tool.ts fix` instead.

```bash
bash openspec/scripts/fix-terminology.sh
```

### `fix_terminology.py` (Legacy)

Python script for BattleMech/mech/unit terminology. Use `terminology-tool.ts fix` instead.

```bash
python openspec/scripts/fix_terminology.py openspec/specs
```

---

## Maintenance

### Adding New Rules

1. Add the rule to `terminology.config.json`
2. Run validation to test the new rule
3. Update `TERMINOLOGY_GLOSSARY.md` if needed

### Updating Rules

1. Edit `terminology.config.json`
2. Increment version number
3. Run `terminology-tool.ts validate` to verify

### Debugging

```bash
# Verbose output
npx ts-node openspec/scripts/terminology-tool.ts validate --verbose

# JSON output for programmatic use
npx ts-node openspec/scripts/terminology-tool.ts validate --json | jq

# Check specific file
npx ts-node openspec/scripts/terminology-tool.ts validate openspec/specs/gyro-system/spec.md
```

---

## Exit Codes

| Code | Meaning                             |
| ---- | ----------------------------------- |
| `0`  | No errors (warnings may exist)      |
| `1`  | Errors found (with `--strict` flag) |

---

## Related Documentation

- `../TERMINOLOGY_GLOSSARY.md` - Canonical terminology reference
- `../specs/README.md` - Specification index
- `../templates/spec-template.md` - Specification template
