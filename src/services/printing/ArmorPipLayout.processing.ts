import type { ProcessLayoutParams } from './ArmorPipLayout.types';

import { Bounds } from './ArmorPipLayout';

const PRECISION = 0.01;
const DEFAULT_PIP_SIZE = 0.4;

export function processStandardLayout(params: ProcessLayoutParams): void {
  if (params.bounds.width === 0 || params.bounds.height === 0) {
    return;
  }

  let nRows = Math.max(
    1,
    Math.round(
      Math.sqrt((params.pipCount * params.bounds.height) / params.bounds.width),
    ),
  );

  if (nRows > params.pipCount) {
    nRows = params.pipCount;
  }

  let nCols = Math.min(
    Math.floor(params.pipCount / nRows),
    Math.floor(params.avgWidth / params.avgHeight),
  );

  while (nCols * nRows < params.pipCount && nRows <= params.pipCount) {
    if (params.avgWidth / nCols > params.bounds.height / nRows) {
      nCols++;
    } else {
      nRows++;
    }
  }

  let radius = params.avgHeight * DEFAULT_PIP_SIZE;
  let spacing = Math.min(params.avgHeight, params.bounds.height / nRows);
  let staggered = params.staggered;

  if (spacing < params.avgHeight) {
    staggered = true;
    radius = Math.min(radius, spacing * 0.5);
  }

  const rowCount: number[] = [];
  const rows: Bounds[] = [];
  const gaps: Bounds[] = [];

  spacing =
    (Math.sqrt((spacing * nRows) / params.bounds.height) *
      params.bounds.height) /
    nRows;

  let yPosition = Math.max(
    params.bounds.top,
    params.bounds.top +
      (params.bounds.height - spacing * nRows) / 2 +
      spacing * 0.5 -
      radius,
  );

  let shift = 0;
  let parity = nCols % 2;

  const sortedRegions = Array.from(params.regions.entries()).sort(
    (a, b) => a[0] - b[0],
  );

  for (let r = 0; r < nRows; r++) {
    const upper = findFloorRegion(yPosition, sortedRegions);
    const lower = findCeilingRegion(yPosition, sortedRegions) ?? upper;

    if (!upper) {
      yPosition += spacing;
      continue;
    }

    const lowerBounds = lower ?? upper;
    const row = new Bounds(
      Math.max(upper.left, lowerBounds.left),
      yPosition,
      Math.min(upper.right, lowerBounds.right),
      yPosition + spacing,
    );

    const upperKey = findFloorKey(yPosition, sortedRegions);
    const lowerKey = findCeilingKey(yPosition, sortedRegions);
    const gap = mergeGaps(
      row,
      upperKey !== null ? params.negativeRegions.get(upperKey) : undefined,
      lowerKey !== null ? params.negativeRegions.get(lowerKey) : undefined,
    );

    if (
      gap.width > 0 &&
      gap.left <= row.left + PRECISION &&
      gap.right >= row.right - PRECISION
    ) {
      yPosition += spacing;
      continue;
    }

    rows.push(row);
    gaps.push(gap);

    let count = staggered
      ? Math.floor(nCols * ((row.width - gap.width) / params.avgWidth) * 0.5)
      : Math.floor(nCols * ((row.width - gap.width) / params.avgWidth));

    const mirror =
      gap.width > 0 &&
      Math.abs(gap.left - row.left - (row.right - gap.right)) < spacing;

    if ((mirror && count % 2 === 1) || (!mirror && count % 2 !== parity)) {
      if (shift <= 0 || count === 0) {
        count++;
        shift--;
      } else {
        count--;
        shift++;
      }
      if (count * spacing * 2 > row.width && count >= 2) {
        count -= 2;
      }
    }

    rowCount.push(count);
    yPosition += spacing;

    if (staggered) {
      parity = 1 - parity;
    }
  }

  const xSpacing = adjustCount(
    params.pipCount,
    rows,
    gaps,
    rowCount,
    staggered,
    spacing,
  );

  drawPips(
    rows,
    gaps,
    rowCount,
    staggered,
    Math.min(radius, xSpacing * 0.4),
    xSpacing,
    params.drawPip,
  );
}

function findFloorRegion(
  y: number,
  sorted: Array<[number, Bounds]>,
): Bounds | null {
  let result: Bounds | null = null;
  for (const [key, bounds] of sorted) {
    if (key <= y) {
      result = bounds;
    } else {
      break;
    }
  }
  return result;
}

function findCeilingRegion(
  y: number,
  sorted: Array<[number, Bounds]>,
): Bounds | null {
  for (const [key, bounds] of sorted) {
    if (key >= y) {
      return bounds;
    }
  }
  return null;
}

function findFloorKey(
  y: number,
  sorted: Array<[number, Bounds]>,
): number | null {
  let result: number | null = null;
  for (const [key] of sorted) {
    if (key <= y) {
      result = key;
    } else {
      break;
    }
  }
  return result;
}

function findCeilingKey(
  y: number,
  sorted: Array<[number, Bounds]>,
): number | null {
  for (const [key] of sorted) {
    if (key >= y) {
      return key;
    }
  }
  return null;
}

