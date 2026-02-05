# PWA Customizer UI Improvement Options

This document presents 4 distinct approaches to improving the customizer UI for PWA/mobile usability. Each option focuses on different aspects and trade-offs.

---

## Current State Analysis

### Key Components

- **CustomizerWithRouter**: Main container with URL routing and DnD provider
- **MultiUnitTabs**: Browser-like tabs for multiple units
- **UnitEditorWithRouting**: Main editor with section tabs + GlobalLoadoutTray
- **UnitInfoBanner**: Stats display bar (fixed min-width: 380px)
- **GlobalLoadoutTray**: Equipment sidebar (fixed width: 260px collapsed: 40px)
- **CustomizerTabs**: Section tabs (Overview, Structure, Armor, Equipment, Critical Slots, Fluff, Preview)

### Current Issues

1. Fixed pixel widths prevent responsive layouts
2. Touch targets too small (py-2.5, px-4 = ~40px height)
3. Drag-and-drop uses HTML5Backend only (no touch support)
4. Context menus require right-click
5. Small text sizes (text-[10px], text-[9px])
6. No safe area handling for PWA
7. Two-column layouts don't adapt

---

## Option A: "Touch-First Overhaul"

**Focus**: Complete mobile-first redesign with touch as primary interaction

### Key Changes

#### 1. Touch Target Sizing

```typescript
// New touch-safe button styles in styles.ts
const button = {
  // Minimum 44x44px touch targets
  touchSafe: 'min-h-[44px] min-w-[44px] px-4 py-3',
  stepperTouch: 'min-h-[44px] min-w-[44px] flex items-center justify-center',
};
```

#### 2. Bottom Sheet Loadout Tray (Mobile)

Replace side tray with bottom sheet on mobile:

```tsx
// GlobalLoadoutTray becomes adaptive
<div className={`
  ${isMobile
    ? 'fixed bottom-0 left-0 right-0 h-auto max-h-[60vh] rounded-t-2xl'
    : 'w-[260px] border-l'}
  bg-slate-800 transition-transform
`}>
```

#### 3. Touch DnD Backend

```tsx
import { TouchBackend } from 'react-dnd-touch-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { isTouchDevice } from '@/utils/device';

const Backend = isTouchDevice() ? TouchBackend : HTML5Backend;
```

#### 4. Long-Press Context Actions

Replace right-click menus with long-press + action sheet:

```tsx
const useLongPress = (callback: () => void, ms = 500) => {
  // Long press detection hook
};
```

### Pros

- True mobile-first experience
- Consistent with native app patterns
- Better accessibility

### Cons

- Significant refactoring required
- Desktop experience may feel different
- Needs extensive testing on multiple devices

### Effort: **High** (2-3 weeks)

---

## Option B: "Responsive Breakpoints"

**Focus**: Add responsive breakpoints to existing components with minimal structural changes

### Key Changes

#### 1. Responsive Tray Width

```tsx
// GlobalLoadoutTray.tsx
<div className={`
  bg-slate-800 border-l border-slate-700 flex flex-col
  w-full sm:w-[200px] md:w-[240px] lg:w-[260px]
  ${isExpanded ? '' : 'w-10 sm:w-10'}
`}>
```

#### 2. Collapsible Stats Banner

```tsx
// UnitInfoBanner.tsx - Stack on mobile
<div className="flex flex-col sm:flex-row flex-wrap items-stretch">
  {/* Section 1: Identity - full width on mobile */}
  <div className="w-full sm:w-auto px-4 py-2 border-b sm:border-b-0 sm:border-r">
```

#### 3. Responsive Tab Labels

```tsx
// CustomizerTabs.tsx - Icons on mobile, labels on desktop
<button className="flex items-center gap-2 px-2 sm:px-4 py-2.5">
  {tab.icon}
  <span className="hidden sm:inline">{tab.label}</span>
</button>
```

#### 4. Stacking Two-Column Layouts

```typescript
// styles.ts - already has this but needs enforcement
const layout = {
  twoColumn: 'grid grid-cols-1 md:grid-cols-2 gap-4', // md breakpoint
};
```

### Pros

- Minimal code changes
- Progressive enhancement
- Easy to test incrementally
- Maintains desktop experience

### Cons

- Doesn't address touch interaction issues
- DnD still problematic on touch devices
- Context menus still need right-click

### Effort: **Low-Medium** (3-5 days)

---

## Option C: "Hybrid Adaptive"

**Focus**: Detect device type and serve optimized UI variant

### Key Changes

#### 1. Device Detection Hook

```tsx
// hooks/useDeviceType.ts
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      const hasTouch = 'ontouchstart' in window;

      if (width < 640 || (hasTouch && width < 768)) {
        setDeviceType('mobile');
      } else if (width < 1024 || hasTouch) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    // ...
  }, []);

  return { deviceType, isMobile: deviceType === 'mobile', isTouch: ... };
}
```

#### 2. Adaptive Components

