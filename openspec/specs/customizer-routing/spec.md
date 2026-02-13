# Customizer Routing Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: customizer-tabs
**Affects**: unit-customizer

---

## Overview

### Purpose

The Customizer Routing subsystem provides URL-based navigation for the unit customizer, enabling shareable URLs, direct navigation to specific units and tabs, and synchronization between URL state and application state. This enables users to bookmark specific customizer views, share links to units, and navigate via browser back/forward buttons.

### Scope

**In Scope:**

- URL structure and parsing for customizer routes
- Tab navigation with URL synchronization
- Unit ID validation and parsing
- Shallow routing behavior
- URL builders for shareable links
- Router hook for navigation actions

**Out of Scope:**

- Tab content rendering (see customizer-tabs spec)
- Unit data persistence (see unit-services spec)
- Authentication and authorization
- Server-side rendering of customizer pages
- Deep linking from external applications

### Key Concepts

- **Shallow Routing**: All customizer navigation uses Next.js shallow routing (`{ shallow: true }`), which updates the URL without triggering a full page reload or data fetching
- **Tab ID**: One of 8 valid customizer tab identifiers (overview, structure, armor, weapons, equipment, criticals, fluff, preview)
- **Unit ID**: A UUID v4 identifier for a unit in the customizer
- **Route Params**: Parsed URL parameters including unit ID, tab ID, validity flags, and index page detection

---

## Requirements

### Requirement: URL Structure

The system SHALL support three URL patterns for customizer navigation:

1. `/customizer` - Index page (no unit specified)
2. `/customizer/[unitId]` - Specific unit with default tab
3. `/customizer/[unitId]/[tabId]` - Specific unit and tab

**Rationale**: This structure enables progressive disclosure (index → unit → tab) and supports shareable URLs at any level of specificity.

**Priority**: Critical

**Source**: `src/hooks/useCustomizerRouter.ts:7-10`

#### Scenario: Navigate to customizer index

**GIVEN** user is on any page
**WHEN** user navigates to `/customizer`
**THEN** route params SHALL be `{ unitId: null, tabId: 'structure', isValid: true, isIndex: true }`

#### Scenario: Navigate to unit with default tab

**GIVEN** user is on customizer index
**WHEN** user navigates to `/customizer/550e8400-e29b-41d4-a716-446655440000`
**THEN** route params SHALL be `{ unitId: '550e8400-e29b-41d4-a716-446655440000', tabId: 'structure', isValid: true, isIndex: false }`

#### Scenario: Navigate to unit with specific tab

**GIVEN** user is on unit structure tab
**WHEN** user navigates to `/customizer/550e8400-e29b-41d4-a716-446655440000/armor`
**THEN** route params SHALL be `{ unitId: '550e8400-e29b-41d4-a716-446655440000', tabId: 'armor', isValid: true, isIndex: false }`

#### Scenario: Invalid unit ID in URL

**GIVEN** user navigates to `/customizer/invalid-uuid`
**WHEN** URL is parsed
**THEN** route params SHALL be `{ unitId: null, tabId: 'structure', isValid: false, isIndex: false }`

#### Scenario: Invalid tab ID defaults to structure

**GIVEN** user navigates to `/customizer/550e8400-e29b-41d4-a716-446655440000/invalid-tab`
**WHEN** URL is parsed
**THEN** route params SHALL be `{ unitId: '550e8400-e29b-41d4-a716-446655440000', tabId: 'structure', isValid: true, isIndex: false }`

### Requirement: Tab ID Validation

The system SHALL validate tab IDs against a fixed set of 8 valid identifiers and default to 'structure' for invalid values.

**Rationale**: Prevents broken URLs from causing errors and ensures consistent fallback behavior.

**Priority**: High

**Source**: `src/hooks/useCustomizerRouter.ts:28-50`

#### Scenario: Valid tab ID accepted

**GIVEN** tab ID is one of: overview, structure, armor, weapons, equipment, criticals, fluff, preview
**WHEN** `isValidTabId(tabId)` is called
**THEN** function SHALL return `true`

#### Scenario: Invalid tab ID rejected

**GIVEN** tab ID is 'invalid-tab'
**WHEN** `isValidTabId(tabId)` is called
**THEN** function SHALL return `false`

