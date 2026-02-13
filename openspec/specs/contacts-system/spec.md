# contacts-system Specification

## Purpose

The contacts-system defines the user interface and API integration for managing vault contacts in MekStation. It provides a complete CRUD (Create, Read, Update, Delete) workflow for adding contacts via friend codes, displaying contact lists with status tracking, editing contact metadata (nickname, notes, trust status), and removing contacts with confirmation.

This specification covers the UI components, data flow, API integration, error handling, and user interactions for the contacts management feature.

## Scope

**In Scope:**

- Contact list display with status indicators (online, offline, syncing, connecting)
- Add contact dialog with friend code input and optional metadata
- Edit contact dialog for updating nickname and notes
- Trust toggle for marking contacts as verified
- Delete confirmation dialog with two-step confirmation pattern
- Empty state UI for zero contacts
- Contact status tracking (initialized as 'offline')
- Per-operation error handling and loading states
- API integration with `/api/vault/contacts` endpoints

**Out of Scope:**

- Real-time presence detection (status tracking is initialized but not actively updated)
- WebRTC peer-to-peer connections
- Contact synchronization protocols
- Friend code generation and validation logic
- Contact search and filtering UI
- Contact groups or categories
- Bulk contact operations
- Contact import/export

## Key Concepts

### Contact Status Tracking

The system tracks connection status for each contact using the `ContactStatus` type:

- `online`: Contact is connected and available
- `offline`: Contact is not connected (default state)
- `syncing`: Contact is actively synchronizing data
- `connecting`: Contact connection is in progress

All contacts are initialized with `offline` status when loaded. Real-time presence detection is out of scope for this specification.

### Trust Status

Contacts have an `isTrusted` boolean flag indicating whether the contact has been verified out-of-band. Trusted contacts display a shield check icon, while untrusted contacts show a shield exclamation icon with "Unverified" label.

### Friend Code System

Contacts are identified by friend codes (e.g., "MK-XXXX-XXXX-XXXX"). The friend code is the primary identifier for adding new contacts and is derived from the contact's public key.

### Two-Step Delete Confirmation

The delete operation uses an inline confirmation pattern:

1. User clicks delete button
2. Confirmation UI appears in the contact card actions area
3. User confirms or cancels
4. On confirm, the contact is deleted

This prevents accidental deletions without requiring a separate modal dialog.

## Requirements

### Requirement: Contact List Display

The system SHALL display all contacts in a responsive grid layout with status indicators, metadata, and action buttons.

#### Scenario: Display contact list

- **GIVEN** the user has contacts in their vault
- **WHEN** they navigate to the contacts page
- **THEN** all contacts are displayed in a grid (1 column mobile, 2 columns tablet, 3 columns desktop)
- **AND** each contact card shows avatar, display name, friend code, status badge, and last seen time
- **AND** trusted contacts display a shield check icon
- **AND** untrusted contacts display a shield exclamation icon with "Unverified" label
- **AND** contact notes are displayed if present (truncated to 1 line)

#### Scenario: Display empty state

- **GIVEN** the user has no contacts
- **WHEN** they navigate to the contacts page
- **THEN** an empty state is displayed with a users icon
- **AND** the message "No contacts yet" is shown
- **AND** a description "Add contacts to share vault content and sync with other MekStation users." is shown
- **AND** an "Add Your First Contact" button is displayed

#### Scenario: Display contact status

- **GIVEN** a contact in the list
- **WHEN** the contact status is 'online'
- **THEN** a green status dot is displayed
- **AND** the status badge shows "Online" with emerald variant
- **WHEN** the contact status is 'offline'
- **THEN** a gray status dot is displayed
- **AND** the status badge shows "Offline" with slate variant
- **WHEN** the contact status is 'syncing'
- **THEN** an animated cyan status dot is displayed
- **AND** the status badge shows "Syncing" with cyan variant and animated signal icon
- **WHEN** the contact status is 'connecting'
- **THEN** an animated amber status dot is displayed
- **AND** the status badge shows "Connecting" with amber variant

#### Scenario: Display contact metadata

