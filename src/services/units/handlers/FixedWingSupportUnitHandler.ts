import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type { IConventionalFighter } from '@/types/unit/AerospaceInterfaces';

import {
  FWS_LARGE_THRESHOLD,
  validateFixedWingSupport,
} from '@/utils/construction/aerospace/fixedWingSupport';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import { ConventionalFighterUnitHandler } from './ConventionalFighterUnitHandler';
import {
  createValidationMessages,
  type UnitValidationMessages,
} from './unitHandlerShared';

/** FWS keeps the established aerospace-store identity (#2487, FU57/61).
 * Native admission/validity belongs to FWS, not conventional-fighter limits.
 */
export class FixedWingSupportUnitHandler extends ConventionalFighterUnitHandler {
  readonly displayName = 'Fixed-Wing Support';
  readonly canHandle = (document: IBlkDocument): boolean =>
    document.unitType.toLowerCase() === 'fixedwingsupport';

  protected sourceSizeErrors(): string[] {
    return [];
  }

  protected parseTypeSpecificFields(document: IBlkDocument) {
    const fields = {
      ...super.parseTypeSpecificFields(document),
      isFixedWingSupport: true,
      // Preserve published BV for already-loadable small/medium FWS sources.
      isSupportVehicle:
        document.tonnage > FWS_LARGE_THRESHOLD ? true : undefined,
    };
    return fields;
  }

  protected validateTypeSpecificRules(
    unit: IConventionalFighter,
  ): UnitValidationMessages {
    const result = createValidationMessages();
    if (unit.nativeAerospaceConstruction)
      result.errors.push(
        ...validateFixedWingSupport(unit.nativeAerospaceConstruction),
      );
    return result;
  }

  protected calculateTypeSpecificBV(unit: IConventionalFighter): number {
    const result = calculateBattleValueForUnit(unit);
    if (result.kind !== 'aerospace')
      throw new Error('FWS requires aerospace BV dispatch');
    return result.breakdown.final;
  }
}