#### Scenario: Parse valid tab ID

**GIVEN** raw tab ID is 'armor'
**WHEN** `parseTabId(rawTabId)` is called
**THEN** function SHALL return `'armor'`

#### Scenario: Parse invalid tab ID defaults to structure

**GIVEN** raw tab ID is 'invalid-tab'
**WHEN** `parseTabId(rawTabId)` is called
**THEN** function SHALL return `'structure'`

#### Scenario: Parse undefined tab ID defaults to structure

**GIVEN** raw tab ID is `undefined`
**WHEN** `parseTabId(rawTabId)` is called
**THEN** function SHALL return `'structure'`

### Requirement: Unit ID Validation

The system SHALL validate unit IDs using UUID v4 format validation and return `null` for invalid values.

**Rationale**: Ensures only valid UUIDs are accepted as unit IDs, preventing database lookup errors.

**Priority**: Critical

**Source**: `src/hooks/useCustomizerRouter.ts:132-143`

#### Scenario: Valid UUID accepted

**GIVEN** unit ID is '550e8400-e29b-41d4-a716-446655440000'
**WHEN** `parseUnitId(unitId)` is called
**THEN** function SHALL return `'550e8400-e29b-41d4-a716-446655440000'`

#### Scenario: Invalid UUID rejected

**GIVEN** unit ID is 'not-a-uuid'
**WHEN** `parseUnitId(unitId)` is called
**THEN** function SHALL return `null`

#### Scenario: Undefined unit ID returns null

**GIVEN** unit ID is `undefined`
**WHEN** `parseUnitId(unitId)` is called
**THEN** function SHALL return `null`

#### Scenario: Array unit ID extracts first element

**GIVEN** unit ID is `['550e8400-e29b-41d4-a716-446655440000', 'extra']`
**WHEN** `parseUnitId(unitId)` is called
**THEN** function SHALL return `'550e8400-e29b-41d4-a716-446655440000'`

### Requirement: Navigation Actions

The system SHALL provide four navigation actions: `navigateToUnit`, `navigateToTab`, `navigateToIndex`, and `syncUrl`.

**Rationale**: Provides a consistent API for all customizer navigation needs, with validation and shallow routing built-in.

**Priority**: Critical

**Source**: `src/hooks/useCustomizerRouter.ts:218-282`

#### Scenario: Navigate to unit with default tab

**GIVEN** user is on customizer index
**WHEN** `navigateToUnit('550e8400-e29b-41d4-a716-446655440000')` is called
**THEN** router SHALL push `/customizer/550e8400-e29b-41d4-a716-446655440000/structure` with `{ shallow: true }`

#### Scenario: Navigate to unit with specific tab

**GIVEN** user is on customizer index
**WHEN** `navigateToUnit('550e8400-e29b-41d4-a716-446655440000', 'armor')` is called
**THEN** router SHALL push `/customizer/550e8400-e29b-41d4-a716-446655440000/armor` with `{ shallow: true }`

#### Scenario: Navigate to tab on current unit

**GIVEN** user is on `/customizer/550e8400-e29b-41d4-a716-446655440000/structure`
**WHEN** `navigateToTab('armor')` is called
**THEN** router SHALL push `/customizer/550e8400-e29b-41d4-a716-446655440000/armor` with `{ shallow: true }`

#### Scenario: Navigate to tab with fallback unit ID

**GIVEN** user is on `/customizer` (no unit in URL)
**AND** fallbackUnitId is '550e8400-e29b-41d4-a716-446655440000'
**WHEN** `navigateToTab('armor')` is called
**THEN** router SHALL push `/customizer/550e8400-e29b-41d4-a716-446655440000/armor` with `{ shallow: true }`

#### Scenario: Navigate to tab without unit or fallback

**GIVEN** user is on `/customizer` (no unit in URL)
**AND** fallbackUnitId is `null`
**WHEN** `navigateToTab('armor')` is called
**THEN** function SHALL log warning and NOT navigate

#### Scenario: Navigate to index

**GIVEN** user is on any customizer page
**WHEN** `navigateToIndex()` is called
**THEN** router SHALL push `/customizer` with `{ shallow: true }`

#### Scenario: Sync URL when different

