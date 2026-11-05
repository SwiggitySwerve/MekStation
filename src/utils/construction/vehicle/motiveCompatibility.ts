import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';
import {
  ELECTRONICS_CATALOG_FILES,
  MISCELLANEOUS_CATALOG_FILES,
  WEAPON_CATALOG_FILES,
} from '@/utils/construction/equipmentBV/catalogData';

/**
 * Equipment/motive compatibility: MegaMek 48fcb2f6 TestTank.legalForMotiveType,
 * reported by TestTank.correctEntity:376-382 (combat, ends with ".") and
 * TestSupportVehicle.correctEntity:1171-1174 (support vehicles). The generated
 * catalog `motiveCompatibility` lists the Java modes each item cannot mount on;
 * records without it carry no Java restriction we know of, so nothing is reported.
 */
interface MotiveRecord {
  readonly id: string;
  readonly name: string;
  readonly motiveCompatibility?: {
    readonly incompatibleCombat: readonly string[];
    readonly incompatibleSupport: readonly string[];
  };
}

let restricted: Map<string, MotiveRecord> | undefined;
function restrictedRecords(): Map<string, MotiveRecord> {
  restricted ??= new Map(
    [
      ...WEAPON_CATALOG_FILES,
      ...ELECTRONICS_CATALOG_FILES,
      ...MISCELLANEOUS_CATALOG_FILES,
    ]
      .flatMap((file) => (file.items ?? []) as unknown as MotiveRecord[])
      .filter((item) => item.motiveCompatibility)
      .map((item) => [item.id, item]),
  );
  return restricted;
}

/** Entity.getMovementModeAsString:8799-8823 for the ground modes. */
const javaModeName = (motion: GroundMotionType): string =>
  motion === GroundMotionType.MAGLEV ? 'MagLev' : motion;

export function vehicleMotiveErrors(
  equipment: readonly { readonly equipmentId: string }[],
  motion: GroundMotionType,
  supportVehicle: boolean,
): string[] {
  const mode = Object.entries(GroundMotionType).find(
    ([, value]) => value === motion,
  )?.[0];
  return equipment.flatMap(({ equipmentId }) => {
    const id = getEquipmentEntry(equipmentId.replace(/:OMNI$/i, '').trim())?.id;
    const record = id ? restrictedRecords().get(id) : undefined;
    const denied = supportVehicle
      ? record?.motiveCompatibility?.incompatibleSupport
      : record?.motiveCompatibility?.incompatibleCombat;
    if (!record || !mode || !denied?.includes(mode)) return [];
    const message = `${record.name} is incompatible with ${javaModeName(motion)}`;
    return [supportVehicle ? message : `${message}.`];
  });
}