- **GIVEN** a contact with a nickname
- **WHEN** displaying the contact
- **THEN** the nickname is shown as the primary name
- **AND** the display name is shown as secondary text
- **GIVEN** a contact without a nickname
- **WHEN** displaying the contact
- **THEN** the display name is shown as the primary name
- **AND** no secondary text is shown

#### Scenario: Display filter stats

- **GIVEN** the user has contacts
- **WHEN** viewing the contact list
- **THEN** a stats bar is displayed above the grid
- **AND** the online count is shown with a green dot indicator
- **AND** the trusted count is shown with a shield check icon

### Requirement: Add Contact

The system SHALL provide a dialog for adding new contacts via friend code with optional nickname and notes.

#### Scenario: Open add contact dialog

- **GIVEN** the user is on the contacts page
- **WHEN** they click the "Add Contact" button in the header
- **THEN** the add contact dialog is displayed
- **AND** the dialog shows a friend code input field (required)
- **AND** the dialog shows a nickname input field (optional)
- **AND** the dialog shows a notes textarea (optional)
- **AND** the submit button is disabled until a friend code is entered

#### Scenario: Add contact successfully

- **GIVEN** the add contact dialog is open
- **WHEN** the user enters a valid friend code
- **AND** optionally enters a nickname and notes
- **AND** clicks "Add Contact"
- **THEN** a POST request is sent to `/api/vault/contacts` with `{ friendCode, nickname, notes }`
- **AND** the dialog shows a loading state
- **AND** on success, the new contact is added to the list
- **AND** the contact status is initialized to 'offline'
- **AND** the dialog is closed
- **AND** the form is reset

#### Scenario: Add contact with error

- **GIVEN** the add contact dialog is open
- **WHEN** the user submits the form
- **AND** the API returns an error
- **THEN** the error message is displayed in the dialog
- **AND** the dialog remains open
- **AND** the user can retry or cancel

#### Scenario: Close add contact dialog

- **GIVEN** the add contact dialog is open
- **WHEN** the user clicks "Cancel" or the backdrop
- **THEN** the dialog is closed
- **AND** the form is reset
- **AND** any error messages are cleared

### Requirement: Edit Contact

The system SHALL provide a dialog for editing contact nickname and notes.

#### Scenario: Open edit contact dialog

- **GIVEN** a contact in the list
- **WHEN** the user clicks the edit button (pencil icon)
- **THEN** the edit contact dialog is displayed
- **AND** the dialog is pre-filled with the current nickname and notes
- **AND** the dialog title shows "Edit Contact"

#### Scenario: Save contact edits

- **GIVEN** the edit contact dialog is open
- **WHEN** the user modifies the nickname or notes
- **AND** clicks "Save Changes"
- **THEN** a PATCH request is sent to `/api/vault/contacts/:id` with `{ nickname, notes }`
- **AND** the dialog shows a loading state
- **AND** on success, the contact is updated in the list
- **AND** the dialog is closed

#### Scenario: Edit contact with error

- **GIVEN** the edit contact dialog is open
- **WHEN** the user submits the form
- **AND** the API request fails
- **THEN** the error is logged to the console
- **AND** the dialog remains open
- **AND** the loading state is cleared

#### Scenario: Close edit contact dialog

- **GIVEN** the edit contact dialog is open
- **WHEN** the user clicks "Cancel" or the backdrop
- **THEN** the dialog is closed
- **AND** no changes are saved

### Requirement: Toggle Trust Status

The system SHALL allow users to toggle the trust status of a contact.

#### Scenario: Mark contact as trusted

- **GIVEN** a contact with `isTrusted: false`
- **WHEN** the user clicks the trust button (shield exclamation icon)
- **THEN** a PATCH request is sent to `/api/vault/contacts/:id` with `{ isTrusted: true }`
- **AND** the button shows a loading state
- **AND** on success, the contact is updated in the list
- **AND** the shield check icon is displayed
- **AND** the "Unverified" label is removed

#### Scenario: Remove trust from contact

- **GIVEN** a contact with `isTrusted: true`
- **WHEN** the user clicks the trust button (shield check icon)
- **THEN** a PATCH request is sent to `/api/vault/contacts/:id` with `{ isTrusted: false }`
- **AND** the button shows a loading state
- **AND** on success, the contact is updated in the list
- **AND** the shield exclamation icon is displayed
- **AND** the "Unverified" label is shown