**GIVEN** current URL is `/customizer/550e8400-e29b-41d4-a716-446655440000/structure`
**WHEN** `syncUrl('550e8400-e29b-41d4-a716-446655440000', 'armor')` is called
**THEN** router SHALL replace `/customizer/550e8400-e29b-41d4-a716-446655440000/armor` with `{ shallow: true }`

#### Scenario: Sync URL when already matching

**GIVEN** current URL is `/customizer/550e8400-e29b-41d4-a716-446655440000/armor`
**WHEN** `syncUrl('550e8400-e29b-41d4-a716-446655440000', 'armor')` is called
**THEN** router SHALL NOT navigate (deduplication)

### Requirement: Shallow Routing Behavior

The system SHALL use Next.js shallow routing (`{ shallow: true }`) for all customizer navigation to prevent full page reloads and data refetching.

**Rationale**: Shallow routing provides instant navigation and preserves component state, improving UX and performance.

**Priority**: High

**Source**: `src/hooks/useCustomizerRouter.ts:226-228, 253-255, 262, 277-279`

#### Scenario: All navigation uses shallow routing

**GIVEN** any navigation action is called
**WHEN** router.push or router.replace is invoked
**THEN** options SHALL include `{ shallow: true }`

### Requirement: URL Builders

The system SHALL provide two URL builder functions: `buildCustomizerUrl` for relative URLs and `buildShareableUrl` for absolute URLs.

**Rationale**: Centralizes URL construction logic and ensures consistent URL format across the application.

**Priority**: Medium

**Source**: `src/hooks/useCustomizerRouter.ts:296-317`

#### Scenario: Build URL with unit and tab

**GIVEN** unitId is '550e8400-e29b-41d4-a716-446655440000' and tabId is 'armor'
**WHEN** `buildCustomizerUrl(unitId, tabId)` is called
**THEN** function SHALL return `/customizer/550e8400-e29b-41d4-a716-446655440000/armor`

#### Scenario: Build URL with unit only

**GIVEN** unitId is '550e8400-e29b-41d4-a716-446655440000' and tabId is `undefined`
**WHEN** `buildCustomizerUrl(unitId, tabId)` is called
**THEN** function SHALL return `/customizer/550e8400-e29b-41d4-a716-446655440000`

#### Scenario: Build shareable URL in browser

**GIVEN** window.location.origin is 'https://mekstation.app'
**AND** unitId is '550e8400-e29b-41d4-a716-446655440000' and tabId is 'armor'
**WHEN** `buildShareableUrl(unitId, tabId)` is called
**THEN** function SHALL return `https://mekstation.app/customizer/550e8400-e29b-41d4-a716-446655440000/armor`

#### Scenario: Build shareable URL on server

**GIVEN** window is `undefined` (server-side)
**AND** unitId is '550e8400-e29b-41d4-a716-446655440000' and tabId is 'armor'
**WHEN** `buildShareableUrl(unitId, tabId)` is called
**THEN** function SHALL return `/customizer/550e8400-e29b-41d4-a716-446655440000/armor` (relative URL)

---

## Data Model Requirements

### Required Types

The implementation MUST provide the following TypeScript types and interfaces:

