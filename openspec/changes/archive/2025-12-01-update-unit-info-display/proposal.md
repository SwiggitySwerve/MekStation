# Change: Integrate Unit Info Banner and Add Structure Weight Summary

## Why

The customizer editor was missing the at-a-glance unit statistics banner and the Structure tab needed a quick-reference weight summary at the top for better UX.

## What Changes

- Integrate `UnitInfoBanner` component into `CustomizerContent.tsx` editor view
- Add compact structural weight summary bar at top of Structure tab
- Remove redundant weight summary from bottom of Structure tab

## Impact

- Affected specs: `unit-info-banner`, `customizer-tabs`
- Affected code: `CustomizerContent.tsx`, `StructureTab.tsx`