#### Scenario: Toggle trust with error

- **GIVEN** a contact
- **WHEN** the user toggles trust
- **AND** the API request fails
- **THEN** the error is logged to the console
- **AND** the contact state is not updated
- **AND** the loading state is cleared

### Requirement: Delete Contact

The system SHALL provide a two-step confirmation pattern for deleting contacts.

#### Scenario: Initiate delete

- **GIVEN** a contact in the list
- **WHEN** the user clicks the delete button (trash icon)
- **THEN** the contact card actions area is replaced with a confirmation UI
- **AND** the confirmation UI shows "Delete this contact?"
- **AND** a "Confirm" button is displayed
- **AND** a "Cancel" button is displayed

#### Scenario: Confirm delete

- **GIVEN** the delete confirmation UI is displayed
- **WHEN** the user clicks "Confirm"
- **THEN** a DELETE request is sent to `/api/vault/contacts/:id`
- **AND** the button shows a loading state
- **AND** on success, the contact is removed from the list
- **AND** the confirmation UI is hidden

#### Scenario: Cancel delete

- **GIVEN** the delete confirmation UI is displayed
- **WHEN** the user clicks "Cancel"
- **THEN** the confirmation UI is hidden
- **AND** the normal action buttons are restored
- **AND** no API request is made

#### Scenario: Delete with error

- **GIVEN** the delete confirmation UI is displayed
- **WHEN** the user confirms delete
- **AND** the API request fails
- **THEN** the error is logged to the console
- **AND** the contact remains in the list
- **AND** the loading state is cleared
- **AND** the confirmation UI remains visible

### Requirement: Loading and Error States

The system SHALL provide appropriate loading and error states for all operations.

#### Scenario: Initial page load

- **GIVEN** the user navigates to the contacts page
- **WHEN** the contacts are being fetched
- **THEN** a loading spinner is displayed with "Loading contacts..." message
- **WHEN** the fetch completes successfully
- **THEN** the loading spinner is replaced with the contact list or empty state
- **WHEN** the fetch fails
- **THEN** an error page is displayed with the error message
- **AND** a "Return Home" link is provided

#### Scenario: Per-operation loading states

- **GIVEN** a contact operation is in progress (add, edit, trust, delete)
- **WHEN** the operation is processing
- **THEN** the relevant button shows a loading spinner
- **AND** the button is disabled
- **AND** other action buttons on the same contact are disabled
- **WHEN** the operation completes
- **THEN** the loading state is cleared
- **AND** buttons are re-enabled

#### Scenario: Add contact error display

- **GIVEN** the add contact dialog is open
- **WHEN** an error occurs during submission
- **THEN** the error message is displayed in a red error box within the dialog
- **AND** the error box has a red border and background
- **AND** the error text is displayed in red

## Data Model Requirements

### IContact Interface

```typescript
interface IContact {
  /** Unique identifier for this contact record */
  id: string;

  /** Friend code of the contact */
  friendCode: string;

  /** Public key of the contact (base64) */
  publicKey: string;

  /** User-defined nickname (optional, overrides displayName) */
  nickname: string | null;

  /** Display name from the contact's identity */
  displayName: string;

  /** Optional avatar from contact's identity */
  avatar: string | null;

  /** When this contact was added */
  addedAt: string;

  /** Last time this contact was seen online */
  lastSeenAt: string | null;

  /** Whether this contact is trusted (verified out-of-band) */
  isTrusted: boolean;

  /** Optional notes about this contact */
  notes: string | null;
}
```

### ContactStatus Type

```typescript
type ContactStatus = 'online' | 'offline' | 'connecting' | 'syncing';
```

### ContactFormData Interface

```typescript
interface ContactFormData {
  friendCode: string;
  nickname: string;
  notes: string;
}
```

### EditingContact Interface

```typescript
interface EditingContact {
  id: string;
  nickname: string;
  notes: string;
}
```

### API Response Types

```typescript
interface ContactsResponse {
  contacts: IContact[];
  count: number;
}

interface AddContactResponse {
  success: boolean;
  contact: IContact;
  error?: string;
}

interface ErrorResponse {
  error: string;
}
```

