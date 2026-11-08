## Why

Mercenary salvage is allocated as `awarded` before player acceptance. The bay
currently displays it as accepted and disables Accept, preventing enrollment.
Declining an enrolled unit changes its status without removing its holdings.

## What Changes

- Derive whole-unit acceptance from one shared enrollment predicate.
- Show awarded, unenrolled units as pending review and allow acceptance.
- Refuse decline after enrollment or while acceptance is in flight.
- Refresh salvage display from live allocation and force data on reload.
- Preserve existing enrollment save, rollback, guest and provenance guards.

## Impact

K5 only, owner ruling D6. No eligibility, salvage engine, salvage processor,
combat event, schema or persistence-format changes. Parts retain their existing
status mapping and inventory insertion behavior. The panel treats accepted
salvage decisions as complete. One draft PR; Root owns merge.

Pinned parity: MekHQ e7adc2c6f3b17ec8ad243d30843e22207fe935e4 separates
wizard selection (`ResolveScenarioWizardDialog.java:1608-1618`), claimed and
leftover lists (`ResolveScenarioTracker.java:2044-2061`), and campaign addition
of kept salvage (`CamOpsSalvageUtilities.java:278-291`). See the salvage rules
document for permanent source links.
