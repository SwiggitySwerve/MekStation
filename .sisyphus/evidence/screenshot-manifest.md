# Screenshot Manifest

Generated: 2026-02-02T17:20:00Z
Total Screenshots: 322
Viewports: 375px (Mobile), 768px (Tablet Portrait), 1024px (Tablet Landscape), 1280px (Desktop)

## Summary

- **Home & Global**: 32 screenshots
- **Compendium**: 48 screenshots  
- **Unit Management**: 12 screenshots
- **Customizer - BattleMech**: 40 screenshots (7 tabs)
- **Customizer - Vehicle**: 16 screenshots (4 tabs)
- **Customizer - Aerospace**: 12 screenshots (3 tabs)
- **Customizer - Battle Armor**: 8 screenshots (2 tabs)
- **Customizer - Infantry**: 4 screenshots (1 view)
- **Customizer - ProtoMech**: 4 screenshots (1 view)
- **Gameplay - Pilots**: 24 screenshots
- **Gameplay - Forces**: 28 screenshots
- **Gameplay - Encounters**: 28 screenshots
- **Gameplay - Campaigns**: 12 screenshots
- **Gameplay - Quick Game**: 4 screenshots
- **Gameplay - Games**: 8 screenshots
- **Gameplay - Repair**: 8 screenshots
- **Comparison**: 8 screenshots
- **Audit & Timeline**: 8 screenshots
- **Sharing**: 8 screenshots
- **Touch Target Overlays**: 20 screenshots

## Viewport Matrix

| Viewport | Width | Project Name |
|----------|-------|--------------|
| Mobile | 375px | Mobile Chrome |
| Tablet Portrait | 768px | Tablet Portrait |
| Tablet Landscape | 1024px | Tablet Landscape |
| Desktop | 1280px | chromium |

## Screenshot Location

All screenshots are stored in:
`.sisyphus/evidence/screenshots/audit-capture.spec.ts-snapshots/`

Naming convention: `{route-name}-{project}-win32.png`

## Failed Captures (20 tests)

The following pages have known issues:
- Contacts page - networkidle timeout
- Shared items (received/sent/empty) - networkidle timeout  
- Compendium rules expanded (Mobile, Tablet Portrait) - expand button not visible
- Events navigation (Mobile, Tablet Portrait) - nav element not visible

## Re-running the Suite

To regenerate all screenshots:
\`\`\`bash
npx playwright test --grep @audit --update-snapshots
\`\`\`

To run without updating (for comparison):
\`\`\`bash
npx playwright test --grep @audit
\`\`\`
