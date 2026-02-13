# unit-sharing Specification

## Purpose

The unit-sharing specification defines the user interface and API integration for managing vault share links, viewing shared items, and redeeming share tokens in MekStation. It provides a complete workflow for creating and managing share links with granular permissions, viewing items shared with you and items you've shared with others, and redeeming share links via token-based URLs.

This specification covers three distinct pages: share link management (`/share`), shared items dual view (`/shared`), and share link redemption (`/share/[token]`).

## Scope

**In Scope:**

- Share link management table with 7 columns (label, scope, level, uses, expires, status, actions)
- Share link actions: copy URL, toggle active/inactive, delete with confirmation
- Share link status indicators (active, inactive, expired, max uses)
- Shared items dual view mode (received vs shared)
- Shared item cards with type icons, sync status, permission levels, and metadata
- Shared item actions: view item, revoke sharing with confirmation
- Share link redemption via token with validation and error handling
- Sync status tracking (synced, pending, conflict, offline)
- Stats summaries and footer counts
- Empty states for zero links and zero shared items
- API integration with `/api/vault/share`, `/api/vault/shared`, and `/api/vault/share/redeem` endpoints

**Out of Scope:**

- Share link creation UI (handled by item detail pages)
- Real-time sync protocol implementation
- Cryptographic signing and verification (handled by backend)
- WebRTC peer-to-peer connections
- Conflict resolution UI for sync conflicts
- Share link QR code generation
- Share link analytics and usage tracking
- Bulk share link operations
- Share link templates or presets

## Key Concepts

### Share Link Types

Share links use a `scopeType` field to define what content is shared:

- `all`: Entire vault content
- `category`: All items of a specific category (units, pilots, forces, encounters)
- `folder`: A shared folder and its contents
- `item`: A single item (unit, pilot, force, or encounter)

### Permission Levels

Share links grant one of three permission levels:

- `read`: View and copy content (emerald badge)
- `write`: View, copy, and edit content (amber badge)
- `admin`: Full access including re-share permissions (violet badge)

### Share Link Status

Share links have multiple status states determined by validation rules:

- `Active`: Link is active, not expired, and under max uses (emerald badge)
- `Inactive`: Link has been manually deactivated (slate badge)
- `Expired`: Link expiration date has passed (red badge)
- `Max Uses`: Link has reached its maximum use count (amber badge)

### Sync Status

Shared items track synchronization state:

- `synced`: Item is up-to-date (emerald badge)
- `pending`: Changes are waiting to sync (amber badge)
- `conflict`: Conflicting changes detected (red badge)
- `offline`: Peer is offline, sync unavailable (slate badge)

### Share URL Format

Share links use the custom protocol format:

```
mekstation://share/{token}
```

Where `{token}` is a unique identifier for the share link.

### Dual View Mode

The shared items page supports two view modes:

- `received`: Items shared with you by other users
- `shared`: Items you've shared with other users

Each mode displays different metadata (owner vs recipients) and different action labels (remove vs revoke).

## Requirements

### Requirement: Share Link Management Table

The system SHALL display all share links in a table with 7 columns and action buttons.

#### Scenario: Display share link table

- **GIVEN** the user has share links in their vault
- **WHEN** they navigate to `/share`
- **THEN** all share links are displayed in a table with columns: Label, Scope, Level, Uses, Expires, Status, Actions
- **AND** each row shows the link label (or "Untitled" if null)
- **AND** each row shows a truncated token preview (first 12 characters + "...")
- **AND** the scope column displays human-readable scope text via `getScopeDisplay()`
- **AND** the level column displays a colored badge (emerald/amber/violet) via `getLevelVariant()`
- **AND** the uses column displays `useCount` and optionally `maxUses` (e.g., "5/10" or "5")
- **AND** the expires column displays formatted expiry date via `formatExpiry()`
- **AND** the status column displays a status badge via `getLinkStatus()`
- **AND** the actions column displays copy, toggle, and delete buttons

#### Scenario: Display empty state

- **GIVEN** the user has no share links
- **WHEN** they navigate to `/share`
- **THEN** an empty state is displayed with a link icon
- **AND** the message "No share links yet" is shown
- **AND** a description "Share links you create will appear here. Use the Share button on any vault item to get started." is shown

