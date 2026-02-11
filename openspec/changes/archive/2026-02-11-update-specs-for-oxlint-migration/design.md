# Design Document: Update OpenSpec Specifications for oxlint/oxfmt Migration

## Context

The project has completed a migration from ESLint to oxlint (50-100x faster linting) and added oxfmt as the first code formatter. This migration was implemented in commit `018bd66f` and includes:

- **Linter replacement**: ESLint → oxlint with configuration generated via `@oxlint/migrate`
- **Formatter addition**: oxfmt with Prettier-compatible settings, Tailwind class sorting, and import sorting
- **Lost capability**: `no-restricted-syntax` ESLint rule (used to enforce "No Double Type Assertions" validation pattern)
- **CI/CD updates**: GitHub Actions workflows now run `npm run lint` (oxlint) and `npm run format:check` (oxfmt)
- **Pre-commit hooks**: lint-staged now uses oxlint + oxfmt instead of ESLint
- **Status**: Migration complete, only documentation needs updating

Existing OpenSpec specifications reference ESLint enforcement mechanisms that no longer exist. These specs must be updated to reflect the current tooling stack and document the loss of automated enforcement for certain validation patterns.

## Goals / Non-Goals

**Goals:**

1. Update `validation-patterns` spec to document the shift from ESLint enforcement to developer education + code review for the "No Double Type Assertions" requirement
2. Update `storybook-component-library` spec to reference oxlint and oxfmt in CI validation scenarios
3. Create new `code-formatting-standards` spec documenting oxfmt configuration, features, and integration points
4. Maintain accuracy of OpenSpec specifications as the single source of truth for project standards
5. Preserve change history by using delta-specs for modified capabilities

**Non-Goals:**

1. Implementing new tooling (migration already complete)
2. Changing code or configuration files (only updating documentation)
3. Re-implementing `no-restricted-syntax` enforcement in oxlint (not supported by the tool)
4. Documenting ESLint configuration (tool has been removed)
5. Creating comprehensive linting rule documentation (oxlint rules are documented in `.oxlintrc.README.md`)

## Decisions

### 1. Spec Update Strategy: Delta-Specs for Modified Capabilities

**Decision**: Use delta-specs to document changes to existing capabilities in `validation-patterns` and `storybook-component-library`.

**Rationale**:

- Delta-specs preserve the history of what changed and why
- They make it clear to developers that enforcement mechanisms have shifted
- They maintain a record of the migration decision for future reference
- OpenSpec's delta-spec pattern is designed for this exact use case

**Alternatives Considered**:

- **Direct edits to main specs**: Would lose change history and make it unclear when/why enforcement changed
- **Annotations in main specs**: Would clutter the spec with historical notes that become stale over time
- **Separate migration document**: Would fragment documentation and make it harder to find current state

**Implementation**:

- Create `openspec/changes/update-specs-for-oxlint-migration/delta-specs/validation-patterns.delta.md`
- Create `openspec/changes/update-specs-for-oxlint-migration/delta-specs/storybook-component-library.delta.md`
- Delta-specs will be synced to main specs during archive

### 2. New Spec Structure: code-formatting-standards

**Decision**: Create a new full spec at `openspec/specs/code-formatting-standards/spec.md` to document oxfmt configuration and formatting standards.

**Rationale**:

