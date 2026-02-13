# drag-and-drop-system Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: None (UI utility)
**Affects**: critical-slots-display, equipment-tray, mobile-loadout-tray

---

## Overview

### Purpose

The drag-and-drop system provides adaptive drag-and-drop interaction for equipment placement in critical slots, with automatic backend selection based on device capabilities (mouse vs touch).

### Scope

**In Scope:**

- Adaptive DnD provider with device detection
- Native HTML5 drag-and-drop for desktop/mouse devices
- Touch backend support for mobile/touch devices
- Drag feedback (visual states, cursor changes)
- Drop zone detection and validation
- Multi-slot equipment drag handling
- Context menu for equipment removal (desktop: right-click, mobile: long-press)

**Out of Scope:**

- Equipment selection logic (handled by parent components)
- Slot validation rules (handled by critical-slot-allocation spec)
- Equipment database queries (handled by equipment-services spec)
- Touch backend package installation (optional dependency)

### Key Concepts

- **DnD Backend**: The underlying drag-and-drop implementation (HTML5Backend for mouse, TouchBackend for touch)
- **Drag Source**: A slot or tray item that can be dragged (equipment with `equipmentId`)
- **Drop Target**: An empty slot that can accept dragged equipment
- **Drop Zone**: Visual area that highlights when equipment is dragged over it
- **Drag Feedback**: Visual indicators during drag (opacity, cursor, highlighting)
- **Long Press**: Touch gesture for context menu (500ms hold)
- **Hybrid Device**: Device with both touch and mouse capabilities (e.g., touchscreen laptop)

---

## Requirements

### Requirement: Adaptive Backend Selection

The system SHALL automatically select the appropriate drag-and-drop backend based on device capabilities.

**Rationale**: Different devices require different interaction models. Mouse devices use HTML5 drag-and-drop, while touch devices need touch-specific event handling.

**Priority**: Critical

#### Scenario: Desktop/mouse device detection

**GIVEN** the user is on a desktop device with mouse/trackpad
**WHEN** the DnD provider initializes
**THEN** HTML5Backend SHALL be selected
**AND** drag-and-drop SHALL use native browser drag events
**AND** cursor SHALL change to `grab` on draggable items

#### Scenario: Touch device detection

**GIVEN** the user is on a touch device (phone/tablet)
**WHEN** the DnD provider initializes
**THEN** TouchBackend SHALL be selected (if installed)
**AND** drag-and-drop SHALL use touch events
**AND** cursor SHALL show `pointer` on draggable items

#### Scenario: Hybrid device detection

**GIVEN** the user is on a hybrid device (touchscreen laptop)
**WHEN** the DnD provider initializes
**THEN** TouchBackend SHALL be selected with `enableMouseEvents: true`
**AND** both touch and mouse interactions SHALL work
**AND** the system SHALL support both interaction modes simultaneously

#### Scenario: Touch backend not installed fallback

**GIVEN** the user is on a touch device
**AND** react-dnd-touch-backend package is not installed
**WHEN** the DnD provider initializes
**THEN** HTML5Backend SHALL be used as fallback
**AND** a warning SHALL be logged to console
**AND** drag-and-drop SHALL still function (with degraded touch experience)

### Requirement: Drag Source Behavior

The system SHALL support dragging equipment from slots and equipment tray.

**Rationale**: Users need to move equipment between slots and from tray to slots.

**Priority**: Critical

#### Scenario: Dragging equipment from slot

**GIVEN** a slot contains equipment with `equipmentId`
**AND** the equipment is not fixed (can be removed)
**WHEN** the user starts dragging the slot
**THEN** the slot SHALL become semi-transparent (opacity 50%)
**AND** the equipment ID SHALL be stored in drag data transfer
**AND** the parent component SHALL be notified via `onDragStart`
**AND** valid drop targets SHALL be highlighted

#### Scenario: Dragging fixed equipment

**GIVEN** a slot contains fixed equipment (e.g., cockpit, gyro)
**OR** a slot contains fixed OmniMech equipment (`isOmniPodMounted: false`)
**WHEN** the user attempts to drag the slot
**THEN** the drag SHALL be prevented
**AND** cursor SHALL show `not-allowed`
**AND** no drag feedback SHALL appear

#### Scenario: Dragging multi-slot equipment

