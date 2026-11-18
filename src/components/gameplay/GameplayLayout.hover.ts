import { useMemo, useState } from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';

import type {
  GameplayLayoutProps,
  IGameplayMovementHover,
} from './GameplayLayout.types';

interface GameplayLayoutHover extends IGameplayMovementHover {
  readonly hoveredHex: IHexCoordinate | null | undefined;
  readonly onHexHover: ((hex: IHexCoordinate | null) => void) | undefined;
}

interface GameplayLayoutHoverProps {
  readonly resolveMovementHover: GameplayLayoutProps['resolveMovementHover'];
  readonly hoveredHex: IHexCoordinate | null | undefined;
  readonly onHexHover: ((hex: IHexCoordinate | null) => void) | undefined;
  readonly movementRange: readonly IMovementRangeHex[];
  readonly hoverMovementInfo: IMovementRangeHex | undefined;
  readonly highlightPath: readonly IHexCoordinate[];
  readonly hoverMpCost: number | undefined;
  readonly hoverUnreachable: boolean;
}

/**
 * Hover inputs for the layout (perf P2). With `resolveMovementHover` the
 * layout owns the hovered hex, so a hover re-renders the layout (map and
 * dock both draw it) but not the page above. Without it, the caller's hover
 * props pass through unchanged.
 */
export function useGameplayLayoutHover({
  resolveMovementHover,
  ...props
}: GameplayLayoutHoverProps): GameplayLayoutHover {
  const [ownHoveredHex, setOwnHoveredHex] = useState<IHexCoordinate | null>(
    null,
  );
  const ownHover = useMemo(
    () => resolveMovementHover?.(ownHoveredHex),
    [resolveMovementHover, ownHoveredHex],
  );
  if (!ownHover) return props;
  return {
    ...ownHover,
    hoveredHex: ownHoveredHex,
    onHexHover: setOwnHoveredHex,
  };
}
