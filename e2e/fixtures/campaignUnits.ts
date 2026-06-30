import { expect, type Page } from '@playwright/test';

export interface CampaignMechBuildConfigFixture {
  readonly [key: string]: number | string;
  readonly tonnage: number;
  readonly engineRating: number;
  readonly engineType: string;
  readonly gyroType: string;
  readonly internalStructureType: string;
  readonly armorType: string;
  readonly totalArmorPoints: number;
  readonly cockpitType: string;
  readonly heatSinkType: string;
  readonly totalHeatSinks: number;
  readonly jumpMP: number;
}

export const ATLAS_AS7_D_E2E_UNIT_ID = 'unit-atlas-e2e';

export const CANONICAL_ATLAS_AS7_D_CONFIG: CampaignMechBuildConfigFixture = {
  tonnage: 100,
  engineRating: 300,
  engineType: 'Standard Fusion',
  gyroType: 'Standard Gyro',
  internalStructureType: 'Standard',
  armorType: 'Standard',
  totalArmorPoints: 304,
  cockpitType: 'Standard',
  heatSinkType: 'Single',
  totalHeatSinks: 20,
  jumpMP: 0,
};

export const CANONICAL_ATLAS_AS7_D_EXPECTED_STATS = {
  tonnage: 100,
  engineRating: 300,
  walkMP: 3,
  runMP: 5,
  jumpMP: 0,
  armorPoints: 304,
  heatSinks: 20,
} as const;

export function cloneCanonicalAtlasAs7DConfig(): CampaignMechBuildConfigFixture {
  return { ...CANONICAL_ATLAS_AS7_D_CONFIG };
}

export async function expectCanonicalAtlasStoredConfiguration(
  page: Page,
  unitId = ATLAS_AS7_D_E2E_UNIT_ID,
): Promise<void> {
  const storedConfig = await page.evaluate((campaignUnitId) => {
    type StoreApi = {
      getState: () => {
        campaign?: {
          unitConfigurations?: Record<string, unknown>;
        } | null;
        getCampaign?: () => {
          unitConfigurations?: Record<string, unknown>;
        } | null;
      };
    };
    const resolveStore = (store: StoreApi | (() => StoreApi)): StoreApi =>
      typeof (store as StoreApi).getState === 'function'
        ? (store as StoreApi)
        : (store as () => StoreApi)();
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: StoreApi | (() => StoreApi);
        };
      }
    ).__ZUSTAND_STORES__;
    if (!stores?.campaign) return null;

    const state = resolveStore(stores.campaign).getState();
    const campaign = state.getCampaign?.() ?? state.campaign;
    return campaign?.unitConfigurations?.[campaignUnitId] ?? null;
  }, unitId);

  expect(storedConfig).toMatchObject(CANONICAL_ATLAS_AS7_D_CONFIG);
}

export async function expectCanonicalAtlasCustomizerStats(
  page: Page,
): Promise<void> {
  await expect(page.getByTestId('unit-info-stat-tonnage')).toContainText(
    `${CANONICAL_ATLAS_AS7_D_EXPECTED_STATS.tonnage}`,
  );
  await expect(page.getByTestId('unit-info-stat-engine')).toContainText(
    `${CANONICAL_ATLAS_AS7_D_EXPECTED_STATS.engineRating}`,
  );
  await expect(page.getByTestId('unit-info-stat-walk')).toContainText(
    `${CANONICAL_ATLAS_AS7_D_EXPECTED_STATS.walkMP}`,
  );
  await expect(page.getByTestId('unit-info-stat-run')).toContainText(
    `${CANONICAL_ATLAS_AS7_D_EXPECTED_STATS.runMP}`,
  );
  await expect(page.getByTestId('unit-info-stat-jump')).toContainText(
    `${CANONICAL_ATLAS_AS7_D_EXPECTED_STATS.jumpMP}`,
  );
  await expect(page.getByTestId('unit-info-stat-armor')).toContainText(
    `${CANONICAL_ATLAS_AS7_D_EXPECTED_STATS.armorPoints}`,
  );
  await expect(page.getByTestId('unit-info-stat-heat')).toContainText(
    `${CANONICAL_ATLAS_AS7_D_EXPECTED_STATS.heatSinks}`,
  );
}
