# Theming & Appearance Specification

## Purpose

The theming and appearance system provides dark/light mode switching with persistent user preferences. The system applies theme classes to the document root, manages color scheme CSS variables, and persists theme selection to localStorage for consistent experience across sessions.

## Requirements

### Requirement: Theme Mode Selection

The system SHALL support light and dark theme modes.

#### Scenario: Theme mode types

- **WHEN** the theme system is initialized
- **THEN** two theme modes are available: 'light' and 'dark'
- **AND** theme mode is represented by the `ThemeMode` type
- **AND** default theme is 'light'

#### Scenario: Theme mode persistence

- **WHEN** user selects a theme mode
- **THEN** selection is persisted to localStorage with key 'theme-preference'
- **AND** theme persists across browser sessions
- **AND** theme is rehydrated on application load

### Requirement: Theme Store

The system SHALL provide a Zustand store for theme state management.

#### Scenario: Theme store interface

- **WHEN** components access the theme store
- **THEN** store exposes `IThemeState` interface with:
  - `theme: ThemeMode` - current theme ('light' or 'dark')
  - `toggleTheme: () => void` - toggle between light and dark
  - `setTheme: (theme: ThemeMode) => void` - set specific theme
  - `applyTheme: () => void` - apply theme to document

#### Scenario: Theme store creation

- **WHEN** the theme store is created
- **THEN** it uses Zustand's `create` function
- **AND** it uses `persist` middleware for localStorage
- **AND** persistence key is 'theme-preference'
- **AND** `onRehydrateStorage` callback applies theme after rehydration

### Requirement: Theme Toggle Action

The system SHALL provide a toggle action to switch between themes.

#### Scenario: Toggle theme execution

- **WHEN** `toggleTheme()` is called
- **THEN** theme switches from 'light' to 'dark' or 'dark' to 'light'
- **AND** `applyTheme()` is called automatically
- **AND** new theme is persisted to localStorage

### Requirement: Theme Set Action

The system SHALL provide a set action to apply a specific theme.

#### Scenario: Set theme execution

- **WHEN** `setTheme(theme)` is called with a valid ThemeMode
- **THEN** theme is set to the specified value
- **AND** `applyTheme()` is called automatically
- **AND** new theme is persisted to localStorage

### Requirement: Theme Application to DOM

The system SHALL apply theme by manipulating document classes.

#### Scenario: Dark mode application

- **WHEN** `applyTheme()` is called with theme 'dark'
- **THEN** 'dark' class is added to `document.documentElement`
- **AND** Tailwind CSS dark mode variants are activated
- **AND** CSS variables respond to `.dark` selector

#### Scenario: Light mode application

- **WHEN** `applyTheme()` is called with theme 'light'
- **THEN** 'dark' class is removed from `document.documentElement`
- **AND** Tailwind CSS reverts to light mode variants
- **AND** CSS variables use default light values

#### Scenario: SSR safety

- **WHEN** `applyTheme()` is called during server-side rendering
- **THEN** document manipulation is skipped (typeof document check)
- **AND** no errors are thrown
- **AND** theme is applied on client hydration

### Requirement: Theme Toggle Component

The system SHALL provide a ThemeToggle UI component.

#### Scenario: Theme toggle rendering

- **WHEN** ThemeToggle component is rendered
- **THEN** it displays a button with sun/moon icon
- **AND** icon reflects current theme (moon for light, sun for dark)
- **AND** button has accessible aria-label
- **AND** button has data-testid="theme-toggle" for testing

#### Scenario: Theme toggle interaction

- **WHEN** user clicks the theme toggle button
- **THEN** `toggleTheme()` is called
- **AND** icon switches immediately
- **AND** theme class is applied to document
- **AND** visual transition occurs smoothly

#### Scenario: Theme toggle initialization

- **WHEN** ThemeToggle component mounts
- **THEN** `applyTheme()` is called via useEffect
- **AND** theme is applied even if store was rehydrated
- **AND** visual flash is minimized

### Requirement: Color Scheme Integration

The system SHALL integrate with Tailwind CSS dark mode.

#### Scenario: Tailwind dark mode configuration

- **WHEN** Tailwind CSS is configured
- **THEN** dark mode strategy is 'class'
- **AND** dark variants are triggered by `.dark` class on html element
- **AND** components use `dark:` prefix for dark mode styles

#### Scenario: CSS variable theming

- **WHEN** theme is applied
- **THEN** CSS variables in `:root` define light mode colors
- **AND** CSS variables in `@media (prefers-color-scheme: dark)` define dark mode defaults
- **AND** `.dark` class overrides can be added for explicit dark mode
- **AND** components reference CSS variables (e.g., `var(--surface-base)`)

### Requirement: System Preference Detection

The system SHALL respect user's system color scheme preference as fallback.

#### Scenario: System preference fallback

- **WHEN** no theme preference is stored in localStorage
- **THEN** system checks `prefers-color-scheme` media query
- **AND** CSS variables respond to system preference
- **AND** user can override system preference via toggle