```tsx
// UnitEditorWithRouting.tsx
function UnitEditorWithRouting({ ... }) {
  const { isMobile, isTouch } = useDeviceType();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <UnitInfoBanner stats={unitStats} compact={isMobile} />

      <div className="flex-1 flex overflow-hidden">
        {/* Tabs and content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <CustomizerTabs
            tabs={DEFAULT_CUSTOMIZER_TABS}
            activeTab={activeTabId}
            onTabChange={handleTabChange}
            iconOnly={isMobile}
          />
          {/* Tab content */}
        </div>

        {/* Tray: Side panel on desktop, bottom sheet on mobile */}
        {isMobile ? (
          <BottomSheetTray equipment={loadoutEquipment} ... />
        ) : (
          <GlobalLoadoutTray equipment={loadoutEquipment} ... />
        )}
      </div>
    </div>
  );
}
```

#### 3. Conditional DnD Backend

```tsx
// CustomizerWithRouter.tsx
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

export default function CustomizerWithRouter() {
  const { isTouch } = useDeviceType();
  const Backend = isTouch ? TouchBackend : HTML5Backend;

  return (
    <DndProvider
      backend={Backend}
      options={isTouch ? { enableMouseEvents: true } : undefined}
    >
      {/* ... */}
    </DndProvider>
  );
}
```

#### 4. Action Sheet for Mobile Context

```tsx
// components/shared/ActionSheet.tsx
interface ActionSheetProps {
  isOpen: boolean;
  actions: Array<{
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }>;
  onClose: () => void;
}

export function ActionSheet({ isOpen, actions, onClose }: ActionSheetProps) {
  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`}
    >
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl transition-transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className="w-full p-4 text-left border-b border-slate-700"
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="w-full p-4 text-center text-slate-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

### Pros

- Best of both worlds - optimized for each device type
- Maintains full desktop functionality
- Progressive enhancement for touch
- Clean separation of concerns

### Cons

- More code to maintain (two UI paths)
- Need to test both variants
- Potential for divergence over time

### Effort: **Medium** (1-2 weeks)

---

## Option D: "PWA Shell Enhancement"

**Focus**: Improve PWA-specific aspects without major UI restructuring

### Key Changes

#### 1. Safe Area Handling

```tsx
// Add to global CSS or tailwind
// globals.css
:root {
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}

// CustomizerWithRouter.tsx
<div className="min-h-screen bg-slate-900 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
```

#### 2. Viewport Meta Optimization

```html
<!-- Already in _document or layout -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
/>
```

#### 3. Touch Action Hints

```tsx
// styles.ts additions
const touch = {
  /** Prevent pull-to-refresh on scrollable areas */
  noOverscroll: 'overscroll-behavior-y-contain',
  /** Optimize for touch scrolling */
  smoothScroll: 'scroll-smooth touch-pan-y',
  /** Prevent text selection on interactive elements */
  noSelect: 'select-none',
};
```

#### 4. Input Mode Hints

```tsx
// ArmorTab.tsx - numeric keyboard on mobile
<input
  type="number"
  inputMode="decimal"
  pattern="[0-9]*\.?[0-9]*"
  className={`w-20 ${cs.input.compact} text-center`}
/>
```

#### 5. Larger Touch Targets via CSS

```typescript
// tailwind.config.ts - add touch-friendly spacing
theme: {
  extend: {
    spacing: {
      'touch': '44px', // Minimum touch target
      'touch-lg': '48px',
    },
    minHeight: {
      'touch': '44px',
    },
    minWidth: {
      'touch': '44px',
    },
  },
}
```

#### 6. Haptic Feedback (where supported)

```tsx
// hooks/useHaptics.ts
export function useHaptics() {
  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return { vibrate };
}

// Usage in buttons
const { vibrate } = useHaptics();
<button onClick={() => { vibrate(); handleAction(); }}>
```

### Pros

- Minimal structural changes
- Improves PWA "feel" significantly
- Easy to implement incrementally
- Low risk of regression

### Cons

- Doesn't solve fundamental layout issues
- Touch DnD still not addressed
- Mobile UX still suboptimal

### Effort: **Low** (2-3 days)

---

## Comparison Matrix

| Aspect             | Option A      | Option B           | Option C        | Option D     |
| ------------------ | ------------- | ------------------ | --------------- | ------------ |
| **Touch Targets**  | Full redesign | Responsive padding | Adaptive sizing | CSS only     |
| **Tray Layout**    | Bottom sheet  | Responsive width   | Both variants   | No change    |
| **DnD Touch**      | Touch backend | No change          | Conditional     | No change    |
| **Context Menus**  | Action sheets | No change          | Conditional     | No change    |
| **Safe Areas**     | Full support  | Partial            | Full support    | Full support |
| **Effort**         | High          | Low-Medium         | Medium          | Low          |
| **Risk**           | High          | Low                | Medium          | Low          |
| **Desktop Impact** | May change    | Minimal            | None            | None         |
| **Mobile UX**      | Excellent     | Good               | Excellent       | Moderate     |

---

## Recommended Approach

Consider a **phased implementation**:

1. **Phase 1**: Option D (PWA Shell) - Quick wins, 2-3 days
2. **Phase 2**: Option B (Responsive) - Layout improvements, 3-5 days
3. **Phase 3**: Option C elements (Touch backend, Bottom sheet) - As needed

This provides:

- Immediate improvements with low risk
- Progressive enhancement over time
- Ability to validate each phase before proceeding
