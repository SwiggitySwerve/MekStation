# Mech-Correct Armor Diagram Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a user-selectable "Schematic" mode alongside the existing SVG-based armor diagrams, with anatomically correct grid layout.

**Architecture:** The existing armor diagram variants (CleanTech, NeonOperator, etc.) become the "Silhouette" mode. A new "Schematic" mode provides an anatomically correct CSS grid layout. Users choose between modes in Settings. Both modes share the same armor data and controls.

**Tech Stack:** React, TypeScript, Zustand (useAppSettingsStore), Tailwind CSS, Jest/RTL

---

## Task 1: Add Armor Diagram Mode to Settings Store

**Files:**
- Modify: `src/stores/useAppSettingsStore.ts`

**Step 1: Write the failing test**

Create test file first:

```typescript
// src/stores/__tests__/useAppSettingsStore.armorMode.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAppSettingsStore } from '../useAppSettingsStore';

describe('useAppSettingsStore - armorDiagramMode', () => {
  beforeEach(() => {
    // Reset store to defaults
    act(() => {
      useAppSettingsStore.getState().resetToDefaults();
    });
  });

  it('should have silhouette as default armor diagram mode', () => {
    const { result } = renderHook(() => useAppSettingsStore());
    expect(result.current.armorDiagramMode).toBe('silhouette');
  });

  it('should update armor diagram mode', () => {
    const { result } = renderHook(() => useAppSettingsStore());

    act(() => {
      result.current.setArmorDiagramMode('schematic');
    });

    expect(result.current.armorDiagramMode).toBe('schematic');
  });

  it('should persist armor diagram mode', () => {
    const { result } = renderHook(() => useAppSettingsStore());

    act(() => {
      result.current.setArmorDiagramMode('schematic');
    });

    // Verify it's in persisted state
    const state = useAppSettingsStore.getState();
    expect(state.armorDiagramMode).toBe('schematic');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/__tests__/useAppSettingsStore.armorMode.test.ts --watch=false`
Expected: FAIL with "Property 'armorDiagramMode' does not exist"

**Step 3: Add the setting to the store**

```typescript
// In src/stores/useAppSettingsStore.ts

// Add type near other types (around line 23)
export type ArmorDiagramMode = 'schematic' | 'silhouette';

// Add to AppSettingsState interface (around line 84)
armorDiagramMode: ArmorDiagramMode;

// Add action to interface (around line 119)
setArmorDiagramMode: (mode: ArmorDiagramMode) => void;

// Add to ActionKeys type (around line 135)
| 'setArmorDiagramMode'

// Add to DEFAULT_SETTINGS (around line 151)
armorDiagramMode: 'silhouette',

// Add action in create() (around line 308)
setArmorDiagramMode: (mode) => set({ armorDiagramMode: mode }),

// Add to partialize() for persistence (around line 331)
armorDiagramMode: state.armorDiagramMode,
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/__tests__/useAppSettingsStore.armorMode.test.ts --watch=false`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/useAppSettingsStore.ts src/stores/__tests__/useAppSettingsStore.armorMode.test.ts
git commit -m "feat(settings): add armorDiagramMode setting for schematic/silhouette toggle"
```

---

## Task 2: Create Shared Types for Armor Diagram

**Files:**
- Create: `src/components/armor/shared/types.ts`

**Step 1: Create the types file**

```typescript
// src/components/armor/shared/types.ts
import { MechLocation } from '@/types/construction';

/**
 * Armor data for a single location
 */
export interface LocationArmorData {
  location: MechLocation;
  current: number;
  maximum: number;
  rear?: number;
  rearMaximum?: number;
}

/**
 * Props shared by all armor diagram modes
 */
export interface ArmorDiagramBaseProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
}

/**
 * Locations that have rear armor (torsos only)
 */
export const TORSO_LOCATIONS: readonly MechLocation[] = [
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
] as const;

/**
 * Check if a location has rear armor
 */
export function hasRearArmor(location: MechLocation): boolean {
  return TORSO_LOCATIONS.includes(location);
}

