import type { AerospaceState } from '@/stores/aerospaceState';
import type { BattleArmorState } from '@/stores/battleArmorState';
import type { InfantryState } from '@/stores/infantryState';
import type { ProtoMechState } from '@/stores/protoMechState';
import type { UnitState } from '@/stores/unitState';
import type { VehicleState } from '@/stores/vehicleState';
import type { IUnitContract } from '@/types/contracts';
import type { ISerializedUnit } from '@/types/unit/UnitSerialization';

import { Era } from '@/types/temporal/Era';
import { getEraForYear } from '@/utils/temporal/eraUtils';

import {
  type CustomUnitSaveIdentity,
  serializeCustomUnitState,
  serializeCustomVehicleState,
  serializeCustomAerospaceState,
  serializeCustomSmallUnitState,
} from './CustomUnitSerializer';

/** Dialog readiness and persistence use the same family serializer and schemas. */
export function serializeCustomLibraryState(
  state:
    | UnitState
    | VehicleState
    | AerospaceState
    | ProtoMechState
    | BattleArmorState
    | InfantryState,
  identity: Omit<CustomUnitSaveIdentity, 'era'> = {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
  },
): ISerializedUnit | IUnitContract {
  const saveIdentity = {
    ...identity,
    era: getEraForYear(state.year) ?? Era.LATE_SUCCESSION_WARS,
  };
  return 'configuration' in state
    ? serializeCustomUnitState(state, saveIdentity)
    : 'aerospaceSubType' in state
      ? serializeCustomAerospaceState(state, saveIdentity)
      : 'pointSize' in state || 'squadSize' in state
        ? serializeCustomSmallUnitState(state, saveIdentity)
        : serializeCustomVehicleState(state, saveIdentity);
}