#### Scenario: Display summary footer

- **GIVEN** the user has share links
- **WHEN** viewing the share link table
- **THEN** a summary footer is displayed below the table
- **AND** the footer shows the count of active links
- **AND** the footer shows the count of inactive links
- **AND** the footer shows the total use count across all links

#### Scenario: Copy share URL

- **GIVEN** a share link in the table
- **WHEN** the user clicks the copy button
- **THEN** the share URL is built via `buildShareUrl(token)` as `mekstation://share/{token}`
- **AND** the URL is copied to the clipboard via `navigator.clipboard.writeText()`
- **AND** the copy button icon changes to a checkmark for 2 seconds
- **AND** the button color changes to emerald for 2 seconds

#### Scenario: Toggle link active status

- **GIVEN** a share link in the table
- **WHEN** the user clicks the toggle button
- **THEN** a PATCH request is sent to `/api/vault/share/{id}` with `{ isActive: !link.isActive }`
- **AND** the button shows a loading spinner during the request
- **AND** on success, the link's `isActive` state is toggled in the UI
- **AND** the row opacity changes to 60% if inactive
- **AND** the toggle button color changes to amber if active, muted if inactive

#### Scenario: Delete link with confirmation

- **GIVEN** a share link in the table
- **WHEN** the user clicks the delete button
- **THEN** the actions column is replaced with inline confirmation UI
- **AND** the confirmation UI shows "Confirm" (danger button) and "Cancel" (ghost button)
- **WHEN** the user clicks "Confirm"
- **THEN** a DELETE request is sent to `/api/vault/share/{id}`
- **AND** the button shows a loading spinner during the request
- **AND** on success, the link is removed from the table
- **WHEN** the user clicks "Cancel"
- **THEN** the confirmation UI is hidden and normal actions are restored

#### Scenario: Display link status

- **GIVEN** a share link in the table
- **WHEN** the link has `isActive: false`
- **THEN** the status badge shows "Inactive" with slate variant
- **WHEN** the link has expired (expiresAt < now)
- **THEN** the status badge shows "Expired" with red variant
- **AND** the expiry date is displayed in red text
- **WHEN** the link has reached max uses (useCount >= maxUses)
- **THEN** the status badge shows "Max Uses" with amber variant
- **WHEN** the link is active, not expired, and under max uses
- **THEN** the status badge shows "Active" with emerald variant

### Requirement: Shared Items Dual View

The system SHALL display shared items in a dual view mode with toggle buttons and card-based layout.

#### Scenario: Display view mode toggle

- **GIVEN** the user is on `/shared`
- **WHEN** the page loads
- **THEN** two toggle buttons are displayed: "Shared with Me" and "My Shared Items"
- **AND** the "Shared with Me" button has an inbox icon
- **AND** the "My Shared Items" button has a share icon
- **AND** the active button has a cyan/violet background color
- **AND** each button shows a count badge if items exist

#### Scenario: Switch view modes

- **GIVEN** the user is viewing "Shared with Me"
- **WHEN** they click "My Shared Items"
- **THEN** the view mode changes to `shared`
- **AND** the button background changes to violet
- **AND** the items grid updates to show items the user has shared
- **AND** the card metadata changes to show recipients instead of owner

#### Scenario: Display shared item cards

- **GIVEN** the user has shared items
- **WHEN** viewing the items grid
- **THEN** items are displayed in a responsive grid (1 column mobile, 2 columns tablet, 3 columns desktop)
- **AND** each card shows a type icon (mech, pilot, force, encounter, folder) with color
- **AND** each card shows the item name and type label
- **AND** each card shows a sync status badge (synced/pending/conflict/offline)
- **AND** each card shows owner/recipients based on view mode
- **AND** each card shows permission level badge (read/write/admin)
- **AND** each card shows shared date via `formatDate()`
- **AND** each card shows last sync time via `formatRelativeTime()`
- **AND** each card has a gradient overlay on hover

#### Scenario: Display empty state for view mode

