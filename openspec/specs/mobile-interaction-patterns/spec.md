# mobile-interaction-patterns Specification

## Purpose

Define mobile and touch interaction patterns including haptic feedback, gesture detection (long press, swipe), touch target sizing, virtual keyboard handling, and device type detection for adaptive UI rendering.

## Requirements

### Requirement: Haptic Feedback Patterns

The system SHALL provide 7 predefined haptic feedback patterns using the Vibration API with graceful degradation on unsupported devices.

#### Scenario: Light haptic feedback

- **WHEN** triggering light haptic feedback
- **THEN** vibration duration SHALL be 10ms
- **AND** use case SHALL be subtle acknowledgment (hover, minor interactions)

#### Scenario: Medium haptic feedback

- **WHEN** triggering medium haptic feedback
- **THEN** vibration duration SHALL be 25ms
- **AND** use case SHALL be button presses and selections

#### Scenario: Heavy haptic feedback

- **WHEN** triggering heavy haptic feedback
- **THEN** vibration duration SHALL be 50ms
- **AND** use case SHALL be significant actions

#### Scenario: Success haptic pattern

- **WHEN** triggering success haptic feedback
- **THEN** vibration pattern SHALL be [25ms, 50ms pause, 25ms]
- **AND** use case SHALL be operation completion and confirmations

#### Scenario: Warning haptic pattern

- **WHEN** triggering warning haptic feedback
- **THEN** vibration pattern SHALL be [15ms, 30ms pause, 15ms, 30ms pause, 15ms]
- **AND** use case SHALL be cautions and destructive action confirmations

#### Scenario: Error haptic pattern

- **WHEN** triggering error haptic feedback
- **THEN** vibration duration SHALL be 100ms
- **AND** use case SHALL be validation errors and failures

#### Scenario: Selection haptic feedback

- **WHEN** triggering selection haptic feedback
- **THEN** vibration duration SHALL be 15ms
- **AND** use case SHALL be quick selection feedback

#### Scenario: Graceful degradation

- **WHEN** Vibration API is not supported
- **THEN** haptic functions SHALL return false
- **AND** no error SHALL be thrown
- **AND** application SHALL continue without haptic feedback

### Requirement: Long Press Gesture Detection

The system SHALL detect long press gestures on both touch and mouse devices with configurable delay and movement threshold.

#### Scenario: Long press with default delay

- **WHEN** user presses and holds for 500ms without movement
- **THEN** long press callback SHALL be triggered
- **AND** regular click callback SHALL NOT be triggered

#### Scenario: Long press with custom delay

- **WHEN** user presses and holds for configured delay (e.g., 800ms)
- **THEN** long press callback SHALL be triggered after delay
- **AND** delay SHALL be configurable via options

#### Scenario: Long press canceled by movement

- **WHEN** user moves finger/mouse more than 10px during press
- **THEN** long press SHALL be canceled
- **AND** no callback SHALL be triggered
- **AND** movement threshold SHALL be configurable

#### Scenario: Regular click after short press

- **WHEN** user releases before delay threshold
- **THEN** long press callback SHALL NOT be triggered
- **AND** regular click callback SHALL be triggered (if provided)

#### Scenario: Touch and mouse event handling

- **WHEN** device supports both touch and mouse (hybrid)
- **THEN** touch events SHALL take precedence
- **AND** mouse events SHALL be ignored after touch event
- **AND** only left mouse button (button 0) SHALL trigger long press

#### Scenario: Context menu prevention

- **WHEN** long press is triggered on touch device
- **THEN** context menu SHALL be prevented by default
- **AND** prevention SHALL be configurable via preventContextMenu option

### Requirement: Swipe Gesture Detection

The system SHALL detect horizontal and vertical swipe gestures with configurable thresholds and edge detection.

#### Scenario: Horizontal swipe left

- **WHEN** user swipes left with deltaX > 50px
- **THEN** onSwipeLeft callback SHALL be triggered
- **AND** vertical movement SHALL be less than 75px

#### Scenario: Horizontal swipe right

- **WHEN** user swipes right with deltaX > 50px
- **THEN** onSwipeRight callback SHALL be triggered
- **AND** vertical movement SHALL be less than 75px

#### Scenario: Vertical swipe up

- **WHEN** user swipes up with deltaY > 50px
- **THEN** onSwipeUp callback SHALL be triggered
- **AND** horizontal movement SHALL be less than vertical movement

