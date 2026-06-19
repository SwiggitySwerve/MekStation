import type { IHexCoordinate, IUnitToken } from '@/types/gameplay';

export function tokenDisplayPosition(token: IUnitToken): IHexCoordinate {
  return token.fogStatus === 'lastKnown' && token.lastKnownPosition
    ? token.lastKnownPosition
    : token.position;
}

function tokenFogDisplayFields(token: IUnitToken): Partial<IUnitToken> {
  return token.fogStatus === 'hidden'
    ? { designation: '?', name: 'Hidden contact' }
    : {};
}

export function tokenFogOpacity(token: IUnitToken): number {
  if (token.fogStatus === 'hidden') return 0.45;
  if (token.fogStatus === 'lastKnown') return 0.62;
  return 1;
}

export function tokenCombatProjectionData(
  combatProjectionValidTarget: boolean | undefined,
): string | undefined {
  if (combatProjectionValidTarget === undefined) return undefined;
  return combatProjectionValidTarget ? 'true' : 'false';
}

export function isometricVisibilityLabel(
  isOcclusionHighlighted: boolean,
  isometricOcclusionReason: string | undefined,
  isometricVisibilityRuleReason: string | undefined,
): string {
  return [
    isOcclusionHighlighted
      ? (isometricOcclusionReason ?? 'Isometric visibility highlighted')
      : null,
    isometricVisibilityRuleReason,
  ]
    .filter((part): part is string => Boolean(part))
    .join('; ');
}

export function renderTimeToken({
  token,
  displayPosition,
  isAnimating,
  facing,
  isValidTarget,
}: {
  readonly token: IUnitToken;
  readonly displayPosition: IHexCoordinate;
  readonly isAnimating: boolean;
  readonly facing: IUnitToken['facing'];
  readonly isValidTarget: boolean | undefined;
}): IUnitToken {
  return isAnimating
    ? ({
        ...token,
        ...tokenFogDisplayFields(token),
        isValidTarget,
        facing,
      } as IUnitToken)
    : ({
        ...token,
        ...tokenFogDisplayFields(token),
        isValidTarget,
        position: displayPosition,
      } as IUnitToken);
}
