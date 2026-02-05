## Why

The project has migrated from ESLint to oxlint (50-100x faster linting) and added oxfmt as the first code formatter. Existing OpenSpec specifications reference ESLint tooling and enforcement mechanisms that no longer exist. These specs need to be updated to reflect the current tooling stack to maintain accuracy and avoid developer confusion.

## What Changes

- Update `validation-patterns` spec to replace ESLint enforcement references with oxlint
- Document the loss of the `no-restricted-syntax` rule (ESLint core rule not supported by oxlint)
- Add oxfmt formatter specification as a new capability for code style consistency
- Update CI/CD related specs to reference oxlint and oxfmt instead of ESLint
- Update development workflow documentation to reflect the new linting and formatting tools

## Capabilities

### New Capabilities

- `code-formatting-standards`: Define oxfmt formatter configuration, formatting rules, Tailwind CSS class sorting, import statement sorting, and integration with pre-commit hooks and CI/CD

### Modified Capabilities

- `validation-patterns`: Update the "No Double Type Assertions" requirement to document that ESLint enforcement has been replaced with developer education and code review, since oxlint does not support the `no-restricted-syntax` rule
- `storybook-component-library`: Update CI validation requirements to reference oxlint and oxfmt in addition to Storybook build checks

## Impact

**Affected Specifications**:

- `openspec/specs/validation-patterns/spec.md` - Lines 53-58 reference ESLint enforcement
- `openspec/specs/storybook-component-library/spec.md` - Lines 159-164 reference CI status checks

**Development Workflow**:

- Developers need updated specs showing current tooling
- Pre-commit hooks now use oxlint + oxfmt instead of ESLint
- CI/CD pipelines updated to run `npm run lint` (oxlint) and `npm run format:check` (oxfmt)

**Documentation**:

- OpenSpec README and development guides should reference oxlint/oxfmt
- No code changes required (migration already complete)
- This change only updates specification accuracy

**Breaking Changes**: None - this is documentation-only to reflect already-implemented tooling changes.