#### Scenario: Vertical swipe down

- **WHEN** user swipes down with deltaY > 50px
- **THEN** onSwipeDown callback SHALL be triggered
- **AND** horizontal movement SHALL be less than vertical movement

#### Scenario: Swipe threshold configuration

- **WHEN** configuring swipe detection
- **THEN** swipeThreshold SHALL default to 50px
- **AND** verticalThreshold SHALL default to 75px
- **AND** both thresholds SHALL be configurable

#### Scenario: Edge-only swipe detection

- **WHEN** leftEdgeOnly is enabled
- **THEN** swipe SHALL only be detected if starting within edgeWidth (default 20px) from left edge
- **AND** swipes starting beyond edgeWidth SHALL be ignored
- **AND** use case SHALL be iOS-style back gestures

#### Scenario: Swipe canceled by excessive vertical movement

- **WHEN** vertical movement exceeds verticalThreshold during horizontal swipe
- **THEN** swipe SHALL be canceled
- **AND** no callback SHALL be triggered
- **AND** prevents conflict with vertical scrolling

### Requirement: Touch Target Minimum Sizing

The system SHALL ensure interactive elements meet WCAG 2.5.5 minimum touch target size of 44×44 pixels without affecting visual layout.

#### Scenario: Touch target expansion with padding and negative margin

- **WHEN** content is smaller than 44px in width or height
- **THEN** positive padding SHALL expand hit area to 44px minimum
- **AND** negative margin SHALL maintain layout position
- **AND** visual appearance SHALL remain unchanged

#### Scenario: Touch target for 20×20px icon

- **WHEN** icon button has 20×20px content
- **THEN** paddingX SHALL be (44 - 20) / 2 = 12px
- **AND** paddingY SHALL be (44 - 20) / 2 = 12px
- **AND** marginX SHALL be -12px
- **AND** marginY SHALL be -12px
- **AND** total hit area SHALL be 44×44px

#### Scenario: Touch target already meets minimum

- **WHEN** content is 44px or larger
- **THEN** no padding or margin SHALL be applied
- **AND** content size SHALL be used as-is

#### Scenario: Touch target class-only variant

- **WHEN** using useTouchTargetClass hook
- **THEN** className 'touch-target' SHALL be returned
- **AND** min-width and min-height CSS SHALL be applied via class
- **AND** use case SHALL be simple buttons without dynamic sizing

### Requirement: Visual Gesture Feedback

The system SHALL provide visual feedback for touch interactions using scale and opacity transformations.

#### Scenario: Default pressed state

- **WHEN** element is pressed
- **THEN** scale SHALL be 0.97 (3% reduction)
- **AND** opacity SHALL be 0.9 (10% reduction)
- **AND** transition duration SHALL be 100ms

#### Scenario: Custom pressed state scale

- **WHEN** configuring pressed state with custom scaleFactor
- **THEN** scale SHALL use provided scaleFactor
- **AND** default SHALL be 0.97 if not specified

#### Scenario: Pressed state CSS classes

- **WHEN** applying pressed state via Tailwind classes
- **THEN** active:scale-[0.97] SHALL reduce size on press
- **AND** active:opacity-90 SHALL reduce opacity on press
- **AND** transition-all duration-100 SHALL animate changes

#### Scenario: Icon button pressed state

- **WHEN** icon button is pressed
- **THEN** scale SHALL be 0.95 (5% reduction, more pronounced)
- **AND** minimum touch target 44×44px SHALL be maintained
- **AND** focus-visible ring SHALL be shown for accessibility

### Requirement: Device Type Detection

The system SHALL detect device type based on screen size breakpoints and input capabilities with debounced resize listener.

#### Scenario: Mobile device detection

- **WHEN** viewport width is less than 768px
- **THEN** isMobile SHALL be true
- **AND** isTablet and isDesktop SHALL be false

#### Scenario: Tablet device detection

- **WHEN** viewport width is >= 768px and < 1024px
- **THEN** isTablet SHALL be true
- **AND** isMobile and isDesktop SHALL be false

#### Scenario: Desktop device detection

- **WHEN** viewport width is >= 1024px
- **THEN** isDesktop SHALL be true
- **AND** isMobile and isTablet SHALL be false

#### Scenario: Touch capability detection

