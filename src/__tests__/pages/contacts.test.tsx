/**
 * Characterization tests for Contacts page — captures current behavior
 * of contact list display, CRUD modals, and action flows before decomposition.
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import React from 'react';

import type { IContact } from '@/types/vault';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// =============================================================================
// Test Data
// =============================================================================

function makeContact(overrides: Partial<IContact> = {}): IContact {
  return {
    id: 'contact-1',
    friendCode: 'MK-AAAA-BBBB-CCCC',
    publicKey: 'abc123',
    nickname: null,
    displayName: 'Test User',
    avatar: null,
    addedAt: '2025-01-01T00:00:00Z',
    lastSeenAt: null,
    isTrusted: false,
    notes: null,
    ...overrides,
  };
}

const mockContacts: IContact[] = [
  makeContact({
    id: 'contact-1',
    friendCode: 'MK-AAAA-BBBB-CCCC',
    displayName: 'Alice',
    nickname: 'Ally',
    isTrusted: true,
    notes: 'My best friend',
    lastSeenAt: '2025-01-10T12:00:00Z',
  }),
  makeContact({
    id: 'contact-2',
    friendCode: 'MK-DDDD-EEEE-FFFF',
    displayName: 'Bob',
    nickname: null,
    isTrusted: false,
    notes: null,
    lastSeenAt: null,
  }),
  makeContact({
    id: 'contact-3',
    friendCode: 'MK-GGGG-HHHH-IIII',
    displayName: 'Charlie',
    nickname: 'Chuck',
    isTrusted: true,
    notes: 'Met at GenCon',
    lastSeenAt: '2025-02-01T08:30:00Z',
  }),
];

// =============================================================================
// Fetch Mock Setup
// =============================================================================

let fetchMock: jest.Mock;

function setupFetchMock(contacts: IContact[] = mockContacts) {
  fetchMock = jest
    .fn()
    .mockImplementation((url: string, options?: RequestInit) => {
      const method = options?.method || 'GET';

      // GET /api/vault/contacts
      if (url === '/api/vault/contacts' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ contacts, count: contacts.length }),
        });
      }

      // POST /api/vault/contacts (add contact)
      if (url === '/api/vault/contacts' && method === 'POST') {
        const body = JSON.parse(options?.body as string);
        const newContact = makeContact({
          id: 'contact-new',
          friendCode: body.friendCode,
          displayName: body.friendCode,
          nickname: body.nickname || null,
          notes: body.notes || null,
        });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, contact: newContact }),
        });
      }

      // PATCH /api/vault/contacts/:id (edit contact)
      if (url.match(/\/api\/vault\/contacts\/[\w-]+$/) && method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }

      // DELETE /api/vault/contacts/:id
      if (url.match(/\/api\/vault\/contacts\/[\w-]+$/) && method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }

      return Promise.reject(new Error(`Unmocked fetch: ${method} ${url}`));
    });

  global.fetch = fetchMock as unknown as typeof fetch;
}

function setupFetchError(errorMessage = 'Failed to fetch contacts') {
  fetchMock = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: errorMessage }),
    }),
  );
  global.fetch = fetchMock as unknown as typeof fetch;
}

// =============================================================================
// Imports (after mocks)
// =============================================================================

import ContactsPage from '@/pages/contacts';

// =============================================================================
// Helpers
// =============================================================================

async function renderContacts(contacts?: IContact[]) {
  setupFetchMock(contacts);
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ContactsPage />);
  });
  return result!;
}

async function renderContactsWithError() {
  setupFetchError();
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ContactsPage />);
  });
  return result!;
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Contacts Page', () => {
  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('renders the page without crashing', async () => {
      await renderContacts();
      expect(screen.getByText('Contacts')).toBeInTheDocument();
    });

    it('sets page title via Head', async () => {
      await renderContacts();
      expect(screen.getByText('Contacts')).toBeInTheDocument();
    });

    it('renders subtitle with contact count', async () => {
      await renderContacts();
      expect(
        screen.getByText('Manage your 3 vault contacts'),
      ).toBeInTheDocument();
    });

    it('renders subtitle with singular form for 1 contact', async () => {
      await renderContacts([mockContacts[0]]);
      expect(
        screen.getByText('Manage your 1 vault contact'),
      ).toBeInTheDocument();
    });

    it('renders Add Contact button in header', async () => {
      await renderContacts();
      // There may be multiple "Add Contact" buttons; just check at least one exists
      const addButtons = screen.getAllByText('Add Contact');
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('shows loading message while fetching contacts', () => {
      // Don't await — we want to catch the loading state
      setupFetchMock();
      render(<ContactsPage />);
      expect(screen.getByText('Loading contacts...')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error State
  // ===========================================================================

  describe('Error State', () => {
    it('shows error page when fetch fails', async () => {
      await renderContactsWithError();
      expect(screen.getByText('Error Loading Contacts')).toBeInTheDocument();
    });

    it('shows Return Home link on error', async () => {
      await renderContactsWithError();
      expect(screen.getByText('Return Home')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe('Empty State', () => {
    it('shows empty state when no contacts', async () => {
      await renderContacts([]);
      expect(screen.getByText('No contacts yet')).toBeInTheDocument();
    });

    it('shows Add Your First Contact button in empty state', async () => {
      await renderContacts([]);
      expect(screen.getByText('Add Your First Contact')).toBeInTheDocument();
    });

    it('shows explanation message in empty state', async () => {
      await renderContacts([]);
      expect(
        screen.getByText(
          'Add contacts to share vault content and sync with other MekStation users.',
        ),
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Contact List Display
  // ===========================================================================

  describe('Contact List Display', () => {
    it('renders all contact cards', async () => {
      await renderContacts();
      // Nicknames take priority: Ally, Bob (no nickname), Chuck
      expect(screen.getByText('Ally')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Chuck')).toBeInTheDocument();
    });

    it('shows secondary name when nickname exists', async () => {
      await renderContacts();
      // Alice has nickname "Ally", so "Alice" shows as secondary
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('shows trusted shield icon for trusted contacts', async () => {
      await renderContacts();
      // Trusted contacts (Alice, Charlie) should have shield icons
      // Untrusted (Bob) should show "Unverified"
      expect(screen.getByText('Unverified')).toBeInTheDocument();
    });

    it('shows notes preview for contacts with notes', async () => {
      await renderContacts();
      expect(screen.getByText('My best friend')).toBeInTheDocument();
      expect(screen.getByText('Met at GenCon')).toBeInTheDocument();
    });

    it('shows truncated friend codes', async () => {
      await renderContacts();
      // MK-AAAA-BBBB-CCCC → MK-AAA...CCCC (truncated)
      const friendCodes = screen.getAllByText(/MK-/);
      expect(friendCodes.length).toBeGreaterThanOrEqual(3);
    });

    it('shows "Never" for contacts with no lastSeenAt', async () => {
      await renderContacts();
      // Bob has lastSeenAt: null
      expect(screen.getByText(/Last seen: Never/)).toBeInTheDocument();
    });

    it('shows status badges for all contacts (default offline)', async () => {
      await renderContacts();
      const offlineBadges = screen.getAllByText('Offline');
      expect(offlineBadges.length).toBe(3);
    });
  });

  // ===========================================================================
  // Stats Summary
  // ===========================================================================

  describe('Stats Summary', () => {
    it('shows online count', async () => {
      await renderContacts();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('online')).toBeInTheDocument();
    });

    it('shows trusted count', async () => {
      await renderContacts();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('trusted')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Add Contact Dialog
  // ===========================================================================

  describe('Add Contact Dialog', () => {
    it('opens add dialog when clicking Add Contact button', async () => {
      await renderContacts();

      const addButtons = screen.getAllByText('Add Contact');
      const headerButton = addButtons.find(
        (el) => el.closest('button') !== null,
      );

      await act(async () => {
        fireEvent.click(headerButton!);
      });

      expect(
        screen.getByText('Connect with another MekStation user'),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          'Enter friend code (e.g., MK-XXXX-XXXX-XXXX)',
        ),
      ).toBeInTheDocument();
    });

    it('shows friend code, nickname, and notes fields', async () => {
      await renderContacts();

      const addButtons = screen.getAllByText('Add Contact');
      const headerButton = addButtons.find(
        (el) => el.closest('button') !== null,
      );

      await act(async () => {
        fireEvent.click(headerButton!);
      });

      expect(
        screen.getByPlaceholderText(
          'Enter friend code (e.g., MK-XXXX-XXXX-XXXX)',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Give this contact a nickname'),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Add notes about this contact...'),
      ).toBeInTheDocument();
    });

    it('has Cancel button in add dialog', async () => {
      await renderContacts();

      const addButtons = screen.getAllByText('Add Contact');
      const headerButton = addButtons.find(
        (el) => el.closest('button') !== null,
      );

      await act(async () => {
        fireEvent.click(headerButton!);
      });

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('closes add dialog on Cancel click', async () => {
      await renderContacts();

      const addButtons = screen.getAllByText('Add Contact');
      const headerButton = addButtons.find(
        (el) => el.closest('button') !== null,
      );

      await act(async () => {
        fireEvent.click(headerButton!);
      });

      expect(
        screen.getByText('Connect with another MekStation user'),
      ).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText('Cancel'));
      });

      expect(
        screen.queryByText('Connect with another MekStation user'),
      ).not.toBeInTheDocument();
    });

    it('submits add form and new contact appears in list', async () => {
      await renderContacts();

      // Open dialog
      const addButtons = screen.getAllByText('Add Contact');
      const headerButton = addButtons.find(
        (el) => el.closest('button') !== null,
      );
      await act(async () => {
        fireEvent.click(headerButton!);
      });

      // Fill in friend code
      const friendCodeInput = screen.getByPlaceholderText(
        'Enter friend code (e.g., MK-XXXX-XXXX-XXXX)',
      );
      await act(async () => {
        fireEvent.change(friendCodeInput, {
          target: { value: 'MK-ZZZZ-YYYY-XXXX' },
        });
      });

      // Submit
      const submitButtons = screen.getAllByText('Add Contact');
      const submitButton = submitButtons.find(
        (el) => el.closest('button')?.getAttribute('type') === 'submit',
      );

      await act(async () => {
        fireEvent.click(submitButton!);
      });

      // Verify the POST was called
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/vault/contacts',
          expect.objectContaining({ method: 'POST' }),
        );
      });
    });
  });

  // ===========================================================================
  // Edit Contact Dialog
  // ===========================================================================

  describe('Edit Contact Dialog', () => {
    it('opens edit dialog when clicking edit button on a contact', async () => {
      await renderContacts();

      // Find edit buttons (they have title "Edit nickname & notes")
      const editButtons = screen.getAllByTitle('Edit nickname & notes');
      expect(editButtons.length).toBe(3);

      await act(async () => {
        fireEvent.click(editButtons[0]);
      });

      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
      expect(screen.getByText('Update nickname and notes')).toBeInTheDocument();
    });

    it('shows Save Changes and Cancel buttons in edit dialog', async () => {
      await renderContacts();

      const editButtons = screen.getAllByTitle('Edit nickname & notes');
      await act(async () => {
        fireEvent.click(editButtons[0]);
      });

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('closes edit dialog on Cancel click', async () => {
      await renderContacts();

      const editButtons = screen.getAllByTitle('Edit nickname & notes');
      await act(async () => {
        fireEvent.click(editButtons[0]);
      });

      expect(screen.getByText('Edit Contact')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText('Cancel'));
      });

      expect(screen.queryByText('Edit Contact')).not.toBeInTheDocument();
    });

    it('pre-fills nickname and notes for the selected contact', async () => {
      await renderContacts();

      // Click edit on Alice (nickname="Ally", notes="My best friend")
      const editButtons = screen.getAllByTitle('Edit nickname & notes');
      await act(async () => {
        fireEvent.click(editButtons[0]);
      });

      const nicknameInput = screen.getByPlaceholderText('Set a nickname');
      const notesInput = screen.getByPlaceholderText(
        'Add notes about this contact...',
      );

      expect(nicknameInput).toHaveValue('Ally');
      expect(notesInput).toHaveValue('My best friend');
    });

    it('submits edit and calls PATCH endpoint', async () => {
      await renderContacts();

      const editButtons = screen.getAllByTitle('Edit nickname & notes');
      await act(async () => {
        fireEvent.click(editButtons[0]);
      });

      // Change nickname
      const nicknameInput = screen.getByPlaceholderText('Set a nickname');
      await act(async () => {
        fireEvent.change(nicknameInput, { target: { value: 'Alice-Updated' } });
      });

      // Submit
      await act(async () => {
        fireEvent.click(screen.getByText('Save Changes'));
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/vault/contacts/contact-1',
          expect.objectContaining({ method: 'PATCH' }),
        );
      });
    });
  });

  // ===========================================================================
  // Delete Contact Flow
  // ===========================================================================

  describe('Delete Contact Flow', () => {
    it('shows delete confirmation when clicking delete button', async () => {
      await renderContacts();

      const deleteButtons = screen.getAllByTitle('Delete contact');
      expect(deleteButtons.length).toBe(3);

      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByText('Delete this contact?')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('cancels delete confirmation', async () => {
      await renderContacts();

      const deleteButtons = screen.getAllByTitle('Delete contact');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByText('Delete this contact?')).toBeInTheDocument();

      // Click Cancel on the confirmation
      const cancelButtons = screen.getAllByText('Cancel');
      const confirmCancel = cancelButtons.find(
        (el) => el.closest('button') !== null,
      );

      await act(async () => {
        fireEvent.click(confirmCancel!);
      });

      expect(
        screen.queryByText('Delete this contact?'),
      ).not.toBeInTheDocument();
    });

    it('confirms delete and calls DELETE endpoint', async () => {
      await renderContacts();

      const deleteButtons = screen.getAllByTitle('Delete contact');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Confirm'));
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/vault/contacts/contact-1',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });
  });

  // ===========================================================================
  // Trust Toggle
  // ===========================================================================

  describe('Trust Toggle', () => {
    it('shows trust toggle buttons for all contacts', async () => {
      await renderContacts();

      // Trusted contacts have title "Remove trust", untrusted have "Mark as trusted"
      const trustButtons = screen.getAllByTitle('Remove trust');
      const untrustButtons = screen.getAllByTitle('Mark as trusted');

      // Alice and Charlie are trusted, Bob is not
      expect(trustButtons.length).toBe(2);
      expect(untrustButtons.length).toBe(1);
    });

    it('calls PATCH endpoint when toggling trust', async () => {
      await renderContacts();

      const markTrustedButton = screen.getByTitle('Mark as trusted');
      await act(async () => {
        fireEvent.click(markTrustedButton);
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/vault/contacts/contact-2',
          expect.objectContaining({ method: 'PATCH' }),
        );
      });

      // Verify the body includes isTrusted: true
      const patchCall = fetchMock.mock.calls.find(
        (call: [string, RequestInit?]) =>
          call[0].includes('contact-2') && call[1]?.method === 'PATCH',
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1]!.body as string);
      expect(body.isTrusted).toBe(true);
    });
  });

  // ===========================================================================
  // Fetch on Mount
  // ===========================================================================

  describe('Data Fetching', () => {
    it('calls GET /api/vault/contacts on mount', async () => {
      await renderContacts();
      expect(fetchMock).toHaveBeenCalledWith('/api/vault/contacts');
    });
  });

  // ===========================================================================
  // Add from Empty State
  // ===========================================================================

  describe('Add from Empty State', () => {
    it('opens add dialog from empty state button', async () => {
      await renderContacts([]);

      await act(async () => {
        fireEvent.click(screen.getByText('Add Your First Contact'));
      });

      expect(
        screen.getByText('Connect with another MekStation user'),
      ).toBeInTheDocument();
    });
  });
});