- **GIVEN** the user has no items in the current view mode
- **WHEN** viewing "Shared with Me" with zero items
- **THEN** an empty state is displayed with an inbox icon
- **AND** the message "Nothing shared with you yet" is shown
- **AND** a description "When contacts share items with you, they will appear here." is shown
- **WHEN** viewing "My Shared Items" with zero items
- **THEN** an empty state is displayed with a share icon
- **AND** the message "You haven't shared anything yet" is shown
- **AND** a description "Share units, pilots, or forces with your contacts from their detail pages." is shown

#### Scenario: Display stats summary

- **GIVEN** the user has shared items in the current view mode
- **WHEN** viewing the items grid
- **THEN** a stats summary bar is displayed above the grid
- **AND** the summary shows the count of synced items with a green dot
- **AND** the summary shows the count of pending items with an amber dot
- **AND** the summary shows the count of conflict items with a red dot (if any)

#### Scenario: Display recipients list

- **GIVEN** the user is viewing "My Shared Items"
- **AND** an item has been shared with multiple recipients
- **WHEN** displaying the item card
- **THEN** a recipients section is shown below the metadata
- **AND** the first 3 recipients are displayed as name badges
- **AND** if more than 3 recipients exist, a "+N more" badge is shown

#### Scenario: View shared item

- **GIVEN** a shared item card
- **WHEN** the user clicks the view button (eye icon)
- **THEN** the user is navigated to the item detail page
- **AND** the URL is constructed as `/{type}s/{id}` for units/pilots/forces/encounters
- **AND** the URL is constructed as `/folders/{id}` for folders

#### Scenario: Revoke sharing with confirmation

- **GIVEN** a shared item card
- **WHEN** the user clicks the revoke button (trash icon)
- **THEN** the card actions are replaced with inline confirmation UI
- **AND** the confirmation UI shows "Remove from library?" for received items
- **AND** the confirmation UI shows "Revoke sharing?" for shared items
- **AND** the confirmation UI shows "Confirm" (danger button) and "Cancel" (ghost button)
- **WHEN** the user clicks "Confirm"
- **THEN** a DELETE request is sent to `/api/vault/shared/received/{id}` for received items
- **OR** a DELETE request is sent to `/api/vault/shared/mine/{id}` for shared items
- **AND** the button shows a loading spinner during the request
- **AND** on success, the item is removed from the grid
- **WHEN** the user clicks "Cancel"
- **THEN** the confirmation UI is hidden and normal actions are restored

#### Scenario: Trigger sync

- **GIVEN** the user is on `/shared`
- **WHEN** they click the "Sync Now" button in the header
- **THEN** a POST request is sent to `/api/vault/sync`
- **AND** the button shows a loading spinner during the request
- **AND** on success, the shared items are refetched
- **AND** sync status badges are updated

### Requirement: Share Link Redemption

The system SHALL validate and redeem share link tokens via the `/share/[token]` page.

#### Scenario: Redeem valid share link

- **GIVEN** a user navigates to `/share/{token}`
- **WHEN** the page loads
- **THEN** a POST request is sent to `/api/vault/share/redeem` with `{ token }`
- **AND** a loading state is displayed with message "Validating share link..."
- **WHEN** the redemption succeeds
- **THEN** a success card is displayed with a green checkmark icon
- **AND** the card shows "Access Granted" as the title
- **AND** the card shows the link scope via `formatScope()`
- **AND** the card shows the permission level via `formatLevel()` with colored badge
- **AND** the card shows the link label (if present)
- **AND** the card shows the use count and max uses (if present)
- **AND** the card shows the expiration date (if present)
- **AND** a "Go to Vault" button is displayed

#### Scenario: Handle share link not found

- **GIVEN** a user navigates to `/share/{token}`
- **WHEN** the redemption fails with errorCode "NOT_FOUND"
- **THEN** an error card is displayed with a magnifying glass icon
- **AND** the title shows "Share Link Not Found"
- **AND** the message shows "This share link does not exist or has been deleted."
- **AND** "Try Again" and "Go Home" buttons are displayed

#### Scenario: Handle expired share link

- **GIVEN** a user navigates to `/share/{token}`
- **WHEN** the redemption fails with errorCode "EXPIRED"
- **THEN** an error card is displayed with a clock icon
- **AND** the title shows "Share Link Expired"
- **AND** the message shows "This share link has expired and is no longer valid."
- **AND** "Try Again" and "Go Home" buttons are displayed

#### Scenario: Handle max uses reached