- **WHEN** device has touch support
- **THEN** isTouch SHALL be true if 'ontouchstart' in window OR navigator.maxTouchPoints > 0
- **AND** detection SHALL work on iOS, Android, and Windows touch devices

#### Scenario: Mouse/hover capability detection

- **WHEN** device has mouse with hover capability
- **THEN** hasMouse SHALL be true if (hover: hover) media query matches
- **AND** detection SHALL distinguish between touch-only and hybrid devices

#### Scenario: Hybrid device detection

- **WHEN** device has both touch and mouse capabilities
- **THEN** isHybrid SHALL be true
- **AND** isTouch and hasMouse SHALL both be true
- **AND** use case SHALL be Surface tablets, touchscreen laptops

#### Scenario: Resize debouncing

- **WHEN** viewport is resized
- **THEN** device type SHALL be recalculated after 150ms debounce
- **AND** prevents excessive recalculations during resize
- **AND** updates breakpoint-based flags (isMobile, isTablet, isDesktop)

### Requirement: Virtual Keyboard Detection

The system SHALL detect virtual keyboard appearance using Visual Viewport API with height threshold and debouncing.

#### Scenario: Keyboard visibility detection

- **WHEN** visual viewport height decreases by more than 150px
- **THEN** isKeyboardVisible SHALL be true
- **AND** keyboardHeight SHALL be window.innerHeight - visualViewport.height
- **AND** visibleHeight SHALL be visualViewport.height

#### Scenario: Keyboard height threshold

- **WHEN** viewport height difference is less than 150px
- **THEN** isKeyboardVisible SHALL be false
- **AND** filters out browser chrome and minor viewport changes
- **AND** threshold SHALL be 150px constant

#### Scenario: Keyboard hidden state

- **WHEN** virtual keyboard is hidden
- **THEN** isKeyboardVisible SHALL be false
- **AND** keyboardHeight SHALL be 0
- **AND** visibleHeight SHALL be window.innerHeight

#### Scenario: Visual Viewport API support

- **WHEN** Visual Viewport API is available
- **THEN** viewport resize and scroll events SHALL be monitored
- **AND** keyboard state SHALL be calculated from viewport dimensions

#### Scenario: Visual Viewport API fallback

- **WHEN** Visual Viewport API is not supported
- **THEN** window resize and focus events SHALL be used
- **AND** isKeyboardVisible SHALL default to false
- **AND** visibleHeight SHALL be window.innerHeight

#### Scenario: Viewport change debouncing

- **WHEN** viewport dimensions change
- **THEN** keyboard state SHALL be recalculated after 100ms debounce
- **AND** prevents excessive recalculations during keyboard animation
- **AND** focus events SHALL trigger recalculation after 300ms delay

### Requirement: Responsive Breakpoints

The system SHALL provide media query hooks for responsive UI rendering with SSR-safe defaults.

#### Scenario: Breakpoint definitions

- **WHEN** defining responsive breakpoints
- **THEN** breakpoints SHALL be:
  - mobile: < 768px
  - tablet: 768px - 1023px
  - desktop: >= 1024px
- **AND** SHALL match Tailwind CSS default breakpoints (sm: 640px, md: 768px, lg: 1024px)

#### Scenario: Media query hook

- **WHEN** using useMediaQuery hook
- **THEN** hook SHALL return boolean match state
- **AND** SHALL listen to media query change events
- **AND** SHALL update on viewport resize

#### Scenario: SSR safety

- **WHEN** rendering on server (typeof window === 'undefined')
- **THEN** all device detection hooks SHALL return safe defaults
- **AND** isMobile, isTablet, isDesktop SHALL be false
- **AND** viewportWidth SHALL be 0
- **AND** prevents hydration mismatches

## Non-Goals

The following are explicitly OUT OF SCOPE for this specification:

- **Multi-touch gestures** (pinch, rotate, multi-finger swipes) - Complex gesture recognition beyond single-touch patterns
- **Drag-and-drop** - Covered by separate drag-and-drop specification
- **Accessibility focus management** - Covered by accessibility specification
- **Custom gesture recognizers** - Only predefined patterns (long press, swipe) are supported
- **Haptic feedback intensity levels** - Vibration API does not support intensity, only duration/pattern
- **Platform-specific haptics** (iOS Taptic Engine, Android Haptic Constants) - Uses standard Vibration API only

## Data Model Requirements

### Haptic Feedback Types