**GIVEN** equipment occupies multiple slots (e.g., 3-slot weapon)
**WHEN** the user drags any slot of the equipment
**THEN** all slots SHALL show drag feedback (opacity 50%)
**AND** the equipment ID SHALL be transferred
**AND** drop targets SHALL validate against total slot count

#### Scenario: Touch drag initiation

**GIVEN** the user is on a touch device
**WHEN** the user taps and holds a draggable slot
**THEN** drag SHALL initiate after touch delay (default 0ms)
**AND** visual feedback SHALL appear
**AND** the user can drag by moving their finger

### Requirement: Drop Target Feedback

The system SHALL provide clear visual feedback for valid and invalid drop targets.

**Rationale**: Users need immediate feedback to understand where equipment can be placed.

**Priority**: High

#### Scenario: Valid drop target highlighting

**GIVEN** the user is dragging equipment
**WHEN** the equipment is dragged over an empty slot that can accept it
**THEN** the slot SHALL show green background (`bg-green-800`)
**AND** the slot SHALL show green border (`border-green-400`)
**AND** the slot SHALL scale slightly (`scale-[1.02]`)
**AND** cursor SHALL show `move` or `copy`

#### Scenario: Invalid drop target highlighting

**GIVEN** the user is dragging equipment
**WHEN** the equipment is dragged over an occupied slot
**OR** the equipment is dragged over a slot without enough space
**THEN** the slot SHALL show red background (`bg-red-900/70`)
**AND** the slot SHALL show red border (`border-red-400`)
**AND** cursor SHALL show `not-allowed`

#### Scenario: Multi-slot drop preview

**GIVEN** the user is dragging multi-slot equipment (e.g., 3 slots)
**WHEN** the equipment is dragged over a valid starting slot
**THEN** all affected slots (current + next N-1) SHALL be highlighted
**AND** if any affected slot is occupied, all SHALL show red (invalid)
**AND** if all affected slots are empty, all SHALL show green (valid)

#### Scenario: Assignable slot highlighting

**GIVEN** equipment is selected in the tray
**AND** the parent component has calculated assignable slots
**WHEN** the critical slots display renders
**THEN** all assignable empty slots SHALL show green highlight (`bg-green-900/60`)
**AND** non-assignable slots SHALL remain default color
**AND** highlighting SHALL persist until equipment is deselected

### Requirement: Drop Handling

The system SHALL handle equipment drops and notify parent components.

**Rationale**: Parent components manage state and validation; the DnD system only handles UI interaction.

**Priority**: Critical

#### Scenario: Successful drop on empty slot

**GIVEN** the user is dragging equipment
**WHEN** the equipment is dropped on an empty slot
**THEN** the drag overlay SHALL disappear
**AND** `onEquipmentDrop(location, slotIndex, equipmentId)` SHALL be called
**AND** the parent component SHALL validate and update state
**AND** drag feedback SHALL be cleared

#### Scenario: Drop on occupied slot

**GIVEN** the user is dragging equipment
**WHEN** the equipment is dropped on an occupied slot
**THEN** the drop SHALL be ignored (no callback)
**AND** the equipment SHALL return to its original position
**AND** no state change SHALL occur

#### Scenario: Drop outside valid targets

**GIVEN** the user is dragging equipment from a slot
**WHEN** the equipment is dropped outside any slot (e.g., on background)
**THEN** the drop SHALL be ignored
**AND** the equipment SHALL remain in its original slot
**AND** drag feedback SHALL be cleared

### Requirement: Equipment Removal

The system SHALL support removing equipment via context menu and keyboard shortcuts.

**Rationale**: Users need multiple ways to remove equipment (accessibility, device differences).

**Priority**: High

#### Scenario: Desktop right-click context menu

**GIVEN** the user is on a desktop device
**AND** a slot contains removable equipment
**WHEN** the user right-clicks the slot
**THEN** a context menu SHALL appear at cursor position
**AND** the menu SHALL show "Unassign" option
**AND** clicking "Unassign" SHALL call `onEquipmentRemove(location, slotIndex)`

#### Scenario: Mobile long-press context menu

