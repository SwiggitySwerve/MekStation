export function formatContractSalvageShare(salvagePercent: number): string {
  if (salvagePercent <= 0) {
    return 'None';
  }

  return `${Math.round(salvagePercent)}%`;
}
