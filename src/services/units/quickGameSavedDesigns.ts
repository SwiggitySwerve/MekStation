import type { IQuickGameUnitRequest } from '@/types/quickgame';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { fetchCanonicalCatalogSnapshot } from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { getCalculationService } from '@/services/construction/CalculationService';
import { projectEditableMech } from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import {
  listCampaignSavedDesigns,
  type ICampaignSavedDesign,
} from './listCampaignSavedDesigns';
import { unitLoaderService, parseUnit } from './unitLoaderService';

export class SavedQuickGameDesignError extends Error {}

/** Reuse the same server eligibility boundary as campaign launch. */
export async function listQuickGameSavedDesigns(): Promise<
  readonly ICampaignSavedDesign[]
> {
  const [designs, catalog] = await Promise.all([
    listCampaignSavedDesigns(),
    fetchCanonicalCatalogSnapshot(),
  ]);
  if (catalog.status !== 'ready' || !catalog.customCombatRefs) {
    throw new SavedQuickGameDesignError(
      'Saved combat designs are unavailable. Retry the catalog.',
    );
  }
  return designs.filter((design) => catalog.customCombatRefs?.has(design.id));
}

/** Build display/force values from the exact saved construction; launch still revalidates it. */
export async function loadQuickGameSavedDesign(
  id: string,
): Promise<IQuickGameUnitRequest> {
  await getEquipmentLookupService().initialize();
  if ((await getEquipmentRegistry().initialize()) !== 'ready') {
    throw new SavedQuickGameDesignError(
      'Equipment loading was interrupted. Retry the saved design.',
    );
  }
  const adapted = await adaptUnit(id);
  const definition = adapted?.customUnitDefinition;
  if (!adapted || !definition) {
    throw new SavedQuickGameDesignError(
      'The saved design is unavailable or unsupported for combat.',
    );
  }
  const state = unitLoaderService.mapToUnitState(parseUnit(definition), false);
  const bv = getCalculationService().calculateBattleValue(
    projectEditableMech(state, adapted.walkMP, id),
  );
  return {
    sourceUnitId: id,
    name: state.name,
    chassis: state.chassis,
    variant: state.model,
    tonnage: state.tonnage,
    bv,
    maxArmor: { ...adapted.armor },
    maxStructure: { ...adapted.structure },
  };
}