**GIVEN** the user is on a touch device
**AND** a slot contains removable equipment
**WHEN** the user long-presses the slot (500ms)
**THEN** a context menu SHALL appear at touch position
**AND** the menu SHALL show "Unassign" option
**AND** tapping "Unassign" SHALL call `onEquipmentRemove(location, slotIndex)`

#### Scenario: Double-click removal

**GIVEN** a slot contains removable equipment
**WHEN** the user double-clicks the slot
**THEN** `onEquipmentRemove(location, slotIndex)` SHALL be called immediately
**AND** no context menu SHALL appear

#### Scenario: Keyboard removal

**GIVEN** a slot contains removable equipment
**AND** the slot has keyboard focus
**WHEN** the user presses Delete or Backspace
**THEN** `onEquipmentRemove(location, slotIndex)` SHALL be called
**AND** focus SHALL remain on the slot

#### Scenario: Context menu dismissal

**GIVEN** a context menu is open
**WHEN** the user clicks outside the menu
**OR** the user presses Escape
**THEN** the context menu SHALL close
**AND** no action SHALL be taken

### Requirement: Touch Support

The system SHALL provide full touch support for mobile and tablet devices.

**Rationale**: Touch devices require different interaction patterns than mouse devices.

**Priority**: High

#### Scenario: Touch drag with scroll disambiguation

**GIVEN** the user is on a touch device
**AND** `delayTouchStart` is set (e.g., 200ms)
**WHEN** the user touches and holds a draggable item
**THEN** drag SHALL not start immediately
**AND** if the user moves their finger before delay, scroll SHALL occur
**AND** if the user holds for delay duration, drag SHALL start

#### Scenario: Touch drag cancellation

**GIVEN** the user is dragging on a touch device
**WHEN** the user lifts their finger
**THEN** the drag SHALL end
**AND** if over a valid drop target, drop SHALL occur
**AND** if not over a valid target, drag SHALL cancel

#### Scenario: Long-press timer cancellation

**GIVEN** the user touches a slot to initiate long-press
**WHEN** the user moves their finger (scroll gesture)
**THEN** the long-press timer SHALL be cancelled
**AND** no context menu SHALL appear
**AND** normal scroll behavior SHALL occur

### Requirement: Accessibility

The system SHALL support keyboard navigation and screen readers.

**Rationale**: Drag-and-drop must be accessible to users who cannot use a mouse or touch.

**Priority**: Medium

#### Scenario: Keyboard focus navigation

**GIVEN** the user is navigating with keyboard
**WHEN** the user tabs through slots
**THEN** each slot SHALL receive focus in order
**AND** focused slot SHALL show focus ring
**AND** screen reader SHALL announce slot content

#### Scenario: Keyboard selection

**GIVEN** a slot has keyboard focus
**WHEN** the user presses Enter or Space
**THEN** the slot SHALL be clicked (same as mouse click)
**AND** if equipment is in tray, it SHALL be assigned to this slot
**AND** if slot has equipment, it SHALL be selected

#### Scenario: Screen reader announcements

**GIVEN** a slot is rendered
**THEN** it SHALL have `aria-label` with slot number and content
**AND** it SHALL have `aria-selected` indicating selection state
**AND** it SHALL have `role="gridcell"` for proper semantics

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Props for the adaptive DnD provider
 */
interface DndProviderAdaptiveProps {
  /** Child components that require DnD context */
  children: React.ReactNode;
  /** Force a specific backend (for testing or override) */
  forceBackend?: 'html5' | 'touch';
  /** Enable mouse events when using touch backend (for hybrid devices) */
  enableMouseEvents?: boolean;
  /** Touch backend delay in milliseconds (default: 0, use higher for scroll disambiguation) */
  delayTouchStart?: number;
}

/**
 * Device type detection result (from useDeviceType hook)
 */
interface DeviceType {
  /** Device is mobile-sized (< 768px) */
  isMobile: boolean;
  /** Device is tablet-sized (768px - 1023px) */
  isTablet: boolean;
  /** Device is desktop-sized (>= 1024px) */
  isDesktop: boolean;
  /** Device has touch capability */
  isTouch: boolean;
  /** Device has mouse/trackpad with hover capability */
  hasMouse: boolean;
  /** Device is a hybrid with both touch and mouse */
  isHybrid: boolean;
  /** Current viewport width */
  viewportWidth: number;
}

