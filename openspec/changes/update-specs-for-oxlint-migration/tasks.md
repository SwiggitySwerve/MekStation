# Implementation Tasks

## 1. New Capability: Code Formatting Standards Spec

- [x] 1.1 Create directory `openspec/specs/code-formatting-standards/`
- [x] 1.2 Create `openspec/specs/code-formatting-standards/spec.md` with content from `openspec/changes/update-specs-for-oxlint-migration/specs/code-formatting-standards/spec.md`
- [x] 1.3 Verify spec follows OpenSpec template structure (metadata, overview, requirements, scenarios)
- [x] 1.4 Verify all oxlint/oxfmt references are accurate and up-to-date

## 2. Modified Capabilities: Apply Delta Specs

- [x] 2.1 Apply delta spec to `openspec/specs/validation-patterns/spec.md`: Update "No Double Type Assertions" requirement to reference oxlint instead of ESLint
- [x] 2.2 Verify validation-patterns spec maintains all existing requirements and only updates linting tool references
- [x] 2.3 Apply delta spec to `openspec/specs/storybook-component-library/spec.md`: Update CI scenario to reference oxlint/oxfmt instead of ESLint/Prettier
- [x] 2.4 Verify storybook-component-library spec maintains all existing scenarios and only updates tooling references

## 3. Documentation Updates

- [x] 3.1 Update `openspec/specs/README.md` to include code-formatting-standards in the spec list
- [x] 3.2 Verify all cross-references between specs are accurate
- [x] 3.3 Verify spec metadata (version, status, dependencies) is correct for all modified specs

## 4. Verification and Quality Checks

- [x] 4.1 Verify no ESLint references remain in specs (except in historical context or migration notes)
- [x] 4.2 Verify no Prettier references remain in specs (except in historical context or migration notes)
- [x] 4.3 Verify all new oxlint/oxfmt references are accurate and consistent
- [x] 4.4 Run markdown linting on all modified spec files
- [x] 4.5 Final review: Read through all changed specs to ensure clarity, accuracy, and completeness