function mergeGaps(row: Bounds, gap1?: Bounds, gap2?: Bounds): Bounds {
  if (!gap1 && !gap2) {
    return new Bounds(0, row.top, 0, row.bottom);
  }

  let left: number;
  let right: number;

  if (!gap2) {
    left = gap1!.left;
    right = gap1!.right;
  } else if (!gap1) {
    left = gap2.left;
    right = gap2.right;
  } else {
    left = Math.min(gap1.left, gap2.left);
    right = Math.max(gap1.right, gap2.right);
  }

  return new Bounds(
    Math.max(left, row.left),
    row.top,
    Math.min(right, row.right),
    row.bottom,
  );
}

function adjustCount(
  pipCount: number,
  rows: Bounds[],
  gaps: Bounds[],
  rowCount: number[],
  staggered: boolean,
  spacing: number,
): number {
  let current = rowCount.reduce((a, b) => a + b, 0);

  if (current === pipCount) {
    return spacing;
  }

  const indices = Array.from({ length: rows.length }, (_, i) => i).sort(
    (a, b) =>
      rowCount[a] / (rows[a].width - gaps[a].width) -
      rowCount[b] / (rows[b].width - gaps[b].width),
  );

  const mirrored = rows.map(
    (row, i) =>
      gaps[i].width > 0 &&
      Math.abs(gaps[i].left - row.left - (row.right - gaps[i].right)) < spacing,
  );
  const allMirrored = mirrored.every(Boolean);

  const rowDelta = staggered ? 2 : 1;
  let row = 0;
  let skipped: number;
  let minimum = true;

  do {
    skipped = 0;
    while (current !== pipCount && skipped < rows.length) {
      const index = indices[row % indices.length];
      const mirror =
        mirrored[index] && (!allMirrored || Math.abs(pipCount - current) > 1);

      if (pipCount > current) {
        const change =
          pipCount - current === 1 ? (mirror ? 0 : 1) : mirror ? 2 : rowDelta;

        if (
          change > 0 &&
          spacing * (rowCount[index] + change) <=
            rows[index].width - gaps[index].width
        ) {
          rowCount[index] += change;
          current += change;
        } else {
          skipped++;
        }
      } else {
        let change =
          current - pipCount === 1
            ? mirror && minimum
              ? 0
              : 1
            : mirror
              ? 2
              : rowDelta;

        if (minimum && rowCount[index] - change <= 0) {
          change = 0;
        } else {
          change = Math.min(change, rowCount[index]);
        }

        if (change > 0) {
          rowCount[index] -= change;
          current -= change;
        } else {
          skipped++;
        }
      }
      row++;
    }

    if (skipped === rows.length) {
      if (current < pipCount) {
        spacing *= 0.95;
      } else {
        minimum = false;
      }
    }
  } while (skipped === rows.length);

  return spacing;
}

function drawPips(
  rows: Bounds[],
  gaps: Bounds[],
  rowCount: number[],
  staggered: boolean,
  radius: number,
  xSpacing: number,
  drawPip: (x: number, y: number, radius: number) => void,
): void {
  const dx = staggered ? xSpacing * 2 : xSpacing;

  let pct = 0;
  for (let r = 0; r < rows.length; r++) {
    if (rowCount[r] > (gaps[r].width > 0 ? 2 : 1)) {
      pct = Math.max(pct, (dx * rowCount[r]) / (rows[r].width - gaps[r].width));
    }
  }

  let adjustedDx = dx;
  if (pct > 1.0) {
    adjustedDx /= pct;
  } else if (pct > 0) {
    adjustedDx /= Math.sqrt(pct);
  }

  let centerX = rows[0]?.centerX ?? 0;
  const xPadding = adjustedDx * 0.5 - radius;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    if (gaps[r].width > 0) {
      const leftBounds = new Bounds(
        row.left,
        row.top,
        gaps[r].left,
        row.bottom,
      );
      const rightBounds = new Bounds(
        gaps[r].right,
        row.top,
        row.right,
        row.bottom,
      );
      const leftCount = Math.round(
        rowCount[r] *
          (leftBounds.width / (leftBounds.width + rightBounds.width)),
      );

      drawRow(
        leftBounds,
        leftCount,
        radius,
        adjustedDx,
        centerX,
        xPadding,
        drawPip,
      );
      drawRow(
        rightBounds,
        rowCount[r] - leftCount,
        radius,
        adjustedDx,
        centerX,
        xPadding,
        drawPip,
      );
      centerX = row.centerX;
    } else {
      centerX = drawRow(
        row,
        rowCount[r],
        radius,
        adjustedDx,
        centerX,
        xPadding,
        drawPip,
      );
    }
  }
}

function drawRow(
  row: Bounds,
  count: number,
  radius: number,
  dx: number,
  centerX: number,
  xPadding: number,
  drawPip: (x: number, y: number, radius: number) => void,
): number {
  let xPosition = calcRowStartX(centerX, count, dx) + xPadding;

  while (xPosition < row.left) {
    xPosition += dx;
  }
  while (xPosition + dx * count > row.right) {
    xPosition -= dx;
  }

  if (xPosition < row.left || count === 1) {
    centerX = row.centerX;
    xPosition = calcRowStartX(centerX, count, dx) + xPadding;
  }

  for (let i = 0; i < count; i++) {
    drawPip(xPosition, row.top, radius);
    xPosition += dx;
  }

  return centerX;
}

function calcRowStartX(
  center: number,
  pipCount: number,
  cellWidth: number,
): number {
  return center - cellWidth * (pipCount / 2);
}
