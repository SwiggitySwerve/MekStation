import type Database from 'better-sqlite3';
import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { webcrypto } from 'node:crypto';

import type { PermissionScopeType } from '@/types/vault';

import shareHandler from '@/pages/api/vault/share/[id]';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { PermissionRepository } from '@/services/vault/PermissionRepository';
import { PermissionService } from '@/services/vault/PermissionService';
import {
  getShareLinkRepository,
  resetShareLinkRepository,
} from '@/services/vault/ShareLinkRepository';
import {
  getShareLinkService,
  resetShareLinkService,
} from '@/services/vault/ShareLinkService';

const NOW = '2026-11-08T12:00:00.000Z';
const INPUTS = ['2026-11-08T01:00:00+14:00', 'Nov 8 2026'];
const LEGACY_EXPIRED = [
  ['2026-11-08T01:00:00+14:00', '2026-11-07T12:00:00.000Z'],
  ['2026-11-08T06:00:00-05:00', NOW],
  ['Nov 8 2026', NOW],
  ['unparseable', NOW],
  ['', NOW],
];

describe('vault sharing with real in-memory SQLite', () => {
  let database: Database.Database;
  let permissions: PermissionService;
  const originalCrypto = globalThis.crypto;
  const shares = () => getShareLinkService();

  beforeAll(async () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: webcrypto,
    });
    resetSQLiteService();
    const sqlite = getSQLiteService({ path: ':memory:' });
    sqlite.initialize();
    database = sqlite.getDatabase();
    await getShareLinkRepository().initialize();
    await new PermissionRepository().initialize();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(NOW));
    database.exec(
      'DELETE FROM vault_share_links; DELETE FROM vault_permissions;',
    );
    permissions = new PermissionService(new PermissionRepository());
  });

  afterEach(() => jest.useRealTimers());

  afterAll(() => {
    resetShareLinkService();
    resetShareLinkRepository();
    resetSQLiteService();
    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto });
  });

  async function createLink(expiresAt: string | null = null) {
    const result = await shares().create({
      scopeType: 'all',
      level: 'read',
      expiresAt,
    });
    expect(result.success).toBe(true);
    if (!result.link) throw new Error(result.error || 'Missing created link');
    return result.link;
  }

  function seedLink(expiresAt: string | null) {
    database
      .prepare(`
      INSERT INTO vault_share_links
        (id, token, scope_type, level, expires_at, created_at)
      VALUES ('legacy', 'legacy-token', 'all', 'read', ?, ?)
    `)
      .run(expiresAt, NOW);
  }

  function seedPermission(
    expiresAt: string | null,
    scopeType: PermissionScopeType = 'item',
    granteeId = 'friend',
  ) {
    database
      .prepare(`
      INSERT INTO vault_permissions
        (id, grantee_id, scope_type, scope_id, scope_category, level, expires_at, created_at)
      VALUES ('legacy', ?, ?, 'unit', 'units', 'read', ?, ?)
    `)
      .run(granteeId, scopeType, expiresAt, NOW);
  }

  async function patchLink(id: string, body: Record<string, unknown>) {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: { id },
      body,
    });
    await shareHandler(req, res);
    return res;
  }

  describe.each(INPUTS)('writes for %s', (input) => {
    it('canonicalizes share creation and denies redemption after expiry', async () => {
      const link = await createLink(input);
      expect((await shares().getById(link.id))?.expiresAt).toBe(
        new Date(input).toISOString(),
      );
      jest.setSystemTime(new Date(new Date(input).getTime() - 1));
      expect((await shares().redeem(link.token)).success).toBe(true);
      jest.setSystemTime(new Date(new Date(input).getTime() + 1));
      expect(await shares().redeem(link.token)).toMatchObject({
        success: false,
        error: { errorCode: 'EXPIRED' },
      });
      expect((await shares().getById(link.id))?.useCount).toBe(1);
    });

    it('canonicalizes direct share expiry updates', async () => {
      const link = await createLink();
      expect((await shares().updateExpiry(link.id, input)).success).toBe(true);
      expect((await shares().getById(link.id))?.expiresAt).toBe(
        new Date(input).toISOString(),
      );
    });

    it('canonicalizes PATCH expiry updates', async () => {
      const link = await createLink();
      expect(
        (await patchLink(link.id, { expiresAt: input }))._getStatusCode(),
      ).toBe(200);
      expect((await shares().getById(link.id))?.expiresAt).toBe(
        new Date(input).toISOString(),
      );
    });

    it('canonicalizes permission grants and denies access after expiry', async () => {
      const result = await permissions.grant({
        granteeId: 'friend',
        scopeType: 'item',
        scopeId: 'unit',
        level: 'read',
        expiresAt: input,
      });
      expect(result.success).toBe(true);
      expect((await permissions.getAllGrants())[0].expiresAt).toBe(
        new Date(input).toISOString(),
      );
      jest.setSystemTime(new Date(new Date(input).getTime() - 1));
      expect(
        (await permissions.check('friend', 'item', 'unit')).hasAccess,
      ).toBe(true);
      jest.setSystemTime(new Date(new Date(input).getTime() + 1));
      expect(
        (await permissions.check('friend', 'item', 'unit')).hasAccess,
      ).toBe(false);
    });

    it('canonicalizes permission expiry updates', async () => {
      seedPermission(null);
      expect((await permissions.updateExpiry('legacy', input)).success).toBe(
        true,
      );
      expect((await permissions.getAllGrants())[0].expiresAt).toBe(
        new Date(input).toISOString(),
      );
    });
  });

  describe.each(LEGACY_EXPIRED)(
    'legacy expired or invalid value %j',
    (input, now) => {
      beforeEach(() => jest.setSystemTime(new Date(now)));

      it('denies redemption without consuming a use', async () => {
        seedLink(input);
        expect(await shares().redeem('legacy-token')).toMatchObject({
          success: false,
          error: { errorCode: 'EXPIRED' },
        });
        expect((await shares().getById('legacy'))?.useCount).toBe(0);
        const link = await shares().getById('legacy');
        if (!link) throw new Error('Missing legacy link');
        expect(shares().isLinkValid(link)).toBe(false);
      });

      it.each(['item', 'category', 'all'] as const)(
        'denies %s permission',
        async (scope) => {
          seedPermission(input, scope);
          expect(
            (await permissions.check('friend', 'item', 'unit', 'units'))
              .hasAccess,
          ).toBe(false);
        },
      );

      it('denies public fallback permission', async () => {
        seedPermission(input, 'all', 'public');
        expect(
          (await permissions.check('friend', 'item', 'unit', 'units'))
            .hasAccess,
        ).toBe(false);
      });
    },
  );

  it.each(['2026-11-09T03:00:00+14:00', '2026-11-08T08:00:00-05:00', null])(
    'allows an unexpired legacy value %j',
    async (input) => {
      seedLink(input);
      seedPermission(input);
      expect((await shares().redeem('legacy-token')).success).toBe(true);
      expect(
        (await permissions.check('friend', 'item', 'unit')).hasAccess,
      ).toBe(true);
    },
  );

  it('denies at the exact expiry instant', async () => {
    seedLink(NOW);
    seedPermission(NOW);
    expect(await shares().redeem('legacy-token')).toMatchObject({
      success: false,
      error: { errorCode: 'EXPIRED' },
    });
    expect((await permissions.check('friend', 'item', 'unit')).hasAccess).toBe(
      false,
    );
  });

  it.each(['unparseable', '', 42])(
    'preserves PATCH validation for %j',
    async (input) => {
      const link = await createLink();
      const response = await patchLink(link.id, { expiresAt: input });
      expect(response._getStatusCode()).toBe(400);
      expect(response._getJSONData()).toEqual({
        error:
          typeof input === 'string'
            ? 'expiresAt must be a valid ISO date'
            : 'expiresAt must be a string or null',
      });
      expect((await shares().getById(link.id))?.expiresAt).toBeNull();
    },
  );

  it('rejects invalid service writes without changing expiry', async () => {
    expect(
      (
        await shares().create({
          scopeType: 'all',
          level: 'read',
          expiresAt: 'unparseable',
        })
      ).success,
    ).toBe(false);
    expect(
      (
        await permissions.grant({
          granteeId: 'friend',
          scopeType: 'all',
          level: 'read',
          expiresAt: 'unparseable',
        })
      ).success,
    ).toBe(false);
    const link = await createLink();
    seedPermission(null);
    expect((await shares().updateExpiry(link.id, 'unparseable')).success).toBe(
      false,
    );
    expect(
      (await permissions.updateExpiry('legacy', 'unparseable')).success,
    ).toBe(false);
    expect((await shares().getById(link.id))?.expiresAt).toBeNull();
    expect((await permissions.getAllGrants())[0].expiresAt).toBeNull();
  });

  it('clears expiry through share PATCH and permission updates', async () => {
    const link = await createLink(INPUTS[0]);
    seedPermission(INPUTS[0]);
    expect(
      (await patchLink(link.id, { expiresAt: null }))._getStatusCode(),
    ).toBe(200);
    expect((await permissions.updateExpiry('legacy', null)).success).toBe(true);
    expect((await shares().redeem(link.token)).success).toBe(true);
    expect((await permissions.check('friend', 'item', 'unit')).hasAccess).toBe(
      true,
    );
  });

  it('rejects a max-uses limit below use_count atomically', async () => {
    const link = await createLink();
    await shares().redeem(link.token);
    await shares().redeem(link.token);
    const result = await shares().updateMaxUses(link.id, 1);
    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining('use count'),
    });
    expect(await shares().getById(link.id)).toMatchObject({
      useCount: 2,
      maxUses: null,
    });
    await expect(
      getShareLinkRepository().updateMaxUses(link.id, 1),
    ).rejects.toThrow('use count');
    expect((await patchLink(link.id, { maxUses: 1 }))._getStatusCode()).toBe(
      400,
    );
  });

  it('allows max-uses limits equal to or above use_count and null', async () => {
    const link = await createLink();
    await shares().redeem(link.token);
    expect((await shares().updateMaxUses(link.id, 1)).success).toBe(true);
    expect(await shares().redeem(link.token)).toMatchObject({
      success: false,
      error: { errorCode: 'MAX_USES' },
    });
    expect((await shares().updateMaxUses(link.id, 2)).success).toBe(true);
    expect((await shares().redeem(link.token)).success).toBe(true);
    expect((await shares().updateMaxUses(link.id, null)).success).toBe(true);
    expect((await shares().redeem(link.token)).success).toBe(true);
  });
});
