/**
 * Campaign grant scope canonicalization and membership (design D5).
 *
 * Pins: unsorted + duplicated input yields one stored/signed form; two
 * grants with the same logical set serialize identically; empty sets
 * are typed-rejected; grantAllowsScope is exact-string membership
 * (no team:/player: prefix wildcards); a campaign-only grant does not
 * see gm.
 */

import {
  canonicalizeGrantScopes,
  createGmGrantScopes,
  grantAllowsScope,
  serializeGrantScopes,
} from '../campaignGrantGuards';
import { CampaignGrantError } from '../ICampaignGrantStore';

describe('canonicalizeGrantScopes', () => {
  it('sorts and dedupes so one logical set has one serialization', () => {
    const canonical = canonicalizeGrantScopes([
      'gm',
      'campaign',
      'gm',
      'campaign',
    ]);
    expect(canonical).toEqual(['campaign', 'gm']);
    expect(serializeGrantScopes(canonical)).toBe('["campaign","gm"]');
  });

  it('two issuances of the same logical set are byte-identical', () => {
    const first = serializeGrantScopes(
      canonicalizeGrantScopes(['player:bob', 'team:alpha', 'campaign']),
    );
    const second = serializeGrantScopes(
      canonicalizeGrantScopes([
        'campaign',
        'team:alpha',
        'player:bob',
        'team:alpha',
      ]),
    );
    expect(first).toBe(second);
    expect(first).toBe('["campaign","player:bob","team:alpha"]');
  });

  it('rejects an empty scope set as empty-scopes', () => {
    try {
      canonicalizeGrantScopes([]);
      throw new Error('expected empty-scopes');
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignGrantError);
      if (error instanceof CampaignGrantError) {
        expect(error.code).toBe('empty-scopes');
      }
    }
  });

  it('rejects values outside the closed campaign-event scope vocabulary', () => {
    try {
      canonicalizeGrantScopes(['campaign', 'lance:alpha']);
      throw new Error('expected invalid-scopes');
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignGrantError);
      if (error instanceof CampaignGrantError) {
        expect(error.code).toBe('invalid-scopes');
      }
    }
  });
});

describe('grantAllowsScope', () => {
  const gmGrant = {
    scopes: createGmGrantScopes(['team:alpha', 'player:bob']),
  };
  const campaignOnly = {
    scopes: canonicalizeGrantScopes(['campaign']),
  };
  const teamGrant = {
    scopes: canonicalizeGrantScopes(['team:alpha']),
  };

  it('gm grant sees gm, campaign, and team/player members of its set', () => {
    expect(gmGrant.scopes).toEqual([
      'campaign',
      'gm',
      'player:bob',
      'team:alpha',
    ]);
    expect(grantAllowsScope(gmGrant, 'gm')).toBe(true);
    expect(grantAllowsScope(gmGrant, 'campaign')).toBe(true);
    expect(grantAllowsScope(gmGrant, 'team:alpha')).toBe(true);
    expect(grantAllowsScope(gmGrant, 'player:bob')).toBe(true);
  });

  it('a campaign-only grant does not see gm', () => {
    expect(grantAllowsScope(campaignOnly, 'campaign')).toBe(true);
    expect(grantAllowsScope(campaignOnly, 'gm')).toBe(false);
  });

  it('matches team: and player: by exact string, not prefix', () => {
    expect(grantAllowsScope(teamGrant, 'team:alpha')).toBe(true);
    expect(grantAllowsScope(teamGrant, 'team:alpha-2')).toBe(false);
    expect(grantAllowsScope(teamGrant, 'team:alph')).toBe(false);
    expect(grantAllowsScope(teamGrant, 'player:alpha')).toBe(false);
    expect(grantAllowsScope(gmGrant, 'team:bravo')).toBe(false);
    expect(grantAllowsScope(gmGrant, 'player:alice')).toBe(false);
  });
});
