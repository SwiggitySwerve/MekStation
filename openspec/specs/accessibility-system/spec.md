# accessibility-system Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: None (cross-cutting infrastructure)
**Affects**: All UI components, keyboard navigation, screen reader support

---

## Overview

### Purpose

The accessibility system provides WCAG 2.1 AA compliant infrastructure for keyboard navigation, screen reader support, focus management, and user accessibility preferences across the MekStation application.

### Scope

**In Scope:**

- Accessibility preferences store (high contrast, reduce motion)
- Screen reader announcements via live regions
- Focus trapping for modals and dialogs
- Arrow key navigation (1D lists, 2D grids)
- Tab navigation with wrap-around
- Keyboard click handlers (Enter/Space activation)
- Focus ring styling utilities
- Keyboard navigation hooks for React components

**Out of Scope:**

- ARIA landmark navigation and skip links (handled by individual components)
- Color contrast validation (handled by design system)
- Form validation accessibility (handled by form components)
- Screen reader testing automation (handled by testing infrastructure)

### Key Concepts

- **Live Region**: ARIA element that announces dynamic content changes to screen readers
- **Focus Trap**: Keyboard navigation constraint that cycles focus within a container (e.g., modal)
- **Politeness Level**: Screen reader announcement priority (`polite` waits for idle, `assertive` interrupts)
- **Focusable Element**: Interactive element that can receive keyboard focus (buttons, links, inputs, `tabindex >= 0`)
- **Wrap-Around Navigation**: Arrow key navigation that cycles from last item to first (and vice versa)

---

## Requirements

### Requirement: Accessibility Preferences Store

The system SHALL provide a Zustand store for managing user accessibility preferences with localStorage persistence.

**Rationale**: Users with motion sensitivity or visual impairments need persistent settings that survive page reloads.

**Priority**: Critical

#### Scenario: High contrast mode toggle

**GIVEN** user has default accessibility settings
**WHEN** `setHighContrast(true)` is called
**THEN** `highContrast` state is set to `true`
**AND** setting is persisted to localStorage under key `mekstation-accessibility`

#### Scenario: Reduce motion preference

**GIVEN** user has default accessibility settings
**WHEN** `setReduceMotion(true)` is called
**THEN** `reduceMotion` state is set to `true`
**AND** setting is persisted to localStorage

#### Scenario: Reset to defaults

**GIVEN** user has customized accessibility settings
**WHEN** `resetToDefaults()` is called
**THEN** `highContrast` is set to `false`
**AND** `reduceMotion` is set to `false`
**AND** localStorage is updated with default values

### Requirement: Screen Reader Announcements

The system SHALL provide a function to announce messages to screen readers via temporary live regions.

**Rationale**: Dynamic content changes (e.g., "Item added to cart") must be communicated to screen reader users.

**Priority**: Critical

#### Scenario: Polite announcement

**GIVEN** screen reader is active
**WHEN** `announce("Item saved", "polite")` is called
**THEN** a `<div>` element is created with `role="status"` and `aria-live="polite"`
**AND** element has `aria-atomic="true"` attribute
**AND** element has screen-reader-only CSS (1px size, absolute position, clipped)
**AND** element is appended to `document.body`
**AND** element contains text "Item saved"
**AND** element is removed after 1000ms

#### Scenario: Assertive announcement

**GIVEN** screen reader is active
**WHEN** `announce("Error occurred", "assertive")` is called
**THEN** live region is created with `aria-live="assertive"`
**AND** announcement interrupts current screen reader output

#### Scenario: Auto-cleanup of announcement

**GIVEN** announcement element exists in DOM
**WHEN** 1000ms elapses
**THEN** element is removed from `document.body` if still present

### Requirement: Focus Trapping

The system SHALL provide a function to trap keyboard focus within a container element.

**Rationale**: Modals and dialogs must prevent Tab navigation from escaping to background content.

**Priority**: Critical

#### Scenario: Tab forward at last element

**GIVEN** modal with 3 focusable buttons (A, B, C)
**AND** focus is on button C (last element)
**WHEN** user presses Tab key
**THEN** event is prevented
**AND** focus moves to button A (first element)

#### Scenario: Tab backward at first element

**GIVEN** modal with 3 focusable buttons (A, B, C)
**AND** focus is on button A (first element)
**WHEN** user presses Shift+Tab
**THEN** event is prevented
**AND** focus moves to button C (last element)

#### Scenario: Focusable element detection