```typescript
/**
 * Haptic feedback patterns for different interactions
 */
export type HapticPattern =
  | 'light'      // 10ms - subtle feedback
  | 'medium'     // 25ms - button presses
  | 'heavy'      // 50ms - significant actions
  | 'success'    // [25, 50, 25] - double tap
  | 'warning'    // [15, 30, 15, 30, 15] - triple tap
  | 'error'      // [100] - long buzz
  | 'selection'; // 15ms - quick feedback

/**
 * Vibration patterns in milliseconds
 * Single number = vibrate duration
 * Array = [vibrate, pause, vibrate, pause, ...]
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [25, 50, 25],
  warning: [15, 30, 15, 30, 15],
  error: [100],
  selection: 15,
};
```

### Long Press Configuration

```typescript
/**
 * Long press configuration options
 */
interface UseLongPressOptions {
  /** Duration in milliseconds to trigger long press (default: 500) */
  delay?: number;
  /** Callback when long press is triggered */
  onLongPress: (event: React.TouchEvent | React.MouseEvent) => void;
  /** Optional callback for regular press/click */
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void;
  /** Movement threshold in pixels before canceling (default: 10) */
  moveThreshold?: number;
  /** Whether to prevent context menu on long press (default: true) */
  preventContextMenu?: boolean;
}

/**
 * Event handlers returned by useLongPress hook
 */
interface UseLongPressHandlers {
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseLeave: (event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}
```

### Swipe Gesture Configuration

```typescript
/**
 * Swipe gesture configuration
 */
export interface SwipeGestureConfig {
  /** Callback when swipe left is detected */
  onSwipeLeft?: () => void;
  /** Callback when swipe right is detected */
  onSwipeRight?: () => void;
  /** Callback when swipe up is detected */
  onSwipeUp?: () => void;
  /** Callback when swipe down is detected */
  onSwipeDown?: () => void;
  /** Minimum horizontal distance in pixels to trigger swipe (default: 50) */
  swipeThreshold?: number;
  /** Maximum vertical movement allowed before swipe is cancelled (default: 75) */
  verticalThreshold?: number;
  /** If true, only detect swipes from left edge (for back gestures) */
  leftEdgeOnly?: boolean;
  /** Distance from left edge to start gesture detection (default: 20) */
  edgeWidth?: number;
}

/**
 * Swipe gesture handlers
 */
export interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}
```

### Touch Target Configuration

```typescript
/**
 * Touch target configuration
 */
interface TouchTargetConfig {
  /** Width of the element's visual content in pixels */
  contentWidth?: number;
  /** Height of the element's visual content in pixels */
  contentHeight?: number;
  /** Minimum touch target size (default: 44px per iOS/Android guidelines) */
  minSize?: number;
}

/**
 * Touch target styles result
 */
interface TouchTargetStyles {
  /** CSS styles to apply to the element */
  style: CSSProperties;
  /** Additional class name for touch target sizing */
  className: string;
}

/**
 * Minimum touch target size per WCAG 2.5.5 and iOS/Android guidelines
 */
const DEFAULT_MIN_SIZE = 44;
```

### Device Type Detection

```typescript
/**
 * Screen size breakpoints (in pixels)
 */
const BREAKPOINTS = {
  /** Mobile: < 768px */
  mobile: 768,
  /** Tablet: >= 768px and < 1024px */
  tablet: 1024,
} as const;

/**
 * Device type detection result
 */
export interface DeviceType {
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
```

### Virtual Keyboard State

```typescript
/**
 * Virtual keyboard state
 */
export interface VirtualKeyboardState {
  /** Whether the virtual keyboard is currently visible */
  isKeyboardVisible: boolean;
  /** Height of the virtual keyboard in pixels (0 when hidden) */
  keyboardHeight: number;
  /** Available viewport height with keyboard visible */
  visibleHeight: number;
}

/**
 * Minimum height difference to consider keyboard as visible
 * Filters out small viewport changes from browser chrome
 */
const KEYBOARD_THRESHOLD_PX = 150;

/**
 * Debounce delay for viewport changes (in milliseconds)
 */
const VIEWPORT_DEBOUNCE_MS = 100;
```

### Visual Feedback Configuration

