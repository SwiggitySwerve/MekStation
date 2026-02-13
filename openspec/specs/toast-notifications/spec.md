# toast-notifications Specification

## Purpose

Provides transient feedback notifications for user actions and system events throughout the application. Uses a React context provider pattern for app-wide availability. Includes specialized hooks for P2P sync event notifications (useSyncNotifications, useSyncToasts).

## Requirements

### Requirement: Toast Provider Architecture

The toast system SHALL use a React context provider pattern for app-wide availability.

#### Scenario: Provider mounting

- **WHEN** ToastProvider wraps the application
- **THEN** useToast hook is available in all child components
- **AND** toast container renders at bottom-right of viewport

#### Scenario: Hook usage

- **WHEN** component calls useToast()
- **THEN** showToast, dismissToast, and dismissAll functions are returned
- **AND** calling showToast displays a new toast notification

#### Scenario: Missing provider

- **WHEN** useToast is called outside ToastProvider
- **THEN** error is thrown with helpful message

### Requirement: Toast Variants

The toast system SHALL support four semantic variants with distinct styling.

#### Scenario: Success toast

- **WHEN** showToast is called with variant "success"
- **THEN** toast displays with green background (bg-green-900/90)
- **AND** green border and checkmark icon
- **AND** appropriate for confirming completed actions

#### Scenario: Error toast

- **WHEN** showToast is called with variant "error"
- **THEN** toast displays with red background (bg-red-900/90)
- **AND** red border and X icon
- **AND** appropriate for reporting failures

#### Scenario: Warning toast

- **WHEN** showToast is called with variant "warning"
- **THEN** toast displays with amber background (bg-amber-900/90)
- **AND** amber border and warning triangle icon
- **AND** appropriate for cautionary messages

#### Scenario: Info toast

- **WHEN** showToast is called with variant "info"
- **THEN** toast displays with blue background (bg-blue-900/90)
- **AND** blue border and info circle icon
- **AND** appropriate for neutral information

### Requirement: Auto-Dismiss Behavior

Toasts SHALL automatically dismiss after a configurable duration.

#### Scenario: Default auto-dismiss

- **WHEN** toast is displayed without custom duration
- **THEN** toast auto-dismisses after 3000ms (3 seconds)

#### Scenario: Custom duration

- **WHEN** showToast is called with duration parameter
- **THEN** toast auto-dismisses after specified milliseconds

#### Scenario: Persistent toast

- **WHEN** showToast is called with duration of 0
- **THEN** toast remains until manually dismissed

### Requirement: Manual Dismissal

Users SHALL be able to manually dismiss toasts.

#### Scenario: Dismiss button

- **WHEN** toast is displayed
- **THEN** X button appears on right side of toast
- **AND** clicking X immediately dismisses the toast

#### Scenario: Dismiss animation

- **WHEN** toast is dismissed (manually or auto)
- **THEN** toast fades out and slides right over 200ms
- **AND** toast is removed from DOM after animation

### Requirement: Action Buttons

Toasts SHALL optionally support action buttons.

#### Scenario: Action button display

- **WHEN** showToast is called with action config
- **THEN** action button appears between message and dismiss button
- **AND** button displays provided label text

#### Scenario: Action button click

- **WHEN** user clicks the action button
- **THEN** provided onClick callback is executed
- **AND** toast is dismissed

### Requirement: Toast Stacking

Multiple toasts SHALL stack vertically.

#### Scenario: Multiple toasts

- **WHEN** multiple toasts are displayed simultaneously
- **THEN** toasts stack vertically with 8px gap
- **AND** newest toast appears at bottom
- **AND** each toast can be dismissed independently

### Requirement: Accessibility

Toasts SHALL be accessible to screen readers.

#### Scenario: ARIA attributes

- **WHEN** toast is displayed
- **THEN** toast has role="alert"
- **AND** aria-live="polite" for non-intrusive announcements

#### Scenario: Dismiss button accessibility

- **WHEN** dismiss button is rendered
- **THEN** button has aria-label="Dismiss notification"

### Requirement: Sync Notifications Hook

The useSyncNotifications hook SHALL provide notification functions for P2P sync events.

**Source**: `src/hooks/useSyncNotifications.ts:130-338`

#### Scenario: Share received notification

- **GIVEN** useSyncNotifications is called with enabled=true
- **WHEN** notifyShareReceived is called with ShareReceivedData
- **THEN** info toast is displayed with message "{fromContactName} shared "{itemName}" with you"
- **AND** toast duration is 5000ms
- **AND** "View" action button is shown if onViewShare callback provided

#### Scenario: Multiple items shared notification