**GIVEN** container with mixed elements (buttons, disabled inputs, hidden links)
**WHEN** focus trap queries focusable elements
**THEN** only elements matching `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])` are included
**AND** disabled elements are excluded
**AND** elements with `offsetParent === null` (hidden) are excluded

#### Scenario: Cleanup function

**GIVEN** focus trap is active on a modal
**WHEN** cleanup function returned by `trapFocus()` is called
**THEN** keydown event listener is removed from container
**AND** focus trap no longer intercepts Tab navigation

### Requirement: Arrow Key Navigation (1D Lists)

The system SHALL provide a utility function for arrow key navigation in horizontal and vertical lists.

**Rationale**: Keyboard users need efficient navigation through tab bars, menus, and lists.

**Priority**: High

#### Scenario: Horizontal list - ArrowRight navigation

**GIVEN** horizontal list with 5 items
**AND** current index is 2
**WHEN** `handleArrowNavigation(event, 2, 5, 'horizontal')` is called with `event.key === 'ArrowRight'`
**THEN** event is prevented
**AND** function returns `3` (next index)

#### Scenario: Horizontal list - wrap-around at end

**GIVEN** horizontal list with 5 items
**AND** current index is 4 (last item)
**WHEN** ArrowRight is pressed
**THEN** function returns `0` (wraps to first item)

#### Scenario: Vertical list - ArrowDown navigation

**GIVEN** vertical list with 5 items
**AND** current index is 1
**WHEN** `handleArrowNavigation(event, 1, 5, 'vertical')` is called with `event.key === 'ArrowDown'`
**THEN** event is prevented
**AND** function returns `2`

#### Scenario: Home key navigation

**GIVEN** list with current index 3
**WHEN** Home key is pressed
**THEN** event is prevented
**AND** function returns `0` (first item)

#### Scenario: End key navigation

**GIVEN** list with 5 items and current index 1
**WHEN** End key is pressed
**THEN** event is prevented
**AND** function returns `4` (last item)

#### Scenario: Non-navigation key

**GIVEN** list navigation is active
**WHEN** user presses a non-navigation key (e.g., 'a')
**THEN** function returns `null`
**AND** event is not prevented

### Requirement: Grid Navigation (2D)

The system SHALL provide keyboard navigation for 2D grids with configurable column count.

**Rationale**: Equipment grids and icon palettes require 2D arrow key navigation.

**Priority**: High

#### Scenario: ArrowDown in grid

**GIVEN** grid with 3 columns and 9 items (3 rows)
**AND** current index is 1 (row 0, column 1)
**WHEN** ArrowDown is pressed
**THEN** new index is `1 + 3 = 4` (row 1, column 1)

#### Scenario: ArrowUp in grid

**GIVEN** grid with 3 columns
**AND** current index is 4 (row 1, column 1)
**WHEN** ArrowUp is pressed
**THEN** new index is `4 - 3 = 1` (row 0, column 1)

#### Scenario: ArrowRight in grid

**GIVEN** grid with 3 columns
**AND** current index is 4
**WHEN** ArrowRight is pressed
**THEN** new index is `5` (same row, next column)

#### Scenario: ArrowLeft in grid

**GIVEN** grid with 3 columns
**AND** current index is 5
**WHEN** ArrowLeft is pressed
**THEN** new index is `4` (same row, previous column)

#### Scenario: Wrap-around at grid bottom

**GIVEN** grid with 3 columns, 9 items, wrap enabled
**AND** current index is 7 (row 2, column 1)
**WHEN** ArrowDown is pressed
**THEN** new index is `(7 + 3) % 9 = 1` (wraps to row 0, column 1)

#### Scenario: Partial last row handling

**GIVEN** grid with 3 columns and 8 items (last row has 2 items)
**AND** current index is 7 (last item)
**WHEN** ArrowDown is pressed with wrap enabled
**THEN** new index is `(7 + 3) % 8 = 2` (wraps to row 0, column 2)

### Requirement: Tab Navigation Hook

The system SHALL provide a React hook for tab bar keyboard navigation with Left/Right arrows.

**Rationale**: Tab bars require horizontal navigation with wrap-around and Home/End support.

**Priority**: High

#### Scenario: ArrowRight in tab bar

**GIVEN** tab bar with 4 tabs
**AND** active tab is at index 1
**WHEN** ArrowRight is pressed
**THEN** event is prevented
**AND** `onTabChange` is called with tab at index 2

#### Scenario: ArrowLeft wrap-around

