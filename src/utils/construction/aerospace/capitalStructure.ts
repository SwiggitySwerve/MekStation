/** Pinned Jumpship/Warship initializeKFIntegrity/initializeSailIntegrity, 48fcb2f6. */
export function capitalDriveWeight(
  tonnage: number,
  core: number,
  jumpRange = 30,
): number {
  const factor =
    core === 4 ? 0.05 + 0.03 * jumpRange : [0.95, 0.4525, 0.5, 0][core];
  return Math.ceil(tonnage * (factor ?? 0));
}

export function capitalStructure(
  shipType: string,
  tonnage: number,
  core: number,
  jumpRange: number,
  hasSail: boolean,
): { kf?: number; sail?: number } {
  if (shipType === 'DropShip') return {};
  const warship = shipType === 'WarShip';
  return {
    ...(shipType === 'Space Station' || core === 3
      ? {}
      : {
          kf: Math.ceil(
            (warship ? 2 : 1.2) +
              capitalDriveWeight(tonnage, core, jumpRange) /
                (warship ? 25000 : 60000),
          ),
        }),
    ...(hasSail
      ? { sail: 1 + Math.ceil((30 + tonnage / (warship ? 20000 : 7500)) / 20) }
      : {}),
  };
}
