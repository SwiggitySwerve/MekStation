# Known Limitations Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: None
**Affects**: Invariant Checkers, Bug Detection

---

## Overview

### Purpose
Documents game engine limitations and unimplemented features to exclude from bug detection, preventing false positives in simulation testing.

### Scope
**In Scope:**
- Documentation of known limitations (known-limitations.md)
- Programmatic exclusion list
- isKnownLimitation() function
- Rationale for each limitation
- Future work references

**Out of Scope:**
- Fixing limitations (documentation only)
- Promising to implement features
- Workarounds or patches

---

## Requirements

### Requirement: Limitation Documentation

The system SHALL document all known game engine limitations.

**Priority**: High

#### Scenario: Document limitation
**GIVEN** unimplemented feature (physical attacks)
**WHEN** documenting in known-limitations.md
**THEN** entry SHALL include name, reason, future work reference
**AND** entry SHALL explain why it's excluded from bug detection

### Requirement: Programmatic Exclusion

The system SHALL provide function to check if violation is known limitation.

**Priority**: Critical

#### Scenario: Exclude known limitation
**GIVEN** violation for physical attack (not implemented)
**WHEN** calling isKnownLimitation(violation)
**THEN** function SHALL return true
**AND** violation SHALL NOT be reported as bug

---

## Data Model Requirements

```typescript
interface IKnownLimitation {
  readonly name: string;
  readonly reason: string;
  readonly futureWork?: string;
}

const KNOWN_LIMITATIONS: IKnownLimitation[] = [
  {
    name: 'physical-attacks',
    reason: 'Not implemented in game engine (marked "Future" in codebase)',
    futureWork: 'Phase 3 - Physical Combat'
  },
  {
    name: 'ammo-tracking',
    reason: 'Ammunition consumption not tracked in current implementation'
  },
  {
    name: 'heat-shutdown',
    reason: 'Heat shutdown mechanics not implemented in game engine'
  },
  {
    name: 'terrain-movement-cost',
    reason: 'Partial implementation - some terrain types not validated'
  }
];

function isKnownLimitation(violation: IViolation): boolean {
  return KNOWN_LIMITATIONS.some(limit =>
    violation.message.toLowerCase().includes(limit.name.toLowerCase())
  );
}
```

---

## Examples

### Example: Check Known Limitation

```typescript
const violation: IViolation = {
  invariant: 'weapon-usage',
  severity: 'warning',
  message: 'Physical attack attempted but not implemented',
  context: {}
};

if (isKnownLimitation(violation)) {
  // Don't report as bug
  console.log('Known limitation - skipping');
} else {
  // Report as actual bug
  reportBug(violation);
}
```

---

## References

- Game Engine: src/utils/gameplay/
- Invariant Checkers Specification

---

## Changelog

### Version 1.0 (2026-02-01)
- Initial specification
- Documented 4 core limitations
