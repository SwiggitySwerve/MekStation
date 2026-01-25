## ADDED Requirements

### Requirement: Context-Aware Component Re-rendering

Components consuming context-based Zustand stores via `useUnitStore` SHALL include the store's `id` field as a dependency in `useCallback` and `useMemo` hooks to ensure proper re-rendering when the React Context switches to a different store instance.

**Rationale**: When `UnitStoreProvider` switches to a different unit's store via React Context, React's hook dependency tracking may not detect the context change if only derived values (not the store identity) are in the dependency array. Including `unitId` ensures callbacks and memoized values are recreated when the active unit changes.

#### Scenario: useCallback with store values requires unitId dependency
- **GIVEN** a component using `useUnitStore` to read state values
- **AND** the component has a `useCallback` that uses those values
- **WHEN** the user switches to a different unit tab
- **THEN** the callback reference SHALL be recreated with the new unit's data
- **AND** any side effects (canvas rendering, API calls) use correct unit data

#### Scenario: Async rendering with context-based stores
- **GIVEN** a component that performs async rendering (e.g., canvas-based preview)
- **AND** the rendering depends on store values
- **WHEN** the user rapidly switches between unit tabs
- **THEN** the rendered output SHALL reflect the currently active unit
- **AND** stale data from previously selected units SHALL NOT appear

#### Scenario: Subscription pattern for context-aware components
- **GIVEN** a component consuming the unit store
- **WHEN** implementing store subscriptions
- **THEN** the component SHALL subscribe to `id` in addition to needed state:
  ```typescript
  const unitId = useUnitStore((s) => s.id);
  const name = useUnitStore((s) => s.name);
  // unitId MUST be in useCallback/useMemo dependencies
  ```