/**
 * Drag event handlers for slot components
 */
interface SlotDragHandlers {
  /** Called when drag starts from this slot */
  onDragStart?: (equipmentId: string) => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
  /** Called when equipment is dropped on this slot */
  onDrop: (equipmentId: string) => void;
  /** Called when equipment is removed from this slot */
  onRemove: () => void;
}

/**
 * Context menu state
 */
interface ContextMenuState {
  /** X position in viewport */
  x: number;
  /** Y position in viewport */
  y: number;
  /** Slot name to display */
  slotName: string;
}
```

### Required Properties

| Property            | Type      | Required | Description                                  | Valid Values      | Default |
| ------------------- | --------- | -------- | -------------------------------------------- | ----------------- | ------- |
| `forceBackend`      | `string`  | No       | Override backend selection                   | 'html5', 'touch'  | auto    |
| `enableMouseEvents` | `boolean` | No       | Enable mouse on touch backend                | true, false       | true    |
| `delayTouchStart`   | `number`  | No       | Touch delay for scroll disambiguation (ms)   | >= 0              | 0       |
| `isTouch`           | `boolean` | Yes      | Device has touch capability                  | true, false       | -       |
| `hasMouse`          | `boolean` | Yes      | Device has mouse/hover capability            | true, false       | -       |
| `isHybrid`          | `boolean` | Yes      | Device has both touch and mouse              | true, false       | -       |
| `equipmentId`       | `string`  | No       | ID of equipment being dragged                | any string        | -       |
| `canDrag`           | `boolean` | Yes      | Whether this slot can be dragged             | true, false       | -       |
| `canUnassign`       | `boolean` | Yes      | Whether equipment can be removed from slot   | true, false       | -       |
| `isDragOver`        | `boolean` | Yes      | Whether equipment is being dragged over slot | true, false       | false   |
| `isDragging`        | `boolean` | Yes      | Whether this slot is currently being dragged | true, false       | false   |
| `longPressTimer`    | `number`  | No       | Timer ID for long-press detection            | setTimeout result | null    |
| `longPressDuration` | `number`  | No       | Duration for long-press (ms)                 | > 0               | 500     |

### Type Constraints

- `delayTouchStart` MUST be >= 0
- `longPressDuration` MUST be > 0
- `equipmentId` MUST be a non-empty string when dragging
- `canDrag` MUST be false if `equipmentId` is undefined
- `canUnassign` MUST be false for fixed equipment (cockpit, gyro, etc.)
- `canUnassign` MUST be false for fixed OmniMech equipment (`isOmniPodMounted: false`)

---

## Drag-and-Drop Flow

### Desktop (HTML5Backend) Flow

**Sequence**:

1. User hovers over draggable slot → cursor changes to `grab`
2. User clicks and drags → `onDragStart` fires
3. Slot becomes semi-transparent (opacity 50%)
4. Equipment ID stored in `dataTransfer`
5. Parent component notified via `onDragStart(equipmentId)`
6. Valid drop targets highlighted green
7. User drags over slot → `onDragOver` fires
8. Slot shows green (valid) or red (invalid) feedback
9. User releases mouse → `onDrop` fires
10. Parent component receives `onDrop(location, slotIndex, equipmentId)`
11. Drag feedback cleared

**Data Transfer**:

```typescript
// On drag start
e.dataTransfer.setData('text/equipment-id', equipmentId);
e.dataTransfer.effectAllowed = 'move';

// On drop
const equipmentId = e.dataTransfer.getData('text/equipment-id');
```

### Touch (TouchBackend) Flow

**Sequence**:

1. User taps draggable slot → no immediate action
2. User holds for `delayTouchStart` ms → drag starts
3. Slot becomes semi-transparent
4. User moves finger → drag continues
5. Valid drop targets highlighted
6. User drags over slot → feedback appears
7. User lifts finger → drop occurs
8. Parent component receives `onDrop(location, slotIndex, equipmentId)`

**Touch Event Handling**:

```typescript
// Touch start - initiate long-press timer
const handleTouchStart = (e: React.TouchEvent) => {
  const timer = setTimeout(() => {
    // Start drag
    const touch = e.touches[0];
    // ... drag logic
  }, delayTouchStart);
  setLongPressTimer(timer);
};

