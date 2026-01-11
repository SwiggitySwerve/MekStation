# Armor Diagram Settings UX Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the grid of diagram previews with a split-panel layout (list + large preview) using draft/save pattern for consistency with appearance settings.

**Architecture:** Add draft state for customizer preferences to useAppSettingsStore, create new ArmorDiagramSettings component with split layout, add VariantThumbnail for list item previews.

**Tech Stack:** React, Zustand, Tailwind CSS, SVG

---

## Design Summary

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  Silhouette Aesthetic                                   │
│  Visual style for the armor diagram                     │
├─────────────────────┬───────────────────────────────────┤
│  [thumb] Standard   │                                   │
│  [thumb] Glow       │      [Large Preview of            │
│  [thumb] LED    ←   │       Selected Variant]           │
│  [thumb] Metallic   │                                   │
│  [thumb] MegaMek    │                                   │
├─────────────────────┴───────────────────────────────────┤
│  ⚠ Diagram style preview active    [Save Diagram Style] │
└─────────────────────────────────────────────────────────┘
```

### Behavior
- Left list shows all variants with mini-preview thumbnails in each variant's actual style
- Clicking a variant updates the large preview immediately (live preview)
- Changes NOT persisted until "Save" clicked
- Navigating away reverts to previously saved variant
- ArmorTab and QuickSettings show draft preview while editing

---

## Task 1: Add Draft State for Customizer Preferences

**Files:**
- Modify: `src/stores/useAppSettingsStore.ts`
- Modify: `src/__tests__/stores/useAppSettingsStore.test.ts`

### Step 1: Add CustomizerSettings interface and draft state

Add to the store after AppearanceSettings:

```typescript
/**
 * Customizer settings that support live preview with save/revert
 */
export interface CustomizerSettings {
  armorDiagramMode: ArmorDiagramMode;
  armorDiagramVariant: ArmorDiagramVariant;
}
```

Add to AppSettingsState interface:

```typescript
// Draft customizer for live preview (not persisted)
draftCustomizer: CustomizerSettings | null;
hasUnsavedCustomizer: boolean;

// Draft setters
setDraftArmorDiagramMode: (mode: ArmorDiagramMode) => void;
setDraftArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;

// Save/revert
saveCustomizer: () => void;
revertCustomizer: () => void;
initDraftCustomizer: () => void;

// Effective getters
getEffectiveArmorDiagramMode: () => ArmorDiagramMode;
getEffectiveArmorDiagramVariant: () => ArmorDiagramVariant;
```

### Step 2: Add to DEFAULT_SETTINGS

```typescript
// Draft customizer state (not persisted)
draftCustomizer: null,
hasUnsavedCustomizer: false,
```

### Step 3: Implement draft setters

```typescript
setDraftArmorDiagramMode: (mode) => set((state) => ({
  draftCustomizer: {
    armorDiagramMode: mode,
    armorDiagramVariant: state.draftCustomizer?.armorDiagramVariant ?? state.armorDiagramVariant,
  },
  hasUnsavedCustomizer: true,
})),

setDraftArmorDiagramVariant: (variant) => set((state) => ({
  draftCustomizer: {
    armorDiagramMode: state.draftCustomizer?.armorDiagramMode ?? state.armorDiagramMode,
    armorDiagramVariant: variant,
  },
  hasUnsavedCustomizer: true,
})),
```

### Step 4: Implement save/revert/init

```typescript
initDraftCustomizer: () => set((state) => ({
  draftCustomizer: {
    armorDiagramMode: state.armorDiagramMode,
    armorDiagramVariant: state.armorDiagramVariant,
  },
  hasUnsavedCustomizer: false,
})),

saveCustomizer: () => set((state) => {
  if (!state.draftCustomizer) return state;
  return {
    armorDiagramMode: state.draftCustomizer.armorDiagramMode,
    armorDiagramVariant: state.draftCustomizer.armorDiagramVariant,
    hasUnsavedCustomizer: false,
  };
}),

revertCustomizer: () => set({
  draftCustomizer: null,
  hasUnsavedCustomizer: false,
}),
```

### Step 5: Implement effective getters

```typescript
getEffectiveArmorDiagramMode: () => {
  const state = get();
  return state.draftCustomizer?.armorDiagramMode ?? state.armorDiagramMode;
},

getEffectiveArmorDiagramVariant: () => {
  const state = get();
  return state.draftCustomizer?.armorDiagramVariant ?? state.armorDiagramVariant;
},
```

### Step 6: Update ActionKeys type

Add the new action keys to the ActionKeys type union.

### Step 7: Write tests

Add test suite for customizer draft behavior similar to appearance tests.

### Step 8: Run tests

```bash
npm test -- --testPathPattern="useAppSettingsStore" --watchAll=false
```

---

## Task 2: Create VariantThumbnail Component

**Files:**
- Create: `src/components/customizer/armor/VariantThumbnail.tsx`

### Step 1: Create the component

```typescript
/**
 * Variant Thumbnail
 *
 * Mini ~40x60px preview showing center torso in each variant's style.
 * Self-contained styling - does not inherit from global theme.
 */

