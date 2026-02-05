# Validation Patterns (Delta Spec)

**Version**: 1.1.0  
**Status**: Delta  
**Last Updated**: 2026-02-04  
**Change**: Update for oxlint migration

---

## Overview

This delta spec modifies the existing `validation-patterns` specification to reflect the migration from ESLint to oxlint. The primary change is the loss of automated enforcement for the "No Double Type Assertions" requirement due to oxlint not supporting the `no-restricted-syntax` ESLint rule.

---

## MODIFIED Requirements

### Requirement: No Double Type Assertions

The codebase SHALL NOT use double type assertions (`as unknown as T` or `as any as T`).

**Rationale**: Double type assertions completely bypass TypeScript's type system, hiding type incompatibilities that should be resolved through proper type design, type guards, or conversion functions.

**Priority**: High

**Change Summary**: Enforcement mechanism shifted from automated ESLint rule to manual code review and developer education. The `no-restricted-syntax` ESLint rule is not supported by oxlint, so this validation pattern now relies on code review processes rather than automated linting.

#### Scenario: Code review enforcement

- **GIVEN** any TypeScript file in the codebase
- **WHEN** it contains `expression as unknown as Type` or `expression as any as Type`
- **THEN** code reviewers SHALL flag the violation during PR review
- **AND** reviewers SHALL suggest using type guards or conversion functions instead
- **AND** the PR SHALL NOT be approved until the violation is resolved

**Note**: This scenario replaces the previous "ESLint enforcement" scenario. Automated enforcement via ESLint's `no-restricted-syntax` rule has been lost in the migration to oxlint. Developers and reviewers must be vigilant in identifying and preventing double type assertions through manual code review.

#### Scenario: Approved alternative - Type guards

- **GIVEN** a need to narrow an unknown type
- **WHEN** the type needs runtime verification
- **THEN** developer SHALL use a type guard function (e.g., `isValidType(value)`)
- **AND** the type guard SHALL perform actual runtime checks

#### Scenario: Approved alternative - Conversion functions

- **GIVEN** a need to transform one type to another
- **WHEN** the types are structurally different
- **THEN** developer SHALL create a conversion function that maps properties explicitly
- **AND** the function SHALL have proper input/output types

#### Scenario: Approved alternative - Partial types for mocks

- **GIVEN** a test file needing to mock an interface
- **WHEN** only some properties are needed for the test
- **THEN** developer SHALL use `Partial<Interface>` with single assertion
- **AND** combine with the concrete type: `as Partial<IService> as ServiceClass`

#### Scenario: Approved alternative - jest.MockedFunction

- **GIVEN** a test file mocking a function
- **WHEN** the function needs type-safe mock setup
- **THEN** developer SHALL use `jest.MockedFunction<typeof originalFn>`
- **AND** avoid casting the mock result

---

## Rationale for Changes

### Loss of Automated Enforcement

The migration from ESLint to oxlint provides significant performance benefits (50-100x faster linting), but oxlint does not support ESLint's `no-restricted-syntax` rule, which was previously used to automatically detect and flag double type assertions.

**Alternatives Considered:**

1. **Custom oxlint plugin**: Not feasible due to immature plugin ecosystem and development overhead
2. **Separate ESLint run for this rule**: Would negate performance benefits of oxlint migration
3. **Remove the requirement**: Would weaken type safety standards unacceptably

**Decision**: Shift enforcement to code review and developer education. This validation pattern remains critical for type safety, and the approved alternatives (type guards, conversion functions, etc.) provide safe ways to handle type transformations.

### Mitigation Strategy

To compensate for the loss of automated enforcement:

1. **Prominent documentation**: This requirement is clearly documented with rationale and approved alternatives
2. **Code review training**: Reviewers are trained to watch for double type assertions
3. **Developer education**: Onboarding materials emphasize this pattern and its risks
4. **Approved alternatives**: Clear guidance on type guards, conversion functions, and other safe patterns
5. **Future consideration**: If oxlint's plugin ecosystem matures, consider implementing a custom rule