- **GIVEN** useSyncNotifications is called
- **WHEN** notifyShareReceived is called with itemCount > 1
- **THEN** info toast displays "{fromContactName} shared {itemCount} {type}s with you"
- **AND** plural form is used for item type

#### Scenario: Conflict detected notification

- **GIVEN** useSyncNotifications is called
- **WHEN** notifyConflictDetected is called with ISyncConflict
- **THEN** warning toast is displayed with message "Sync conflict detected for {type} "{itemName}""
- **AND** toast duration is 8000ms
- **AND** "Resolve" action button is shown if onResolveConflict callback provided

#### Scenario: Sync completion notification

- **GIVEN** useSyncNotifications is called
- **WHEN** notifySyncComplete is called with changesReceived=3, changesSent=2
- **THEN** success toast displays "Synced with {peerName}: received 3, sent 2 changes"
- **AND** toast duration is 4000ms
- **AND** "Details" action button is shown if onViewSyncDetails callback provided

#### Scenario: Sync completion with no changes

- **GIVEN** useSyncNotifications is called
- **WHEN** notifySyncComplete is called with changesReceived=0, changesSent=0
- **THEN** no toast is displayed (silent)

#### Scenario: Peer connected notification

- **GIVEN** useSyncNotifications is called
- **WHEN** notifyConnectionChanged is called with state="connected"
- **THEN** success toast displays "Connected to {peerName}"
- **AND** toast duration is 3000ms

#### Scenario: Peer disconnected notification

- **GIVEN** useSyncNotifications is called
- **WHEN** notifyConnectionChanged is called with state="disconnected"
- **THEN** info toast displays "Disconnected from {peerName}"
- **AND** toast duration is 3000ms

#### Scenario: Connection failed notification

- **GIVEN** useSyncNotifications is called
- **WHEN** notifyConnectionChanged is called with state="failed"
- **THEN** warning toast displays "Failed to connect to {peerName}"
- **AND** toast duration is 3000ms

#### Scenario: Connecting state (no notification)

- **GIVEN** useSyncNotifications is called
- **WHEN** notifyConnectionChanged is called with state="connecting"
- **THEN** no toast is displayed (silent)

#### Scenario: Notification deduplication

- **GIVEN** useSyncNotifications is called
- **WHEN** notifyShareReceived is called twice with same itemName and fromContactName within 60 seconds
- **THEN** only first notification is displayed
- **AND** second call is silently ignored

#### Scenario: Disabled notifications

- **GIVEN** useSyncNotifications is called with enabled=false
- **WHEN** any notify function is called
- **THEN** no toast is displayed

### Requirement: Sync Toasts Hook

The useSyncToasts hook SHALL connect P2P sync events to the toast notification system.

**Source**: `src/hooks/useSyncToasts.ts:16-80`

#### Scenario: App-root mounting

- **GIVEN** ToastProvider wraps the application
- **WHEN** useSyncToasts is called at app root
- **THEN** hook subscribes to P2P sync events
- **AND** unsubscribes on unmount

#### Scenario: Room connected event

- **GIVEN** useSyncToasts is mounted
- **WHEN** P2P sync event type="connected" is emitted
- **THEN** success toast displays "Connected to room {roomCode}" (formatted as XXX-XXX)
- **AND** toast duration is 3000ms

#### Scenario: Room disconnected event

- **GIVEN** useSyncToasts is mounted
- **WHEN** P2P sync event type="disconnected" is emitted with reason
- **THEN** warning toast displays "Disconnected: {reason}"
- **AND** toast duration is 4000ms

#### Scenario: Room destroyed (no notification)

- **GIVEN** useSyncToasts is mounted
- **WHEN** P2P sync event type="disconnected" is emitted with reason="Room destroyed"
- **THEN** no toast is displayed (silent)

#### Scenario: Peer joined event

- **GIVEN** useSyncToasts is mounted
- **WHEN** P2P sync event type="peer-joined" is emitted
- **THEN** info toast displays "{peer.name} joined the room" (or "A peer joined the room" if no name)
- **AND** toast duration is 3000ms

#### Scenario: Peer left event

- **GIVEN** useSyncToasts is mounted
- **WHEN** P2P sync event type="peer-left" is emitted
- **THEN** info toast displays "A peer left the room"
- **AND** toast duration is 3000ms

#### Scenario: Sync completed event (silent)

- **GIVEN** useSyncToasts is mounted
- **WHEN** P2P sync event type="sync-completed" is emitted
- **THEN** no toast is displayed (too noisy)

#### Scenario: Conflict event

- **GIVEN** useSyncToasts is mounted
- **WHEN** P2P sync event type="conflict" is emitted
- **THEN** warning toast displays "Sync conflict detected. Manual resolution may be needed."
- **AND** toast duration is 6000ms

#### Scenario: Error event

