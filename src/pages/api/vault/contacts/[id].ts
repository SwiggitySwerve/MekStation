/**
 * Vault Contact API
 *
 * PATCH /api/vault/contacts/[id] - Update contact metadata
 * DELETE /api/vault/contacts/[id] - Remove contact
 *
 * @spec openspec/specs/contacts-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IContact } from '@/types/vault';

import {
  rejectMissingQueryString,
  rejectUnexpectedMethod,
  sendLoggedApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getContactService } from '@/services/vault/ContactService';

interface UpdateContactRequest {
  isTrusted?: unknown;
  nickname?: unknown;
  notes?: unknown;
}

interface ContactResponse {
  contact: IContact;
}

interface DeleteContactResponse {
  success: true;
}

type ContactApiResponse =
  | ContactResponse
  | DeleteContactResponse
  | ApiErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContactApiResponse>,
): Promise<void> {
  const id = rejectMissingQueryString(req, res, 'id', 'Invalid contact ID');
  if (!id) return;

  if (
    rejectUnexpectedMethod(req, res, ['PATCH', 'DELETE'], () => ({
      error: 'Method not allowed',
    }))
  )
    return;

  try {
    const contactService = getContactService();

    if (req.method === 'DELETE') {
      const deleted = await contactService.removeContact(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      return res.status(200).json({ success: true });
    }

    const existing = await contactService.getContact(id);
    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const body = req.body as UpdateContactRequest;

    if (body.nickname !== undefined) {
      if (body.nickname !== null && typeof body.nickname !== 'string') {
        return res.status(400).json({ error: 'Invalid nickname' });
      }
      await contactService.setNickname(id, body.nickname);
    }

    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== 'string') {
        return res.status(400).json({ error: 'Invalid notes' });
      }
      await contactService.setNotes(id, body.notes);
    }

    if (body.isTrusted !== undefined) {
      if (typeof body.isTrusted !== 'boolean') {
        return res.status(400).json({ error: 'Invalid trust flag' });
      }
      await contactService.setTrusted(id, body.isTrusted);
    }

    const contact = await contactService.getContact(id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.status(200).json({ contact });
  } catch (error) {
    sendLoggedApiError(res, 'Contact API error:', error);
  }
}