// Touch move - cancel long-press if scrolling
const handleTouchMove = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    setLongPressTimer(null);
  }
};

// Touch end - clear timer
const handleTouchEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    setLongPressTimer(null);
  }
};
```

---

## Validation Rules

### Validation: Draggable Slot

**Rule**: Only slots with equipment that can be removed are draggable

**Severity**: Error

**Condition**:

```typescript
// Slot is draggable if:
const canDrag = !!(
  slot.equipmentId && // Has equipment
  canUnassign // Can be removed (not fixed)
);

// Fixed equipment cannot be dragged
const isFixedOnOmni =
  isOmni && slot.type === 'equipment' && slot.isOmniPodMounted === false;
const canUnassign =
  !isFixedOnOmni &&
  (slot.type === 'equipment' || (slot.type === 'system' && slot.equipmentId)); // System with equipment ID can be unassigned
```

**Error Message**: "This equipment is fixed and cannot be moved"

**User Action**: Equipment cannot be dragged; no action available

### Validation: Drop Target

**Rule**: Equipment can only be dropped on empty slots with sufficient space

**Severity**: Error

**Condition**:

```typescript
// Valid drop target if:
const isValidDropTarget =
  slot.type === 'empty' && // Slot is empty
  isAssignable; // Parent component validated space

// Parent component calculates assignable slots based on:
// - Equipment slot count
// - Available contiguous empty slots
// - Location restrictions
```

**Error Message**: "Not enough space for this equipment"

**User Action**: Drop on a different slot with more space

### Validation: Touch Backend Installation

**Rule**: Touch backend package should be installed for touch devices

**Severity**: Warning

**Condition**:

```typescript
if (useTouch && !TouchBackend) {
  logger.warn(
    'DndProviderAdaptive: Touch device detected but react-dnd-touch-backend not installed. ' +
      'Run: npm install react-dnd-touch-backend',
  );
  // Fallback to HTML5Backend
}
```

**Error Message**: "Touch backend not installed. Using HTML5 backend as fallback. Run: npm install react-dnd-touch-backend"

**User Action**: Install react-dnd-touch-backend package for better touch support

---

## Device Detection

### Device Type Detection

**Detection Method**:

```typescript
// Touch capability
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Mouse/hover capability
const hasMouse = window.matchMedia('(hover: hover)').matches;

// Hybrid device
const isHybrid = isTouch && hasMouse;

// Screen size
const isMobile = window.innerWidth < 768;
const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
const isDesktop = window.innerWidth >= 1024;
```

**Backend Selection Logic**:

```typescript
// Determine which backend to use
const useTouch =
  forceBackend === 'touch' || (forceBackend !== 'html5' && isTouch);

// Configure backend
if (useTouch) {
  backend = TouchBackend;
  options = {
    enableMouseEvents: enableMouseEvents && hasMouse,
    delayTouchStart,
    ignoreContextMenu: true,
  };
} else {
  backend = HTML5Backend;
  options = {};
}
```

---

## Dependencies

### Depends On

- **react-dnd**: Core drag-and-drop library
- **react-dnd-html5-backend**: HTML5 drag-and-drop backend for desktop
- **react-dnd-touch-backend** (optional): Touch backend for mobile devices
- **useDeviceType hook**: Device capability detection

### Used By

- **critical-slots-display**: Equipment placement in critical slots
- **equipment-tray**: Dragging equipment from tray to slots
- **mobile-loadout-tray**: Touch-optimized equipment selection

### Integration Sequence

1. **DndProviderAdaptive** wraps the application root
2. Device type is detected via **useDeviceType** hook
3. Appropriate backend is selected (HTML5 or Touch)
4. Child components use drag-and-drop via react-dnd hooks
5. Drag events trigger parent component callbacks
6. Parent components handle state updates and validation

---

## Implementation Notes

### Performance Considerations

- **Device detection runs once**: useDeviceType hook memoizes results and only updates on resize
- **Drag feedback is CSS-based**: No JavaScript animations; uses Tailwind classes for performance
- **Context menu is conditionally rendered**: Only rendered when open to avoid unnecessary DOM nodes
- **Long-press timer cleanup**: Always clear timers on unmount to prevent memory leaks

### Edge Cases

- **Hybrid devices**: Enable both touch and mouse events to support both interaction modes
- **Touch backend not installed**: Gracefully fallback to HTML5Backend with warning
- **Scroll vs drag on touch**: Use `delayTouchStart` to disambiguate (0ms for immediate drag, 200ms+ for scroll-friendly)
- **Context menu positioning**: Adjust position to keep menu on screen (check viewport bounds)
- **Multi-slot equipment**: Validate all affected slots, not just the drop target slot

### Common Pitfalls

- **Forgetting to clear timers**: Always clear long-press timers on touch end/move/unmount
- **Not preventing default on drag events**: Always call `e.preventDefault()` on dragOver to enable drop
- **Assuming touch backend is installed**: Check for TouchBackend existence before using
- **Not handling hybrid devices**: Enable mouse events on touch backend for touchscreen laptops
- **Hardcoding cursor styles**: Use conditional cursor based on device type (grab vs pointer)

### Testing Considerations

- **Force backend for testing**: Use `forceBackend` prop to test specific backends
- **Mock device detection**: Mock useDeviceType hook to test different device types
- **Test keyboard navigation**: Ensure all drag-and-drop actions have keyboard equivalents
- **Test screen reader**: Verify aria-labels and roles are correct

---

## Examples

### Example 1: Basic DnD Provider Setup

```typescript
import { DndProviderAdaptive } from '@/components/providers/DndProviderAdaptive';