**GIVEN** tab bar with 4 tabs
**AND** active tab is at index 0 (first)
**WHEN** ArrowLeft is pressed
**THEN** event is prevented
**AND** `onTabChange` is called with tab at index 3 (last)

#### Scenario: Home key in tab bar

**GIVEN** tab bar with active tab at index 2
**WHEN** Home key is pressed
**THEN** event is prevented
**AND** `onTabChange` is called with tab at index 0

#### Scenario: End key in tab bar

**GIVEN** tab bar with 4 tabs and active tab at index 1
**WHEN** End key is pressed
**THEN** event is prevented
**AND** `onTabChange` is called with tab at index 3

### Requirement: Keyboard Click Handler

The system SHALL provide a utility to create keyboard event handlers that trigger callbacks on Enter or Space.

**Rationale**: Custom interactive elements need to match native button keyboard behavior.

**Priority**: Medium

#### Scenario: Enter key activation

**GIVEN** keyboard click handler with callback function
**WHEN** Enter key is pressed
**THEN** event is prevented
**AND** callback function is invoked

#### Scenario: Space key activation

**GIVEN** keyboard click handler with callback function
**WHEN** Space key is pressed
**THEN** event is prevented
**AND** callback function is invoked

#### Scenario: Other key ignored

**GIVEN** keyboard click handler
**WHEN** any other key (e.g., 'a') is pressed
**THEN** event is not prevented
**AND** callback is not invoked

### Requirement: Focus Ring Styling

The system SHALL provide Tailwind CSS class constants for WCAG AA compliant focus indicators.

**Rationale**: Consistent focus styling across all interactive elements ensures keyboard navigation visibility.

**Priority**: Medium

#### Scenario: Standard focus ring classes

**GIVEN** interactive element (button, link)
**WHEN** `FOCUS_RING_CLASSES` constant is applied
**THEN** element has `focus:outline-none` (removes browser default)
**AND** element has `focus:ring-2` (2px ring width)
**AND** element has `focus:ring-blue-500` (blue ring color)
**AND** element has `focus:ring-offset-2` (2px offset from element)
**AND** element has `dark:focus:ring-offset-gray-900` (dark mode offset color)

#### Scenario: Inset focus ring variant

**GIVEN** element where offset would break layout (e.g., grid cell)
**WHEN** `FOCUS_RING_INSET_CLASSES` constant is applied
**THEN** element has `focus:outline-none`
**AND** element has `focus:ring-2`
**AND** element has `focus:ring-blue-500`
**AND** element has `focus:ring-inset` (ring inside element border)

#### Scenario: Screen-reader-only classes

**GIVEN** element that should be hidden visually but accessible to screen readers
**WHEN** `SR_ONLY_CLASSES` constant is applied
**THEN** element has `absolute` positioning
**AND** element has `w-px h-px` (1px size)
**AND** element has `overflow-hidden` and `whitespace-nowrap`
**AND** element has `border-0`
**AND** element is visually hidden but readable by assistive technology

### Requirement: Keyboard Navigation React Hook

The system SHALL provide a `useKeyboardNavigation` hook for managing keyboard navigation state in React components.

**Rationale**: Reusable hook reduces boilerplate for implementing keyboard navigation in lists and grids.

**Priority**: High

#### Scenario: Hook initialization with selected item

**GIVEN** list of 5 items with item at index 2 selected
**WHEN** `useKeyboardNavigation` hook is initialized
**THEN** `currentIndex` is `2`
**AND** `navigate` function is available
**AND** `handleKeyDown` function is available

#### Scenario: Navigate function call

**GIVEN** hook with 5 items and current index 1
**WHEN** `navigate('down')` is called
**THEN** `onSelect` callback is invoked with item at index 2

#### Scenario: Wrap-around disabled

**GIVEN** hook with `wrap: false` and current index 4 (last item)
**WHEN** `navigate('down')` is called
**THEN** `onSelect` is not called
**AND** current index remains 4

#### Scenario: Grid navigation with columns

**GIVEN** hook with `columns: 3` and 9 items
**AND** current index is 1
**WHEN** `navigate('down')` is called
**THEN** `onSelect` is called with item at index 4 (1 + 3)

#### Scenario: Enter key activation

**GIVEN** hook with `onActivate` callback
**AND** item at index 2 is selected
**WHEN** `handleKeyDown` receives Enter key event
**THEN** event is prevented
**AND** `onActivate` is called with selected item

#### Scenario: Disabled navigation

**GIVEN** hook with `enabled: false`
**WHEN** `handleKeyDown` receives any arrow key
**THEN** event is not prevented
**AND** `navigate` is not called

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Accessibility store state
 */