```typescript
/**
 * Pressed state style configuration
 */
export interface PressedStateStyles {
  /** CSS properties to apply when pressed */
  style: CSSProperties;
  /** Tailwind classes for pressed state */
  className: string;
}

/**
 * Feedback type for different interactions
 */
export type FeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'error';

/**
 * Touch feedback configuration
 */
export interface TouchFeedbackConfig {
  /** Enable haptic feedback */
  haptic?: boolean;
  /** Enable visual feedback */
  visual?: boolean;
  /** Feedback intensity */
  intensity?: FeedbackType;
  /** Custom scale factor for pressed state (default: 0.97) */
  scaleFactor?: number;
}

/**
 * Default pressed state scale factor
 */
const DEFAULT_SCALE_FACTOR = 0.97;

/**
 * Vibration patterns for different feedback types (in milliseconds)
 */
const VIBRATION_PATTERNS: Record<FeedbackType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  selection: [10, 30, 10],
  error: [50, 50, 50],
};
```

## Calculation Formulas

### Touch Target Padding Calculation

```typescript
/**
 * Calculate padding and margin to expand hit area to minimum size
 * while maintaining visual layout position
 */
function calculateTouchTargetPadding(
  contentSize: number,
  minSize: number = 44
): { padding: number; margin: number } {
  if (contentSize >= minSize) {
    return { padding: 0, margin: 0 };
  }
  
  const padding = (minSize - contentSize) / 2;
  const margin = -padding;
  
  return { padding, margin };
}

// Example: 20px icon button
const { padding, margin } = calculateTouchTargetPadding(20, 44);
// padding = (44 - 20) / 2 = 12px
// margin = -12px
// Result: 12px padding + 20px content + 12px padding = 44px hit area
//         -12px margin maintains original layout position
```

### Swipe Direction Detection

```typescript
/**
 * Determine swipe direction from touch coordinates
 */
function detectSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  swipeThreshold: number = 50,
  verticalThreshold: number = 75
): 'left' | 'right' | 'up' | 'down' | null {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  
  const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
  
  // Cancel if vertical movement exceeds threshold during horizontal swipe
  if (isHorizontalSwipe && Math.abs(deltaY) > verticalThreshold) {
    return null;
  }
  
  if (isHorizontalSwipe) {
    if (Math.abs(deltaX) > swipeThreshold) {
      return deltaX > 0 ? 'right' : 'left';
    }
  } else {
    if (Math.abs(deltaY) > swipeThreshold) {
      return deltaY > 0 ? 'down' : 'up';
    }
  }
  
  return null;
}
```

### Virtual Keyboard Height Calculation

```typescript
/**
 * Calculate virtual keyboard height from viewport dimensions
 */
function calculateKeyboardHeight(
  windowHeight: number,
  viewportHeight: number,
  threshold: number = 150
): { isVisible: boolean; height: number } {
  const heightDifference = windowHeight - viewportHeight;
  const isVisible = heightDifference > threshold;
  
  return {
    isVisible,
    height: isVisible ? heightDifference : 0,
  };
}

// Example: iPhone with keyboard
// windowHeight = 844px (full screen)
// viewportHeight = 500px (visible area)
// heightDifference = 344px > 150px threshold
// Result: { isVisible: true, height: 344 }
```

## Validation Rules

### Haptic Feedback Validation

```typescript
/**
 * Validate haptic pattern
 */
function validateHapticPattern(pattern: unknown): pattern is HapticPattern {
  const validPatterns: HapticPattern[] = [
    'light', 'medium', 'heavy', 'success', 'warning', 'error', 'selection'
  ];
  return typeof pattern === 'string' && validPatterns.includes(pattern as HapticPattern);
}

/**
 * Validate custom vibration pattern
 */
function validateVibrationPattern(pattern: unknown): pattern is number | number[] {
  if (typeof pattern === 'number') {
    return pattern >= 0 && Number.isFinite(pattern);
  }
  if (Array.isArray(pattern)) {
    return pattern.every(n => typeof n === 'number' && n >= 0 && Number.isFinite(n));
  }
  return false;
}
```

### Touch Target Validation

```typescript
/**
 * Validate touch target meets minimum size
 */
function validateTouchTargetSize(
  width: number,
  height: number,
  minSize: number = 44
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (width < minSize) {
    errors.push(`Touch target width ${width}px is below minimum ${minSize}px`);
  }
  if (height < minSize) {
    errors.push(`Touch target height ${height}px is below minimum ${minSize}px`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Gesture Configuration Validation

```typescript
/**
 * Validate long press configuration
 */
