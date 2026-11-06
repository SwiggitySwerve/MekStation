/**
 * Environment-aware campaign event-store selection (umbrella task 8.1).
 *
 * Pins the four answers the selection owes a caller: an initialized
 * SQLite process gets the durable journal; a process that promised
 * durability and does not have it FAILS rather than substituting memory
 * (the design's "do not accept in-memory substitutes as durability
 * evidence"); a dev/test process keeps the ephemeral adapter but is told
 * out loud that it has one; and the rollback lever still forces memory.
 *
 * Real SQLite through the shipped service - an in-memory mock of the
 * journal would prove nothing about which store the registry picked.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  _resetCampaignEventStoreAnnouncementForTests,
  CampaignDurableStoreUnavailableError,
  selectCampaignEventStore,
} from '../getCampaignEventStore';
import { setTestNodeEnv } from './storeNodeEnvironment';

describe('selectCampaignEventStore', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalOverride = process.env.CAMPAIGN_EVENT_STORE;

  beforeEach(() => {
    resetSQLiteService();
    _resetCampaignEventStoreAnnouncementForTests();
    delete process.env.CAMPAIGN_EVENT_STORE;
  });

  afterEach(() => {
    resetSQLiteService();
    setTestNodeEnv(originalNodeEnv);
    if (originalOverride === undefined) {
      delete process.env.CAMPAIGN_EVENT_STORE;
    } else {
      process.env.CAMPAIGN_EVENT_STORE = originalOverride;
    }
  });

  describe('with an initialized database', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), 'campaign-event-store-'));
      getSQLiteService({ path: path.join(dir, 'select.db') }).initialize();
    });

    afterEach(async () => {
      resetSQLiteService();
      await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    });

    it('selects the durable journal store', () => {
      const selection = selectCampaignEventStore();

      expect(selection.durability).toBe('journal');
      expect(selection.store).toBeInstanceOf(JournalCampaignEventStore);
    });

    it('still honours the memory rollback lever', () => {
      // The design's rollback step: force the durable path dormant
      // without redeploying a different build.
      process.env.CAMPAIGN_EVENT_STORE = 'memory';

      expect(selectCampaignEventStore().durability).toBe('ephemeral');
    });
  });

  describe('without an initialized database', () => {
    it('falls back to the ephemeral adapter in development', () => {
      setTestNodeEnv('development');

      const selection = selectCampaignEventStore();

      expect(selection.durability).toBe('ephemeral');
      expect(selection.store).toBeInstanceOf(InMemoryCampaignEventStore);
    });

    it('says out loud that the campaign log is not durable', () => {
      setTestNodeEnv('development');
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      selectCampaignEventStore();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('dev-only');
      warn.mockRestore();
    });

    it('announces once per process rather than once per campaign', () => {
      // Loud, not deafening: a server hosting fifty campaigns must not
      // bury its own startup log, and the announcement is about the
      // PROCESS, which does not change between two campaigns.
      setTestNodeEnv('development');
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      selectCampaignEventStore();
      selectCampaignEventStore();

      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('refuses to substitute memory in production', () => {
      setTestNodeEnv('production');

      expect(() => selectCampaignEventStore()).toThrow(
        CampaignDurableStoreUnavailableError,
      );
    });

    it('refuses to substitute memory when durability was demanded', () => {
      setTestNodeEnv('development');
      process.env.CAMPAIGN_EVENT_STORE = 'durable';

      expect(() => selectCampaignEventStore()).toThrow(
        CampaignDurableStoreUnavailableError,
      );
    });

    it('lets the memory lever win in production', () => {
      // An operator who has explicitly chosen memory has accepted the
      // loss; the refusal above is for a process that did NOT choose.
      setTestNodeEnv('production');
      process.env.CAMPAIGN_EVENT_STORE = 'memory';

      expect(selectCampaignEventStore().durability).toBe('ephemeral');
    });
  });
});