- **GIVEN** a user navigates to `/share/{token}`
- **WHEN** the redemption fails with errorCode "MAX_USES"
- **THEN** an error card is displayed with a chart icon
- **AND** the title shows "Share Link Used Up"
- **AND** the message shows "This share link has reached its maximum number of uses."
- **AND** "Try Again" and "Go Home" buttons are displayed

#### Scenario: Handle inactive share link

- **GIVEN** a user navigates to `/share/{token}`
- **WHEN** the redemption fails with errorCode "INACTIVE"
- **THEN** an error card is displayed with a lock icon
- **AND** the title shows "Share Link Inactive"
- **AND** the message shows "This share link has been deactivated by its owner."
- **AND** "Try Again" and "Go Home" buttons are displayed

#### Scenario: Handle generic error

- **GIVEN** a user navigates to `/share/{token}`
- **WHEN** the redemption fails with no specific errorCode
- **THEN** an error card is displayed with a warning icon
- **AND** the title shows "Invalid Share Link"
- **AND** the message shows the error message from the response or "There was a problem with this share link."
- **AND** "Try Again" and "Go Home" buttons are displayed

## Data Model Requirements

### IShareLink Interface

```typescript
/**
 * A shareable link for content
 */
export interface IShareLink {
  /** Unique identifier for this link */
  id: string;

  /** Unique token used in the share URL */
  token: string;

  /** Type of scope */
  scopeType: PermissionScopeType;

  /** ID of the specific item or folder (null for category/all) */
  scopeId: string | null;

  /** Category for category-level shares */
  scopeCategory: ContentCategory | null;

  /** Permission level for link users */
  level: PermissionLevel;

  /** When this link expires (null for never) */
  expiresAt: string | null;

  /** Maximum number of uses (null for unlimited) */
  maxUses: number | null;

  /** Current use count */
  useCount: number;

  /** When this link was created */
  createdAt: string;

  /** Optional label for the link */
  label?: string;

  /** Whether the link is currently active */
  isActive: boolean;
}
```

### ISharedItem Interface

```typescript
/**
 * A shared item (either shared with me or shared by me)
 */
interface ISharedItem {
  /** Unique ID */
  id: string;

  /** Item name */
  name: string;

  /** Type of content */
  type: ShareableContentType | 'folder';

  /** Permission level */
  level: PermissionLevel;

  /** Owner's friend code (null if I own it) */
  ownerId: string | null;

  /** Owner's display name */
  ownerName: string;

  /** Recipients (for items I shared) */
  sharedWith?: {
    friendCode: string;
    name: string;
    level: PermissionLevel;
  }[];

  /** When sharing was established */
  sharedAt: string;

  /** Last sync time */
  lastSyncAt: string | null;

  /** Sync status */
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline';
}
```

### Supporting Types

```typescript
/**
 * Permission scope types
 */
export type PermissionScopeType = 'item' | 'folder' | 'category' | 'all';

/**
 * Content categories for category-level permissions
 */
export type ContentCategory = 'units' | 'pilots' | 'forces' | 'encounters';

/**
 * Permission levels for shared content
 */
export type PermissionLevel = 'read' | 'write' | 'admin';

/**
 * Content types that can be shared
 */
export type ShareableContentType = 'unit' | 'pilot' | 'force' | 'encounter';

/**
 * View mode for shared items page
 */
type ViewMode = 'received' | 'shared';
```

## Helper Functions

### buildShareUrl

Constructs a share URL from a token.

```typescript
function buildShareUrl(token: string): string {
  return `mekstation://share/${token}`;
}
```

**Example:**

```typescript
buildShareUrl('abc123xyz789');
// Returns: "mekstation://share/abc123xyz789"
```

### getScopeDisplay

Returns human-readable scope text for a share link.

```typescript
function getScopeDisplay(link: IShareLink): string {
  switch (link.scopeType) {
    case 'all':
      return 'All Content';
    case 'category':
      return link.scopeCategory
        ? link.scopeCategory.charAt(0).toUpperCase() +
            link.scopeCategory.slice(1)
        : 'Category';
    case 'folder':
      return 'Folder';
    case 'item':
      return 'Single Item';
    default:
      return link.scopeType;
  }
}
```

**Example:**

```typescript
getScopeDisplay({ scopeType: 'all', ... })
// Returns: "All Content"