## Component Architecture

### ContactsPage Component

**Location:** `src/pages/contacts.tsx`

**Responsibilities:**

- Fetch contacts from API on mount
- Manage contact list state
- Manage contact status tracking (initialized as 'offline')
- Handle add/edit/trust/delete operations
- Coordinate dialog visibility
- Handle per-operation error states

**State:**

- `contacts: IContact[]` - List of contacts
- `contactStatuses: Record<string, ContactStatus>` - Status tracking per contact
- `loading: boolean` - Initial page load state
- `error: string | null` - Page-level error
- `showAddDialog: boolean` - Add dialog visibility
- `addDialogError: string | null` - Add operation error
- `isAdding: boolean` - Add operation loading state
- `editingContact: EditingContact | null` - Currently editing contact
- `isSaving: boolean` - Edit operation loading state

**API Integration:**

- `GET /api/vault/contacts` - Fetch all contacts
- `POST /api/vault/contacts` - Add new contact
- `PATCH /api/vault/contacts/:id` - Update contact (nickname, notes, isTrusted)
- `DELETE /api/vault/contacts/:id` - Delete contact

### ContactList Component

**Location:** `src/components/contacts/ContactList.tsx`

**Responsibilities:**

- Render contact grid layout
- Display filter stats (online count, trusted count)
- Manage per-contact processing state
- Manage delete confirmation state
- Render empty state when no contacts

**Props:**

- `contacts: IContact[]`
- `contactStatuses: Record<string, ContactStatus>`
- `onEdit: (contact: IContact) => void`
- `onToggleTrust: (contact: IContact) => Promise<void>`
- `onDelete: (contact: IContact) => Promise<void>`
- `onOpenAddDialog: () => void`

**State:**

- `processingId: string | null` - ID of contact being processed
- `deleteConfirmId: string | null` - ID of contact showing delete confirmation

### ContactCard Component

**Location:** `src/components/contacts/ContactList.tsx` (internal)

**Responsibilities:**

- Render individual contact card
- Display avatar with initials and color
- Display status indicator dot
- Display contact metadata (name, friend code, notes, trust status)
- Render action buttons

**Props:**

- `contact: IContact`
- `status: ContactStatus`
- `isProcessing: boolean`
- `showDeleteConfirm: boolean`
- `onEdit: () => void`
- `onToggleTrust: () => void`
- `onDelete: () => void`
- `onConfirmDelete: () => void`
- `onCancelDelete: () => void`

### AddContactDialog Component

**Location:** `src/components/contacts/ContactFormModal.tsx`

**Responsibilities:**

- Render add contact modal dialog
- Manage form state (friendCode, nickname, notes)
- Validate friend code presence
- Display error messages
- Handle form submission

**Props:**

- `isOpen: boolean`
- `onClose: () => void`
- `onSubmit: (data: ContactFormData) => Promise<void>`
- `isSubmitting: boolean`
- `error: string | null`

**State:**

- `formData: ContactFormData` - Form field values

### EditContactDialog Component

**Location:** `src/components/contacts/ContactFormModal.tsx`

**Responsibilities:**

- Render edit contact modal dialog
- Manage form state (nickname, notes)
- Pre-fill form with current values
- Handle form submission

**Props:**

- `contact: EditingContact | null`
- `onClose: () => void`
- `onSave: (id: string, nickname: string, notes: string) => Promise<void>`
- `isSaving: boolean`

**State:**

- `nickname: string` - Nickname field value
- `notes: string` - Notes field value

### ContactDeleteDialog Component

**Location:** `src/components/contacts/ContactDeleteDialog.tsx`

**Responsibilities:**

- Render inline delete confirmation UI
- Render contact card action buttons

**Exports:**

- `ContactDeleteConfirm` - Confirmation UI component
- `ContactCardActions` - Action buttons component

### ContactFilters Component

**Location:** `src/components/contacts/ContactFilters.tsx`

**Responsibilities:**

- Export shared types and helper functions
- Export shared icons
- Render filter stats component

**Exports:**

