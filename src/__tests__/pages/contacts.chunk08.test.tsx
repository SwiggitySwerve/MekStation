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
});