interface AccessibilityState {
  /**
   * High contrast mode enabled
   * @example false
   */
  readonly highContrast: boolean;

  /**
   * Reduce motion preference enabled
   * @example false
   */
  readonly reduceMotion: boolean;

  /**
   * Enable high contrast mode
   */
  setHighContrast: (enabled: boolean) => void;

  /**
   * Enable reduce motion preference
   */
  setReduceMotion: (enabled: boolean) => void;

  /**
   * Reset all settings to defaults
   */
  resetToDefaults: () => void;
}

/**
 * Keyboard event interface for navigation utilities
 */
interface IKeyboardEventLike {
  /**
   * Key name (e.g., 'ArrowLeft', 'Enter')
   */
  readonly key: string;

  /**
   * Prevent default browser behavior
   */
  preventDefault(): void;
}

/**
 * Live region component props
 */
interface ILiveRegionProps {
  /**
   * Message to announce to screen readers
   */
  readonly message: string;

  /**
   * Politeness level for announcement
   * @default 'polite'
   */
  readonly priority?: 'polite' | 'assertive';

  /**
   * Whether the region should be visible
   * @default false
   */
  readonly visible?: boolean;
}

/**
 * Navigation direction for keyboard navigation
 */
type NavDirection = 'up' | 'down' | 'left' | 'right' | 'first' | 'last';

/**
 * Keyboard navigation hook options
 */
interface KeyboardNavOptions<T> {
  /**
   * Items to navigate
   */
  readonly items: readonly T[];

  /**
   * Currently selected item
   */
  readonly selectedItem: T | null;

  /**
   * Called when selection changes
   */
  onSelect: (item: T) => void;

  /**
   * Called when item is activated (Enter key)
   */
  onActivate?: (item: T) => void;

  /**
   * Get unique key for item
   */
  getKey: (item: T) => string;

  /**
   * Enable wrap-around navigation
   * @default true
   */
  readonly wrap?: boolean;

  /**
   * Enable horizontal navigation (Left/Right)
   * @default false
   */
  readonly horizontal?: boolean;

  /**
   * Grid columns for 2D navigation
   */
  readonly columns?: number;

  /**
   * Is navigation enabled
   * @default true
   */
  readonly enabled?: boolean;
}
```

### Required Properties

| Property       | Type                      | Required | Description                         | Valid Values              | Default    |
| -------------- | ------------------------- | -------- | ----------------------------------- | ------------------------- | ---------- |
| `highContrast` | `boolean`                 | Yes      | High contrast mode enabled          | `true`, `false`           | `false`    |
| `reduceMotion` | `boolean`                 | Yes      | Reduce motion preference enabled    | `true`, `false`           | `false`    |
| `message`      | `string`                  | Yes      | Screen reader announcement text     | Non-empty string          | N/A        |
| `priority`     | `'polite' \| 'assertive'` | No       | Live region politeness level        | `'polite'`, `'assertive'` | `'polite'` |
| `wrap`         | `boolean`                 | No       | Enable wrap-around navigation       | `true`, `false`           | `true`     |
| `horizontal`   | `boolean`                 | No       | Enable horizontal navigation        | `true`, `false`           | `false`    |
| `columns`      | `number`                  | No       | Grid column count for 2D navigation | Integer > 0               | N/A        |
| `enabled`      | `boolean`                 | No       | Is keyboard navigation enabled      | `true`, `false`           | `true`     |

### Type Constraints

- `highContrast` MUST be a boolean
- `reduceMotion` MUST be a boolean
- `message` MUST be a non-empty string
- `priority` MUST be either `'polite'` or `'assertive'`
- `columns` MUST be a positive integer when provided
- `wrap` MUST be a boolean
- `horizontal` MUST be a boolean
- `enabled` MUST be a boolean

---

## Calculation Formulas

### Arrow Navigation Index Calculation

**Formula (Horizontal/Vertical)**:

```
nextIndex = (currentIndex + direction + totalItems) % totalItems
```

**Where**:

- `currentIndex` = Current focused item index (0-based)
- `direction` = `-1` for previous (Left/Up), `+1` for next (Right/Down)
- `totalItems` = Total number of navigable items
- `% totalItems` = Modulo operation for wrap-around

**Example (Horizontal List)**:

```
Input: currentIndex = 4, totalItems = 5, direction = +1 (ArrowRight)
Calculation: nextIndex = (4 + 1 + 5) % 5 = 10 % 5 = 0
Output: nextIndex = 0 (wraps to first item)
```

**Special Cases**:

- When `wrap = false` and at boundary: return current index unchanged
- When `key === 'Home'`: return `0`
- When `key === 'End'`: return `totalItems - 1`

### Grid Navigation Index Calculation

**Formula (ArrowDown)**:

```
nextIndex = currentIndex + columns
if (nextIndex >= totalItems && wrap) {
  nextIndex = nextIndex % totalItems
}
```

**Formula (ArrowUp)**:

```
nextIndex = currentIndex - columns
if (nextIndex < 0 && wrap) {
  nextIndex = totalItems + nextIndex
}
```

**Example (3-column grid, 9 items)**:

```
Input: currentIndex = 7, columns = 3, direction = ArrowDown, wrap = true
Calculation: nextIndex = 7 + 3 = 10
             10 >= 9, so nextIndex = 10 % 9 = 1