function validateLongPressConfig(config: UseLongPressOptions): string[] {
  const errors: string[] = [];
  
  if (config.delay !== undefined && (config.delay < 0 || !Number.isFinite(config.delay))) {
    errors.push('Long press delay must be a positive finite number');
  }
  
  if (config.moveThreshold !== undefined && (config.moveThreshold < 0 || !Number.isFinite(config.moveThreshold))) {
    errors.push('Move threshold must be a positive finite number');
  }
  
  if (typeof config.onLongPress !== 'function') {
    errors.push('onLongPress must be a function');
  }
  
  return errors;
}

/**
 * Validate swipe gesture configuration
 */
function validateSwipeConfig(config: SwipeGestureConfig): string[] {
  const errors: string[] = [];
  
  if (config.swipeThreshold !== undefined && (config.swipeThreshold < 0 || !Number.isFinite(config.swipeThreshold))) {
    errors.push('Swipe threshold must be a positive finite number');
  }
  
  if (config.verticalThreshold !== undefined && (config.verticalThreshold < 0 || !Number.isFinite(config.verticalThreshold))) {
    errors.push('Vertical threshold must be a positive finite number');
  }
  
  if (config.edgeWidth !== undefined && (config.edgeWidth < 0 || !Number.isFinite(config.edgeWidth))) {
    errors.push('Edge width must be a positive finite number');
  }
  
  const hasCallback = config.onSwipeLeft || config.onSwipeRight || config.onSwipeUp || config.onSwipeDown;
  if (!hasCallback) {
    errors.push('At least one swipe callback must be provided');
  }
  
  return errors;
}
```

## Implementation Notes

### Haptic Feedback

- **Vibration API Support**: Check `'vibrate' in navigator` before use
- **Graceful Degradation**: Always return false on unsupported devices, never throw
- **Try-Catch Wrapping**: Wrap all `navigator.vibrate()` calls in try-catch (can be blocked by permissions)
- **Cancellation**: Call `navigator.vibrate(0)` to stop ongoing vibration
- **Pattern Format**: Single number = duration, array = [vibrate, pause, vibrate, ...]

### Long Press Detection

- **Hybrid Device Handling**: Use `isTouchRef` flag to prevent duplicate events on touch+mouse devices
- **Movement Threshold**: Default 10px prevents accidental cancellation from finger jitter
- **Context Menu**: Prevent by default on touch to avoid conflicts with long press actions
- **Cleanup**: Always clear timeout on unmount to prevent memory leaks
- **Mouse Button**: Only left button (button === 0) should trigger long press

### Swipe Gesture Detection

- **Direction Priority**: Horizontal vs vertical determined by `Math.abs(deltaX) > Math.abs(deltaY)`
- **Scroll Conflict**: Cancel horizontal swipe if vertical movement exceeds threshold (prevents conflict with scrolling)
- **Edge Detection**: For back gestures, check `startX <= edgeWidth` before processing
- **Ref Cleanup**: Reset touch refs on unmount and after each gesture completes
- **Tab Swipe Variant**: Pre-configured with 50px threshold for tab navigation
- **Back Swipe Variant**: Pre-configured with leftEdgeOnly=true, 100px threshold for iOS-style back gesture

### Touch Target Sizing

- **Padding + Negative Margin Technique**: Expands hit area without affecting layout
- **WCAG 2.5.5 Compliance**: 44×44px minimum per accessibility guidelines
- **iOS/Android Guidelines**: Both platforms recommend 44px minimum
- **Dynamic Calculation**: Only apply padding/margin if content is below minimum
- **Class-Only Variant**: Use `useTouchTargetClass()` for simple cases with CSS min-width/min-height

### Visual Feedback

- **Scale Factor**: Default 0.97 (3% reduction) for buttons, 0.95 (5% reduction) for icon buttons
- **Transition Duration**: 100ms for smooth but responsive feel
- **Active Pseudo-Class**: Use `:active` for CSS-only pressed states
- **Opacity Reduction**: 0.9 (10% reduction) provides subtle visual feedback
- **Focus Ring**: Always include focus-visible ring for keyboard accessibility

### Device Type Detection

- **Breakpoint Alignment**: Match Tailwind CSS defaults (md: 768px, lg: 1024px)
- **Touch Detection**: Use both `'ontouchstart' in window` and `navigator.maxTouchPoints > 0` for broad compatibility
- **Hover Detection**: `(hover: hover)` media query distinguishes touch-only from hybrid devices
- **Resize Debouncing**: 150ms delay prevents excessive recalculations
- **SSR Safety**: Return safe defaults (all false, width 0) when `typeof window === 'undefined'`
- **Hybrid Devices**: Surface tablets, touchscreen laptops have both `isTouch` and `hasMouse` true

### Virtual Keyboard Detection

- **Visual Viewport API**: Preferred method, supported on iOS 13+, Android Chrome 61+
- **Fallback Events**: Use window resize + focus/blur events on older browsers
- **Height Threshold**: 150px filters out browser chrome and minor viewport changes
- **Debouncing**: 100ms delay prevents excessive recalculations during keyboard animation
- **Focus Delay**: 300ms delay after focus event allows keyboard animation to complete
- **SSR Safety**: Return safe defaults when `typeof window === 'undefined'`

### Performance Considerations

- **Event Listener Cleanup**: Always remove listeners on unmount
- **Debouncing**: Use debounce for resize and viewport change events
- **Ref Usage**: Use refs for gesture tracking to avoid re-renders
- **Memoization**: Memoize touch target styles calculation
- **Passive Listeners**: Consider passive: true for touch event listeners (not applicable in React synthetic events)

## Examples

### Haptic Feedback Usage

```typescript
import { useHaptics } from '@/hooks/useHaptics';

