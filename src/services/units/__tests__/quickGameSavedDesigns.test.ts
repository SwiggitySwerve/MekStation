import {
  readyCanonicalCatalog,
  fetchCanonicalCatalogSnapshot,
} from '@/lib/campaign/readiness/canonicalCatalogAdmission';

import { listCampaignSavedDesigns } from '../listCampaignSavedDesigns';
import { listQuickGameSavedDesigns } from '../quickGameSavedDesigns';

jest.mock('@/lib/campaign/readiness/canonicalCatalogAdmission', () => ({
  ...jest.requireActual('@/lib/campaign/readiness/canonicalCatalogAdmission'),
  fetchCanonicalCatalogSnapshot: jest.fn(),
}));
jest.mock('../listCampaignSavedDesigns');

const catalog = jest.mocked(fetchCanonicalCatalogSnapshot);
const list = jest.mocked(listCampaignSavedDesigns);
beforeEach(() => jest.clearAllMocks());

it('only returns references admitted by the server combat catalog', async () => {
  const eligible = {
    id: 'custom-valid',
    name: 'Saved Biped',
    tonnage: 70,
    unitType: 'BattleMech',
  };
  list.mockResolvedValue([
    eligible,
    { id: 'local-draft', name: 'Local only', tonnage: 70 },
    {
      id: 'custom-quad',
      name: 'Unsupported Quad',
      tonnage: 70,
      unitType: 'BattleMech',
    },
  ]);
  catalog.mockResolvedValue(
    readyCanonicalCatalog(['atlas-as7-d'], [eligible.id]),
  );
  expect(await listQuickGameSavedDesigns()).toEqual([eligible]);
});

it('refuses unavailable custom eligibility even when canonical catalog remains ready', async () => {
  list.mockResolvedValue([]);
  catalog.mockResolvedValue(readyCanonicalCatalog(['atlas-as7-d']));
  await expect(listQuickGameSavedDesigns()).rejects.toThrow('unavailable');
});
