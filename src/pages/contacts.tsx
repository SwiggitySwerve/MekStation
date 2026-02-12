import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';

import type { IContact, ContactStatus } from '@/types/vault';

import {
  UserPlusIcon,
  type ContactsResponse,
  type AddContactResponse,
  type ErrorResponse,
} from '@/components/contacts/ContactFilters';
import {
  AddContactDialog,
  EditContactDialog,
  type ContactFormData,
  type EditingContact,
} from '@/components/contacts/ContactFormModal';
import { ContactList } from '@/components/contacts/ContactList';
import { PageLayout, PageLoading, PageError, Button } from '@/components/ui';
import { logger } from '@/utils/logger';

export default function ContactsPage(): React.ReactElement {
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [contactStatuses, setContactStatuses] = useState<
    Record<string, ContactStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogError, setAddDialogError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingContact, setEditingContact] = useState<EditingContact | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/vault/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const data = (await response.json()) as ContactsResponse;
      setContacts(data.contacts);
      const statuses: Record<string, ContactStatus> = {};
      data.contacts.forEach((c) => {
        statuses[c.id] = 'offline';
      });
      setContactStatuses(statuses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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

  const handleEditContact = (contact: IContact) => {
    setEditingContact({
      id: contact.id,
      nickname: contact.nickname || '',
      notes: contact.notes || '',
    });
  };

  const handleSaveEdit = async (
    id: string,
    nickname: string,
    notes: string,
  ) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/vault/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname || null,
          notes: notes || null,
        }),
      });
      if (!response.ok) throw new Error('Failed to update contact');
      setContacts((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, nickname: nickname || null, notes: notes || null }
            : c,
        ),
      );
      setEditingContact(null);
    } catch (err) {
      logger.error('Failed to save edit:', err);
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleDelete = async (contact: IContact) => {
    try {
      const response = await fetch(`/api/vault/contacts/${contact.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete contact');
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    } catch (err) {
      logger.error('Failed to delete:', err);
    }
  };

  if (loading) return <PageLoading message="Loading contacts..." />;
  if (error) {
    return (
      <PageError
        title="Error Loading Contacts"
        message={error}
        backLink="/"
        backLabel="Return Home"
      />
    );
  }

  return (
    <>
      <Head>
        <title>Contacts | MekStation</title>
      </Head>

      <PageLayout
        title="Contacts"
        subtitle={`Manage your ${contacts.length} vault contact${contacts.length !== 1 ? 's' : ''}`}
        maxWidth="wide"
        backLink={{ href: '/', label: 'Home' }}
        headerContent={
          <Button
            variant="primary"
            onClick={() => setShowAddDialog(true)}
            leftIcon={<UserPlusIcon className="h-4 w-4" />}
            className="!bg-cyan-600 hover:!bg-cyan-500"
          >
            Add Contact
          </Button>
        }
      >
        <ContactList
          contacts={contacts}
          contactStatuses={contactStatuses}
          onEdit={handleEditContact}
          onToggleTrust={handleToggleTrust}
          onDelete={handleDelete}
          onOpenAddDialog={() => setShowAddDialog(true)}
        />

        <AddContactDialog
          isOpen={showAddDialog}
          onClose={() => {
            setShowAddDialog(false);
            setAddDialogError(null);
          }}
          onSubmit={handleAddContact}
          isSubmitting={isAdding}
          error={addDialogError}
        />

        <EditContactDialog
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSave={handleSaveEdit}
          isSaving={isSaving}
        />
      </PageLayout>
    </>
  );
}