Output: nextIndex = 1 (wraps to row 0, column 1)
```

---

## Validation Rules

### Validation: Focusable Element Detection

**Rule**: Only elements that are interactive and visible SHALL be included in focus trap navigation.

**Severity**: Error

**Condition**:

```typescript
// Element must match focusable selector
const isFocusable = element.matches(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
);

// Element must not be disabled
const isEnabled = !element.hasAttribute('disabled');

// Element must be visible (has layout)
const isVisible = element.offsetParent !== null;

// Valid if all conditions met
const isValid = isFocusable && isEnabled && isVisible;
```

**Error Message**: "Element is not focusable or is hidden"

**User Action**: Ensure element is interactive, enabled, and visible

### Validation: Live Region Cleanup

**Rule**: Live region elements SHALL be removed from DOM after 1000ms to prevent memory leaks.

**Severity**: Warning

**Condition**:

```typescript
setTimeout(() => {
  if (document.body.contains(announcement)) {
    document.body.removeChild(announcement);
  }
}, 1000);
```

**Error Message**: "Live region element was not cleaned up"

**User Action**: Verify cleanup timeout is not cleared prematurely

### Validation: Grid Column Count

**Rule**: Grid navigation `columns` parameter MUST be a positive integer.

**Severity**: Error

**Condition**:

```typescript
if (columns !== undefined && (!Number.isInteger(columns) || columns <= 0)) {
  throw new Error('columns must be a positive integer');
}
```

**Error Message**: "Grid columns must be a positive integer"

**User Action**: Provide valid column count (e.g., `columns: 3`)

---

## Technology Base Variants

N/A - This is a UI infrastructure specification with no tech base variants.

---

## Dependencies

### Depends On

- **Zustand**: State management library for accessibility store
- **React**: Hooks (`useCallback`, `useEffect`) for keyboard navigation
- **Tailwind CSS**: Utility classes for focus ring styling

### Used By

- **Confirmation Dialogs**: Focus trapping, keyboard navigation
- **Tab Navigation**: Tab bar keyboard navigation hook
- **Equipment Browser**: Grid navigation for equipment cards
- **Modal Components**: Focus trapping and screen reader announcements
- **All Interactive Components**: Focus ring styling utilities

### Construction Sequence

1. Initialize accessibility store on app startup
2. Load persisted preferences from localStorage
3. Apply preferences to UI (high contrast, reduce motion)
4. Attach keyboard navigation hooks to interactive components
5. Announce dynamic content changes via live regions

---

## Implementation Notes

### Performance Considerations

- **Live Region Cleanup**: Use `setTimeout` with 1000ms delay to auto-remove announcement elements and prevent DOM bloat
- **Focusable Element Query**: Cache focusable elements in focus trap to avoid repeated DOM queries on every Tab press
- **Event Listener Cleanup**: Always return cleanup function from `trapFocus()` to prevent memory leaks

### Edge Cases

- **Empty Focusable List**: If no focusable elements exist in focus trap container, Tab navigation should be a no-op
- **Partial Grid Rows**: Grid navigation with wrap-around must handle last row with fewer items than `columns`
- **Disabled Navigation**: When `enabled: false`, keyboard navigation hook should not prevent default browser behavior
- **Concurrent Announcements**: Multiple rapid `announce()` calls create separate live regions; screen reader queues them

### Common Pitfalls

- **Forgetting Cleanup**: Always call cleanup function returned by `trapFocus()` when modal closes
- **Wrong Orientation**: Using `'vertical'` for horizontal lists causes Left/Right arrows to be ignored
- **Missing preventDefault**: Arrow key handlers must call `preventDefault()` to stop page scrolling
- **Hardcoded Focus Rings**: Use `FOCUS_RING_CLASSES` constants instead of inline Tailwind classes for consistency

---

## Examples

### Example 1: Using Accessibility Store

```typescript
import { useAccessibilityStore } from '@/stores/useAccessibilityStore';