#### Scenario: System preference override

- **WHEN** user explicitly sets a theme via toggle
- **THEN** user preference takes precedence over system preference
- **AND** localStorage stores explicit choice
- **AND** system preference is ignored until localStorage is cleared

### Requirement: Theme Persistence Lifecycle

The system SHALL manage theme persistence across application lifecycle.

#### Scenario: Initial load with stored preference

- **WHEN** application loads and localStorage contains 'theme-preference'
- **THEN** stored theme is loaded into Zustand store
- **AND** `onRehydrateStorage` callback applies theme to document
- **AND** theme is applied before first paint (minimize flash)

#### Scenario: Initial load without stored preference

- **WHEN** application loads and localStorage is empty
- **THEN** default theme 'light' is used
- **AND** theme is applied to document
- **AND** no localStorage entry is created until user changes theme

#### Scenario: Theme change persistence

- **WHEN** user changes theme via toggle or setTheme
- **THEN** new theme is written to localStorage immediately
- **AND** Zustand persist middleware handles serialization
- **AND** theme survives page refresh and browser restart

## Data Model Requirements

### ThemeMode Type

```typescript
export type ThemeMode = 'light' | 'dark';
```

**Purpose**: Represents the two available theme modes.

**Constraints**:

- MUST be one of 'light' or 'dark'
- MUST be serializable to localStorage

### IThemeState Interface

```typescript
export interface IThemeState {
  readonly theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  applyTheme: () => void;
}
```

**Purpose**: Defines the theme store state and actions.

**Properties**:

- `theme`: Current theme mode (readonly to enforce using actions)
- `toggleTheme`: Action to switch between light and dark
- `setTheme`: Action to set a specific theme
- `applyTheme`: Action to apply theme to document DOM

### useThemeStore Hook

```typescript
export const useThemeStore = create<IThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }));
        get().applyTheme();
      },
      setTheme: (theme: ThemeMode) => {
        set({ theme });
        get().applyTheme();
      },
      applyTheme: () => {
        const { theme } = get();
        if (typeof document !== 'undefined') {
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
    }),
    {
      name: 'theme-preference',
      onRehydrateStorage: () => (state) => {
        state?.applyTheme();
      },
    },
  ),
);
```

**Purpose**: Zustand store implementation with persistence.

**Behavior**:

- Default theme is 'light'
- `toggleTheme` flips theme and applies to DOM
- `setTheme` sets specific theme and applies to DOM
- `applyTheme` manipulates `document.documentElement.classList`
- Persist middleware saves to localStorage with key 'theme-preference'
- `onRehydrateStorage` ensures theme is applied after rehydration

## Validation Rules

### Theme Mode Validation

**Rule**: Theme mode MUST be 'light' or 'dark'

**Validation**:

```typescript
function isValidThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}
```

**Error**: "Invalid theme mode: must be 'light' or 'dark'"

### Document Availability Validation

**Rule**: DOM manipulation MUST only occur in browser environment

**Validation**:

```typescript
if (typeof document !== 'undefined') {
  // Safe to manipulate document
}
```

**Error**: No error thrown; operation is skipped during SSR

## CSS Integration

### Tailwind Dark Mode Configuration

**tailwind.config.ts**:

```typescript
export default {
  darkMode: 'class', // Use .dark class strategy
  // ... rest of config
};
```

### CSS Variables for Theming

**globals.css**:

```css
:root {
  /* Light mode (default) */
  --surface-base: #1e293b; /* slate-800 */
  --surface-deep: #0f172a; /* slate-900 */
  --surface-raised: #334155; /* slate-700 */
  --text-primary: #f8fafc; /* slate-50 */
  --text-secondary: #94a3b8; /* slate-400 */
  --border-default: #475569; /* slate-600 */
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode system preference fallback */
    --background: #0f172a;
    --foreground: #e2e8f0;
  }
}

/* Explicit dark mode via .dark class */
.dark {
  /* Can override CSS variables here if needed */
}
```

### Tailwind Dark Mode Utilities

**Component usage**:

```tsx
<div className="bg-gray-100 dark:bg-gray-800">
  <p className="text-gray-700 dark:text-gray-200">Content</p>
</div>
```

## Component Reference

### ThemeToggle Component

**Location**: `src/components/ThemeToggle.tsx`

**Props**:

```typescript
export interface IThemeToggleProps {
  readonly className?: string;
}
```

**Usage**:

```tsx
import { ThemeToggle } from '@/components/ThemeToggle';

<ThemeToggle className="ml-4" />;
```

**Behavior**:

- Renders button with sun/moon icon
- Calls `toggleTheme()` on click
- Applies theme via `useEffect` on mount
- Accessible with aria-label and data-testid

### useThemeStore Hook

**Location**: `src/stores/useThemeStore.ts`

**Usage**:

```tsx
import { useThemeStore } from '@/stores/useThemeStore';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useThemeStore();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
    </div>
  );
}
```

## Implementation Notes

### Minimizing Flash of Unstyled Content (FOUC)

**Challenge**: Theme must be applied before first paint to avoid visual flash.

**Solution**:

1. Zustand persist middleware rehydrates synchronously from localStorage
2. `onRehydrateStorage` callback applies theme immediately after rehydration
3. ThemeToggle component calls `applyTheme()` in useEffect as safety net
4. Consider adding inline script in `<head>` for instant theme application (future enhancement)

### SSR Compatibility

**Challenge**: `document` is not available during server-side rendering.

**Solution**:

- `applyTheme()` checks `typeof document !== 'undefined'` before DOM manipulation
- No errors thrown during SSR
- Theme is applied on client hydration

### Tailwind Dark Mode Strategy

**Why 'class' strategy**:

- Allows explicit user control via toggle
- Not dependent on system preference alone
- Compatible with localStorage persistence
- Predictable behavior across browsers

**Alternative**: 'media' strategy uses `prefers-color-scheme` but doesn't allow user override.

### Persistence Key Naming

**Key**: `'theme-preference'`

**Rationale**:

- Descriptive and specific
- Avoids conflicts with other localStorage keys
- Consistent with app settings pattern

### Theme Application Timing

**When theme is applied**:

1. On store rehydration (page load)
2. On `toggleTheme()` call
3. On `setTheme()` call
4. On ThemeToggle mount (useEffect safety net)

**Why multiple application points**:

- Ensures theme is always in sync with store
- Handles edge cases (manual store manipulation, SSR hydration)
- Provides redundancy for reliability

## Testing Considerations

### Unit Tests

**Test coverage**:

- `toggleTheme()` switches theme correctly
- `setTheme()` sets specific theme
- `applyTheme()` adds/removes 'dark' class
- Persistence to localStorage works
- Rehydration applies theme
- SSR safety (no document errors)

**Example test**:

```typescript
import { useThemeStore } from '@/stores/useThemeStore';

describe('useThemeStore', () => {
  it('toggles theme from light to dark', () => {
    useThemeStore.getState().setTheme('light');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('applies dark class to documentElement', () => {
    useThemeStore.getState().setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
```

### Component Tests

**ThemeToggle tests**:

- Renders sun icon in dark mode
- Renders moon icon in light mode
- Clicking button toggles theme
- Aria-label updates based on theme
- Theme is applied on mount

### E2E Tests

**Scenarios**:

- User toggles theme, refreshes page, theme persists
- System dark mode preference is respected initially
- User override persists across sessions
- Theme applies to all components correctly

## Examples

### Basic Theme Toggle Usage

```tsx
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>MekStation</h1>
      <ThemeToggle />
    </header>
  );
}
```

### Programmatic Theme Control

```tsx
import { useThemeStore } from '@/stores/useThemeStore';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div>
      <h2>Appearance Settings</h2>
      <label>
        <input
          type="radio"
          checked={theme === 'light'}
          onChange={() => setTheme('light')}
        />
        Light Mode
      </label>
      <label>
        <input
          type="radio"
          checked={theme === 'dark'}
          onChange={() => setTheme('dark')}
        />
        Dark Mode
      </label>
    </div>
  );
}
```

### Dark Mode Styling in Components

```tsx
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
      <p className="text-gray-700 dark:text-gray-200">{children}</p>
    </div>
  );
}
```

### Using CSS Variables for Theming

```tsx
export function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-base border-border-theme text-text-theme-primary p-4">
      {children}
    </div>
  );
}
```

**CSS**:

```css
:root {
  --surface-base: #1e293b;
  --border-theme: #475569;
  --text-theme-primary: #f8fafc;
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface-base: #0f172a;
    --border-theme: #334155;
    --text-theme-primary: #e2e8f0;
  }
}
```

## Dependencies

### Internal Dependencies

- **Zustand**: State management library
- **Zustand persist middleware**: localStorage persistence
- **Tailwind CSS**: Dark mode utilities and class-based theming
- **React**: Component framework

### External Dependencies

None (system preference detection uses native browser APIs)

### Dependent Systems

- **App Settings**: May include theme selection in settings UI
- **Global Style Provider**: May apply theme-related CSS variables
- **All UI Components**: Use dark mode utilities for theming

## References

### Official Documentation

- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Zustand Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)

### Related Specifications

- **App Settings**: `openspec/specs/app-settings/spec.md` - User preferences including theme
- **Storybook Component Library**: `openspec/specs/storybook-component-library/spec.md` - Component documentation

### Implementation Files

- `src/stores/useThemeStore.ts` - Theme store implementation
- `src/components/ThemeToggle.tsx` - Theme toggle component
- `src/styles/globals.css` - CSS variables and dark mode styles
- `tailwind.config.ts` - Tailwind dark mode configuration
- `src/__tests__/components/ThemeToggle.test.tsx` - Unit tests
