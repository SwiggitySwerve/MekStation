## REMOVED Requirements

### Requirement: Offline Status Detection

**Reason**: Dead module, owner ruling 2026-11-07 D1 (`useOfflineStatus`, `useIsOnline` and `getOnlineStatus` had no production caller and are deleted).

**Migration**: None. The `Offline Indicator UI` requirement is served by `useOfflineIndicator`, which is unchanged.