getScopeDisplay({ scopeType: 'category', scopeCategory: 'units', ... })
// Returns: "Units"

getScopeDisplay({ scopeType: 'item', ... })
// Returns: "Single Item"
```

### getLevelVariant

Returns badge variant for permission level.

```typescript
function getLevelVariant(level: string): 'emerald' | 'amber' | 'violet' {
  switch (level) {
    case 'read':
      return 'emerald';
    case 'write':
      return 'amber';
    case 'admin':
      return 'violet';
    default:
      return 'emerald';
  }
}
```

**Example:**

```typescript
getLevelVariant('read'); // Returns: 'emerald'
getLevelVariant('write'); // Returns: 'amber'
getLevelVariant('admin'); // Returns: 'violet'
```

### getLinkStatus

Determines the status of a share link based on validation rules.

```typescript
function getLinkStatus(link: IShareLink): {
  label: string;
  variant: 'emerald' | 'red' | 'amber' | 'slate';
} {
  if (!link.isActive) {
    return { label: 'Inactive', variant: 'slate' };
  }

  const expiry = formatExpiry(link.expiresAt);
  if (expiry.isExpired) {
    return { label: 'Expired', variant: 'red' };
  }

  if (link.maxUses !== null && link.useCount >= link.maxUses) {
    return { label: 'Max Uses', variant: 'amber' };
  }

  return { label: 'Active', variant: 'emerald' };
}
```

**Example:**

```typescript
getLinkStatus({ isActive: false, ... })
// Returns: { label: 'Inactive', variant: 'slate' }

getLinkStatus({ isActive: true, expiresAt: '2020-01-01', ... })
// Returns: { label: 'Expired', variant: 'red' }

getLinkStatus({ isActive: true, useCount: 10, maxUses: 10, ... })
// Returns: { label: 'Max Uses', variant: 'amber' }

getLinkStatus({ isActive: true, useCount: 5, maxUses: 10, ... })
// Returns: { label: 'Active', variant: 'emerald' }
```

### formatScope

Formats scope for display on redemption page.

```typescript
function formatScope(link: IShareLink): string {
  switch (link.scopeType) {
    case 'all':
      return 'All Vault Content';
    case 'category':
      return `All ${link.scopeCategory || 'Items'}`;
    case 'folder':
      return 'Shared Folder';
    case 'item':
      return 'Single Item';
    default:
      return link.scopeType;
  }
}
```

**Example:**

```typescript
formatScope({ scopeType: 'all', ... })
// Returns: "All Vault Content"

formatScope({ scopeType: 'category', scopeCategory: 'pilots', ... })
// Returns: "All pilots"
```

### formatLevel

Formats permission level for display on redemption page.

```typescript
function formatLevel(level: string): string {
  switch (level) {
    case 'read':
      return 'View & Copy';
    case 'write':
      return 'View, Copy & Edit';
    case 'admin':
      return 'Full Access';
    default:
      return level;
  }
}
```

**Example:**

```typescript
formatLevel('read'); // Returns: "View & Copy"
formatLevel('write'); // Returns: "View, Copy & Edit"
formatLevel('admin'); // Returns: "Full Access"
```

### getSyncStatusDisplay

Returns badge variant and label for sync status.

```typescript
function getSyncStatusDisplay(status: ISharedItem['syncStatus']): {
  variant: 'emerald' | 'amber' | 'red' | 'slate';
  label: string;
} {
  switch (status) {
    case 'synced':
      return { variant: 'emerald', label: 'Synced' };
    case 'pending':
      return { variant: 'amber', label: 'Pending' };
    case 'conflict':
      return { variant: 'red', label: 'Conflict' };
    case 'offline':
    default:
      return { variant: 'slate', label: 'Offline' };
  }
}
```

**Example:**

```typescript
getSyncStatusDisplay('synced');
// Returns: { variant: 'emerald', label: 'Synced' }

