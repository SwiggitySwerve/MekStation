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
});
