import type { ProcessLayoutParams } from './ArmorPipLayout.types';

import { adjustCount } from './ArmorPipLayout.adjustCount';
import { collectLayoutRows } from './ArmorPipLayout.rows';
import { Bounds } from './ArmorPipLayout.types';

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

  spacing =
    (Math.sqrt((spacing * nRows) / params.bounds.height) *
      params.bounds.height) /
    nRows;

  const { rows, gaps, rowCount } = collectLayoutRows({
    layout: params,
    nRows,
    nCols,
    spacing,
    radius,
    staggered,
  });

  const xSpacing = adjustCount(
    params.pipCount,
    rows,
    gaps,
    rowCount,
    staggered,
    spacing,
  );

  drawPips({
    rows,
    gaps,
    rowCount,
    staggered,
    radius: Math.min(radius, xSpacing * 0.4),
    xSpacing,
    drawPip: params.drawPip,
  });
}

type DrawPipsParams = {
  rows: Bounds[];
  gaps: Bounds[];
  rowCount: number[];
  staggered: boolean;
  radius: number;
  xSpacing: number;
  drawPip: (x: number, y: number, radius: number) => void;
};

type DrawRowParams = {
  row: Bounds;
  count: number;
  radius: number;
  dx: number;
  centerX: number;
  xPadding: number;
  drawPip: (x: number, y: number, radius: number) => void;
};

function drawPips(params: DrawPipsParams): void {
  const { rows, gaps, rowCount, staggered, radius, xSpacing, drawPip } = params;
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

      drawRow({
        row: leftBounds,
        count: leftCount,
        radius,
        dx: adjustedDx,
        centerX,
        xPadding,
        drawPip,
      });
      drawRow({
        row: rightBounds,
        count: rowCount[r] - leftCount,
        radius,
        dx: adjustedDx,
        centerX,
        xPadding,
        drawPip,
      });
      centerX = row.centerX;
    } else {
      centerX = drawRow({
        row,
        count: rowCount[r],
        radius,
        dx: adjustedDx,
        centerX,
        xPadding,
        drawPip,
      });
    }
  }
}

function drawRow(params: DrawRowParams): number {
  const { row, count, radius, dx, xPadding, drawPip } = params;
  let centerX = params.centerX;
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
