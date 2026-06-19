import type {
  AddContactResponse,
  ContactsResponse,
  ErrorResponse,
} from '@/components/contacts/ContactFilters';
import type {
  ContactFormData,
  EditingContact,
} from '@/components/contacts/ContactFormModal';
import type { IContact, ContactStatus } from '@/types/vault';

export function offlineStatusesFor(
  contacts: readonly IContact[],
): Record<string, ContactStatus> {
  return contacts.reduce<Record<string, ContactStatus>>((statuses, contact) => {
    statuses[contact.id] = 'offline';
    return statuses;
  }, {});
}

export function toEditingContact(contact: IContact): EditingContact {
  return {
    id: contact.id,
    nickname: contact.nickname || '',
    notes: contact.notes || '',
  };
}

export async function fetchContactsList(): Promise<IContact[]> {
  const response = await fetch('/api/vault/contacts');
  if (!response.ok) throw new Error('Failed to fetch contacts');
  const data = (await response.json()) as ContactsResponse;
  return data.contacts;
}

export async function createContact(data: ContactFormData): Promise<IContact> {
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
  return result.contact;
}

export async function updateContact(
  id: string,
  payload: Partial<Pick<IContact, 'isTrusted' | 'nickname' | 'notes'>>,
): Promise<void> {
  const response = await fetch(`/api/vault/contacts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update contact');
}

export async function removeContact(id: string): Promise<void> {
  const response = await fetch(`/api/vault/contacts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete contact');
}
