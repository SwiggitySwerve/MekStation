# Storybook Component Library (Delta Spec)

**Version**: 1.1.0  
**Status**: Delta  
**Last Updated**: 2026-02-04  
**Change**: Update for oxlint/oxfmt migration

---

## Overview

This delta spec modifies the existing `storybook-component-library` specification to reflect the migration from ESLint to oxlint and the addition of oxfmt as the project's code formatter. The primary change is updating CI validation scenarios to reference the new tooling stack.

---

## MODIFIED Requirements

### Requirement: Static Storybook Build

The system SHALL produce a static Storybook build for CI validation.

**Priority**: High

**Change Summary**: CI validation now includes oxlint and oxfmt checks in addition to Storybook build validation. The CI pipeline runs linting and formatting checks before building Storybook to catch issues early.

#### Scenario: Static build succeeds

- **GIVEN** all stories are valid
- **WHEN** the developer runs `npm run storybook:build`
- **THEN** a static site is generated in `storybook-static/`
- **AND** the build completes without errors

#### Scenario: CI validates Storybook build

- **GIVEN** a pull request is opened
- **WHEN** CI runs the Storybook build step
- **THEN** oxlint validation runs via `npm run lint` before the build
- **AND** oxfmt format checking runs via `npm run format:check` before the build
- **AND** Storybook build runs via `npm run storybook:build`
- **AND** build failures in any step block the PR
- **AND** success in all steps is reported to the PR status checks

**Note**: This scenario has been updated to reflect the current CI tooling stack. The CI pipeline now validates code quality with oxlint (50-100x faster than ESLint) and code formatting with oxfmt before building Storybook. This ensures that all code meets quality and formatting standards before component documentation is generated.

---

## Rationale for Changes

### CI Tooling Stack Update

The project has migrated from ESLint to oxlint for linting and added oxfmt as the first code formatter. These changes provide significant performance improvements while maintaining code quality standards:

- **oxlint**: 50-100x faster than ESLint, providing near-instantaneous feedback on code quality issues
- **oxfmt**: Rust-based formatter compatible with Prettier, ensuring consistent code style across the codebase

The CI pipeline now runs three validation steps before allowing PR merge:

1. **Linting** (`npm run lint`): Validates code quality with oxlint
2. **Formatting** (`npm run format:check`): Validates code formatting with oxfmt
3. **Storybook Build** (`npm run storybook:build`): Validates component stories and generates documentation

This multi-stage validation ensures that merged code is high-quality, properly formatted, and has valid component documentation.

---

## Dependencies

### Depends On

- **oxlint**: Code quality validation
- **oxfmt**: Code formatting validation
- **Storybook**: Component documentation and build system
- **GitHub Actions**: CI/CD pipeline execution

### Used By

- **CI/CD pipeline**: Automated validation on pull requests
- **Code review process**: PR status checks inform reviewers
- **Component development**: Developers run builds locally before pushing

---

## Implementation Notes

### CI Pipeline Order

The CI pipeline runs validation steps in this order:

1. **Install dependencies**: `npm ci`
2. **Lint code**: `npm run lint` (oxlint)
3. **Check formatting**: `npm run format:check` (oxfmt)
4. **Build Storybook**: `npm run storybook:build`
5. **Run tests**: `npm test` (if applicable)

**Rationale**: Linting and formatting checks are fast and catch common issues early. Running them before the Storybook build (which is slower) provides faster feedback to developers.

### Local Development Workflow

Developers should run these commands before pushing:

```bash
npm run lint          # Check for code quality issues
npm run format        # Auto-fix formatting issues
npm run storybook:build  # Validate Storybook builds
```

**Tip**: Configure your IDE to format on save (see `code-formatting-standards` spec) to avoid formatting issues.

### Common Pitfalls

- **Forgetting to format**: Run `npm run format` before committing to avoid CI failures
- **Bypassing pre-commit hooks**: Using `git commit --no-verify` skips formatting; use sparingly
- **Ignoring lint warnings**: oxlint warnings indicate potential issues; address them before pushing
- **Storybook build failures**: Often caused by invalid story syntax or missing dependencies; check error messages carefully

---

## Examples

### Example 1: CI Workflow Configuration

**GitHub Actions** (`.github/workflows/pr-checks.yml`):

```yaml
name: PR Checks

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Lint code
        run: npm run lint
      - name: Check formatting
        run: npm run format:check
      - name: Build Storybook
        run: npm run storybook:build
```

### Example 2: Local Pre-push Validation

**Developer workflow:**

```bash
# Before pushing changes
npm run lint                # Check for linting issues
npm run format              # Auto-fix formatting
npm run storybook:build     # Validate Storybook builds

# If all pass, push changes
git push origin feature-branch
```

### Example 3: Handling CI Failures

**Scenario**: CI fails on formatting check

```bash
# CI error message:
# "Code formatting check failed. Run 'npm run format' to fix."

# Fix locally:
npm run format              # Auto-format all files
git add .
git commit -m "fix: apply code formatting"
git push origin feature-branch

# CI will re-run and should pass
```

---

## References

### Related Specifications

- `code-formatting-standards`: oxfmt formatter configuration and integration
- `validation-patterns`: Code quality standards and oxlint enforcement

### Configuration Files

- `.oxlintrc.json`: oxlint configuration
- `.oxfmtrc.json`: oxfmt configuration
- `.github/workflows/pr-checks.yml`: CI pipeline configuration
- `.storybook/main.ts`: Storybook configuration

### Migration Context

- Migration commit: `018bd66f` - "build(tooling): migrate from ESLint to oxlint + add oxfmt formatter"
- Design document: `openspec/changes/update-specs-for-oxlint-migration/design.md`

---

## Changelog

### Version 1.1.0 (2026-02-04)

- **MODIFIED**: "Static Storybook Build" requirement
  - Updated "CI validates Storybook build" scenario to reference oxlint and oxfmt
  - Added note explaining CI pipeline runs linting and formatting checks before Storybook build
  - Documented multi-stage validation approach (lint → format → build)
  - Added implementation notes for CI pipeline order and local development workflow

### Version 1.0.0 (Original)

- Initial specification with ESLint-based CI validation
