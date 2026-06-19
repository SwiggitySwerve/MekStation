import type { IPhysicalLegalityGateSupportEntry } from './CombatPhysicalLegalityGateSupport.types';

import { BASIC_PHYSICAL_LEGALITY_GATE_SUPPORT } from './CombatPhysicalLegalityGateSupport.basic';
import { CHARGE_DFA_PHYSICAL_LEGALITY_GATE_SUPPORT } from './CombatPhysicalLegalityGateSupport.chargeDfa';
import { PUSH_PHYSICAL_LEGALITY_GATE_SUPPORT } from './CombatPhysicalLegalityGateSupport.push';
import { SHARED_PHYSICAL_LEGALITY_GATE_SUPPORT } from './CombatPhysicalLegalityGateSupport.shared';

export type {
  IPhysicalLegalityGateSupportEntry,
  PhysicalLegalityAttackFamily,
} from './CombatPhysicalLegalityGateSupport.types';
export {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
} from './CombatPhysicalLegalityGateSupport.authorities';

export const PHYSICAL_LEGALITY_GATE_SUPPORT = {
  ...SHARED_PHYSICAL_LEGALITY_GATE_SUPPORT,
  ...BASIC_PHYSICAL_LEGALITY_GATE_SUPPORT,
  ...PUSH_PHYSICAL_LEGALITY_GATE_SUPPORT,
  ...CHARGE_DFA_PHYSICAL_LEGALITY_GATE_SUPPORT,
} satisfies Record<string, IPhysicalLegalityGateSupportEntry>;
