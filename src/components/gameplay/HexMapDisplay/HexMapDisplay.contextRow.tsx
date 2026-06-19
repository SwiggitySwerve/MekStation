import React from 'react';

import type { ICombatRangeHex, IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  tacticalProjectionDataAttributes,
  type TacticalProjectionDataAttributes,
  type TacticalProjectionSourceMetadata,
} from './HexMapDisplay.tacticalProjectionAttributes';

export interface CombatContextRowsProps {
  readonly combatInfo: ICombatRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}

export interface MovementContextRowsProps {
  readonly movementInfo: IMovementRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}

export function TacticalProjectionContextRow({
  children,
  dataAttributes,
  rulesSurface,
  source,
  testId,
}: {
  readonly children: React.ReactNode;
  readonly dataAttributes?: TacticalProjectionDataAttributes;
  readonly rulesSurface?: string;
  readonly source: TacticalProjectionSourceMetadata;
  readonly testId: string;
}): React.ReactElement {
  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      {...tacticalProjectionDataAttributes(source, rulesSurface)}
      {...dataAttributes}
    >
      {children}
    </div>
  );
}