/**
 * All mech locations in anatomical order (top to bottom, left to right)
 */
export const MECH_LOCATIONS_ORDERED: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.LEFT_TORSO,
  MechLocation.CENTER_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
] as const;

/**
 * Short labels for locations
 */
export const LOCATION_SHORT_LABELS: Record<MechLocation, string> = {
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.LEFT_ARM]: 'LA',
  [MechLocation.RIGHT_ARM]: 'RA',
  [MechLocation.LEFT_LEG]: 'LL',
  [MechLocation.RIGHT_LEG]: 'RL',
};
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/components/armor/shared/types.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/armor/shared/types.ts
git commit -m "feat(armor): add shared types for armor diagram modes"
```

---

## Task 3: Create Schematic Location Component

**Files:**
- Create: `src/components/armor/schematic/SchematicLocation.tsx`
- Create: `src/components/armor/schematic/__tests__/SchematicLocation.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/armor/schematic/__tests__/SchematicLocation.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SchematicLocation } from '../SchematicLocation';
import { MechLocation } from '@/types/construction';

describe('SchematicLocation', () => {
  const defaultProps = {
    location: MechLocation.CENTER_TORSO,
    current: 35,
    maximum: 47,
    rear: 12,
    rearMaximum: 23,
    isSelected: false,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render location label', () => {
    render(<SchematicLocation {...defaultProps} />);
    expect(screen.getByText('CT')).toBeInTheDocument();
  });

  it('should render front armor value', () => {
    render(<SchematicLocation {...defaultProps} />);
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('/ 47')).toBeInTheDocument();
  });

  it('should render rear armor for torso locations', () => {
    render(<SchematicLocation {...defaultProps} />);
    expect(screen.getByText('Rear')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should not render rear for non-torso locations', () => {
    render(<SchematicLocation {...defaultProps} location={MechLocation.HEAD} rear={undefined} />);
    expect(screen.queryByText('Rear')).not.toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    render(<SchematicLocation {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).toHaveBeenCalledWith(MechLocation.CENTER_TORSO);
  });

  it('should show selected state', () => {
    const { container } = render(<SchematicLocation {...defaultProps} isSelected={true} />);
    expect(container.querySelector('.ring-2')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<SchematicLocation {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('Center Torso'));
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/armor/schematic/__tests__/SchematicLocation.test.tsx --watch=false`
Expected: FAIL with "Cannot find module '../SchematicLocation'"

**Step 3: Implement SchematicLocation component**

```typescript
// src/components/armor/schematic/SchematicLocation.tsx
import React from 'react';
import { MechLocation } from '@/types/construction';
import { hasRearArmor, LOCATION_SHORT_LABELS } from '../shared/types';

/**
 * Get status color based on armor percentage
 */
function getStatusColor(current: number, maximum: number): string {
  if (maximum === 0) return 'bg-gray-500';
  const percentage = (current / maximum) * 100;
  if (percentage >= 75) return 'bg-green-500';
  if (percentage >= 50) return 'bg-amber-500';
  if (percentage >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

export interface SchematicLocationProps {
  location: MechLocation;
  current: number;
  maximum: number;
  rear?: number;
  rearMaximum?: number;
  isSelected: boolean;
  onClick: (location: MechLocation) => void;
}

export function SchematicLocation({
  location,
  current,
  maximum,
  rear,
  rearMaximum,
  isSelected,
  onClick,
}: SchematicLocationProps): React.ReactElement {
  const label = LOCATION_SHORT_LABELS[location];
  const showRear = hasRearArmor(location) && rear !== undefined;
  const frontColor = getStatusColor(current, maximum);
  const rearColor = showRear ? getStatusColor(rear!, rearMaximum ?? 1) : '';

  const ariaLabel = showRear
    ? `${location} armor: Front ${current} of ${maximum}, Rear ${rear} of ${rearMaximum}`
    : `${location} armor: ${current} of ${maximum}`;

  return (
    <button
      type="button"
      role="button"
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onClick={() => onClick(location)}
      className={`
        relative p-3 rounded-lg border transition-all duration-150
        bg-surface-base hover:bg-surface-raised
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-border-theme-subtle'}
        focus:outline-none focus:ring-2 focus:ring-blue-500
        min-h-[44px] min-w-[44px]
      `}
    >
      {/* Location Label */}
      <div className="text-xs font-semibold text-text-theme-secondary mb-1">
        {label}
      </div>

      {/* Front Armor Section */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-8 rounded ${frontColor}`} />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white tabular-nums">{current}</span>
          <span className="text-xs text-text-theme-secondary">/ {maximum}</span>
        </div>
      </div>

      {/* Rear Armor Section (torso only) */}
      {showRear && (
        <div className="mt-2 pt-2 border-t border-border-theme-subtle">
          <div className="text-xs text-text-theme-secondary mb-1">Rear</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-6 rounded ${rearColor}`} />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tabular-nums">{rear}</span>
              <span className="text-xs text-text-theme-secondary">/ {rearMaximum}</span>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/armor/schematic/__tests__/SchematicLocation.test.tsx --watch=false`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/armor/schematic/SchematicLocation.tsx src/components/armor/schematic/__tests__/SchematicLocation.test.tsx
git commit -m "feat(armor): add SchematicLocation component for grid-based diagram"
```

---

## Task 4: Create Schematic Diagram Component

**Files:**
- Create: `src/components/armor/schematic/SchematicDiagram.tsx`
- Create: `src/components/armor/schematic/__tests__/SchematicDiagram.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/armor/schematic/__tests__/SchematicDiagram.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SchematicDiagram } from '../SchematicDiagram';
import { MechLocation } from '@/types/construction';

describe('SchematicDiagram', () => {
  const mockArmorData = [
    { location: MechLocation.HEAD, current: 9, maximum: 9 },
    { location: MechLocation.CENTER_TORSO, current: 35, maximum: 47, rear: 12, rearMaximum: 23 },
    { location: MechLocation.LEFT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
    { location: MechLocation.RIGHT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
    { location: MechLocation.LEFT_ARM, current: 20, maximum: 24 },
    { location: MechLocation.RIGHT_ARM, current: 20, maximum: 24 },
    { location: MechLocation.LEFT_LEG, current: 28, maximum: 32 },
    { location: MechLocation.RIGHT_LEG, current: 28, maximum: 32 },
  ];

  const defaultProps = {
    armorData: mockArmorData,
    selectedLocation: null,
    unallocatedPoints: 12,
    onLocationClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all 8 mech locations', () => {
    render(<SchematicDiagram {...defaultProps} />);
    expect(screen.getByText('HD')).toBeInTheDocument();
    expect(screen.getByText('CT')).toBeInTheDocument();
    expect(screen.getByText('LT')).toBeInTheDocument();
    expect(screen.getByText('RT')).toBeInTheDocument();
    expect(screen.getByText('LA')).toBeInTheDocument();
    expect(screen.getByText('RA')).toBeInTheDocument();
    expect(screen.getByText('LL')).toBeInTheDocument();
    expect(screen.getByText('RL')).toBeInTheDocument();
  });

  it('should use anatomically correct grid layout', () => {
    const { container } = render(<SchematicDiagram {...defaultProps} />);
    const grid = container.querySelector('[style*="grid-template-areas"]');
    expect(grid).toBeInTheDocument();
  });

  it('should call onLocationClick when a location is clicked', () => {
    render(<SchematicDiagram {...defaultProps} />);
    const headButton = screen.getByRole('button', { name: /Head armor/i });
    fireEvent.click(headButton);
    expect(defaultProps.onLocationClick).toHaveBeenCalledWith(MechLocation.HEAD);
  });

  it('should show selected state for selected location', () => {
    const { container } = render(
      <SchematicDiagram {...defaultProps} selectedLocation={MechLocation.HEAD} />
    );
    const selectedButton = container.querySelector('.ring-2');
    expect(selectedButton).toBeInTheDocument();
  });

  it('should render auto-allocate button when handler provided', () => {
    render(<SchematicDiagram {...defaultProps} onAutoAllocate={jest.fn()} />);
    expect(screen.getByText(/Auto Allocate/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/armor/schematic/__tests__/SchematicDiagram.test.tsx --watch=false`
Expected: FAIL with "Cannot find module '../SchematicDiagram'"

**Step 3: Implement SchematicDiagram component**

```typescript
// src/components/armor/schematic/SchematicDiagram.tsx
import React from 'react';
import { MechLocation } from '@/types/construction';
import { ArmorDiagramBaseProps, LocationArmorData } from '../shared/types';
import { SchematicLocation } from './SchematicLocation';

/**
 * Schematic Armor Diagram
 *
 * Anatomically correct CSS grid layout showing mech body parts
 * in their proper positions with visual connectors.
 */
export function SchematicDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
}: ArmorDiagramBaseProps): React.ReactElement {
  const getArmorData = (location: MechLocation): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;

  const renderLocation = (location: MechLocation) => {
    const data = getArmorData(location);
    return (
      <SchematicLocation
        key={location}
        location={location}
        current={data?.current ?? 0}
        maximum={data?.maximum ?? 1}
        rear={data?.rear}
        rearMaximum={data?.rearMaximum}
        isSelected={selectedLocation === location}
        onClick={onLocationClick}
      />
    );
  };

  return (
    <div className={`bg-surface-base rounded-lg border border-border-theme-subtle p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Armor Allocation</h3>
        {onAutoAllocate && (
          <button
            onClick={onAutoAllocate}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              isOverAllocated
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-accent hover:bg-accent-hover text-white'
            }`}
          >
            Auto Allocate ({unallocatedPoints} pts)
          </button>
        )}
      </div>

      {/* Anatomically Correct Grid Layout */}
      <div
        className="hidden lg:grid gap-2"
        style={{
          gridTemplateAreas: `
            ".    .    head   .    ."
            "la   lt   ct     rt   ra"
            ".    ll   .      rl   ."
          `,
          gridTemplateColumns: '1fr 1fr 1.2fr 1fr 1fr',
          gridTemplateRows: 'auto auto auto',
        }}
      >
        <div style={{ gridArea: 'head' }}>{renderLocation(MechLocation.HEAD)}</div>
        <div style={{ gridArea: 'ct' }}>{renderLocation(MechLocation.CENTER_TORSO)}</div>
        <div style={{ gridArea: 'lt' }}>{renderLocation(MechLocation.LEFT_TORSO)}</div>
        <div style={{ gridArea: 'rt' }}>{renderLocation(MechLocation.RIGHT_TORSO)}</div>
        <div style={{ gridArea: 'la' }}>{renderLocation(MechLocation.LEFT_ARM)}</div>
        <div style={{ gridArea: 'ra' }}>{renderLocation(MechLocation.RIGHT_ARM)}</div>
        <div style={{ gridArea: 'll' }}>{renderLocation(MechLocation.LEFT_LEG)}</div>
        <div style={{ gridArea: 'rl' }}>{renderLocation(MechLocation.RIGHT_LEG)}</div>
      </div>

      {/* Mobile Stacked Layout */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Head */}
        <div>
          <h4 className="text-xs font-medium text-text-theme-secondary mb-1 px-1">Head</h4>
          {renderLocation(MechLocation.HEAD)}
        </div>

        {/* Torso */}
        <div>
          <h4 className="text-xs font-medium text-text-theme-secondary mb-1 px-1">Torso</h4>
          <div className="flex flex-col gap-2">
            {renderLocation(MechLocation.CENTER_TORSO)}
            <div className="flex gap-2">
              {renderLocation(MechLocation.LEFT_TORSO)}
              {renderLocation(MechLocation.RIGHT_TORSO)}
            </div>
          </div>
        </div>

        {/* Arms */}
        <div>
          <h4 className="text-xs font-medium text-text-theme-secondary mb-1 px-1">Arms</h4>
          <div className="flex gap-2">
            {renderLocation(MechLocation.LEFT_ARM)}
            {renderLocation(MechLocation.RIGHT_ARM)}
          </div>
        </div>

        {/* Legs */}
        <div>
          <h4 className="text-xs font-medium text-text-theme-secondary mb-1 px-1">Legs</h4>
          <div className="flex gap-2">
            {renderLocation(MechLocation.LEFT_LEG)}
            {renderLocation(MechLocation.RIGHT_LEG)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-text-theme-secondary">75%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-text-theme-secondary">50%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-text-theme-secondary">25%+</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-text-theme-secondary">&lt;25%</span>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-text-theme-secondary text-center mt-2">
        Click a location to edit armor values
      </p>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/armor/schematic/__tests__/SchematicDiagram.test.tsx --watch=false`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/armor/schematic/SchematicDiagram.tsx src/components/armor/schematic/__tests__/SchematicDiagram.test.tsx
git commit -m "feat(armor): add SchematicDiagram with anatomically correct grid layout"
```

---

## Task 5: Create Index Exports for Schematic Module

**Files:**
- Create: `src/components/armor/schematic/index.ts`

**Step 1: Create the index file**

```typescript
// src/components/armor/schematic/index.ts
export { SchematicDiagram } from './SchematicDiagram';
export { SchematicLocation } from './SchematicLocation';
```

**Step 2: Commit**

```bash
git add src/components/armor/schematic/index.ts
git commit -m "chore(armor): add schematic module exports"
```

---

## Task 6: Create Armor Diagram Mode Switcher

**Files:**
- Create: `src/components/armor/ArmorDiagramModeSwitch.tsx`
- Create: `src/components/armor/__tests__/ArmorDiagramModeSwitch.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/armor/__tests__/ArmorDiagramModeSwitch.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArmorDiagramModeSwitch } from '../ArmorDiagramModeSwitch';
import { useAppSettingsStore } from '@/stores/useAppSettingsStore';
import { act } from '@testing-library/react';

// Mock the store
jest.mock('@/stores/useAppSettingsStore');

describe('ArmorDiagramModeSwitch', () => {
  const mockSetArmorDiagramMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppSettingsStore as unknown as jest.Mock).mockReturnValue({
      armorDiagramMode: 'silhouette',
      setArmorDiagramMode: mockSetArmorDiagramMode,
    });
  });

  it('should render mode options', () => {
    render(<ArmorDiagramModeSwitch />);
    expect(screen.getByText('Schematic')).toBeInTheDocument();
    expect(screen.getByText('Silhouette')).toBeInTheDocument();
  });

  it('should show current mode as selected', () => {
    render(<ArmorDiagramModeSwitch />);
    const silhouetteButton = screen.getByText('Silhouette');
    expect(silhouetteButton).toHaveClass('bg-accent');
  });

  it('should call setArmorDiagramMode when mode is changed', () => {
    render(<ArmorDiagramModeSwitch />);
    fireEvent.click(screen.getByText('Schematic'));
    expect(mockSetArmorDiagramMode).toHaveBeenCalledWith('schematic');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/armor/__tests__/ArmorDiagramModeSwitch.test.tsx --watch=false`
Expected: FAIL with "Cannot find module '../ArmorDiagramModeSwitch'"

**Step 3: Implement ArmorDiagramModeSwitch**

```typescript
// src/components/armor/ArmorDiagramModeSwitch.tsx
import React from 'react';
import { useAppSettingsStore, ArmorDiagramMode } from '@/stores/useAppSettingsStore';

/**
 * Toggle switch for armor diagram mode (Schematic vs Silhouette)
 */
export function ArmorDiagramModeSwitch(): React.ReactElement {
  const { armorDiagramMode, setArmorDiagramMode } = useAppSettingsStore();

  const modes: { id: ArmorDiagramMode; label: string }[] = [
    { id: 'schematic', label: 'Schematic' },
    { id: 'silhouette', label: 'Silhouette' },
  ];

  return (
    <div className="flex gap-1 p-1 bg-surface-raised rounded-lg">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setArmorDiagramMode(mode.id)}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md transition-colors
            ${armorDiagramMode === mode.id
              ? 'bg-accent text-white'
              : 'text-text-theme-secondary hover:text-white hover:bg-surface-base'
            }
          `}
          aria-pressed={armorDiagramMode === mode.id}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/armor/__tests__/ArmorDiagramModeSwitch.test.tsx --watch=false`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/armor/ArmorDiagramModeSwitch.tsx src/components/armor/__tests__/ArmorDiagramModeSwitch.test.tsx
git commit -m "feat(armor): add ArmorDiagramModeSwitch component"
```

---

## Task 7: Create Unified Armor Diagram Orchestrator

**Files:**
- Modify: `src/components/armor/ArmorDiagram.tsx`
- Create: `src/components/armor/__tests__/ArmorDiagram.mode.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/armor/__tests__/ArmorDiagram.mode.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArmorDiagram } from '../ArmorDiagram';
import { useAppSettingsStore } from '@/stores/useAppSettingsStore';
import { MechLocation } from '@/types/construction';

// Mock the store
jest.mock('@/stores/useAppSettingsStore');

describe('ArmorDiagram mode switching', () => {
  const mockArmorData = [
    { location: MechLocation.HEAD, current: 9, maximum: 9 },
    { location: MechLocation.CENTER_TORSO, current: 35, maximum: 47, rear: 12, rearMaximum: 23 },
    { location: MechLocation.LEFT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
    { location: MechLocation.RIGHT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
    { location: MechLocation.LEFT_ARM, current: 20, maximum: 24 },
    { location: MechLocation.RIGHT_ARM, current: 20, maximum: 24 },
    { location: MechLocation.LEFT_LEG, current: 28, maximum: 32 },
    { location: MechLocation.RIGHT_LEG, current: 28, maximum: 32 },
  ];

  const defaultProps = {
    armorData: mockArmorData,
    selectedLocation: null,
    unallocatedPoints: 12,
    onLocationClick: jest.fn(),
  };

  it('should render SchematicDiagram when mode is schematic', () => {
    (useAppSettingsStore as unknown as jest.Mock).mockReturnValue({
      armorDiagramMode: 'schematic',
      armorDiagramVariant: 'clean-tech',
    });

    render(<ArmorDiagram {...defaultProps} />);

    // Schematic uses CSS grid layout
    const grid = document.querySelector('[style*="grid-template-areas"]');
    expect(grid).toBeInTheDocument();
  });

  it('should render variant diagram when mode is silhouette', () => {
    (useAppSettingsStore as unknown as jest.Mock).mockReturnValue({
      armorDiagramMode: 'silhouette',
      armorDiagramVariant: 'clean-tech',
    });

    render(<ArmorDiagram {...defaultProps} />);

    // Silhouette uses SVG
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/armor/__tests__/ArmorDiagram.mode.test.tsx --watch=false`
Expected: FAIL (ArmorDiagram doesn't handle modes yet)

**Step 3: Update ArmorDiagram to support mode switching**

The existing `ArmorDiagram.tsx` needs to be updated to check `armorDiagramMode` and render either the schematic or the appropriate variant. Review the existing file and add mode switching:

```typescript
// At the top of ArmorDiagram.tsx, add import
import { useAppSettingsStore } from '@/stores/useAppSettingsStore';
import { SchematicDiagram } from './schematic';

// Inside the component, add mode check
const { armorDiagramMode, armorDiagramVariant } = useAppSettingsStore();

// Early return for schematic mode
if (armorDiagramMode === 'schematic') {
  return (
    <SchematicDiagram
      armorData={armorData}
      selectedLocation={selectedLocation}
      unallocatedPoints={unallocatedPoints}
      onLocationClick={onLocationClick}
      onAutoAllocate={onAutoAllocate}
      className={className}
    />
  );
}

// Existing variant rendering continues for silhouette mode...
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/armor/__tests__/ArmorDiagram.mode.test.tsx --watch=false`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/armor/ArmorDiagram.tsx src/components/armor/__tests__/ArmorDiagram.mode.test.tsx
git commit -m "feat(armor): add mode switching to ArmorDiagram orchestrator"
```

---

## Task 8: Add Mode Picker to Armor Diagram Quick Settings

**Files:**
- Modify: `src/components/customizer/armor/ArmorDiagramQuickSettings.tsx`

**Step 1: Read the existing file**

Run: Read the file to understand current structure

**Step 2: Add mode toggle to quick settings**

Add the `ArmorDiagramModeSwitch` component to the quick settings popover. The exact changes depend on the existing structure, but generally:

```typescript
// Add import
import { ArmorDiagramModeSwitch } from '@/components/armor/ArmorDiagramModeSwitch';

// Add to the popover content
<div className="mb-3">
  <label className="text-xs text-text-theme-secondary mb-1 block">Diagram Mode</label>
  <ArmorDiagramModeSwitch />
</div>
```

**Step 3: Verify it works**

Run: `npm run dev` and navigate to armor tab to verify mode switch appears

**Step 4: Commit**

```bash
git add src/components/customizer/armor/ArmorDiagramQuickSettings.tsx
git commit -m "feat(armor): add diagram mode switch to quick settings"
```

---

## Task 9: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm test -- --watch=false`
Expected: All tests pass

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Run linter**

Run: `npm run lint`
Expected: No lint errors (or only pre-existing ones)

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any test/lint issues from armor diagram mode implementation"
```

---

## Task 10: Final Verification and Documentation

**Step 1: Manual testing checklist**

1. Open Settings, verify "Armor Diagram Mode" option appears
2. Switch to Schematic mode, verify grid layout appears
3. Switch to Silhouette mode, verify SVG diagram appears
4. Click locations in both modes, verify selection works
5. Test on mobile viewport, verify responsive layouts
6. Verify mode preference persists after page reload

**Step 2: Update design spec status**

```bash
# Update the design spec to mark as implemented
sed -i 's/Status: Draft/Status: Implemented/' docs/plans/2026-01-10-mech-silhouette-armor-diagram.md
git add docs/plans/2026-01-10-mech-silhouette-armor-diagram.md
git commit -m "docs: mark armor diagram mode design as implemented"
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(armor): complete schematic/silhouette mode implementation

- Add armorDiagramMode setting to app settings store
- Create SchematicDiagram with anatomically correct CSS grid layout
- Create SchematicLocation component for grid cells
- Add ArmorDiagramModeSwitch toggle component
- Update ArmorDiagram orchestrator to switch between modes
- Add mode picker to ArmorDiagramQuickSettings
- Full test coverage for new components"
```

---

## Summary

**Files Created:**
- `src/stores/__tests__/useAppSettingsStore.armorMode.test.ts`
- `src/components/armor/shared/types.ts`
- `src/components/armor/schematic/SchematicLocation.tsx`
- `src/components/armor/schematic/__tests__/SchematicLocation.test.tsx`
- `src/components/armor/schematic/SchematicDiagram.tsx`
- `src/components/armor/schematic/__tests__/SchematicDiagram.test.tsx`
- `src/components/armor/schematic/index.ts`
- `src/components/armor/ArmorDiagramModeSwitch.tsx`
- `src/components/armor/__tests__/ArmorDiagramModeSwitch.test.tsx`
- `src/components/armor/__tests__/ArmorDiagram.mode.test.tsx`

**Files Modified:**
- `src/stores/useAppSettingsStore.ts` - Add `armorDiagramMode` setting
- `src/components/armor/ArmorDiagram.tsx` - Add mode switching
- `src/components/customizer/armor/ArmorDiagramQuickSettings.tsx` - Add mode picker

**Total Tasks:** 10
**Estimated Commits:** 10-12