function App() {
  return (
    <DndProviderAdaptive>
      <CustomizerUI />
    </DndProviderAdaptive>
  );
}
```

### Example 2: Draggable Slot Component

```typescript
function SlotRow({ slot, onDrop, onRemove, onDragStart }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canDrag = !!(slot.equipmentId && canUnassign);

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag || !slot.equipmentId) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/equipment-id', slot.equipmentId);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    onDragStart?.(slot.equipmentId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const equipmentId = e.dataTransfer.getData('text/equipment-id');
    if (equipmentId && slot.type === 'empty') {
      onDrop(equipmentId);
    }
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-green-800' : ''}`}
    >
      {slot.name || '- Empty -'}
    </div>
  );
}
```

### Example 3: Touch Long-Press Context Menu

```typescript
function SlotRow({ slot, onRemove }) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canUnassign || !isTouchDevice) return;

    const timer = setTimeout(() => {
      const touch = e.touches[0];
      setContextMenu({ x: touch.clientX, y: touch.clientY });
    }, 500);

    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {slot.name}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onUnassign={onRemove}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
```

### Example 4: Hybrid Device Configuration

```typescript
// For hybrid devices (touchscreen laptops), enable both touch and mouse
<DndProviderAdaptive
  enableMouseEvents={true}  // Enable mouse on touch backend
  delayTouchStart={0}       // Immediate drag (no scroll disambiguation)
>
  <App />
</DndProviderAdaptive>
```

### Example 5: File Drop Zone (ImportUnitDialog)

```typescript
function ImportUnitDialog() {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith('.json')) {
      setError('Please drop a JSON file');
      return;
    }

    await parseFile(file);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`dropzone ${dragActive ? 'dropzone-active' : ''}`}
    >
      Drop JSON file here
    </div>
  );
}
```

---

## References

### Official Documentation

- [React DnD Documentation](https://react-dnd.github.io/react-dnd/)
- [HTML5 Backend](https://react-dnd.github.io/react-dnd/docs/backends/html5)
- [Touch Backend](https://react-dnd.github.io/react-dnd/docs/backends/touch)
- [MDN: Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [MDN: Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

### Related Specifications

- **critical-slots-display**: Uses drag-and-drop for equipment placement
- **equipment-tray**: Drag source for equipment
- **mobile-loadout-tray**: Touch-optimized equipment selection

### Implementation Files

- `src/components/providers/DndProviderAdaptive.tsx`: Adaptive DnD provider
- `src/components/customizer/critical-slots/SlotRow.tsx`: Draggable slot component
- `src/components/customizer/dialogs/ImportUnitDialog.tsx`: File drop zone example
- `src/hooks/useDeviceType.ts`: Device detection hook

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Adaptive backend selection (HTML5 vs Touch)
- Drag source and drop target behavior
- Touch support with long-press context menu
- Accessibility requirements
- Device detection logic
- Examples and implementation notes
