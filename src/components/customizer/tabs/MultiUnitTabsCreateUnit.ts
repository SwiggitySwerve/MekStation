import { createAndRegisterAerospace } from '@/stores/aerospaceStoreRegistry';
import { createAndRegisterBattleArmor } from '@/stores/battleArmorStoreRegistry';
import { createAndRegisterInfantry } from '@/stores/infantryStoreRegistry';
import { createAndRegisterProtoMech } from '@/stores/protoMechStoreRegistry';
import { UNIT_TEMPLATES, type UnitTemplate } from '@/stores/useTabManagerStore';
import { createAndRegisterVehicle } from '@/stores/vehicleStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

interface AddTabPayload {
  id: string;
  name: string;
  tonnage?: number;
  techBase?: TechBase;
  unitType?: UnitType;
}

interface CreateNewUnitArgs {
  tonnage: number;
  techBase?: TechBase;
  unitType?: UnitType;
  createTab: (template: UnitTemplate) => string;
  addTab: (tabInfo: AddTabPayload) => void;
  navigateToTab: (tabId: string) => void;
}

export function createNewUnitWithRouting({
  tonnage,
  techBase = TechBase.INNER_SPHERE,
  unitType = UnitType.BATTLEMECH,
  createTab,
  addTab,
  navigateToTab,
}: CreateNewUnitArgs): string {
  if (unitType === UnitType.VEHICLE || unitType === UnitType.VTOL) {
    const vehicleStore = createAndRegisterVehicle({
      name: `New ${tonnage}t Vehicle`,
      tonnage,
      techBase,
      unitType: unitType as UnitType.VEHICLE | UnitType.VTOL,
    });
    const vehicleState = vehicleStore.getState();

    addTab({
      id: vehicleState.id,
      name: vehicleState.name,
      tonnage: vehicleState.tonnage,
      techBase: vehicleState.techBase,
      unitType: vehicleState.unitType,
    });

    navigateToTab(vehicleState.id);
    return vehicleState.id;
  }

  if (
    unitType === UnitType.AEROSPACE ||
    unitType === UnitType.CONVENTIONAL_FIGHTER
  ) {
    const aerospaceStore = createAndRegisterAerospace({
      name: `New ${tonnage}t Fighter`,
      tonnage,
      techBase,
      isConventional: unitType === UnitType.CONVENTIONAL_FIGHTER,
    });
    const aerospaceState = aerospaceStore.getState();

    addTab({
      id: aerospaceState.id,
      name: aerospaceState.name,
      tonnage: aerospaceState.tonnage,
      techBase: aerospaceState.techBase,
      unitType: aerospaceState.unitType,
    });

    navigateToTab(aerospaceState.id);
    return aerospaceState.id;
  }

  if (unitType === UnitType.BATTLE_ARMOR) {
    const battleArmorStore = createAndRegisterBattleArmor({
      name: 'New Battle Armor',
      techBase,
    });
    const battleArmorState = battleArmorStore.getState();

    addTab({
      id: battleArmorState.id,
      name: battleArmorState.name,
      tonnage: 0,
      techBase: battleArmorState.techBase,
      unitType: battleArmorState.unitType,
    });

    navigateToTab(battleArmorState.id);
    return battleArmorState.id;
  }

  if (unitType === UnitType.INFANTRY) {
    const infantryStore = createAndRegisterInfantry({
      name: 'New Infantry Platoon',
      techBase,
    });
    const infantryState = infantryStore.getState();

    addTab({
      id: infantryState.id,
      name: infantryState.name,
      tonnage: 0,
      techBase: infantryState.techBase,
      unitType: infantryState.unitType,
    });

    navigateToTab(infantryState.id);
    return infantryState.id;
  }

  if (unitType === UnitType.PROTOMECH) {
    const protoMechStore = createAndRegisterProtoMech({
      name: `New ${tonnage}t ProtoMech`,
      tonnage,
    });
    const protoMechState = protoMechStore.getState();

    addTab({
      id: protoMechState.id,
      name: protoMechState.name,
      tonnage: protoMechState.tonnage,
      techBase: protoMechState.techBase,
      unitType: protoMechState.unitType,
    });

    navigateToTab(protoMechState.id);
    return protoMechState.id;
  }

  const template =
    UNIT_TEMPLATES.find((item) => item.tonnage === tonnage) ||
    UNIT_TEMPLATES[1];
  const templateWithTechBase = { ...template, techBase };
  const newTabId = createTab(templateWithTechBase);
  navigateToTab(newTabId);
  return newTabId;
}
