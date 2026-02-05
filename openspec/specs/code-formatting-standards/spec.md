# Code Formatting Standards

**Version**: 1.0.0  
**Status**: Active  
**Last Updated**: 2026-02-04

---

## Overview

### Purpose

This specification defines the code formatting standards for MekStation using oxfmt as the project's official code formatter. It documents configuration, integration points, and developer workflows to ensure consistent code style across the codebase.

### Scope

**In Scope:**

- oxfmt formatter configuration and settings
- Tailwind CSS class sorting rules
- Import statement sorting rules
- Pre-commit hook integration (lint-staged)
- CI/CD validation (GitHub Actions)
- Developer workflow and IDE integration
- Formatting rules and standards

**Out of Scope:**

- Linting rules (covered by oxlint configuration)
- Code quality standards (covered by validation-patterns spec)
- TypeScript compiler settings
- Build tooling configuration

### Key Concepts

- **oxfmt**: Rust-based code formatter compatible with Prettier, providing fast and consistent code formatting
- **Tailwind Sorting**: Automatic ordering of Tailwind CSS classes according to official recommendations
- **Import Sorting**: Automatic organization of import statements by type and source
- **Format-on-Save**: IDE integration that automatically formats code when files are saved
- **Pre-commit Formatting**: Automatic formatting of staged files before commit
- **CI Format Checking**: Validation that all code is properly formatted before merge

---

## ADDED Requirements

### Requirement: oxfmt Formatter Configuration

The project SHALL use oxfmt as the official code formatter with configuration defined in `.oxfmtrc.json`.

**Rationale**: oxfmt provides fast, consistent formatting compatible with Prettier while being significantly faster. Standardized configuration ensures all developers format code identically.

**Priority**: High

#### Scenario: Configuration file exists

- **GIVEN** the project root directory
- **WHEN** a developer checks for formatter configuration
- **THEN** a `.oxfmtrc.json` file SHALL exist
- **AND** the file SHALL contain valid JSON configuration

#### Scenario: Print width set to 80 characters

- **GIVEN** the `.oxfmtrc.json` configuration file
- **WHEN** the formatter processes any code file
- **THEN** lines SHALL be wrapped at 80 characters maximum
- **AND** the formatter SHALL respect language-specific wrapping rules

#### Scenario: Consistent formatting across file types

- **GIVEN** TypeScript, TSX, JavaScript, JSON, and Markdown files
- **WHEN** oxfmt formats these files
- **THEN** all files SHALL use consistent indentation (2 spaces)
- **AND** all files SHALL use consistent quote style (single quotes for code, double quotes for JSX)
- **AND** all files SHALL use consistent line endings (LF)

---

### Requirement: Tailwind CSS Class Sorting

The formatter SHALL automatically sort Tailwind CSS classes according to official Tailwind recommendations.

**Rationale**: Consistent class ordering improves readability, reduces merge conflicts, and makes it easier to identify duplicate or conflicting classes.

**Priority**: High

#### Scenario: Tailwind classes sorted in JSX

- **GIVEN** a React component with Tailwind classes in `className` attribute
- **WHEN** oxfmt formats the file
- **THEN** classes SHALL be sorted in Tailwind's recommended order
- **AND** layout classes SHALL appear before styling classes
- **AND** responsive modifiers SHALL be preserved

#### Scenario: Tailwind classes sorted in template literals

- **GIVEN** a component using `clsx()` or template literals for dynamic classes
- **WHEN** oxfmt formats the file
- **THEN** static Tailwind classes SHALL be sorted
- **AND** dynamic class expressions SHALL be preserved

---

### Requirement: Import Statement Sorting

The formatter SHALL automatically sort import statements by type and source.

**Rationale**: Consistent import ordering improves readability, makes it easier to identify missing or duplicate imports, and reduces merge conflicts in import blocks.

**Priority**: High

#### Scenario: Imports sorted by type

- **GIVEN** a TypeScript file with multiple import statements
- **WHEN** oxfmt formats the file
- **THEN** imports SHALL be grouped in order: external packages, internal modules, relative imports
- **AND** type imports SHALL be separated from value imports
- **AND** each group SHALL be sorted alphabetically

#### Scenario: Import sorting preserves side effects

- **GIVEN** a file with side-effect imports (e.g., `import './styles.css'`)
- **WHEN** oxfmt formats the file
- **THEN** side-effect imports SHALL remain in their original position
- **AND** other imports SHALL be sorted around them

