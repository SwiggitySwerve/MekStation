# MekStation PWA Testing Checklist

## Automated Tests (Playwright)

Run with: `npm run test:e2e`

### Test Coverage
- [x] Homepage loads without errors
- [x] No broken images
- [x] Accessibility: interactive elements have accessible names
- [x] Document structure valid
- [x] No failed network requests
- [x] Fast page load (< 5s)
- [x] Dark mode support
- [x] Light mode support
- [x] Mobile navigation rendering
- [x] Touch-friendly target sizes
- [x] Touch event responses
- [x] Swipe gesture support
- [x] Responsive layout adapts to viewport
- [x] PWA manifest present and valid
- [x] Service worker support
- [x] Theme color meta tag
- [x] Apple touch icon
- [x] Static asset caching
- [x] Offline page available

---

## Manual Testing Checklist

### PWA Installation
- [ ] Chrome/Edge: Install prompt appears in address bar (desktop)
- [ ] Chrome Android: "Add to Home Screen" banner appears
- [ ] Safari iOS: Can add to home screen via share menu
- [ ] Installed app opens in standalone mode (no browser UI)
- [ ] App icon appears correctly on home screen

### Offline Support
1. Open DevTools → Application → Service Workers
   - [ ] Service worker is registered and activated
2. Go to Network tab → Check "Offline"
   - [ ] Offline page displays when navigating
   - [ ] Previously cached pages still work
3. Uncheck "Offline"
   - [ ] App reconnects and works normally

### Mobile Touch Interactions
1. Use Chrome DevTools device toolbar (Ctrl+Shift+M)
   - [ ] Select iPhone or Pixel device preset

2. Bottom Navigation Bar
   - [ ] Visible on mobile viewport
   - [ ] All 5 tabs are tappable (44x44px minimum)
   - [ ] Active tab is highlighted
   - [ ] Smooth tab switching

3. Touch Targets
   - [ ] All buttons meet 44x44px minimum
   - [ ] Adequate spacing between touch targets
   - [ ] No accidental taps on adjacent elements

4. Swipe Gestures
   - [ ] Can swipe left/right between tabs (if implemented)
   - [ ] Swipe feels natural and responsive

### Component Testing

#### Armor Diagram
- [ ] Front/rear toggle works
- [ ] All 8 locations render correctly
- [ ] Expandable cards work on mobile
- [ ] Increment/decrement buttons work
- [ ] Auto-allocate dropdown (if present)

#### Equipment Catalog
- [ ] Search filters items correctly
- [ ] Filter drawer opens from bottom
- [ ] Category checkboxes filter correctly
- [ ] Item tap opens detail view
- [ ] Smooth transitions

#### Equipment Detail
- [ ] Slide-in animation works
- [ ] Back button returns to catalog
- [ ] All stats display correctly
- [ ] Assign button works (if present)

#### Gameplay Components
- [ ] Armor pips show damage states
- [ ] Heat tracker shows warning colors
- [ ] Ammo counter decrements correctly

### Responsive Design

1. Desktop (1200px+)
   - [ ] CSS Grid layouts work
   - [ ] Desktop-specific elements visible
   - [ ] No horizontal scroll

2. Tablet (768px - 1199px)
   - [ ] Layout adapts appropriately
   - [ ] Touch targets still adequate

3. Mobile (< 768px)
   - [ ] Single column layout
   - [ ] Bottom nav visible
   - [ ] Mobile-specific elements visible
   - [ ] No content cut off

### Dark Mode
1. System preferences → Dark mode
   - [ ] App respects system preference
   - [ ] All text is readable
   - [ ] Contrast ratios adequate
   - [ ] No white flashes on load

### Performance
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 5s
- [ ] No layout shifts after load
- [ ] Smooth scrolling (60fps)
- [ ] No memory leaks during use

---

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Run with Playwright UI
npm run test:e2e:ui

# Debug a specific test
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Update visual snapshots
npx playwright test --update-snapshots
```

## Browser Compatibility

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅      | ✅     |
| Firefox | ⚠️ (no SW) | ⚠️   |
| Safari  | ⚠️      | ⚠️     |
| Edge    | ✅      | ✅     |

Note: Service workers may not work in all browsers during development.
