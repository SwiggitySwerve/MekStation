# Mobile UI & PWA Design

**Date:** 2026-01-08
**Status:** Approved
**Author:** SwerveLabs

## Overview

MekStation requires mobile support and cross-platform capabilities. This design establishes a responsive, PWA-enabled architecture that maintains desktop functionality while optimizing for mobile devices.

**Goals:**
- Make all current features mobile-friendly
- Enable PWA installation on mobile devices
- Support full mobile range (320px-768px) with adaptive layouts
- Achieve functional parity between desktop and mobile

**Target Platforms:**
- Primary: Responsive web (mobile browsers)
- PWA: Installable on iOS Safari and Chrome Android
- Future: Native apps (React Native) if warranted

---

## Architecture

### Layout Architecture: Stackable Panel System

**Current State (Desktop):**
Three-panel layout visible simultaneously:
- Left sidebar (navigation)
- Center tabs (editor content)
- Right equipment tray

**Mobile Challenge:**
375px width cannot fit three panels simultaneously. Screen real estate requires rethinking information hierarchy.

**Solution: Stackable Full-Screen Panels**

Desktop (1024px+): All panels visible (existing layout)
Tablet (768px-1024px): Two-panel layout (sidebar + content, tray overlays)
Mobile (<768px): Single-panel layout with navigation stack

**Mobile Panel Navigation:**
- Each panel becomes a full-screen view
- Navigation stack with back/forward capability
- Smooth transitions between panels
- Persistent navigation bar for quick switching
- State preserved when switching between panels

**Example Mobile Flow:**
1. User opens app → sees unit catalog (default panel)
2. Taps unit → transitions to unit detail (pushes to stack)
3. Taps "Edit" → transitions to editor tabs (pushes to stack)
4. Taps equipment browser → transitions to equipment (pushes to stack)
5. Back button or swipe → returns to previous panel

**Implementation:**
- `PanelStack` component manages navigation state
- `ResponsiveContainer` wraps each panel with mobile/desktop behavior
- Panel transitions use React transition group or Framer Motion
- State management via Zustand store (panel history, current panel)

### Progressive Enhancement Strategy

Build mobile-first, then enhance for larger displays. This approach prevents awkward desktop layouts shrinking unpredictably.

**Breakpoint System:**

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| (base) | <640px | Phones (primary mobile target) |
| `sm` | 640px+ | Large phones, small tablets landscape |
| `md` | 768px+ | Tablets (iPad, etc.) |
| `lg` | 1024px+ | Desktop, large tablets |

Use Tailwind's responsive utilities exclusively. Custom breakpoints increase maintenance burden.

### Design Principles

**Touch Targets:** All interactive elements must measure 44×44px minimum (iOS/Android guideline).

**Layout Strategy:** Single-column layouts below 768px. Use drawer or sheet patterns for secondary content.

**Progressive Disclosure:** Show critical information first. Expand details on demand.

**Touch-First Patterns:** Tap-to-select replaces hover. Larger hit areas replace small controls.

### Architectural Additions

1. **PWA Infrastructure** — `manifest.json`, service worker, Next.js PWA plugin
2. **Responsive Layout Primitives** — containers, grids, stacks in `src/components/common/`
3. **Touch Interaction Utilities** — mobile-friendly alternatives to drag-and-drop
4. **Viewport Configuration** — meta tags and safe-area handling for notched devices

---

## Component Design

### Unit Editor Tabs

**Desktop:** Keep current side/top tab layout.

**Mobile:** Transform to bottom navigation bar. Places controls within thumb reach and matches mobile app conventions. Active tab content occupies scrollable container with safe-area padding.

### Critical Slot Management

**Desktop:** Retain react-dnd drag-and-drop.

**Mobile:** Replace with two-step tap interaction:
1. Tap equipment item → enters placement mode (shows highlight)
2. Tap valid slot → assigns equipment
3. Tap outside or cancel → aborts placement

**Abstraction:** Create `EquipmentAssignmentAdapter` component. Detects touch capability and swaps interaction patterns automatically.

**Mobile Layout:** Slot grid becomes horizontally scrollable rather than condensed.

### Armor Allocation Interface (Complete Redesign)

Replace SVG with **CSS Grid-based mech diagram** built from React components.

**Location Component Structure:**
- Location name label
- Current/max armor display
- Interactive point indicators (pips) or compact numeric display
- Tap/click to expand allocation controls

**Desktop Layout:** Diagram approximates human silhouette using CSS Grid. Head centered, torsos in middle, arms on sides, legs at bottom. Front/rear armor shows as split cells or toggleable view.

**Mobile Layout:** Stacks vertically (Head → Torso → Arms → Legs). Swipe or tap to switch front/rear views. Each location becomes horizontally expandable card.

**Allocation Controls:**
- Quick-add buttons: +5, +10, +20, Max
- Fine-tune stepper controls: [-] [value] [+]
- Auto-allocate dropdown (Front-weighted, Rear-weighted, Even)
- Visual progress bars showing percentage of max armor

