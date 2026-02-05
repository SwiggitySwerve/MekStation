# [Subsystem Name] Specification

**Status**: Draft | Active | Deprecated
**Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Dependencies**: [List other specs this depends on]
**Affects**: [List specs that depend on this one]

---

## Overview

### Purpose

[1-3 sentences describing what this subsystem does and why it exists]

### Scope

**In Scope:**

- [What this spec covers]
- [Key responsibilities]

**Out of Scope:**

- [What this spec does NOT cover]
- [Related but separate concerns]

### Key Concepts

- **[Term 1]**: Definition
- **[Term 2]**: Definition
- **[Term 3]**: Definition

---

## Requirements

### Requirement: [Requirement Name]

[Complete description of the requirement using SHALL/MUST language]

The system SHALL [do something specific and testable].

**Rationale**: [Why this requirement exists]

**Priority**: Critical | High | Medium | Low

#### Scenario: [Success case name]

**GIVEN** [initial state/context]
**WHEN** [action or trigger]
**THEN** [expected outcome]
**AND** [additional expected outcome]

#### Scenario: [Edge case name]

**GIVEN** [edge case setup]
**WHEN** [action]
**THEN** [how system handles it]

#### Scenario: [Error case name]

**GIVEN** [error condition setup]
**WHEN** [action that should fail]
**THEN** [error handling behavior]

### Requirement: [Another Requirement Name]

[Description...]

#### Scenario: [Scenario name]

[...]

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * [Description of interface]
 */
interface I[InterfaceName] {
  /**
   * [Property description]
   * @example value
   */
  readonly propertyName: PropertyType;

  // ... more properties
}
```

### Required Properties

| Property       | Type   | Required | Description | Valid Values | Default       |
| -------------- | ------ | -------- | ----------- | ------------ | ------------- |
| `propertyName` | `Type` | Yes/No   | Description | Constraints  | Default value |

### Type Constraints

- `propertyName` MUST be [constraint]
- `propertyName` MUST NOT be [constraint]
- When `condition`, `propertyName` SHALL be [value]

---

## Calculation Formulas

### [Formula Name]

**Formula**:

```
result = expression
```

**Where**:

- `variable1` = [description]
- `variable2` = [description]

**Example**:

```
Input: variable1 = X, variable2 = Y
Calculation: result = X * Y
Output: result = Z
```

**Special Cases**:

- When [condition]: [formula variation]
- When [condition]: [formula variation]

**Rounding Rules**:

- [How to round the result]

---

## Validation Rules

### Validation: [Validation Name]

**Rule**: [Description of what must be validated]

**Severity**: Error | Warning | Info

**Condition**:

```typescript
// Pseudocode for validation logic
if (condition) {
  // valid
} else {
  // invalid - emit error/warning
}
```

**Error Message**: "[Exact error message shown to user]"

**User Action**: [What user should do to fix]

### Validation: [Another Validation]

[...]

---

## Technology Base Variants

### Inner Sphere Implementation

**Differences from base specification**:

- [Property]: [IS-specific value]
- [Property]: [IS-specific value]

**Special Rules**:

- [IS-specific rule]

**Example**:

```typescript
// IS-specific example
```

### Clan Implementation

**Differences from base specification**:

- [Property]: [Clan-specific value]
- [Property]: [Clan-specific value]

**Special Rules**:

- [Clan-specific rule]

**Example**:

```typescript
// Clan-specific example
```

### Mixed Tech Rules

**When unit tech base is Mixed**:

- [Mixed tech rule]
- [Compatibility rule]

---

## Dependencies

### Depends On

- **[Spec Name]**: [Why this dependency exists]
- **[Spec Name]**: [Why this dependency exists]

### Used By

- **[Spec Name]**: [How it uses this spec]
- **[Spec Name]**: [How it uses this spec]

### Construction Sequence

1. [Step 1 - what must happen first]
2. [Step 2 - what happens next]
3. [Step 3 - dependencies on this subsystem]

---

## Implementation Notes

### Performance Considerations

- [Performance concern and solution]

### Edge Cases

- **[Edge Case]**: [How to handle]
- **[Edge Case]**: [How to handle]

### Common Pitfalls

- **Pitfall**: [Description]
  - **Solution**: [How to avoid]

---

## Examples

### Example 1: [Common Case Name]

**Input**:

```typescript
const input = {
  property1: value1,
  property2: value2,
};
```

**Processing**:

```typescript
// Step-by-step calculation
const intermediate = formula1(input);
const result = formula2(intermediate);
```

**Output**:

```typescript
const output = {
  calculatedProperty: result,
};
```

### Example 2: [Edge Case Name]

[...]

---

## References

### Official BattleTech Rules

- **TechManual**: Page XXX - [Topic]
- **Total Warfare**: Page XXX - [Topic]

### Related Documentation

- [Internal doc reference]
- [Related spec reference]

---

## Changelog

### Version 1.0 (YYYY-MM-DD)

- Initial specification

### Version 1.1 (YYYY-MM-DD)

- [Change description]
