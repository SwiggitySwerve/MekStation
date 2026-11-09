/**
 * The unit lifecycle flag domain and the frozen pre-delegation formulas that
 * the C1 oracle tests compare each site against.
 *
 * Domain: every flag is `boolean | undefined` as declared, and `pilotConscious`
 * also takes `undefined`, which old fixtures omit. Each `before*` helper is a
 * verbatim copy of the inline formula as it stood before the site moved to
 * `getUnitOperability`, so a delegated site can't drift without a red row.
 */

import {
  Facing,
  LockState,
  MovementType,
  type GameSide,
  type IUnitGameState,
} from '@/types/gameplay';

export type Flags = Pick<
  IUnitGameState,
  | 'destroyed'
  | 'shutdown'
  | 'pilotConscious'
  | 'hasEjected'
  | 'hasRetreated'
  | 'isRetreating'
  | 'isWithdrawing'
  | 'empShutdownTurns'
>;

/** Still in play: `!destroyed && !hasRetreated && !hasEjected`. */
export const beforeSurvives = (u: Flags): boolean =>
  !u.destroyed && !u.hasRetreated && !u.hasEjected;

/** Left play: `destroyed || hasRetreated || hasEjected`. */
export const beforeLeftPlay = (u: Flags): boolean =>
  Boolean(u.destroyed || u.hasRetreated || u.hasEjected);

const bools = [false, true] as const;
const optBools = [undefined, false, true] as const;
const consciousness = [true, false, undefined] as const;
const emp = [undefined, 0, 2] as const;

/** 2 x 3 x 3 x 3 x 3 x 2 x 2 x 3 = 1944 combinations. */
export const FLAG_DOMAIN: readonly Flags[] = buildFlagDomain();
export const FLAG_DOMAIN_SIZE = 2 * 3 * 3 * 3 * 3 * 2 * 2 * 3;

function buildFlagDomain(): Flags[] {
  const combos: Flags[] = [];
  for (const destroyed of bools)
    for (const shutdown of optBools)
      for (const pilotConscious of consciousness)
        for (const hasEjected of optBools)
          for (const hasRetreated of optBools)
            for (const isRetreating of [undefined, true] as const)
              for (const isWithdrawing of [undefined, true] as const)
                for (const empShutdownTurns of emp)
                  combos.push({
                    destroyed,
                    shutdown,
                    pilotConscious: pilotConscious as boolean,
                    hasEjected,
                    hasRetreated,
                    isRetreating,
                    isWithdrawing,
                    empShutdownTurns,
                  });
  return combos;
}

export const flagLabel = (flags: Flags): string => JSON.stringify(flags);

/** A minimal unit state; `flags` overrides any field. */
export function unitWith(
  id: string,
  side: GameSide,
  flags: Partial<IUnitGameState> = {},
  position = { q: 0, r: 0 },
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    ...flags,
  };
}