```typescript
/**
 * Valid customizer tab identifiers
 */
type CustomizerTabId =
  | 'overview'
  | 'structure'
  | 'armor'
  | 'weapons'
  | 'equipment'
  | 'criticals'
  | 'fluff'
  | 'preview';

/**
 * All valid tab IDs for validation
 */
const VALID_TAB_IDS: readonly CustomizerTabId[] = [
  'overview',
  'structure',
  'armor',
  'weapons',
  'equipment',
  'criticals',
  'fluff',
  'preview',
] as const;

/**
 * Default tab when none specified
 */
const DEFAULT_TAB: CustomizerTabId = 'structure';

/**
 * Parsed route parameters
 */
interface CustomizerRouteParams {
  /** Unit UUID from URL (null if on index page or invalid) */
  readonly unitId: string | null;
  /** Tab ID from URL (defaults to 'structure' if invalid) */
  readonly tabId: CustomizerTabId;
  /** Whether the route is valid (false if unit ID is invalid) */
  readonly isValid: boolean;
  /** Whether we're on the index page (no unit specified) */
  readonly isIndex: boolean;
}

/**
 * Router actions for navigation
 */
interface CustomizerRouterActions {
  /** Navigate to a specific unit (with optional tab, defaults to 'structure') */
  navigateToUnit: (unitId: string, tabId?: CustomizerTabId) => void;
  /** Navigate to a specific tab (keeps current unit or uses fallback) */
  navigateToTab: (tabId: CustomizerTabId) => void;
  /** Navigate to the customizer index */
  navigateToIndex: () => void;
  /** Update URL without navigation (for syncing state, deduplicates) */
  syncUrl: (unitId: string, tabId: CustomizerTabId) => void;
}

/**
 * Combined hook return type
 */
interface CustomizerRouterResult
  extends CustomizerRouteParams, CustomizerRouterActions {}

/**
 * Options for the customizer router hook
 */
interface UseCustomizerRouterOptions {
  /**
   * Fallback unit ID to use when URL has no unit ID.
   * Typically the active tab ID from the tab manager store.
   * Enables tab navigation when on /customizer index page.
   */
  readonly fallbackUnitId?: string | null;
}
```

### Required Properties

| Property         | Type              | Required | Description                                      | Valid Values                                                                    | Default     |
| ---------------- | ----------------- | -------- | ------------------------------------------------ | ------------------------------------------------------------------------------- | ----------- |
| `unitId`         | `string \| null`  | Yes      | Unit UUID from URL                               | Valid UUID v4 or null                                                           | null        |
| `tabId`          | `CustomizerTabId` | Yes      | Tab ID from URL                                  | overview, structure, armor, weapons, equipment, criticals, fluff, preview       | 'structure' |
| `isValid`        | `boolean`         | Yes      | Whether the route is valid                       | true if unit ID is valid UUID or null (index page), false if unit ID is invalid | N/A         |
| `isIndex`        | `boolean`         | Yes      | Whether we're on the index page                  | true if no unit specified in URL, false otherwise                               | N/A         |
| `fallbackUnitId` | `string \| null`  | No       | Fallback unit ID for tab navigation without unit | Valid UUID v4 or null                                                           | null        |

### Type Constraints

- `CustomizerTabId` MUST be one of 8 valid tab identifiers
- `unitId` MUST be a valid UUID v4 format when non-null
- `tabId` MUST default to 'structure' when invalid or undefined
- `isValid` MUST be `false` when unit ID is present but invalid
- `isIndex` MUST be `true` when URL is `/customizer` with no unit ID
- `navigateToUnit` MUST validate unit ID before navigation
- `navigateToTab` MUST use fallbackUnitId when URL has no unit ID
- `syncUrl` MUST deduplicate (skip navigation if URL already matches)
- All navigation actions MUST use `{ shallow: true }` routing

---

## Dependencies

### Depends On

- **customizer-tabs**: Defines the 8 valid tab IDs and their rendering logic
- **uuid**: Provides UUID v4 validation via `isValidUnitId` function
- **Next.js Router**: Provides `useRouter` hook for navigation and URL parsing

### Used By

- **unit-customizer**: Uses `useCustomizerRouter` hook for all navigation
- **customizer-tabs**: Uses tab IDs and navigation actions for tab switching
- **unit-services**: Uses unit ID from route params for data loading

---

## Implementation Notes

### Performance Considerations

- **Shallow routing**: All navigation uses `{ shallow: true }` to avoid full page reloads
- **Memoization**: Route params are memoized with `useMemo` to prevent unnecessary re-renders
- **Deduplication**: `syncUrl` skips navigation if URL already matches target
- **Ref-based navigation tracking**: `isNavigatingRef` prevents race conditions during navigation

### Edge Cases

- **Invalid unit ID**: Returns `{ unitId: null, isValid: false, isIndex: false }` to signal error state
- **Invalid tab ID**: Defaults to 'structure' to prevent broken URLs
- **Array route params**: Extracts first element from array (Next.js catch-all route behavior)
- **Fallback unit ID**: Enables tab navigation on index page when active tab is known
- **Server-side rendering**: `buildShareableUrl` returns relative URL when `window` is undefined

### Common Pitfalls