- **GIVEN** useSyncToasts is mounted
- **WHEN** P2P sync event type="error" is emitted with message
- **THEN** error toast displays event.message (or "Sync error occurred" if no message)
- **AND** toast duration is 5000ms

---

## Data Model Requirements

### SyncNotificationEvent

**Source**: `src/hooks/useSyncNotifications.ts:27-34`

```typescript
export interface SyncNotificationEvent {
  readonly type:
    | 'share_received'
    | 'conflict_detected'
    | 'sync_complete'
    | 'connection_changed';
  readonly data?: unknown;
}
```

Discriminated union type for sync notification events.

### ShareReceivedData

**Source**: `src/hooks/useSyncNotifications.ts:36-41`

```typescript
export interface ShareReceivedData {
  readonly itemName: string;
  readonly itemType: ShareableContentType | 'folder';
  readonly fromContactName: string;
  readonly itemCount?: number;
}
```

Data payload for share_received events.

### SyncCompleteData

**Source**: `src/hooks/useSyncNotifications.ts:43-47`

```typescript
export interface SyncCompleteData {
  readonly peerName: string;
  readonly changesReceived: number;
  readonly changesSent: number;
}
```

Data payload for sync_complete events.

### ConnectionChangedData

**Source**: `src/hooks/useSyncNotifications.ts:49-52`

```typescript
export interface ConnectionChangedData {
  readonly peerName: string;
  readonly state: P2PConnectionState;
}
```

Data payload for connection_changed events.

### UseSyncNotificationsOptions

**Source**: `src/hooks/useSyncNotifications.ts:54-66`

```typescript
export interface UseSyncNotificationsOptions {
  /** Whether notifications are enabled */
  readonly enabled?: boolean;
  /** Callback when user clicks to view shared item */
  readonly onViewShare?: (
    itemId: string,
    itemType: ShareableContentType | 'folder',
  ) => void;
  /** Callback when user clicks to resolve conflict */
  readonly onResolveConflict?: (conflict: ISyncConflict) => void;
  /** Callback when user clicks to view sync details */
  readonly onViewSyncDetails?: () => void;
}
```

Configuration options for useSyncNotifications hook.

### UseSyncNotificationsReturn

**Source**: `src/hooks/useSyncNotifications.ts:68-77`

```typescript
export interface UseSyncNotificationsReturn {
  /** Notify about a received share */
  readonly notifyShareReceived: (data: ShareReceivedData) => void;
  /** Notify about a detected conflict */
  readonly notifyConflictDetected: (conflict: ISyncConflict) => void;
  /** Notify about sync completion */
  readonly notifySyncComplete: (data: SyncCompleteData) => void;
  /** Notify about connection state change */
  readonly notifyConnectionChanged: (data: ConnectionChangedData) => void;
}
```

Return value of useSyncNotifications hook.

### ISyncConflict

**Source**: `src/types/vault.ts` (referenced in useSyncNotifications.ts:16)

```typescript
export interface ISyncConflict {
  readonly id: string;
  readonly itemName: string;
  readonly contentType: ShareableContentType;
  // ... additional conflict resolution fields
}
```

Represents a sync conflict requiring user resolution.

### P2PConnectionState

**Source**: `src/types/vault.ts` (referenced in useSyncNotifications.ts:18)

```typescript
export type P2PConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';
```

Connection state for P2P sync peers.

### ShareableContentType

**Source**: `src/types/vault.ts` (referenced in useSyncNotifications.ts:19)

```typescript
export type ShareableContentType = 'unit' | 'pilot' | 'force' | 'encounter';
```

Content types that can be shared via P2P sync.

### SyncEvent

**Source**: `src/lib/p2p` (referenced in useSyncToasts.ts:10)

```typescript
export type SyncEvent =
  | { type: 'connected'; roomCode: string }
  | { type: 'disconnected'; reason?: string }
  | { type: 'peer-joined'; peer: { name?: string } }
  | { type: 'peer-left' }
  | { type: 'sync-completed' }
  | { type: 'conflict' }
  | { type: 'error'; message?: string };
```

Discriminated union of P2P sync events emitted by the sync system.

---

## Non-Goals

This specification does NOT cover:

1. **Toast Persistence** - Toasts are transient UI elements, not persistent notifications
2. **Notification History** - No log or history of dismissed toasts
3. **Toast Queuing** - Multiple toasts stack vertically but are not queued
4. **Custom Toast Components** - Only predefined variants (success, error, warning, info)
5. **Toast Positioning** - Fixed at bottom-right viewport, not configurable
6. **P2P Sync Implementation** - Only covers toast notifications for sync events, not sync logic itself
7. **Conflict Resolution UI** - useSyncNotifications provides callbacks, but conflict resolution UI is out of scope
