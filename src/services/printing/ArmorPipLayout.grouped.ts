import type { ProcessLayoutParams } from './ArmorPipLayout.types';

import { Bounds } from './ArmorPipLayout';

export function processGroupedByFiveLayout(
  params: ProcessLayoutParams,
  fallback: () => void,
): void {
  let attempts = 0;
  const firstRegion = params.regions.values().next().value;
  if (!firstRegion) {
    return;
  }

  let diameter = firstRegion.height;
  const originalDiameter = diameter;

  let remaining: number;
  let pips: Array<{ x: number; y: number }>;

  do {
    remaining = params.pipCount;
    pips = [];

    for (const bbox of Array.from(iterateRegionsFromMiddle(params.regions))) {
      let capacity = Math.floor(bbox.width / diameter);
      capacity -= Math.floor(capacity / 6);

      const groups = Math.min(
        Math.floor(remaining / 5),
        Math.floor(capacity / 5),
      );
      remaining -= groups * 5;
      capacity -= groups * 5;

      let leftovers = 0;
      if (remaining % 5 !== 0 && capacity >= remaining % 5) {
        leftovers = remaining % 5;
        remaining -= leftovers;
      }

      let totalWidth = groups * diameter * 6;
      if (leftovers > 0) {
        totalWidth += leftovers * diameter;
      } else {
        totalWidth -= diameter;
      }

      const posY = bbox.top;
      let posX = bbox.centerX - totalWidth / 2;

      for (let g = 0; g < groups; g++) {
        for (let j = 0; j < 5; j++) {
          pips.push({ x: posX, y: posY });
          posX += diameter;
        }
        posX += diameter;
      }

      for (let l = 0; l < leftovers; l++) {
        pips.push({ x: posX, y: posY });
        posX += diameter;
      }

      if (remaining === 0) {
        break;
      }
    }

    if (remaining > 0) {
      attempts++;
      if (attempts > 5) {
        fallback();
        return;
      }
      diameter *= 0.9;
    }
  } while (remaining > 0);

  for (const pip of pips) {
    params.drawPip(
      pip.x,
      pip.y + (originalDiameter / 2 - diameter / 2.2),
      diameter / 2.2,
    );
  }
}

function* iterateRegionsFromMiddle(
  regions: Map<number, Bounds>,
): Generator<Bounds> {
  const entries = Array.from(regions.values());
  let left = Math.floor(entries.length / 2) - 1;
  let right = Math.floor(entries.length / 2);
  let nextRight = true;

  while (left >= 0 || right < entries.length) {
    if (nextRight && right < entries.length) {
      yield entries[right++];
    } else if (left >= 0) {
      yield entries[left--];
    }
    nextRight = !nextRight;
  }
}