- This is a new capability (project's first formatter)
- Formatting standards are a foundational concern that affects all code
- Developers need a single source of truth for formatting rules and configuration
- The spec should document integration with pre-commit hooks and CI/CD

**Alternatives Considered**:

- **Document in README or contributing guide**: Would fragment standards documentation and make it harder to maintain
- **Document only in `.oxfmtrc.json` comments**: Configuration files are not the right place for comprehensive documentation
- **Skip documentation**: Would leave developers without guidance on formatting expectations

**Spec Structure**:

```
openspec/specs/code-formatting-standards/
├── spec.md
└── examples/ (if needed)
```

**Content Sections**:

1. **Purpose**: Document oxfmt as the project's code formatter
2. **Requirements**:
   - Formatter configuration (`.oxfmtrc.json` settings)
   - Tailwind CSS class sorting
   - Import statement sorting
   - Pre-commit hook integration
   - CI/CD validation
   - Developer workflow (format on save, manual formatting)
3. **Configuration Reference**: Document each `.oxfmtrc.json` setting with rationale
4. **Integration Points**: Pre-commit hooks (lint-staged), CI (GitHub Actions), IDE setup
5. **Examples**: Before/after formatting examples for common patterns

### 3. Handling Lost Capability: no-restricted-syntax

**Decision**: Document in `validation-patterns` delta-spec that automated enforcement of "No Double Type Assertions" has been replaced with developer education and code review.

**Rationale**:

- `no-restricted-syntax` is an ESLint core rule not supported by oxlint
- The validation pattern itself remains valid and important
- Enforcement mechanism has shifted from automated (ESLint) to manual (code review)
- Developers need to understand this change and why it happened

**Alternatives Considered**:

- **Remove the requirement entirely**: Would weaken type safety standards
- **Implement custom oxlint plugin**: Out of scope, requires significant effort, and oxlint plugin ecosystem is immature
- **Use a different linter for this rule**: Would add complexity and slow down linting
- **Ignore the change**: Would leave specs inaccurate and confuse developers

**Mitigation Strategy**:

- Update "ESLint enforcement" scenario to "Code review enforcement"
- Add explicit note explaining the loss of automated enforcement
- Emphasize the importance of manual review for this pattern
- Document approved alternatives (type guards, conversion functions, etc.) more prominently

**Delta-Spec Content**:

```markdown
### Modified Requirement: No Double Type Assertions

**Change**: Enforcement mechanism shifted from ESLint to code review.

**Rationale**: The `no-restricted-syntax` ESLint rule is not supported by oxlint.
This validation pattern remains critical for type safety, but enforcement now
relies on developer education and code review rather than automated linting.

#### Scenario: Code review enforcement (REPLACES "ESLint enforcement")

- **GIVEN** any TypeScript file in the codebase
- **WHEN** it contains `expression as unknown as Type` or `expression as any as Type`
- **THEN** code reviewers SHALL flag the violation during PR review
- **AND** suggest using type guards or conversion functions instead
```

### 4. CI/CD References: Backward-Compatible Updates

**Decision**: Update `storybook-component-library` spec to reference oxlint and oxfmt while maintaining backward compatibility with existing CI workflows.

**Rationale**:

- CI workflows now run `npm run lint` (oxlint) and `npm run format:check` (oxfmt)
- The spec should reflect current tooling without breaking existing workflows
- ESLint may still exist in devDependencies temporarily (for migration period)

**Alternatives Considered**:

- **Remove all ESLint references immediately**: Could break workflows if ESLint is still partially present
- **Document both ESLint and oxlint**: Would confuse developers about which tool is current
- **Skip CI updates**: Would leave specs inaccurate

**Delta-Spec Content**:

```markdown
### Modified Requirement: CI Validation

**Change**: CI now validates code with oxlint and oxfmt instead of ESLint.

#### Scenario: CI validates Storybook build (UPDATED)

- **GIVEN** a pull request is opened
- **WHEN** CI runs the Storybook build step
- **THEN** oxlint validation runs before build
- **AND** oxfmt format checking runs before build
- **AND** Storybook build failures block the PR
- **AND** success is reported to the PR status checks
```

## Risks / Trade-offs

### Risk 1: Loss of Automated Enforcement for Double Type Assertions

**Risk**: Without ESLint's `no-restricted-syntax` rule, developers may introduce double type assertions that bypass TypeScript's type system.

**Likelihood**: Medium (developers may not be aware of the pattern or its risks)

**Impact**: Medium (type safety violations can lead to runtime errors)

**Mitigation**:

- Emphasize the importance of this pattern in `validation-patterns` spec
- Document approved alternatives prominently (type guards, conversion functions)
- Train code reviewers to watch for this pattern
- Consider adding a custom oxlint rule in the future if the plugin ecosystem matures

**Trade-off Accepted**: We accept the loss of automated enforcement in exchange for 50-100x faster linting. Manual code review is a reasonable fallback for this specific pattern.

### Risk 2: Spec Drift During Migration Period

**Risk**: If ESLint is still partially present in the codebase (e.g., in devDependencies), specs may become temporarily inaccurate.

**Likelihood**: Low (migration is complete per commit `018bd66f`)

**Impact**: Low (temporary confusion, easily corrected)

**Mitigation**:

- Verify ESLint has been fully removed before archiving this change
- Update specs to reflect current state, not transitional state
- Document migration completion in delta-specs

**Trade-off Accepted**: Minor risk of temporary inaccuracy is acceptable given the migration is complete.

### Risk 3: Developer Confusion About Formatting Standards

**Risk**: Without clear documentation, developers may not understand oxfmt's configuration or how to integrate it with their workflow.

**Likelihood**: Medium (new tool, first formatter for the project)

**Impact**: Medium (inconsistent formatting, CI failures)

**Mitigation**:

- Create comprehensive `code-formatting-standards` spec
- Document IDE integration (format on save)
- Document pre-commit hook behavior
- Provide examples of common formatting patterns

**Trade-off Accepted**: Upfront documentation effort is necessary to prevent ongoing confusion and CI failures.

### Trade-off 1: Delta-Specs vs. Direct Edits

**Trade-off**: Delta-specs add overhead (separate files, sync process) but preserve change history.

**Decision**: Use delta-specs for modified capabilities.

**Rationale**: Change history is valuable for understanding why enforcement mechanisms changed. The overhead is minimal and follows OpenSpec best practices.

### Trade-off 2: Comprehensive vs. Minimal Documentation

**Trade-off**: Comprehensive documentation (full spec for formatting standards) requires more effort but provides better developer experience.

**Decision**: Create comprehensive `code-formatting-standards` spec.

**Rationale**: Formatting is a foundational concern that affects all code. Investing in comprehensive documentation upfront will save time and reduce confusion long-term.

---

## Implementation Notes

### Spec File Locations

1. **Delta-specs** (created in this change):
   - `openspec/changes/update-specs-for-oxlint-migration/delta-specs/validation-patterns.delta.md`
   - `openspec/changes/update-specs-for-oxlint-migration/delta-specs/storybook-component-library.delta.md`

2. **New spec** (created in this change):
   - `openspec/specs/code-formatting-standards/spec.md`

3. **Main specs** (updated during archive):
   - `openspec/specs/validation-patterns/spec.md`
   - `openspec/specs/storybook-component-library/spec.md`

### Verification Checklist

Before archiving this change:

- [ ] Verify ESLint has been fully removed from package.json devDependencies
- [ ] Verify `.oxfmtrc.json` and `.oxlintrc.json` exist and are documented
- [ ] Verify CI workflows reference oxlint and oxfmt
- [ ] Verify pre-commit hooks use lint-staged with oxlint/oxfmt
- [ ] Verify all delta-specs accurately reflect current state
- [ ] Verify `code-formatting-standards` spec is complete and accurate

### References

- Migration commit: `018bd66f` - "build(tooling): migrate from ESLint to oxlint + add oxfmt formatter"
- oxfmt configuration: `.oxfmtrc.json`
- oxlint configuration: `.oxlintrc.json`
- CI workflow: `.github/workflows/pr-checks.yml`
- Pre-commit hooks: `.husky/pre-commit` + `package.json` lint-staged config
- OpenSpec delta-spec pattern: `openspec/templates/delta-spec-template.md`