---

### Requirement: Pre-commit Hook Integration

The project SHALL automatically format staged files before commit using lint-staged.

**Rationale**: Pre-commit formatting ensures that only properly formatted code enters the repository, preventing format-related CI failures and reducing noise in code reviews.

**Priority**: High

#### Scenario: Staged files formatted on commit

- **GIVEN** a developer has staged files for commit
- **WHEN** the developer runs `git commit`
- **THEN** lint-staged SHALL run oxfmt on staged TypeScript, TSX, JavaScript, and JSON files
- **AND** formatted files SHALL be automatically re-staged
- **AND** the commit SHALL proceed with formatted code

#### Scenario: Commit blocked on formatting errors

- **GIVEN** a staged file with syntax errors
- **WHEN** the developer runs `git commit`
- **THEN** oxfmt SHALL fail to format the file
- **AND** the commit SHALL be blocked
- **AND** an error message SHALL indicate which file failed

#### Scenario: Pre-commit hook can be bypassed

- **GIVEN** a developer needs to commit without formatting (emergency fix)
- **WHEN** the developer runs `git commit --no-verify`
- **THEN** the pre-commit hook SHALL be skipped
- **AND** the commit SHALL proceed without formatting

---

### Requirement: CI/CD Format Validation

The CI pipeline SHALL validate that all code is properly formatted before allowing merge.

**Rationale**: CI validation acts as a safety net to catch any unformatted code that bypassed pre-commit hooks, ensuring the main branch always contains properly formatted code.

**Priority**: High

#### Scenario: CI runs format check on pull requests

- **GIVEN** a pull request is opened
- **WHEN** CI runs the format check step
- **THEN** the pipeline SHALL execute `npm run format:check`
- **AND** the check SHALL fail if any files are not properly formatted
- **AND** the failure SHALL block the PR from merging

#### Scenario: Format check reports specific files

- **GIVEN** a pull request with unformatted files
- **WHEN** CI runs the format check
- **THEN** the error message SHALL list all unformatted files
- **AND** the message SHALL instruct the developer to run `npm run format`

#### Scenario: Format check passes on formatted code

- **GIVEN** a pull request with all files properly formatted
- **WHEN** CI runs the format check
- **THEN** the check SHALL pass
- **AND** the PR status SHALL show a green checkmark for formatting

---

### Requirement: Developer Workflow Integration

Developers SHALL have multiple ways to format code: IDE integration, manual commands, and automatic pre-commit.

**Rationale**: Flexible formatting options accommodate different developer preferences and workflows while ensuring consistent results.

**Priority**: Medium

#### Scenario: Format on save in IDE

- **GIVEN** a developer has configured their IDE with oxfmt
- **WHEN** the developer saves a file
- **THEN** the IDE SHALL automatically format the file
- **AND** the formatting SHALL match `npm run format` output

#### Scenario: Manual format command

- **GIVEN** a developer wants to format all files
- **WHEN** the developer runs `npm run format`
- **THEN** oxfmt SHALL format all TypeScript, TSX, JavaScript, JSON, and Markdown files
- **AND** the command SHALL report which files were changed

#### Scenario: Format check command

- **GIVEN** a developer wants to check formatting without modifying files
- **WHEN** the developer runs `npm run format:check`
- **THEN** oxfmt SHALL check all files for formatting issues
- **AND** the command SHALL exit with code 0 if all files are formatted
- **AND** the command SHALL exit with non-zero code and list unformatted files if any exist

---

## Configuration Reference

### .oxfmtrc.json Settings

```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "jsxBracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

**Setting Rationales:**

- **printWidth: 80** - Balances readability with modern screen sizes; prevents excessive line length
- **tabWidth: 2** - Standard for JavaScript/TypeScript projects; reduces indentation depth
- **useTabs: false** - Spaces ensure consistent rendering across editors
- **semi: true** - Explicit semicolons prevent ASI edge cases
- **singleQuote: true** - Reduces visual noise in code; matches TypeScript conventions
- **jsxSingleQuote: false** - Follows React/JSX conventions (double quotes in JSX attributes)
- **trailingComma: es5** - Cleaner diffs when adding array/object items
- **bracketSpacing: true** - Improves readability of object literals
- **arrowParens: always** - Consistent arrow function syntax
- **endOfLine: lf** - Unix-style line endings for cross-platform compatibility
- **plugins: prettier-plugin-tailwindcss** - Enables Tailwind class sorting

---

## Integration Points

### Pre-commit Hooks (lint-staged)

**Configuration** (in `package.json`):

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json}": ["oxfmt --write"]
  }
}
```

