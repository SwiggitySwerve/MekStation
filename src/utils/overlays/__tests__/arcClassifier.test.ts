import { describe, expect, it } from '@jest/globals';

import {
  AXIAL_DIRECTION_DELTAS,
  Facing,
  type IHexCoordinate,
  type IUnitPosition,
} from '@/types/gameplay';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { hexNeighbor } from '@/utils/gameplay/hexMath';
import {
  classifyFiringArc,
  createFiringArcClassifier,
  firingArcToUiArc,
  type UiFiringArc,
} from '@/utils/overlays/arcClassifier';

const FACINGS: readonly Facing[] = [
  Facing.North,
  Facing.Northeast,
  Facing.Southeast,
  Facing.South,
  Facing.Southwest,
  Facing.Northwest,
];

function unit(facing: Facing): IUnitPosition {
  return {
    unitId: `unit-${facing}`,
    coord: { q: 0, r: 0 },
    facing,
    prone: false,
  };
}

function expectedArc(facing: Facing, target: IHexCoordinate): UiFiringArc {
  return firingArcToUiArc(determineArc(unit(facing), target).arc);
}

describe('arcClassifier', () => {
  it('returns front for the hex directly in front across all facings', () => {
    for (const facing of FACINGS) {
      expect(
        classifyFiringArc(unit(facing), hexNeighbor({ q: 0, r: 0 }, facing)),
      ).toBe('front');
    }
  });

  it('matches existing determineArc conventions for every facing and adjacent target direction', () => {
    for (const facing of FACINGS) {
      for (const targetDirection of FACINGS) {
        const target = hexNeighbor({ q: 0, r: 0 }, targetDirection);
        expect(classifyFiringArc(unit(facing), target)).toBe(
          expectedArc(facing, target),
        );
      }
    }
  });

  it('distinguishes left-side and right-side labels using the engine arc result', () => {
    const north = unit(Facing.North);

    expect(classifyFiringArc(north, { q: -2, r: 1 })).toBe('left-side');
    expect(classifyFiringArc(north, { q: 2, r: -1 })).toBe('right-side');
    expect(classifyFiringArc(north, { q: 0, r: 1 })).toBe('rear');
  });

  it('returns out-of-arc for map-excluded hexes and range-excluded hexes', () => {
    const north = unit(Facing.North);
    const mapHexes = new Set(['0,0', '0,-1']);

    expect(
      classifyFiringArc(north, { q: 1, r: 0 }, { mapHexes, maxRange: 5 }),
    ).toBe('out-of-arc');
    expect(classifyFiringArc(north, { q: 0, r: -2 }, { maxRange: 1 })).toBe(
      'out-of-arc',
    );
  });

  it('supports visible arc filtering for informational rear-only overlays', () => {
    const north = unit(Facing.North);

    expect(
      classifyFiringArc(north, { q: 0, r: 1 }, { visibleArcs: ['rear'] }),
    ).toBe('rear');
    expect(
      classifyFiringArc(north, { q: 0, r: -1 }, { visibleArcs: ['rear'] }),
    ).toBe('out-of-arc');
  });

  it('creates a reusable classifier scoped to one unit and option set', () => {
    const classifier = createFiringArcClassifier(unit(Facing.North), {
      mapHexes: AXIAL_DIRECTION_DELTAS,
      includeOrigin: false,
      maxRange: 1,
    });

    expect(classifier({ q: 0, r: -1 })).toBe('front');
    expect(classifier({ q: 0, r: -1 })).toBe('front');
    expect(classifier({ q: 0, r: 0 })).toBe('out-of-arc');
  });
});
