/**
 * Old saves keep loading after applied outcomes gain an in-game `appliedOn`.
 *
 * `fixtures/recentlyAppliedPreAppliedOn.json` (server body) and
 * `src/stores/campaign/__tests__/fixtures/recentlyAppliedPreAppliedOn.state.json`
 * (local-storage state) are the unmodified output of origin/main's two
 * `serializeCampaign` functions (commit 921254806, before `appliedOn`) over a
 * campaign dated 3025-07-04 holding two applied outcomes whose `capturedAt` is
 * a wall-clock instant in 2026. Only whitespace was changed (oxfmt). Do not
 * regenerate them: they are the "old shape" these tests pin.
 *
 * @spec openspec/changes/fix-captured-at-time-domain/specs/campaign-refit-and-prestige/spec.md
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import type { SerializedCampaignBody } from '@/types/campaign/SerializedCampaign';

import {
  deserializeCampaign,
  serializeCampaign as serializeState,
  type SerializedCampaignState,
} from '@/stores/campaign/useCampaignStore.persistence';

import {
  deserializeCampaignBody,
  serializeCampaign,
} from '../serializeCampaign';

const body = JSON.parse(
  readFileSync(
    join(__dirname, 'fixtures', 'recentlyAppliedPreAppliedOn.json'),
    'utf8',
  ),
) as SerializedCampaignBody;
const state = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'stores',
      'campaign',
      '__tests__',
      'fixtures',
      'recentlyAppliedPreAppliedOn.state.json',
    ),
    'utf8',
  ),
) as SerializedCampaignState;

const LOADED_DAY = '3025-07-04T00:00:00.000Z';

describe('a save written before appliedOn existed', () => {
  it('has wall-clock capturedAt and no appliedOn in either fixture', () => {
    for (const entries of [
      body.recentlyAppliedOutcomes,
      state.recentlyAppliedOutcomes,
    ]) {
      expect(entries?.map((o) => o.matchId)).toEqual([
        'legacy-win',
        'legacy-loss',
      ]);
      for (const entry of entries ?? []) {
        expect(entry).not.toHaveProperty('appliedOn');
        expect(entry.capturedAt.startsWith('2026-')).toBe(true);
      }
    }
  });

  it('loads through the server-body deserializer with appliedOn stamped from the loaded campaign date and nothing dropped', () => {
    const campaign = deserializeCampaignBody(body);
    const entries = campaign.recentlyAppliedOutcomes ?? [];

    expect(entries.map((o) => o.matchId)).toEqual([
      'legacy-win',
      'legacy-loss',
    ]);
    expect(entries.map((o) => o.appliedOn)).toEqual([LOADED_DAY, LOADED_DAY]);
    // capturedAt is provenance and is left exactly as it was written.
    expect(entries.map((o) => o.capturedAt)).toEqual(
      (body.recentlyAppliedOutcomes ?? []).map((o) => o.capturedAt),
    );
    expect(campaign.moraleCountedMatchIds).toEqual(['legacy-win']);
  });

  it('loads through the local-storage deserializer the same way', () => {
    const campaign = deserializeCampaign(state, new Map(), new Map());
    const entries = campaign.recentlyAppliedOutcomes ?? [];

    expect(entries.map((o) => o.matchId)).toEqual([
      'legacy-win',
      'legacy-loss',
    ]);
    expect(entries.map((o) => o.appliedOn)).toEqual([LOADED_DAY, LOADED_DAY]);
    expect(campaign.moraleCountedMatchIds).toEqual(['legacy-win']);
  });

  it('round-trips with appliedOn kept, and a second load changes nothing', () => {
    const once = deserializeCampaignBody(body);
    const saved = serializeCampaign(once);
    expect(saved.recentlyAppliedOutcomes?.map((o) => o.appliedOn)).toEqual([
      LOADED_DAY,
      LOADED_DAY,
    ]);

    const twice = deserializeCampaignBody(saved);
    expect(twice.recentlyAppliedOutcomes).toEqual(once.recentlyAppliedOutcomes);

    const savedState = serializeState(once, [], [], {});
    expect(savedState.recentlyAppliedOutcomes?.map((o) => o.appliedOn)).toEqual(
      [LOADED_DAY, LOADED_DAY],
    );
  });

  it('keeps an appliedOn that is already there, however far from the loaded date', () => {
    const stamped = {
      ...body,
      recentlyAppliedOutcomes: (body.recentlyAppliedOutcomes ?? []).map(
        (o) => ({
          ...o,
          appliedOn: '3025-05-20T00:00:00.000Z',
        }),
      ),
    };
    const campaign = deserializeCampaignBody(stamped);
    expect(campaign.recentlyAppliedOutcomes?.map((o) => o.appliedOn)).toEqual([
      '3025-05-20T00:00:00.000Z',
      '3025-05-20T00:00:00.000Z',
    ]);
  });

  it('stamps only the entries that lack appliedOn and leaves the others as they were', () => {
    const [first, second] = body.recentlyAppliedOutcomes ?? [];
    const mixed = {
      ...body,
      recentlyAppliedOutcomes: [
        { ...first, appliedOn: '3025-05-20T00:00:00.000Z' },
        second,
      ],
    };
    const campaign = deserializeCampaignBody(mixed);
    expect(campaign.recentlyAppliedOutcomes?.map((o) => o.appliedOn)).toEqual([
      '3025-05-20T00:00:00.000Z',
      LOADED_DAY,
    ]);
  });

  it('re-stamps an unreadable appliedOn instead of dropping the entry', () => {
    const broken = {
      ...body,
      recentlyAppliedOutcomes: (body.recentlyAppliedOutcomes ?? []).map(
        (o) => ({
          ...o,
          appliedOn: 'not a date',
        }),
      ),
    };
    const campaign = deserializeCampaignBody(broken);
    expect(campaign.recentlyAppliedOutcomes?.map((o) => o.appliedOn)).toEqual([
      LOADED_DAY,
      LOADED_DAY,
    ]);
  });

  it('loads a campaign that has no applied outcomes at all', () => {
    const { recentlyAppliedOutcomes: _dropped, ...without } = body;
    void _dropped;
    expect(
      deserializeCampaignBody(without as SerializedCampaignBody)
        .recentlyAppliedOutcomes,
    ).toBeUndefined();
  });
});