import React from 'react';
import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';

interface VariantThumbnailProps {
  variant: ArmorDiagramVariant;
  className?: string;
}

export function VariantThumbnail({ variant, className = '' }: VariantThumbnailProps): React.ReactElement {
  // Render a simplified center torso shape with variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'clean-tech':
        return {
          fill: '#22c55e',
          stroke: '#000',
          strokeWidth: 1.5,
          filter: undefined,
        };
      case 'neon-operator':
        return {
          fill: 'rgba(6, 182, 212, 0.3)',
          stroke: '#06b6d4',
          strokeWidth: 2,
          filter: 'url(#neon-glow)',
        };
      case 'tactical-hud':
        return {
          fill: '#1e3a5f',
          stroke: '#3b82f6',
          strokeWidth: 1.5,
          filter: undefined,
        };
      case 'premium-material':
        return {
          fill: 'url(#metallic-gradient)',
          stroke: '#94a3b8',
          strokeWidth: 1,
          filter: undefined,
        };
      case 'megamek':
        return {
          fill: '#22c55e',
          stroke: '#000',
          strokeWidth: 1.2,
          filter: undefined,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <svg
      viewBox="0 0 40 60"
      className={`w-10 h-15 ${className}`}
    >
      <defs>
        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Simplified torso shape */}
      <rect
        x="8"
        y="5"
        width="24"
        height="50"
        rx="3"
        fill={styles.fill}
        stroke={styles.stroke}
        strokeWidth={styles.strokeWidth}
        filter={styles.filter}
      />

      {/* Variant-specific decorations */}
      {variant === 'neon-operator' && (
        <rect
          x="12"
          y="10"
          width="16"
          height="40"
          rx="2"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
      )}

      {variant === 'tactical-hud' && (
        <>
          <rect x="14" y="20" width="12" height="4" fill="#3b82f6" opacity="0.8" />
          <rect x="14" y="28" width="12" height="4" fill="#3b82f6" opacity="0.6" />
          <rect x="14" y="36" width="12" height="4" fill="#3b82f6" opacity="0.4" />
        </>
      )}
    </svg>
  );
}
```

### Step 2: Export from index

Add export to appropriate index file if one exists.

---

## Task 3: Create ArmorDiagramSettings Component

**Files:**
- Create: `src/components/customizer/armor/ArmorDiagramSettings.tsx`

### Step 1: Create the split-panel component

```typescript
/**
 * Armor Diagram Settings
 *
 * Split-panel layout for selecting armor diagram variant.
 * Left: list with thumbnails, Right: large preview.
 * Uses draft/save pattern for consistency with appearance settings.
 */