**Why CSS Components:**
- Naturally responsive
- Easy animation with Tailwind
- Better accessibility than Canvas
- Simpler than SVG
- Uses Tailwind utilities directly

### Equipment Browser

**Desktop:** Keep side-by-side layout.

**Mobile:** Implement master-detail pattern.
- Full-screen catalog list
- Transitions to detail view on selection (React Router or state-controlled view stack)
- Filters move to collapsible drawer triggered by prominent button
- Search bar becomes sticky at top

### Shared Container Wrapper

Create `ResponsiveContainer` component. Handles:
- Safe-area insets for notched phones
- Consistent padding/spacing across mobile viewports
- Breakpoint-aware layout switching

---

## Touch Interaction Patterns

### Dual-Mode Interaction System

Detect input type and switch patterns automatically.

**Desktop Features (Unchanged):**
- Full react-dnd drag-and-drop
- Hover states and tooltips
- Keyboard navigation and shortcuts
- Multi-panel layouts
- Right-click context menus
- Standard modal dialogs

**Desktop Improvements:**
- Responsive layout (graceful window resize)
- Better keyboard focus indicators
- Smoother CSS-based armor animations
- Consistent touch targets (helps mouse users too)

**Mobile Features:**
- Two-step tap for equipment placement
- Long-press context menus for secondary actions
- Swipe gestures for tab navigation (left/right)
- Haptic feedback for confirmations and errors (Vibration API)
- Modal sheets and drawers (bottom sheets, 80% screen height)

**Detection Logic:**
- Media queries: `@media (hover: hover)` checks for mouse
- `useDeviceCapabilities` hook checks `'ontouchstart' in window`
- Pointer type detection on interaction
- Desktop touchscreens get touch patterns when touching, mouse patterns when clicking

### Mobile Interaction Utilities

**Touch Target Sizing:** `useTouchTarget` hook ensures 44×44px minimum. Adds padding without affecting visual layout.

**Sticky Controls:** Primary actions (Save, Export) stay visible at bottom of viewport. Use `position: sticky` or fixed bottom bars.

**Haptic Feedback:**
- Equipment assigned: short pulse
- Save complete: confirmation vibration
- Invalid placement: error pulse

---

## PWA Implementation

### Core Components

**Web App Manifest** (`public/manifest.json`)
- App name, icons, theme colors (match MekStation branding)
- Display mode: `standalone` (hides browser chrome)
- Orientation: `any` (support portrait and landscape)
- Start URL: `/`

**Service Worker**
Use `next-pwa` plugin for Next.js integration:
- Cache critical assets (bundle, CSS, data files) on first load
- Network-first strategy for API calls with offline fallback
- Stale-while-revalidate for equipment catalogs
- Runtime caching for record sheet SVG assets

**Install Prompts**
Add "Install App" button in header. Appears when PWA installable (`beforeinstallprompt` event). Mobile users can add to home screen.

**Offline Capabilities**
- Show offline indicator when network unavailable
- Cache custom units locally (IndexedDB fallback alongside SQLite)
- Queue save operations when offline, sync on reconnection
- Allow viewing previously loaded units offline

**App Updates**
- Service worker auto-updates in background
- Prompt user to refresh when new version available
- Show in-app notification, not browser dialog

### Mobile-Specific Configuration

**Theme:** Match BattleTech aesthetic

**Safe Areas:** Use CSS `env(safe-area-inset-*)` for notched phones

**Zoom Prevention:** Apply `touch-action: manipulation` to form inputs

**Splash Screen:** Generated from manifest icons

---

## Testing & Validation

### Visual Regression Testing

- Add Percy or Chromatic for screenshot testing across breakpoints
- Test critical paths: unit editor, armor allocation, equipment browser, record sheets
- Catch unintended layout changes from updates

### Component Testing with Responsive Variants

Extend existing Jest/RTL tests:

```typescript
const viewports = ['mobile', 'tablet', 'desktop']
viewports.forEach(viewport => {
  it(`renders armor diagram correctly on ${viewport}`, () => {
    // Test layout, interaction, visibility
  })
})
```

### Manual Testing Checklist

**Test Devices:**
- iPhone SE (375px) — smallest practical target
- iPhone 12/13 (390px) — common phone size
- iPad (768px) — tablet breakpoint
- Desktop (1920px) — existing experience

**Test Scenarios:**
- All editor tabs accessible and functional
- Equipment assignment via tap-to-place
- Armor allocation with mobile layout
- Equipment browser filters and search
- Record sheet preview and export
- Custom unit save/load/delete
- PWA install and offline mode

### Touch Interaction Testing

- Tap-to-place flow for equipment assignment
- Verify 44px minimum touch targets (axe DevTools)
- Swipe gestures for tab navigation
- Haptic feedback verification

### PWA Validation

**Lighthouse:** Score ≥90 on PWA audit

**Install Testing:**
- iOS Safari (most strict requirements)
- Chrome Android
- Desktop browsers (Edge, Firefox, Chrome)