**Behavior:**

- Runs automatically on `git commit`
- Formats only staged files (fast)
- Re-stages formatted files
- Blocks commit on formatting errors

### CI/CD (GitHub Actions)

**Workflow** (`.github/workflows/pr-checks.yml`):

```yaml
- name: Check code formatting
  run: npm run format:check
```

**Behavior:**

- Runs on all pull requests
- Checks all files in repository
- Fails PR if any files are unformatted
- Reports specific files needing formatting

### IDE Integration

**VS Code** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

**Behavior:**

- Formats file on save (Ctrl+S / Cmd+S)
- Uses oxfmt via Prettier extension
- Respects `.oxfmtrc.json` configuration

---

## Examples

### Example 1: Tailwind Class Sorting

**Before formatting:**

```tsx
<div className="text-white bg-blue-500 p-4 rounded-lg hover:bg-blue-600 flex items-center">
  <span className="font-bold text-lg ml-2">Hello</span>
</div>
```

**After formatting:**

```tsx
<div className="flex items-center rounded-lg bg-blue-500 p-4 text-white hover:bg-blue-600">
  <span className="ml-2 text-lg font-bold">Hello</span>
</div>
```

### Example 2: Import Sorting

**Before formatting:**

```typescript
import { useState } from 'react';
import type { User } from './types';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import './styles.css';
import { formatDate } from '../utils/date';
```

**After formatting:**

```typescript
import type { User } from './types';
import './styles.css';
import clsx from 'clsx';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { formatDate } from '../utils/date';
```

### Example 3: Line Wrapping at 80 Characters

**Before formatting:**

```typescript
const result = await fetchUserData(
  userId,
  includeProfile,
  includePreferences,
  includeHistory,
);
```

**After formatting:**

```typescript
const result = await fetchUserData(
  userId,
  includeProfile,
  includePreferences,
  includeHistory,
);
```

---

## Dependencies

### Depends On

- **Node.js**: Runtime for oxfmt
- **npm scripts**: `format` and `format:check` commands
- **lint-staged**: Pre-commit hook integration
- **Husky**: Git hook management

### Used By

- **Pre-commit hooks**: Automatic formatting before commit
- **CI/CD pipelines**: Format validation in GitHub Actions
- **Developer workflows**: IDE integration and manual formatting
- **Code review process**: Ensures consistent formatting in PRs

---

## Implementation Notes

### Performance Considerations

- oxfmt is significantly faster than Prettier (Rust-based)
- Pre-commit formatting only processes staged files (fast)
- CI format checking processes all files (slower but comprehensive)
- IDE format-on-save is near-instantaneous for single files

### Edge Cases

- **Syntax errors**: oxfmt cannot format files with syntax errors; these will block commits
- **Generated files**: Add generated files to `.prettierignore` to skip formatting
- **Large files**: oxfmt handles large files efficiently, but consider excluding minified files
- **Merge conflicts**: Resolve conflicts before formatting; oxfmt cannot format files with conflict markers

### Common Pitfalls

- **Forgetting to install dependencies**: Run `npm install` after cloning to get oxfmt
- **Bypassing pre-commit hooks**: Using `--no-verify` skips formatting; use sparingly
- **IDE configuration conflicts**: Ensure IDE uses oxfmt, not a different formatter
- **Ignoring format check failures**: CI failures indicate unformatted code; run `npm run format` to fix

---

## References

### Official Documentation

- oxfmt: https://oxc.rs/docs/guide/usage/formatter.html
- Prettier (compatibility): https://prettier.io/docs/en/options.html
- Tailwind CSS class sorting: https://tailwindcss.com/blog/automatic-class-sorting-with-prettier

### Related Specifications

- `validation-patterns`: Code quality and type safety standards
- `storybook-component-library`: Component development and CI validation

### Configuration Files

- `.oxfmtrc.json`: Formatter configuration
- `package.json`: npm scripts and lint-staged configuration
- `.github/workflows/pr-checks.yml`: CI format validation
- `.vscode/settings.json`: IDE integration

---

## Changelog

### Version 1.0.0 (2026-02-04)

- Initial specification for oxfmt formatter
- Documented configuration, integration points, and developer workflows
- Added examples for Tailwind sorting, import sorting, and line wrapping