- Types: `ContactsResponse`, `AddContactResponse`, `ErrorResponse`, `ActionState`
- Helpers: `formatLastSeen`, `truncateFriendCode`, `getDisplayName`, `getStatusDisplay`, `getAvatarInitials`, `getAvatarColor`
- Icons: `UserPlusIcon`, `ShieldCheckIcon`
- Component: `ContactFilterStats`

## Display Helpers

### formatLastSeen

Formats a timestamp into a human-readable "last seen" string:

- Less than 1 minute: "Just now"
- Less than 60 minutes: "Xm ago"
- Less than 24 hours: "Xh ago"
- Less than 7 days: "Xd ago"
- 7+ days: "Mon DD" (e.g., "Jan 15")

### truncateFriendCode

Truncates long friend codes for display:

- 12 characters or less: Display as-is
- Longer: Display first 6 characters + "..." + last 4 characters

### getDisplayName

Determines primary and secondary display names:

- If nickname exists: `{ primary: nickname, secondary: displayName }`
- If no nickname: `{ primary: displayName, secondary: null }`

### getStatusDisplay

Maps ContactStatus to badge variant and label:

- `online`: `{ variant: 'emerald', label: 'Online' }`
- `syncing`: `{ variant: 'cyan', label: 'Syncing' }`
- `connecting`: `{ variant: 'amber', label: 'Connecting' }`
- `offline`: `{ variant: 'slate', label: 'Offline' }`

### getAvatarInitials

Extracts initials from a name:

- Two or more words: First letter of first two words (e.g., "John Doe" → "JD")
- One word: First two characters (e.g., "Alice" → "AL")

### getAvatarColor

Generates a consistent gradient color for an avatar based on contact ID:

- Uses hash of ID to select from 8 predefined gradient colors
- Colors: cyan, violet, emerald, amber, rose, sky, fuchsia, teal

## Validation Rules

### Friend Code Validation

- **Rule:** Friend code MUST NOT be empty when adding a contact
- **Enforcement:** Submit button is disabled until friend code is entered
- **Error:** API returns error if friend code is invalid or already exists

### Nickname Validation

- **Rule:** Nickname is optional
- **Enforcement:** No client-side validation
- **Storage:** Empty strings are converted to `null` before sending to API

### Notes Validation

- **Rule:** Notes are optional
- **Enforcement:** No client-side validation
- **Storage:** Empty strings are converted to `null` before sending to API

## Error Handling

### Page-Level Errors

- **Scenario:** Initial contact fetch fails
- **Handling:** Display `PageError` component with error message and "Return Home" link

### Add Contact Errors

- **Scenario:** POST `/api/vault/contacts` fails
- **Handling:** Display error message in red error box within dialog
- **Recovery:** User can retry or cancel

### Edit Contact Errors

- **Scenario:** PATCH `/api/vault/contacts/:id` fails
- **Handling:** Log error to console, keep dialog open
- **Recovery:** User can retry or cancel

### Trust Toggle Errors

- **Scenario:** PATCH `/api/vault/contacts/:id` fails
- **Handling:** Log error to console, do not update UI state
- **Recovery:** User can retry the toggle

### Delete Contact Errors

- **Scenario:** DELETE `/api/vault/contacts/:id` fails
- **Handling:** Log error to console, keep confirmation UI visible
- **Recovery:** User can retry or cancel

## Implementation Notes

### Status Tracking Initialization

All contacts are initialized with `offline` status when loaded:

```typescript
const statuses: Record<string, ContactStatus> = {};
data.contacts.forEach((c) => {
  statuses[c.id] = 'offline';
});
setContactStatuses(statuses);
```

Real-time presence detection is out of scope. The status tracking infrastructure is in place for future implementation.

### Processing State Management

The `ContactList` component manages a single `processingId` to track which contact is currently being processed. This ensures:

- Only one operation can be in progress at a time per contact
- All action buttons for the processing contact are disabled
- Loading spinners are displayed on the active button

### Delete Confirmation Pattern

The delete confirmation uses an inline pattern rather than a separate modal:

1. `deleteConfirmId` state tracks which contact is showing confirmation
2. When set, the `ContactCard` renders `ContactDeleteConfirm` instead of normal actions
3. Confirmation UI is scoped to the specific contact card
4. No backdrop or modal overlay is used