**Offline Testing:**
- Disconnect network
- Verify cached assets load
- Test offline indicators
- Verify queue-and-sync behavior

### Cross-Browser Testing

- iOS Safari (critical — strictest PWA requirements)
- Chrome Android (most flexible)
- Desktop: Edge, Firefox, Safari, Chrome

---

## Success Criteria

- [ ] All features functional on 375px+ width
- [ ] Touch targets ≥44×44px
- [ ] PWA installable on iOS and Android
- [ ] Offline mode works for cached content
- [ ] Lighthouse PWA score ≥90
- [ ] No horizontal scroll on mobile
- [ ] Text readable without zoom (16px minimum)
- [ ] Functional parity between desktop and mobile

---

## Implementation Phases

### Phase 1: PWA Foundation
**Goal:** Installable app with responsive infrastructure

- PWA manifest configuration (`public/manifest.json`)
- Service worker setup with `next-pwa` plugin
- Install prompt UI in header
- Viewport meta tags and safe-area handling
- Basic responsive testing setup
- Lighthouse PWA audit compliance (90+ score)

**Success criteria:** PWA installable on iOS/Android, passes Lighthouse audit

---

### Phase 2: Layout Architecture
**Goal:** Stackable panel system for mobile

- `ResponsiveContainer` component with safe-area insets
- Bottom navigation bar for editor tabs (mobile)
- Stackable panel system (sidebar/tabs/tray as full-screen views)
- Navigation between panels with back/forward
- Mobile breakpoint testing
- Basic responsive utilities and hooks (`useDeviceCapabilities`)

**Success criteria:** All panels accessible and navigable on mobile, no horizontal scroll

---

### Phase 3: Touch Interactions
**Goal:** Touch-first interaction patterns

- `EquipmentAssignmentAdapter` with dual-mode (drag/tap)
- Tap-to-place flow for equipment assignment
- Touch target sizing utilities (`useTouchTarget`)
- Haptic feedback integration (Vibration API)
- Swipe gesture detection for tab navigation
- Long-press context menus for secondary actions
- Modal sheets and bottom drawers (80% screen height)

**Success criteria:** All features usable via touch on mobile devices

---

### Phase 4: Component Redesigns
**Goal:** Mobile-optimized critical components

- **Armor Allocation:** CSS Grid-based mech diagram (replaces SVG)
  - Desktop: Human silhouette layout
  - Mobile: Stacked vertical cards with swipe front/rear
  - Quick-add buttons, stepper controls, auto-allocate dropdown
- **Equipment Browser:** Master-detail pattern
  - Full-screen catalog list with sticky search
  - Detail view transitions
  - Collapsible filter drawer
- **Critical Slots:** Location-by-location view with tabs
  - Mobile: Horizontal scrolling or tabbed by location
  - Desktop: Full grid view (existing)

**Success criteria:** All critical components functional on 375px width

---

### Phase 5: Digital Gameplay Sheet
**Goal:** Interactive record sheet for gameplay

- Clickable armor pips to mark damage
- Heat tracking with clickable heat sinks
- Ammo consumption tracking
- Critical hit markers
- Save/load game state
- Share unit state (JSON export/import)
- Reset between games
- Undo/redo for game actions

**Success criteria:** Complete gameplay tracking without physical record sheets

---

### Phase 6: Polish & Optimization
**Goal:** Production-ready mobile experience

- Performance optimization (bundle size, rendering, animations)
- Smooth transitions and micro-interactions
- Comprehensive cross-browser testing (iOS Safari, Chrome Android)
- Accessibility improvements (WCAG 2.1 AA compliance)
- Visual regression testing setup (Percy/Chromatic)
- Offline capability verification
- Battery and data usage optimization

**Success criteria:** Smooth 60fps interactions, passes all testing checklists

---

## Implementation Notes

This design prioritizes:
1. **Adaptive over separate** — Single codebase, adaptive patterns
2. **Progressive enhancement** — Mobile-first, enhanced for desktop
3. **Pragmatic patterns** — Proven mobile UX over innovation
4. **Maintainability** — Leverage Tailwind and existing architecture

Desktop users retain current functionality with incremental improvements. Mobile users gain optimized touch patterns without separate codebase.

### Electron Compatibility

The Electron desktop app is fully compatible with this responsive design:

- **Desktop windows always use desktop breakpoints** — Minimum window size (1024×768px) matches the `md` breakpoint. Default size (1400×900px) is in `lg` breakpoint.
- **Responsive CSS works in Chromium** — Tailwind media queries function correctly in Electron's rendering engine.
- **PWA features are browser-only** — Service workers, install prompts, and manifest are ignored by Electron (intentional, as Electron has its own installation mechanism).
- **Dual-mode interactions work automatically** — Electron is mouse/keyboard first, so desktop patterns (react-dnd, hover states, multi-panel) always activate.
- **CSS-based armor benefits all platforms** — Replaces clunky SVG system with smoother, more maintainable approach for web and desktop.
