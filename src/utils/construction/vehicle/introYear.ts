import { blkEngineName } from '@/services/conversion/blkEngineIdentity';
import { javaArmorIntroduction } from '@/types/construction/ArmorType';
import { javaEngineIntroduction } from '@/types/construction/EngineType';
import { techRouteId } from '@/utils/construction/equipmentBVCatalogData';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';
import { INTRO_YEAR_MARGIN } from '@/utils/construction/equipmentIntroduction';
import { equipmentIntroductionErrors } from '@/utils/construction/equipmentIntroduction';

/** TestEntity.java:1487-1512,1611-1618; both vehicle verifiers call this loop. */
export function vehicleEquipmentIntroYearErrors(source: {
  readonly year: number;
  readonly originalBuildYear?: number;
  readonly equipment: readonly { readonly equipmentId: string }[];
  readonly clan: boolean;
  readonly mixed: boolean;
}): string[] {
  return equipmentIntroductionErrors({
    equipment: source.equipment.map((mount) => mount.equipmentId),
    years: [source.year, source.originalBuildYear].filter(
      (year): year is number => typeof year === 'number',
    ),
    clan: source.clan,
    mixed: source.mixed,
    resolve: (name) =>
      getEquipmentEntry(techRouteId(name, source.clan) ?? name),
  });
}

/**
 * Vehicle intro-year checks: MegaMek 48fcb2f6 TestEntity.hasIncorrectIntroYear
 * (:1470-1622), called by TestTank.correctEntity:426. Margin 5
 * (TestXMLOption.introYearMargin); the validation year is the unit year
 * (:1611-1618; no pinned vehicle has an original build year). Ported: the
 * armor loop (:1512-1552) and the engine part (:1594-1607). Patchwork armor
 * (code 7) is not: no pinned vehicle needs it.
 */
/** TechConstants.isClan:394-398 (T_CLAN_TW, ADVANCED, EXPERIMENTAL, UNOFFICIAL, ALL_CLAN). */
const CLAN_TECH_LEVELS = new Set([2, 6, 8, 10, 12]);
const PATCHWORK = 7;

export interface VehicleIntroYearSource {
  readonly year: number;
  readonly armorCode: number;
  /** BLK `armor_tech_level`; absent means the unit's own side (BLKTankFile.java:291-298). */
  readonly armorTechLevel?: number;
  readonly clan: boolean;
  readonly mixed: boolean;
}

export function vehicleArmorIntroYearErrors(
  source: VehicleIntroYearSource,
): string[] {
  if (source.armorCode === PATCHWORK) return [];
  const clanArmor =
    source.armorTechLevel === undefined
      ? source.clan
      : CLAN_TECH_LEVELS.has(source.armorTechLevel);
  const intro = javaArmorIntroduction(
    source.armorCode,
    clanArmor,
    source.clan,
    source.mixed,
  );
  if (!intro || intro.year <= source.year + INTRO_YEAR_MARGIN) return [];
  return [`${intro.name} armor has intro date of ${intro.year}`];
}

export interface VehicleEngineIntroYearSource {
  readonly year: number;
  /** BLK engine_type code (blkEngineIdentity). */
  readonly engineCode: number;
  readonly engineRating: number;
  readonly clanEngine: boolean;
  readonly clan: boolean;
  readonly mixed: boolean;
}

export function vehicleEngineIntroYearErrors(
  source: VehicleEngineIntroYearSource,
): string[] {
  let name: string;
  try {
    name = blkEngineName(source.engineCode);
  } catch {
    return []; // An unsupported code is already a parse error.
  }
  const intro = javaEngineIntroduction(
    name,
    source.engineRating,
    source.clanEngine,
    source.clan,
    source.mixed,
  );
  if (!intro || intro.year <= source.year + INTRO_YEAR_MARGIN) return [];
  return [`${intro.name} has intro date of ${intro.year}`];
}