getSyncStatusDisplay('conflict');
// Returns: { variant: 'red', label: 'Conflict' }
```

## API Integration

### GET /api/vault/share

Fetches all share links for the current user.

**Response:**

```typescript
interface ShareLinksResponse {
  links: IShareLink[];
  count: number;
}
```

**Example:**

```typescript
const response = await fetch('/api/vault/share');
const data = (await response.json()) as ShareLinksResponse;
// data.links: IShareLink[]
// data.count: number
```

### PATCH /api/vault/share/:id

Updates a share link's active status.

**Request Body:**

```typescript
{
  isActive: boolean;
}
```

**Example:**

```typescript
await fetch(`/api/vault/share/${linkId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ isActive: false }),
});
```

### DELETE /api/vault/share/:id

Deletes a share link.

**Example:**

```typescript
await fetch(`/api/vault/share/${linkId}`, {
  method: 'DELETE',
});
```

### GET /api/vault/shared

Fetches all shared items (both received and shared by user).

**Response:**

```typescript
interface SharedItemsResponse {
  sharedWithMe: ISharedItem[];
  mySharedItems: ISharedItem[];
}
```

**Example:**

```typescript
const response = await fetch('/api/vault/shared');
const data = (await response.json()) as SharedItemsResponse;
// data.sharedWithMe: ISharedItem[]
// data.mySharedItems: ISharedItem[]
```

### DELETE /api/vault/shared/received/:id

Removes a shared item from the user's library (received items).

**Example:**

```typescript
await fetch(`/api/vault/shared/received/${itemId}`, {
  method: 'DELETE',
});
```

### DELETE /api/vault/shared/mine/:id

Revokes sharing for an item the user has shared (shared items).

**Example:**

```typescript
await fetch(`/api/vault/shared/mine/${itemId}`, {
  method: 'DELETE',
});
```

### POST /api/vault/sync

Triggers a sync operation for shared items.

**Example:**

```typescript
await fetch('/api/vault/sync', {
  method: 'POST',
});
```

### POST /api/vault/share/redeem

Redeems a share link token.

**Request Body:**

```typescript
{
  token: string;
}
```

**Response:**

```typescript
interface RedeemResult {
  success: boolean;
  link?: IShareLink;
  error?: string;
  errorCode?: 'NOT_FOUND' | 'EXPIRED' | 'MAX_USES' | 'INACTIVE';
}
```

**Example:**

```typescript
const response = await fetch('/api/vault/share/redeem', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: 'abc123xyz789' }),
});
const data = (await response.json()) as RedeemResult;
```

## Validation Rules

### Share Link Validation

- **Token MUST be unique** across all share links
- **scopeType MUST be one of**: 'item', 'folder', 'category', 'all'
- **scopeId MUST be null** if scopeType is 'category' or 'all'
- **scopeCategory MUST be null** if scopeType is 'item', 'folder', or 'all'
- **level MUST be one of**: 'read', 'write', 'admin'
- **expiresAt MUST be a valid ISO 8601 date** or null
- **maxUses MUST be a positive integer** or null
- **useCount MUST be >= 0**
- **isActive MUST be a boolean**

### Shared Item Validation

- **type MUST be one of**: 'unit', 'pilot', 'force', 'encounter', 'folder'
- **level MUST be one of**: 'read', 'write', 'admin'
- **syncStatus MUST be one of**: 'synced', 'pending', 'conflict', 'offline'
- **sharedAt MUST be a valid ISO 8601 date**
- **lastSyncAt MUST be a valid ISO 8601 date** or null

## Non-Goals

The following are explicitly out of scope for this specification:

- **Cryptographic signing and verification**: Handled by backend services
- **Real-time sync protocol**: Defined in separate vault-sync specification
- **Share link creation UI**: Handled by item detail pages
- **Conflict resolution UI**: Requires separate specification
- **QR code generation**: Future enhancement
- **Analytics and usage tracking**: Future enhancement
- **Bulk operations**: Future enhancement
- **Share link templates**: Future enhancement

## Dependencies

This specification depends on:

- **vault-sharing specification**: Core types (IShareLink, ISharedItem, PermissionLevel, etc.)
- **UI component library**: PageLayout, Card, Button, Badge, EmptyState, PageLoading, PageError
- **Formatting utilities**: formatDate, formatRelativeTime, formatExpiry
- **Logger utility**: logger.error for error logging

## Implementation Notes

### Performance Considerations

- **Table rendering**: Use virtualization for large share link lists (100+ links)
- **Card grid rendering**: Use CSS Grid for responsive layout, avoid JavaScript-based layout
- **Clipboard API**: Use `navigator.clipboard.writeText()` with fallback for older browsers
- **Sync operations**: Debounce sync button to prevent rapid repeated requests

### Error Handling

- **Network errors**: Display toast notification with retry option
- **API errors**: Display inline error messages in cards/table rows
- **Clipboard errors**: Log to console, display toast notification
- **Token validation errors**: Display specific error messages based on errorCode

### Edge Cases

- **Zero links**: Display empty state with call-to-action
- **Zero shared items**: Display empty state with explanation
- **Expired links**: Display in table with red badge and disabled actions
- **Inactive links**: Display with reduced opacity and slate badge
- **Max uses reached**: Display with amber badge and disabled copy action
- **Sync conflicts**: Display red badge, link to conflict resolution (future)
- **Offline peers**: Display slate badge, disable sync actions

### Pitfalls to Avoid

- **Do not modify share link tokens**: Tokens are immutable identifiers
- **Do not allow copy action on inactive links**: Inactive links should not be shared
- **Do not allow toggle action on expired links**: Expired links cannot be reactivated
- **Do not allow revoke action during processing**: Disable buttons during API calls
- **Do not display raw error messages**: Use user-friendly error messages
- **Do not skip confirmation for delete/revoke**: Always require explicit confirmation

## Examples

### Example: Share Link Table Row

```tsx
<tr
  className={`transition-colors ${!link.isActive ? 'opacity-60' : 'hover:bg-surface-raised/30'}`}
>
  {/* Label */}
  <td className="px-4 py-3">
    <div className="flex flex-col">
      <span className="text-text-theme-primary text-sm font-medium">
        {link.label || 'Untitled'}
      </span>
      <span className="text-text-theme-muted mt-0.5 font-mono text-xs">
        {link.token.slice(0, 12)}...
      </span>
    </div>
  </td>

  {/* Scope */}
  <td className="px-4 py-3">
    <span className="text-text-theme-secondary text-sm">
      {getScopeDisplay(link)}
    </span>
  </td>

  {/* Level */}
  <td className="px-4 py-3">
    <Badge variant={getLevelVariant(link.level)} size="sm">
      {link.level.charAt(0).toUpperCase() + link.level.slice(1)}
    </Badge>
  </td>

  {/* Uses */}
  <td className="px-4 py-3 text-center">
    <span className="text-text-theme-secondary font-mono text-sm">
      {link.useCount}
      {link.maxUses !== null && (
        <span className="text-text-theme-muted">/{link.maxUses}</span>
      )}
    </span>
  </td>

  {/* Expires */}
  <td className="px-4 py-3">
    <span
      className={`text-sm ${expiry.isExpired ? 'text-red-400' : 'text-text-theme-secondary'}`}
    >
      {expiry.text}
    </span>
  </td>

  {/* Status */}
  <td className="px-4 py-3">
    <Badge variant={status.variant} size="sm">
      {status.label}
    </Badge>
  </td>

  {/* Actions */}
  <td className="px-4 py-3">
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => handleCopy(link)}>
        <CopyIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToggleActive(link)}
      >
        <ToggleOnIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDeleteConfirmId(link.id)}
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  </td>
</tr>
```

### Example: Shared Item Card

```tsx
<Card
  variant="dark"
  className="group hover:border-border-theme relative overflow-hidden"
>
  {/* Gradient overlay on hover */}
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-violet-500/0 transition-all duration-300 group-hover:from-cyan-500/5 group-hover:to-violet-500/5" />

  <div className="relative">
    {/* Header */}
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {/* Type Icon */}
        <div
          className={`bg-surface-raised/50 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${typeDisplay.color}`}
        >
          {typeDisplay.icon}
        </div>

        {/* Name & Type */}
        <div className="min-w-0">
          <h3 className="text-text-theme-primary truncate font-semibold">
            {item.name}
          </h3>
          <p className="text-text-theme-muted text-xs">{typeDisplay.label}</p>
        </div>
      </div>

      {/* Sync Status */}
      <Badge variant={syncStatus.variant} size="sm">
        {syncStatus.label}
      </Badge>
    </div>

    {/* Info Grid */}
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      {/* Owner / Recipients */}
      <div>
        <span className="text-text-theme-muted mb-1 block text-xs">
          {viewMode === 'received' ? 'From' : 'Shared with'}
        </span>
        {viewMode === 'received' ? (
          <span className="text-text-theme-secondary font-medium">
            {item.ownerName}
          </span>
        ) : (
          <span className="text-text-theme-secondary font-medium">
            {item.sharedWith && item.sharedWith.length > 0
              ? item.sharedWith.length === 1
                ? item.sharedWith[0].name
                : `${item.sharedWith.length} contacts`
              : 'No one'}
          </span>
        )}
      </div>

      {/* Permission Level */}
      <div>
        <span className="text-text-theme-muted mb-1 block text-xs">
          Permission
        </span>
        <Badge variant={getLevelVariant(item.level)} size="sm">
          {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
        </Badge>
      </div>

      {/* Shared Date */}
      <div>
        <span className="text-text-theme-muted mb-1 block text-xs">Shared</span>
        <span className="text-text-theme-secondary">
          {formatDate(item.sharedAt)}
        </span>
      </div>

      {/* Last Sync */}
      <div>
        <span className="text-text-theme-muted mb-1 block text-xs">
          Last sync
        </span>
        <span className="text-text-theme-secondary">
          {formatRelativeTime(item.lastSyncAt)}
        </span>
      </div>
    </div>

    {/* Actions */}
    <div className="border-border-theme-subtle/50 mt-4 flex items-center justify-end gap-2 border-t pt-4">
      <Button variant="ghost" size="sm" onClick={onView}>
        <EyeIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRevoke}
        className="text-red-400/70 hover:text-red-400"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  </div>
</Card>
```

### Example: Share Link Redemption Success

```tsx
<Card variant="dark" className="mx-auto max-w-md p-6">
  <div className="mb-6 text-center">
    <div className="mb-2 text-4xl">✅</div>
    <h2 className="text-xl font-bold text-green-400">Access Granted</h2>
  </div>

  <div className="space-y-4">
    <div className="flex items-center justify-between border-b border-gray-700 py-2">
      <span className="text-gray-400">Scope</span>
      <span className="text-white">{formatScope(link)}</span>
    </div>

    <div className="flex items-center justify-between border-b border-gray-700 py-2">
      <span className="text-gray-400">Permission</span>
      <span
        className={`rounded px-2 py-1 text-xs font-medium text-white ${getLevelColor(link.level)}`}
      >
        {formatLevel(link.level)}
      </span>
    </div>

    {link.label && (
      <div className="flex items-center justify-between border-b border-gray-700 py-2">
        <span className="text-gray-400">Label</span>
        <span className="text-white">{link.label}</span>
      </div>
    )}

    <div className="flex items-center justify-between border-b border-gray-700 py-2">
      <span className="text-gray-400">Uses</span>
      <span className="text-white">
        {link.useCount}
        {link.maxUses ? ` / ${link.maxUses}` : ''}
      </span>
    </div>
  </div>

  <div className="mt-6 rounded-lg bg-gray-900 p-4">
    <p className="text-center text-sm text-gray-400">
      You now have{' '}
      <span className="font-medium text-white">{formatLevel(link.level)}</span>{' '}
      access to the shared content. The content should be available in your
      vault.
    </p>
  </div>

  <div className="mt-6">
    <Button variant="primary" className="w-full" onClick={handleGoHome}>
      Go to Vault
    </Button>
  </div>
</Card>
```

## References

- **Source Files**:
  - `src/pages/share.tsx` (554 lines) - Share link management table
  - `src/pages/shared.tsx` (857 lines) - Shared items dual view
  - `src/pages/share/[token].tsx` (284 lines) - Share link redemption
- **Type Definitions**: `src/types/vault/VaultInterfaces.ts` (IShareLink, ISharedItem, PermissionLevel, etc.)
- **Related Specifications**: vault-sharing, vault-sync, contacts-system
- **UI Components**: PageLayout, Card, Button, Badge, EmptyState, PageLoading, PageError
- **Utilities**: formatDate, formatRelativeTime, formatExpiry, logger

---

**Version**: 1.0.0
**Last Updated**: 2026-02-13
**Status**: Complete
