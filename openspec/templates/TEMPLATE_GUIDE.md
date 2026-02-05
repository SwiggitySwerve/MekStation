# OpenSpec Template Guide

This directory contains templates for creating MekStation OpenSpec specifications.

## Template Files

1. **spec-template.md** - Template for requirement specifications
2. **design-template.md** - Template for technical design documents
3. **example-tech-base-spec.md** - Example of a completed spec

## When to Use Each Template

### spec.md Template

Use this for defining **WHAT** the system must do:

- Requirements and constraints
- Business rules and formulas
- Data models and interfaces
- Validation rules
- Tech base variants

### design.md Template

Use this for defining **HOW** to implement it:

- Technical decisions and rationale
- Architecture and data flow
- Implementation strategy
- API design
- Migration plans
- Performance considerations

## Creating a New Spec

### Step 1: Create Directory Structure

```bash
mkdir -p openspec/specs/[subsystem-name]
```

### Step 2: Copy Templates

```bash
cp openspec/templates/spec-template.md openspec/specs/[subsystem-name]/spec.md
cp openspec/templates/design-template.md openspec/specs/[subsystem-name]/design.md
```

### Step 3: Fill Out spec.md

1. Replace all `[placeholder]` text
2. Define requirements using SHALL/MUST language
3. Add scenarios for each requirement (GIVEN/WHEN/THEN)
4. Define data model interfaces
5. Include formulas if applicable
6. Add validation rules
7. Document tech base variants

### Step 4: Fill Out design.md

1. Document design decisions
2. Show architecture diagrams
3. Define implementation phases
4. Design APIs and interfaces
5. Plan migration strategy
6. Add testing strategy

## Spec Writing Guidelines

### Requirement Language

- Use **SHALL** or **MUST** for mandatory requirements
- Use **SHOULD** for recommended but not required
- Use **MAY** for optional features
- Be specific and testable

### Scenario Format

Always use:

```markdown
#### Scenario: [Descriptive name]

**GIVEN** [initial state]
**WHEN** [action]
**THEN** [expected outcome]
**AND** [additional outcome]
```

### Data Model Format

Always use TypeScript interfaces:

```typescript
/**
 * [Description]
 */
interface IInterfaceName {
  /** [Property description] */
  readonly propertyName: PropertyType;
}
```

### Formula Format

```markdown
**Formula**:
```

result = expression

```

**Where**:
- `variable1` = description
- `variable2` = description
```

## Validation with OpenSpec CLI

After creating your spec:

```bash
# Validate a single spec
openspec validate [subsystem-name] --strict

# View your spec
openspec show [subsystem-name] --type spec

# List all specs
openspec list --specs
```

## Common Sections

### Every spec.md Should Have

1. Overview (Purpose, Scope, Key Concepts)
2. Requirements (with Scenarios)
3. Data Model Requirements
4. Validation Rules
5. Dependencies
6. Examples
7. References

### Every design.md Should Have

1. Context (Background, Constraints)
2. Goals & Non-Goals
3. Design Decisions (with rationale)
4. Architecture
5. Implementation Strategy
6. API Design
7. Testing Strategy

## Tips

### For BattleTech Rule Specs

- Always reference official source books (TechManual, Total Warfare)
- Include exact formulas from rules
- Show both IS and Clan variants
- Document rounding rules explicitly
- Provide worked examples

### For Type System Specs

- Show complete TypeScript interfaces
- Document required vs optional properties
- Include type guards
- Show validation logic
- Provide type hierarchy diagrams

### For Integration Specs

- Show data flow diagrams
- Document state transitions
- Include sequence diagrams
- Show error handling paths

## See Also

- `example-tech-base-spec.md` - Complete example spec
- `openspec/AGENTS.md` - OpenSpec workflow guide
- `openspec/project.md` - Project conventions
