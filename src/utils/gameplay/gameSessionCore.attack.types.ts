import type { IAttackPreResolution } from '@/engine/attackContext';
import type {
  IAttackDeclaredPayload,
  IGameUnit,
  IGameSession,
  IToHitModifier,
  IToHitModifierDetail,
  IUnitGameState,
  IWeaponAttack,
  RangeBracket,
} from '@/types/gameplay';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import type { ILOSInterveningTerrainEffect } from './lineOfSight';

export type IndirectFireResolutionInput =
  | IIndirectFireResolution
  | IAttackPreResolution
  | undefined;

export interface IDeclareAttackContext {
  readonly session: IGameSession;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weapons: readonly IWeaponAttack[];
  readonly range: number;
  readonly rangeBracket: RangeBracket;
  readonly indirectFireResolutionInput: IndirectFireResolutionInput;
  readonly targetHex?: IHexCoordinate;
  readonly targetPartialCover: boolean;
  readonly interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[];
  readonly targetTerrainModifier: IToHitModifierDetail | null;
  readonly selectedAMSWeaponIds?: IAttackDeclaredPayload['selectedAMSWeaponIds'];
  readonly selectedAMSWeaponMounts?: IAttackDeclaredPayload['selectedAMSWeaponMounts'];
}

export interface IAttackParticipants {
  readonly attacker: IGameUnit;
  readonly attackerUnit: IUnitGameState;
  readonly targetUnit: IUnitGameState;
}

export interface IDeclaredAttackToHit {
  readonly finalToHit: number;
  readonly indirectFireResolution?: IIndirectFireResolution;
  readonly modifiers: readonly IToHitModifier[];
}

export type DeclareAttack = (
  session: IGameSession,
  attackerId: string,
  targetId: string,
  weapons: readonly IWeaponAttack[],
  range: number,
  rangeBracket: RangeBracket,
  indirectFireResolutionInput?: IndirectFireResolutionInput,
  targetHex?: IHexCoordinate,
  targetPartialCover?: boolean,
  interveningTerrainEffects?: readonly ILOSInterveningTerrainEffect[],
  targetTerrainModifier?: IToHitModifierDetail | null,
  selectedAMSWeaponIds?: IAttackDeclaredPayload['selectedAMSWeaponIds'],
  selectedAMSWeaponMounts?: IAttackDeclaredPayload['selectedAMSWeaponMounts'],
) => IGameSession;