function EquipmentSlot() {
  const { vibrate, isSupported } = useHaptics();
  
  const handleDrop = () => {
    vibrate('medium'); // 25ms tap on equipment assignment
    assignEquipment();
  };
  
  const handleSave = () => {
    vibrate('success'); // Double tap pattern on save
    saveConfiguration();
  };
  
  const handleError = () => {
    vibrate('error'); // Long buzz on validation error
    showErrorMessage();
  };
  
  return (
    <div onDrop={handleDrop}>
      {isSupported && <span>Haptic feedback enabled</span>}
    </div>
  );
}
```

### Long Press Gesture

```typescript
import { useLongPress } from '@/hooks/useLongPress';

function UnitCard({ unit }) {
  const [showActions, setShowActions] = useState(false);
  
  const longPressHandlers = useLongPress({
    delay: 500,
    onLongPress: () => setShowActions(true),
    onClick: () => selectUnit(unit),
    moveThreshold: 10,
  });
  
  return (
    <div {...longPressHandlers} className="unit-card">
      <h3>{unit.name}</h3>
      {showActions && <ActionMenu />}
    </div>
  );
}
```

### Swipe Gestures

```typescript
import { useSwipeGestures, useBackSwipeGesture } from '@/hooks/useSwipeGestures';

// Tab navigation with swipe
function TabbedInterface() {
  const [activeTab, setActiveTab] = useState(0);
  
  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: () => setActiveTab(prev => Math.min(prev + 1, tabs.length - 1)),
    onSwipeRight: () => setActiveTab(prev => Math.max(prev - 1, 0)),
    swipeThreshold: 50,
  });
  
  return <div {...swipeHandlers}>{tabs[activeTab].content}</div>;
}

// iOS-style back gesture
function DetailPanel() {
  const backSwipeHandlers = useBackSwipeGesture({
    onSwipeRight: () => navigation.goBack(),
  });
  
  return <div {...backSwipeHandlers}>Panel content</div>;
}
```

### Touch Target Sizing

```typescript
import { useTouchTarget, useTouchTargetClass } from '@/hooks/useTouchTarget';

// Icon button with dynamic sizing
function CloseButton() {
  const { style, className } = useTouchTarget({
    contentWidth: 20,
    contentHeight: 20,
  });
  
  return (
    <button style={style} className={className}>
      <CloseIcon size={20} />
    </button>
  );
}

// Simple button with class-only
function ActionButton() {
  const className = useTouchTargetClass();
  
  return <button className={className}>Delete</button>;
}
```

### Visual Feedback

```typescript
import { getPressedStyles, getTouchButtonClasses, getIconButtonClasses } from '@/utils/touch/gestureFeedback';

// Button with pressed state
function TouchButton() {
  const [pressed, setPressed] = useState(false);
  const pressedStyle = getPressedStyles({ scaleFactor: 0.95 });
  
  return (
    <button
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={pressed ? pressedStyle.style : undefined}
    >
      Press Me
    </button>
  );
}