import React, { useEffect } from 'react';
import { useAppSettingsStore, ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import { VariantThumbnail } from './VariantThumbnail';
import { ArmorDiagramPreview, DIAGRAM_VARIANT_INFO } from './ArmorDiagramPreview';

interface ArmorDiagramSettingsProps {
  className?: string;
}

export function ArmorDiagramSettings({ className = '' }: ArmorDiagramSettingsProps): React.ReactElement {
  const initDraftCustomizer = useAppSettingsStore((s) => s.initDraftCustomizer);
  const saveCustomizer = useAppSettingsStore((s) => s.saveCustomizer);
  const hasUnsavedCustomizer = useAppSettingsStore((s) => s.hasUnsavedCustomizer);
  const setDraftArmorDiagramVariant = useAppSettingsStore((s) => s.setDraftArmorDiagramVariant);
  const getEffectiveArmorDiagramVariant = useAppSettingsStore((s) => s.getEffectiveArmorDiagramVariant);

  const effectiveVariant = getEffectiveArmorDiagramVariant();

  // Initialize draft on mount
  useEffect(() => {
    initDraftCustomizer();
  }, [initDraftCustomizer]);

  const variants: ArmorDiagramVariant[] = [
    'clean-tech',
    'neon-operator',
    'tactical-hud',
    'premium-material',
    'megamek',
  ];

  return (
    <div className={className}>
      <div className="flex gap-4">
        {/* Left: Variant list */}
        <div className="w-48 space-y-1">
          {variants.map((variant) => {
            const info = DIAGRAM_VARIANT_INFO[variant];
            const isSelected = effectiveVariant === variant;

            return (
              <button
                key={variant}
                onClick={() => setDraftArmorDiagramVariant(variant)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'bg-accent/20 border border-accent'
                    : 'bg-surface-raised/30 border border-transparent hover:bg-surface-raised hover:border-border-theme'
                }`}
              >
                <VariantThumbnail variant={variant} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isSelected ? 'text-accent' : 'text-text-theme-primary'}`}>
                    {info.name}
                  </div>
                  <div className="text-xs text-text-theme-secondary truncate">
                    {info.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Large preview */}
        <div className="flex-1">
          <ArmorDiagramPreview variant={effectiveVariant} />
        </div>
      </div>

      {/* Save indicator */}
      {hasUnsavedCustomizer && (
        <div className="flex items-center justify-between mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm text-amber-200">
              Diagram style preview active — save to keep changes
            </span>
          </div>
          <button
            onClick={saveCustomizer}
            className="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
          >
            Save Diagram Style
          </button>
        </div>
      )}
    </div>
  );
}
```

### Step 2: Export from armor components

Add export to the armor components index if applicable.

---

## Task 4: Update Settings Page

**Files:**
- Modify: `src/pages/settings.tsx`

### Step 1: Import the new component

```typescript
import { ArmorDiagramSettings } from '@/components/customizer/armor/ArmorDiagramSettings';
```

### Step 2: Add revert on route change

Update the route change handler:

```typescript
const revertCustomizer = useAppSettingsStore((s) => s.revertCustomizer);

useEffect(() => {
  const handleRouteChange = () => {
    revertAppearance();
    revertCustomizer();  // Add this
  };

  router.events.on('routeChangeStart', handleRouteChange);
  return () => {
    router.events.off('routeChangeStart', handleRouteChange);
  };
}, [router.events, revertAppearance, revertCustomizer]);
```

### Step 3: Replace the grid preview

Replace in Customizer section:

```typescript
{/* Armor Diagram Variant */}
{settings.armorDiagramMode === 'silhouette' && (
  <div>
    <div className="text-sm font-medium text-text-theme-primary mb-2">Silhouette Aesthetic</div>
    <div className="text-xs text-text-theme-secondary mb-3">
      Visual style for the armor diagram
    </div>
    <ArmorDiagramSettings />
  </div>
)}
```

Remove the old ArmorDiagramGridPreview usage.

---

## Task 5: Update Components to Use Effective Getters

**Files:**
- Modify: `src/components/customizer/armor/ArmorTab.tsx`
- Modify: `src/components/customizer/armor/ArmorDiagramQuickSettings.tsx`

### Step 1: Update ArmorTab

Change from:
```typescript
const armorDiagramVariant = useAppSettingsStore((s) => s.armorDiagramVariant);
```

To:
```typescript
const getEffectiveArmorDiagramVariant = useAppSettingsStore((s) => s.getEffectiveArmorDiagramVariant);
const armorDiagramVariant = getEffectiveArmorDiagramVariant();
```

### Step 2: Update ArmorDiagramQuickSettings

Same change - use `getEffectiveArmorDiagramVariant()` instead of reading `armorDiagramVariant` directly.

Also update the setter to use `setDraftArmorDiagramVariant` instead of `setArmorDiagramVariant`.

---

## Task 6: Write Tests and Verify

**Files:**
- Modify: `src/__tests__/stores/useAppSettingsStore.test.ts`

### Step 1: Add customizer draft tests

```typescript
describe('Customizer draft/save system', () => {
  it('should initialize draft with current values', () => {
    const { result } = renderHook(() => useAppSettingsStore());

    act(() => {
      result.current.initDraftCustomizer();
    });

    expect(result.current.draftCustomizer).toEqual({
      armorDiagramMode: 'silhouette',
      armorDiagramVariant: 'clean-tech',
    });
    expect(result.current.hasUnsavedCustomizer).toBe(false);
  });

  it('should update draft without persisting', () => {
    const { result } = renderHook(() => useAppSettingsStore());

    act(() => {
      result.current.initDraftCustomizer();
      result.current.setDraftArmorDiagramVariant('megamek');
    });

    expect(result.current.draftCustomizer?.armorDiagramVariant).toBe('megamek');
    expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Not persisted
    expect(result.current.hasUnsavedCustomizer).toBe(true);
  });

  it('should persist on save', () => {
    const { result } = renderHook(() => useAppSettingsStore());

    act(() => {
      result.current.initDraftCustomizer();
      result.current.setDraftArmorDiagramVariant('megamek');
      result.current.saveCustomizer();
    });

    expect(result.current.armorDiagramVariant).toBe('megamek');
    expect(result.current.hasUnsavedCustomizer).toBe(false);
  });

  it('should revert on revertCustomizer', () => {
    const { result } = renderHook(() => useAppSettingsStore());

    act(() => {
      result.current.initDraftCustomizer();
      result.current.setDraftArmorDiagramVariant('megamek');
      result.current.revertCustomizer();
    });

    expect(result.current.armorDiagramVariant).toBe('clean-tech'); // Original
    expect(result.current.draftCustomizer).toBeNull();
  });

  it('getEffectiveArmorDiagramVariant returns draft when present', () => {
    const { result } = renderHook(() => useAppSettingsStore());

    act(() => {
      result.current.initDraftCustomizer();
      result.current.setDraftArmorDiagramVariant('tactical-hud');
    });

    expect(result.current.getEffectiveArmorDiagramVariant()).toBe('tactical-hud');
  });
});
```

### Step 2: Run all tests

```bash
npm test -- --watchAll=false
```

### Step 3: Run build

```bash
npm run build
```

---

## Summary

This implementation:
1. Adds draft/save pattern for customizer settings (consistent with appearance)
2. Creates split-panel UI with list + large preview
3. Shows variant thumbnails with each variant's actual style
4. Updates all components to use effective getters for live preview
5. Handles save/revert lifecycle properly
