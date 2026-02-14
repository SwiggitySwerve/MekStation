import { STEALTH_ARMOR_MODIFIERS } from './constants';
import {
  IElectronicWarfareState,
  IStealthModifier,
  StealthRangeBracket,
} from './types';

export function calculateStealthArmorModifier(
  hasStealthArmor: boolean,
  targetEntityId: string,
  targetTeamId: string,
  rangeBracket: StealthRangeBracket,
  ewState: IElectronicWarfareState,
): IStealthModifier {
  if (!hasStealthArmor) {
    return { modifier: 0, active: false, description: 'No stealth armor' };
  }

  const hasActiveGuardianECM = ewState.ecmSuites.some(
    (ecm) =>
      ecm.entityId === targetEntityId &&
      ecm.teamId === targetTeamId &&
      ecm.mode === 'ecm' &&
      ecm.operational,
  );

  if (!hasActiveGuardianECM) {
    return {
      modifier: 0,
      active: false,
      description: 'Stealth armor inactive (no active ECM)',
    };
  }

  const modifier = STEALTH_ARMOR_MODIFIERS[rangeBracket];
  return {
    modifier,
    active: true,
    description:
      modifier > 0
        ? `Stealth armor at ${rangeBracket} range: +${modifier}`
        : `Stealth armor at ${rangeBracket} range: +0`,
  };
}
