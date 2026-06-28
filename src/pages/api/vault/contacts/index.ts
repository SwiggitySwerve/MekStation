/**
 * Vault Contacts API
 *
 * GET /api/vault/contacts - List contacts
 * POST /api/vault/contacts - Add a contact by friend code
 *
 * @spec openspec/specs/contacts-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IContact } from '@/types/vault';

import {
  rejectUnexpectedMethod,
  sendLoggedApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getContactService } from '@/services/vault/ContactService';

interface CreateContactRequest {
  friendCode?: unknown;
  nickname?: unknown;
  notes?: unknown;
  trusted?: unknown;
}

interface ContactsResponse {
  contacts: IContact[];
}

interface AddContactResponse {
  contact: IContact;
}

type ContactsApiResponse =
  | ContactsResponse
  | AddContactResponse
  | ApiErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContactsApiResponse>,
): Promise<void> {
  if (
    rejectUnexpectedMethod(req, res, ['GET', 'POST'], () => ({
      error: 'Method not allowed',
    }))
  )
    return;

  try {
    const contactService = getContactService();

    if (req.method === 'GET') {
      const contacts = await contactService.getAllContacts();
      return res.status(200).json({ contacts });
    }

    const body = req.body as CreateContactRequest;
    if (!body.friendCode || typeof body.friendCode !== 'string') {
      return res.status(400).json({ error: 'Friend code is required' });
    }

    const result = await contactService.addContact({
      friendCode: body.friendCode,
      nickname:
        typeof body.nickname === 'string' ? body.nickname.trim() : undefined,
      notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
      trusted: typeof body.trusted === 'boolean' ? body.trusted : undefined,
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error.message,
        code: result.error.errorCode,
      });
    }

    return res.status(201).json({ contact: result.data.contact });
  } catch (error) {
    sendLoggedApiError(res, 'Contacts API error:', error);
  }
}
