import type { ProcessLayoutParams } from './ArmorPipLayout.types';

import { Bounds } from './ArmorPipLayout.types';

const PRECISION = 0.01;

export type RowCollectionParams = {
  layout: ProcessLayoutParams;
  nRows: number;
  nCols: number;
  spacing: number;
  radius: number;
  staggered: boolean;
};

export type RowCollectionResult = {
  rows: Bounds[];
  gaps: Bounds[];
  rowCount: number[];
};

type RowCandidate = {
  row: Bounds;
  gap: Bounds;
};

type RowCountAdjustment = {
  count: number;
  shift: number;
  parity: number;
};

export function collectLayoutRows(
  params: RowCollectionParams,
): RowCollectionResult {
  const { layout, nRows, nCols, spacing, radius, staggered } = params;
  const rowCount: number[] = [];
  const rows: Bounds[] = [];
  const gaps: Bounds[] = [];
  const sortedRegions = Array.from(layout.regions.entries()).sort(
    (a, b) => a[0] - b[0],
  );

  let yPosition = rowStartY(layout.bounds, nRows, spacing, radius);
  let shift = 0;
  let parity = nCols % 2;

  for (let r = 0; r < nRows; r++) {
    const candidate = rowCandidate(layout, sortedRegions, yPosition, spacing);

    if (!candidate) {
      yPosition += spacing;
      continue;
    }

    rows.push(candidate.row);
    gaps.push(candidate.gap);

    const adjusted = adjustInitialRowCount({
      row: candidate.row,
      gap: candidate.gap,
      avgWidth: layout.avgWidth,
      nCols,
      spacing,
      staggered,
      shift,
      parity,
    });
    rowCount.push(adjusted.count);
    shift = adjusted.shift;
    parity = adjusted.parity;
    yPosition += spacing;
  }

  return { rows, gaps, rowCount };
}

function rowCandidate(
  layout: ProcessLayoutParams,
  sortedRegions: Array<[number, Bounds]>,
  yPosition: number,
  spacing: number,
): RowCandidate | undefined {
  const upper = findFloorRegion(yPosition, sortedRegions);
  const lower = findCeilingRegion(yPosition, sortedRegions) ?? upper;

  if (!upper) {
    return undefined;
  }

  const lowerBounds = lower ?? upper;
  const row = new Bounds(
    Math.max(upper.left, lowerBounds.left),
    yPosition,
    Math.min(upper.right, lowerBounds.right),
    yPosition + spacing,
  );
  const gap = mergeRowGap(layout, sortedRegions, row, yPosition);

  if (isFullWidthGap(row, gap)) {
    return undefined;
  }

  return { row, gap };
}

type InitialRowCountParams = {
  row: Bounds;
  gap: Bounds;
  avgWidth: number;
  nCols: number;
  spacing: number;
  staggered: boolean;
  shift: number;
  parity: number;
};

function adjustInitialRowCount(
  params: InitialRowCountParams,
): RowCountAdjustment {
  let count = initialRowCount(params);

  if (!needsParityAdjustment(params.row, params.gap, count, params)) {
    return {
      count,
      shift: params.shift,
      parity: nextParity(params.parity, params.staggered),
    };
  }

  const shifted = shiftRowCount(count, params.shift);
  count = fitShiftedRowCount(shifted.count, params.row, params.spacing);

  return {
    count,
    shift: shifted.shift,
    parity: nextParity(params.parity, params.staggered),
  };
}

function initialRowCount(params: InitialRowCountParams): number {
  const openWidth = params.row.width - params.gap.width;
  const scale = params.staggered ? 0.5 : 1;
  return Math.floor(params.nCols * (openWidth / params.avgWidth) * scale);
}

function needsParityAdjustment(
  row: Bounds,
  gap: Bounds,
  count: number,
  params: InitialRowCountParams,
): boolean {
  const mirror = isMirroredGap(row, gap, params.spacing);
  return (
    (mirror && count % 2 === 1) || (!mirror && count % 2 !== params.parity)
  );
}

function shiftRowCount(
  count: number,
  shift: number,
): { count: number; shift: number } {
  if (shift <= 0 || count === 0) {
    return { count: count + 1, shift: shift - 1 };
  }

  return { count: count - 1, shift: shift + 1 };
}

function fitShiftedRowCount(
  count: number,
  row: Bounds,
  spacing: number,
): number {
  return count * spacing * 2 > row.width && count >= 2 ? count - 2 : count;
}

function nextParity(parity: number, staggered: boolean): number {
  return staggered ? 1 - parity : parity;
}

function isMirroredGap(row: Bounds, gap: Bounds, spacing: number): boolean {
  return (
    gap.width > 0 &&
    Math.abs(gap.left - row.left - (row.right - gap.right)) < spacing
  );
}

function isFullWidthGap(row: Bounds, gap: Bounds): boolean {
  return (
    gap.width > 0 &&
    gap.left <= row.left + PRECISION &&
    gap.right >= row.right - PRECISION
  );
}

function rowStartY(
  bounds: Bounds,
  nRows: number,
  spacing: number,
  radius: number,
): number {
  return Math.max(
    bounds.top,
    bounds.top + (bounds.height - spacing * nRows) / 2 + spacing * 0.5 - radius,
  );
}

function mergeRowGap(
  layout: ProcessLayoutParams,
  sortedRegions: Array<[number, Bounds]>,
  row: Bounds,
  yPosition: number,
): Bounds {
  const upperKey = findFloorKey(yPosition, sortedRegions);
  const lowerKey = findCeilingKey(yPosition, sortedRegions);
  return mergeGaps(
    row,
    upperKey !== null ? layout.negativeRegions.get(upperKey) : undefined,
    lowerKey !== null ? layout.negativeRegions.get(lowerKey) : undefined,
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