---

## Dependencies

### Depends On

- **TypeScript compiler**: Provides base type checking
- **Code review process**: Manual enforcement mechanism
- **Developer education**: Understanding of type safety principles

### Used By

- **Code review guidelines**: Reviewers check for this pattern
- **Developer onboarding**: New developers learn this pattern
- **Type safety standards**: Part of overall type safety strategy

---

## Implementation Notes

### For Developers

- **Avoid double type assertions**: Never use `as unknown as T` or `as any as T`
- **Use type guards**: Create functions that perform runtime checks and narrow types
- **Use conversion functions**: Explicitly map properties when transforming types
- **Use Partial for mocks**: Combine `Partial<T>` with single assertion for test mocks
- **Ask for help**: If unsure how to avoid a double assertion, ask in code review

### For Code Reviewers

- **Watch for double assertions**: Actively look for `as unknown as` and `as any as` patterns
- **Suggest alternatives**: Point developers to type guards, conversion functions, or Partial types
- **Block PRs with violations**: Do not approve PRs containing double type assertions
- **Educate developers**: Explain why double assertions are problematic and how to avoid them

### Common Pitfalls

- **Assuming automated enforcement**: Developers may not realize this pattern is no longer caught by linting
- **Rushing to bypass types**: Double assertions are often used as a quick fix; encourage proper solutions
- **Ignoring in tests**: Test code should also avoid double assertions; use approved alternatives

---

## Examples

### Example 1: Avoid Double Assertion - Use Type Guard Instead

**Bad (double assertion):**

```typescript
function processData(data: unknown) {
  const user = data as unknown as User;
  return user.name;
}
```

**Good (type guard):**

```typescript
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    typeof (data as any).name === 'string'
  );
}

function processData(data: unknown) {
  if (!isUser(data)) {
    throw new Error('Invalid user data');
  }
  return data.name; // TypeScript knows data is User
}
```

### Example 2: Avoid Double Assertion - Use Conversion Function

**Bad (double assertion):**

```typescript
function adaptApiResponse(response: ApiResponse) {
  return response as unknown as DomainModel;
}
```

**Good (conversion function):**

```typescript
function adaptApiResponse(response: ApiResponse): DomainModel {
  return {
    id: response.userId,
    name: response.userName,
    email: response.userEmail,
    createdAt: new Date(response.created_timestamp),
  };
}
```

### Example 3: Approved Alternative - Partial for Mocks

**Acceptable (single assertion with Partial):**

```typescript
const mockService = {
  fetchUser: jest.fn(),
  updateUser: jest.fn(),
} as Partial<UserService> as UserService;
```

**Rationale**: This is a single assertion (not double) that uses `Partial<T>` to indicate that only some properties are implemented. This is acceptable in test code where full implementation is not needed.

---

## References

### Related Specifications

- `code-formatting-standards`: oxfmt formatter configuration
- `storybook-component-library`: CI validation with oxlint

### Configuration Files

- `.oxlintrc.json`: oxlint configuration (does not include `no-restricted-syntax`)
- `.oxlintrc.README.md`: Documentation of oxlint rules

### Migration Context

- Migration commit: `018bd66f` - "build(tooling): migrate from ESLint to oxlint + add oxfmt formatter"
- Design document: `openspec/changes/update-specs-for-oxlint-migration/design.md`

---

## Changelog

### Version 1.1.0 (2026-02-04)

- **MODIFIED**: "No Double Type Assertions" requirement
  - Changed enforcement from ESLint automation to code review
  - Documented loss of `no-restricted-syntax` rule support in oxlint
  - Added mitigation strategy and reviewer guidance
  - Preserved all approved alternatives (type guards, conversion functions, Partial types, jest.MockedFunction)

### Version 1.0.0 (Original)

- Initial specification with ESLint enforcement
