import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ParsedRosterUnitSource } from '@/types/campaign/RosterUnitSource';

import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import {
  admitCanonicalExactReference,
  readyCanonicalCatalog,
  snapshotFromNodeCatalogIndex,
  snapshotFromUnitsApiPayload,
  UNAVAILABLE_CANONICAL_CATALOG,
} from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { parseRosterUnitSource } from '@/types/campaign/RosterUnitSource';

const catalog = readyCanonicalCatalog(['atlas-as7-d']);

function admit(
  parsed: ParsedRosterUnitSource,
  extra: {
    unitRef?: string;
    catalog?: typeof catalog | { status: 'loading' };
  } = {},
) {
  return admitCanonicalExactReference({
    parsed,
    unitRef: extra.unitRef ?? 'atlas-as7-d',
    catalog: extra.catalog ?? catalog,
    unitId: 'u1',
    unitName: 'Atlas',
  });
}

describe('RosterUnitSource and catalog admission', () => {
  it('parses legacy/valid/invalid sources and fail-closed catalogs', () => {
    const persisted = { unitSource: 'stock' as unknown };
    expect(parseRosterUnitSource(undefined)).toEqual({
      kind: 'legacy',
      source: 'canonical',
    });
    expect(parseRosterUnitSource('custom')).toEqual({
      kind: 'valid',
      source: 'custom',
    });
    expect(parseRosterUnitSource(persisted.unitSource).kind).toBe('invalid');
    expect(persisted.unitSource).toBe('stock');
    expect(
      snapshotFromUnitsApiPayload({
        success: true,
        data: [{ id: 'atlas-as7-d' }],
      }),
    ).toMatchObject({ status: 'ready' });
    expect(snapshotFromUnitsApiPayload({ success: true, data: [] })).toBe(
      UNAVAILABLE_CANONICAL_CATALOG,
    );
    expect(
      snapshotFromNodeCatalogIndex(() => {
        throw new Error('missing');
      }),
    ).toBe(UNAVAILABLE_CANONICAL_CATALOG);
  });

  it('publishes CAMP-01A wave-result.json when the controller artifact dir is set', async () => {
    const artifactDir = process.env.CAMP01_ARTIFACT_DIR;
    const runId = process.env.CAMP01_RUN_ID;
    if (!artifactDir || !runId) return;
    const legacy = parseRosterUnitSource(undefined);
    const persisted = { unitSource: 'forged-source' };
    const unknown = parseRosterUnitSource(persisted.unitSource);
    const exact = admit(legacy);
    const custom = admit(parseRosterUnitSource('custom'));
    const loading = admit(legacy, { catalog: { status: 'loading' } });
    const fetchImpl = jest.fn() as unknown as typeof fetch;
    await expect(
      materializeCampaignMissionEncounter({
        campaign: { id: 'c1', name: 'Gray Dawn', missions: new Map() },
        missionId: 'm1',
        rosterUnits: [
          {
            unitId: 'u2',
            unitName: 'Custom',
            chassisVariant: 'AS7-D',
            unitRef: 'atlas-as7-d',
            unitSource: 'custom',
            readiness: 'Ready',
          },
        ],
        catalog,
        fetchImpl,
      }),
    ).rejects.toThrow('cannot launch yet');
    const calls = (fetchImpl as jest.Mock).mock.calls.length;
    const assertions = {
      'blockerPresent===true': !custom.admitted && !loading.admitted,
      'canonicalExactRefResolved===true': exact.admitted,
      'downgradeRejected===true':
        unknown.kind === 'invalid' && persisted.unitSource === 'forged-source',
      'encounterLookupCount===0': calls,
      'legacySourceResolvedCanonical===true':
        legacy.kind === 'legacy' && legacy.source === 'canonical',
      'mutationCount===0': calls,
      'reuseResultCount===0': calls,
      'routeCallCount===0': calls,
      'unknownSourceRejected===true': unknown.kind === 'invalid',
    };
    if (
      Object.values(assertions).some((value) => value !== true && value !== 0)
    ) {
      throw new Error(
        `wave assertion checks failed: ${JSON.stringify(assertions)}`,
      );
    }
    fs.writeFileSync(
      path.join(artifactDir, 'wave-result.json'),
      `${JSON.stringify({ schema: 'camp01-wave-result/v1', wave: 'camp-01a', runId, status: 'passed', assertions })}\n`,
      { flag: 'wx' },
    );
  });
});
