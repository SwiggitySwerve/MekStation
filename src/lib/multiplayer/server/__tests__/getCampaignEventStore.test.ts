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

// `NODE_ENV` is typed read-only on `process.env`; cast through a mutable
// view so each row can state the environment it is about.
const env = process.env as Record<string, string | undefined>;

describe('selectCampaignEventStore', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalOverride = process.env.CAMPAIGN_EVENT_STORE;

  beforeEach(() => {
    resetSQLiteService();
    _resetCampaignEventStoreAnnouncementForTests();
    delete env.CAMPAIGN_EVENT_STORE;
  });

  afterEach(() => {
    resetSQLiteService();
    env.NODE_ENV = originalNodeEnv;
    if (originalOverride === undefined) {
      delete env.CAMPAIGN_EVENT_STORE;
    } else {
      env.CAMPAIGN_EVENT_STORE = originalOverride;
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
      env.CAMPAIGN_EVENT_STORE = 'memory';

      expect(selectCampaignEventStore().durability).toBe('ephemeral');
    });
  });

  describe('without an initialized database', () => {
    it('falls back to the ephemeral adapter in development', () => {
      env.NODE_ENV = 'development';

      const selection = selectCampaignEventStore();

      expect(selection.durability).toBe('ephemeral');
      expect(selection.store).toBeInstanceOf(InMemoryCampaignEventStore);
    });

    it('says out loud that the campaign log is not durable', () => {
      env.NODE_ENV = 'development';
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
      env.NODE_ENV = 'development';
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      selectCampaignEventStore();
      selectCampaignEventStore();

      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('refuses to substitute memory in production', () => {
      env.NODE_ENV = 'production';

      expect(() => selectCampaignEventStore()).toThrow(
        CampaignDurableStoreUnavailableError,
      );
    });

    it('refuses to substitute memory when durability was demanded', () => {
      env.NODE_ENV = 'development';
      env.CAMPAIGN_EVENT_STORE = 'durable';

      expect(() => selectCampaignEventStore()).toThrow(
        CampaignDurableStoreUnavailableError,
      );
    });

    it('lets the memory lever win in production', () => {
      // An operator who has explicitly chosen memory has accepted the
      // loss; the refusal above is for a process that did NOT choose.
      env.NODE_ENV = 'production';
      env.CAMPAIGN_EVENT_STORE = 'memory';

      expect(selectCampaignEventStore().durability).toBe('ephemeral');
    });
  });
});