function AccessibilitySettings() {
  const { highContrast, reduceMotion, setHighContrast, setReduceMotion } =
    useAccessibilityStore();

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={highContrast}
          onChange={(e) => setHighContrast(e.target.checked)}
        />
        High Contrast Mode
      </label>
      <label>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={(e) => setReduceMotion(e.target.checked)}
        />
        Reduce Motion
      </label>
    </div>
  );
}
```

### Example 2: Screen Reader Announcement

```typescript
import { announce } from '@/utils/accessibility';

function SaveButton() {
  const handleSave = async () => {
    await saveData();
    announce('Changes saved successfully', 'polite');
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Example 3: Focus Trapping in Modal

```typescript
import { useEffect, useRef } from 'react';
import { trapFocus } from '@/utils/accessibility';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const cleanup = trapFocus(modalRef.current);
      return cleanup; // Remove listener on unmount
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### Example 4: Arrow Key Navigation in Tab Bar

```typescript
import { handleArrowNavigation } from '@/utils/accessibility';

function TabBar({ tabs, activeIndex, onTabChange }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const newIndex = handleArrowNavigation(
      e,
      activeIndex,
      tabs.length,
      'horizontal'
    );
    if (newIndex !== null) {
      onTabChange(newIndex);
    }
  };

  return (
    <div role="tablist" onKeyDown={handleKeyDown}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={index === activeIndex}
          tabIndex={index === activeIndex ? 0 : -1}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### Example 5: Grid Navigation Hook

```typescript
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

function EquipmentGrid({ items }) {
  const [selectedItem, setSelectedItem] = useState(items[0]);

  const { handleKeyDown } = useKeyboardNavigation({
    items,
    selectedItem,
    onSelect: setSelectedItem,
    onActivate: (item) => console.log('Activated:', item),
    getKey: (item) => item.id,
    wrap: true,
    columns: 3, // 3-column grid
  });

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={selectedItem === item ? 'ring-2 ring-blue-500' : ''}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### Example 6: Tab Navigation Hook

```typescript
import { useTabKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

function CustomizerTabs({ tabs, activeTabId, onTabChange }) {
  const handleKeyDown = useTabKeyboardNavigation(
    tabs,
    activeTabId,
    onTabChange
  );

  return (
    <div role="tablist" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          tabIndex={tab.id === activeTabId ? 0 : -1}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### Example 7: Keyboard Click Handler

```typescript
import { createKeyboardClickHandler } from '@/utils/accessibility';

function CustomButton({ onClick, children }) {
  const handleKeyDown = createKeyboardClickHandler(onClick);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
```

### Example 8: Focus Ring Styling

```typescript
import { FOCUS_RING_CLASSES, FOCUS_RING_INSET_CLASSES } from '@/utils/accessibility';

function InteractiveCard() {
  return (
    <button className={`p-4 rounded ${FOCUS_RING_CLASSES}`}>
      Click me
    </button>
  );
}

function GridCell() {
  return (
    <div
      tabIndex={0}
      className={`border p-2 ${FOCUS_RING_INSET_CLASSES}`}
    >
      Grid item
    </div>
  );
}
```

---

## References

### Official Standards

- **WCAG 2.1 Level AA**: [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- **ARIA Authoring Practices**: [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- **Keyboard Navigation Patterns**: [ARIA APG - Keyboard Navigation](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

### Related Specifications

- **confirmation-dialogs**: Uses focus trapping and keyboard navigation
- **customizer-tabs**: Uses tab navigation hook
- **equipment-browser**: Uses grid navigation for equipment cards

### Implementation Files

- `src/stores/useAccessibilityStore.ts` - Accessibility preferences store
- `src/utils/accessibility.ts` - Screen reader, focus trap, navigation utilities
- `src/hooks/useKeyboardNavigation.ts` - React hooks for keyboard navigation

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Accessibility preferences store (high contrast, reduce motion)
- Screen reader announcements with live regions
- Focus trapping for modals
- Arrow key navigation (1D lists, 2D grids)
- Tab navigation hook
- Keyboard click handlers
- Focus ring styling utilities
- Keyboard navigation React hooks