- **Pitfall**: Calling `navigateToTab` on index page without fallbackUnitId
  - **Solution**: Always provide fallbackUnitId option when using `navigateToTab` on index page
- **Pitfall**: Using `router.push` directly instead of hook actions
  - **Solution**: Always use `navigateToUnit`, `navigateToTab`, or `navigateToIndex` for validation and shallow routing
- **Pitfall**: Forgetting to validate unit ID before navigation
  - **Solution**: Hook validates all unit IDs automatically, but external callers should use `isValidUnitId` first

---

## Non-Goals

This specification does NOT cover:

- **Tab content rendering**: See customizer-tabs spec for tab component implementation
- **Unit data loading**: See unit-services spec for data fetching and persistence
- **Tab state management**: See customizer-tabs spec for tab manager store
- **Authentication**: URL routing is public, authentication is handled separately
- **Server-side rendering**: Customizer pages are client-side only
- **Deep linking from external apps**: Only supports web browser navigation
- **URL query parameters**: Only path-based routing is supported (no ?tab=armor)

---

## Examples

### Example 1: Basic Navigation

**Input**:

```typescript
const { navigateToUnit, navigateToTab } = useCustomizerRouter();

// Navigate to a unit
navigateToUnit('550e8400-e29b-41d4-a716-446655440000');
```

**Processing**:

```typescript
// Hook validates unit ID
isValidUnitId('550e8400-e29b-41d4-a716-446655440000'); // true

// Navigates to /customizer/550e8400-e29b-41d4-a716-446655440000/structure
router.push(
  '/customizer/550e8400-e29b-41d4-a716-446655440000/structure',
  undefined,
  {
    shallow: true,
  },
);
```

**Output**:

```typescript
// URL: /customizer/550e8400-e29b-41d4-a716-446655440000/structure
// Route params: { unitId: '550e8400-e29b-41d4-a716-446655440000', tabId: 'structure', isValid: true, isIndex: false }
```

### Example 2: Tab Navigation with Fallback

**Input**:

```typescript
// On /customizer index page
const activeTabId = '550e8400-e29b-41d4-a716-446655440000';
const { navigateToTab } = useCustomizerRouter({ fallbackUnitId: activeTabId });

// Navigate to armor tab
navigateToTab('armor');
```

**Processing**:

```typescript
// Hook uses fallback unit ID since URL has no unit
const effectiveUnitId = params.unitId || fallbackUnitId; // '550e8400-e29b-41d4-a716-446655440000'

// Navigates to /customizer/550e8400-e29b-41d4-a716-446655440000/armor
router.push(
  '/customizer/550e8400-e29b-41d4-a716-446655440000/armor',
  undefined,
  {
    shallow: true,
  },
);
```

**Output**:

```typescript
// URL: /customizer/550e8400-e29b-41d4-a716-446655440000/armor
// Route params: { unitId: '550e8400-e29b-41d4-a716-446655440000', tabId: 'armor', isValid: true, isIndex: false }
```

### Example 3: URL Synchronization

**Input**:

```typescript
const { syncUrl } = useCustomizerRouter();

// Sync URL to match application state
syncUrl('550e8400-e29b-41d4-a716-446655440000', 'weapons');
```

**Processing**:

```typescript
// Check if URL already matches
if (params.unitId === unitId && params.tabId === tabId) {
  return; // Skip navigation (deduplication)
}

// Replace URL without adding to history
router.replace(
  '/customizer/550e8400-e29b-41d4-a716-446655440000/weapons',
  undefined,
  {
    shallow: true,
  },
);
```

**Output**:

```typescript
// URL: /customizer/550e8400-e29b-41d4-a716-446655440000/weapons
// No history entry added (replace instead of push)
```

---

## References

### Related Documentation

- **customizer-tabs spec**: Defines the 8 valid tab IDs and tab rendering
- **unit-services spec**: Defines unit data loading and persistence
- **uuid utilities**: Provides `isValidUnitId` for UUID v4 validation
- **Next.js Routing**: [Shallow Routing documentation](https://nextjs.org/docs/routing/shallow-routing)

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Documented URL structure and parsing
- Documented tab ID and unit ID validation
- Documented navigation actions and shallow routing
- Documented URL builders for shareable links
- Documented hook options and return type
