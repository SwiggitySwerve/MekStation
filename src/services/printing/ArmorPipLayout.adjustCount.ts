import { Bounds } from './ArmorPipLayout.types';

export function adjustCount(
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
      const result =
        pipCount > current
          ? tryAddPips({
              pipCount,
              current,
              rowCount,
              index,
              mirror,
              rowDelta,
              spacing,
              availableWidth: rows[index].width - gaps[index].width,
            })
          : tryRemovePips({
              pipCount,
              current,
              rowCount,
              index,
              mirror,
              rowDelta,
              minimum,
            });

      if (result.changed) {
        current = result.current;
      } else {
        skipped++;
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

type AdjustPipsParams = {
  pipCount: number;
  current: number;
  rowCount: number[];
  index: number;
  mirror: boolean;
  rowDelta: number;
};

type AddPipsParams = AdjustPipsParams & {
  spacing: number;
  availableWidth: number;
};

type RemovePipsParams = AdjustPipsParams & {
  minimum: boolean;
};

type AdjustPipsResult = {
  changed: boolean;
  current: number;
};

function tryAddPips(params: AddPipsParams): AdjustPipsResult {
  const change =
    params.pipCount - params.current === 1
      ? params.mirror
        ? 0
        : 1
      : params.mirror
        ? 2
        : params.rowDelta;

  if (
    change <= 0 ||
    params.spacing * (params.rowCount[params.index] + change) >
      params.availableWidth
  ) {
    return { changed: false, current: params.current };
  }

  params.rowCount[params.index] += change;
  return { changed: true, current: params.current + change };
}

function tryRemovePips(params: RemovePipsParams): AdjustPipsResult {
  let change =
    params.current - params.pipCount === 1
      ? params.mirror && params.minimum
        ? 0
        : 1
      : params.mirror
        ? 2
        : params.rowDelta;

  if (params.minimum && params.rowCount[params.index] - change <= 0) {
    change = 0;
  } else {
    change = Math.min(change, params.rowCount[params.index]);
  }

  if (change <= 0) {
    return { changed: false, current: params.current };
  }

  params.rowCount[params.index] -= change;
  return { changed: true, current: params.current - change };
}