### API Request Patterns

All API requests follow this pattern:

1. Set loading state (`isAdding`, `isSaving`, `processingId`)
2. Make fetch request with appropriate method and body
3. Check response.ok, throw error if not ok
4. Parse JSON response
5. Update local state on success
6. Clear loading state in finally block
7. Handle errors with try/catch

### Empty Values Handling

Empty strings for optional fields are converted to `null` or `undefined` before sending to API:

```typescript
body: JSON.stringify({
  nickname: nickname || null,
  notes: notes || null,
});
```

This ensures consistent null handling in the database.

## Examples

### Example: Add Contact Flow

```typescript
const handleAddContact = async (data: ContactFormData) => {
  setIsAdding(true);
  setAddDialogError(null);
  try {
    const response = await fetch('/api/vault/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        friendCode: data.friendCode,
        nickname: data.nickname || undefined,
        notes: data.notes || undefined,
      }),
    });
    if (!response.ok) {
      const errorData = (await response.json()) as ErrorResponse;
      throw new Error(errorData.error || 'Failed to add contact');
    }
    const result = (await response.json()) as AddContactResponse;
    setContacts((prev) => [...prev, result.contact]);
    setContactStatuses((prev) => ({
      ...prev,
      [result.contact.id]: 'offline',
    }));
    setShowAddDialog(false);
  } catch (err) {
    setAddDialogError(
      err instanceof Error ? err.message : 'Failed to add contact',
    );
  } finally {
    setIsAdding(false);
  }
};
```

### Example: Toggle Trust Flow

```typescript
const handleToggleTrust = async (contact: IContact) => {
  try {
    const response = await fetch(`/api/vault/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTrusted: !contact.isTrusted }),
    });
    if (!response.ok) throw new Error('Failed to update trust status');
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id ? { ...c, isTrusted: !c.isTrusted } : c,
      ),
    );
  } catch (err) {
    logger.error('Failed to toggle trust:', err);
  }
};
```

### Example: Delete Confirmation Flow

```typescript
// In ContactList component
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

const handleDelete = async (contact: IContact) => {
  setProcessingId(contact.id);
  try {
    await onDelete(contact);
    setDeleteConfirmId(null);
  } finally {
    setProcessingId(null);
  }
};

// In ContactCard render
<ContactCardActions
  isTrusted={contact.isTrusted}
  isProcessing={isProcessing}
  showDeleteConfirm={deleteConfirmId === contact.id}
  onEdit={() => onEdit(contact)}
  onToggleTrust={() => handleToggleTrust(contact)}
  onDelete={() => setDeleteConfirmId(contact.id)}
  onConfirmDelete={() => handleDelete(contact)}
  onCancelDelete={() => setDeleteConfirmId(null)}
/>
```

## References

- **Type Definitions:** `src/types/vault/VaultInterfaces.ts` (lines 574-628)
- **Page Component:** `src/pages/contacts.tsx` (227 lines)
- **List Component:** `src/components/contacts/ContactList.tsx` (293 lines)
- **Form Modals:** `src/components/contacts/ContactFormModal.tsx` (369 lines)
- **Delete Dialog:** `src/components/contacts/ContactDeleteDialog.tsx` (211 lines)
- **Filters/Helpers:** `src/components/contacts/ContactFilters.tsx` (204 lines)
- **Related Spec:** `openspec/specs/vault-sync/spec.md` (peer connection management)

## Dependencies

- **UI Components:** `@/components/ui` (Button, Input, Card, Badge, EmptyState, PageLayout, PageLoading, PageError)
- **Types:** `@/types/vault` (IContact, ContactStatus)
- **Logger:** `@/utils/logger`
- **Next.js:** Head component for page metadata
- **React:** useState, useEffect, useCallback hooks

## Non-Goals

- Real-time presence detection and status updates
- WebRTC peer-to-peer connection establishment
- Contact synchronization protocols
- Friend code generation and cryptographic validation
- Contact search and filtering UI
- Contact groups or categories
- Bulk contact operations (select all, delete multiple)
- Contact import/export functionality
- Contact profile pages with detailed information
- Contact activity history or audit logs