// CSS-only pressed state
function SimpleButton() {
  return (
    <button className={getTouchButtonClasses()}>
      Click Me
    </button>
  );
}

// Icon button with touch-safe tap area
function IconButton() {
  return (
    <button className={getIconButtonClasses('md')}>
      <SettingsIcon />
    </button>
  );
}
```

### Device Type Detection

```typescript
import { useDeviceType } from '@/hooks/useDeviceType';

function AdaptiveUI() {
  const { isMobile, isTablet, isTouch, isHybrid } = useDeviceType();
  
  if (isMobile && isTouch) {
    return <MobileUI />;
  }
  
  if (isTablet) {
    return <TabletUI />;
  }
  
  if (isHybrid) {
    return <HybridUI />; // Surface tablet, touchscreen laptop
  }
  
  return <DesktopUI />;
}
```

### Virtual Keyboard Handling

```typescript
import { useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';

function ChatInput() {
  const { isKeyboardVisible, keyboardHeight, visibleHeight } = useVirtualKeyboard();
  
  useEffect(() => {
    if (isKeyboardVisible && document.activeElement) {
      // Scroll focused input into view
      document.activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isKeyboardVisible]);
  
  return (
    <div
      style={{
        paddingBottom: isKeyboardVisible ? keyboardHeight : 0,
        maxHeight: visibleHeight - 60, // Account for header
      }}
    >
      <input type="text" placeholder="Type a message..." />
    </div>
  );
}
```

### Combined Haptic and Visual Feedback

```typescript
import { withFeedback, triggerFeedback } from '@/utils/touch/gestureFeedback';

function InteractiveButton() {
  const handleClick = withFeedback(
    () => performAction(),
    { haptic: true, intensity: 'medium' }
  );
  
  return (
    <button onClick={handleClick} className={getTouchButtonClasses()}>
      Tap Me
    </button>
  );
}

// Manual feedback triggering
function CustomInteraction() {
  const handlePress = () => {
    triggerFeedback({ haptic: true, intensity: 'heavy' });
    performHeavyAction();
  };
  
  return <div onTouchStart={handlePress}>Heavy Action</div>;
}
```

## Dependencies

### External Dependencies

- **React** (hooks: useState, useEffect, useCallback, useRef, useMemo)
- **Web APIs**:
  - Vibration API (`navigator.vibrate`)
  - Visual Viewport API (`window.visualViewport`)
  - Media Query API (`window.matchMedia`)
  - Touch Events (`TouchEvent`, `touches`, `clientX`, `clientY`)
  - Mouse Events (`MouseEvent`, `button`, `clientX`, `clientY`)

### Internal Dependencies

- None (foundational mobile interaction patterns)

### Used By

- **UI Components**: All interactive components (buttons, cards, panels)
- **Drag-and-Drop System**: Touch target sizing, haptic feedback
- **Navigation**: Swipe gestures for tab switching, back gestures
- **Forms**: Virtual keyboard detection, touch target sizing
- **Responsive Layout**: Device type detection, breakpoint hooks

## References

- **WCAG 2.5.5**: Target Size (Minimum 44×44 CSS pixels) - https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- **iOS Human Interface Guidelines**: Touch Targets (44pt minimum) - https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/
- **Android Material Design**: Touch Targets (48dp minimum) - https://material.io/design/usability/accessibility.html#layout-and-typography
- **MDN Vibration API**: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- **MDN Visual Viewport API**: https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
- **MDN Touch Events**: https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
- **Tailwind CSS Breakpoints**: https://tailwindcss.com/docs/responsive-design

## Implementation Files

- `src/hooks/useHaptics.ts` - Haptic feedback hook (140 lines)
- `src/hooks/useLongPress.ts` - Long press gesture detection (209 lines)
- `src/hooks/useSwipeGestures.ts` - Swipe gesture detection (232 lines)
- `src/hooks/useTouchTarget.ts` - Touch target sizing (116 lines)
- `src/hooks/useVirtualKeyboard.ts` - Virtual keyboard detection (224 lines)
- `src/hooks/useDeviceType.ts` - Device type detection (135 lines)
- `src/utils/hapticFeedback.ts` - Haptic feedback utilities (242 lines)
- `src/utils/responsive.ts` - Responsive breakpoint hooks (66 lines)
- `src/utils/touch/gestureFeedback.ts` - Visual and haptic feedback utilities (309 lines)

**Total**: ~1,673 lines of implementation code
