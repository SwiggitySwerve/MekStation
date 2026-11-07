import Database from 'better-sqlite3';

import type { IStoredIdentity } from '@/types/vault';

import { IdentityRepository } from '../IdentityRepository';

let database: Database.Database;

jest.mock('@/services/persistence', () => ({
  getSQLiteService: () => ({
    initialize: jest.fn(),
    getDatabase: () => database,
  }),
}));

describe('IdentityRepository active identity transaction', () => {
  let repository: IdentityRepository;

  beforeEach(async () => {
    database = new Database(':memory:');
    repository = new IdentityRepository();
    const identity: IStoredIdentity = {
      id: 'previous',
      displayName: 'Previous identity',
      publicKey: 'public-key',
      encryptedPrivateKey: {
        ciphertext: 'ciphertext',
        iv: 'iv',
        salt: 'salt',
        algorithm: 'AES-GCM-256',
      },
      friendCode: 'PREVIOUS',
      createdAt: '2026-11-07T00:00:00.000Z',
    };
    await repository.save(identity);
    await repository.save({ ...identity, id: 'next', friendCode: 'NEXT' });
    await repository.setActive('previous');
  });

  afterEach(() => {
    database.close();
  });

  it('switches the active identity and deactivates the previous identity', async () => {
    await repository.setActive('next');

    expect((await repository.getActive())?.id).toBe('next');
    expect(
      database
        .prepare('SELECT id FROM vault_identities WHERE is_active = 1')
        .all(),
    ).toEqual([{ id: 'next' }]);
  });

  it('rolls back deactivation when activating the next identity fails', async () => {
    database.exec(`
      CREATE TRIGGER reject_activation BEFORE UPDATE OF is_active ON vault_identities
      WHEN NEW.id = 'next' AND NEW.is_active = 1
      BEGIN
        SELECT RAISE(ABORT, 'activation failed');
      END;
    `);

    await expect(repository.setActive('next')).rejects.toMatchObject({
      message: 'activation failed',
      code: 'SQLITE_CONSTRAINT_TRIGGER',
    });

    expect((await repository.getActive())?.id).toBe('previous');
    expect(
      database
        .prepare('SELECT id FROM vault_identities WHERE is_active = 1')
        .all(),
    ).toEqual([{ id: 'previous' }]);
    expect(database.inTransaction).toBe(false);
  });
});
