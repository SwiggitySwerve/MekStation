const weapons = [
  'er-medium-laser', 'er-large-laser', 'er-ppc', 'srm-4', 'srm-6', 'lrm-20',
  'medium-x-pulse-laser', 'large-x-pulse-laser', 'mml-7', 'mml-9',
  'rotary-ac-2', 'streak-srm-6', 'streak-lrm-20', 'lb-20-x-ac',
  'heavy-gauss-rifle', 'er-flamer', 'medium-pulse-laser', 'er-small-laser',
  'tsemp-one-shot', 'improved-heavy-medium-laser', 'light-machine-gun',
  'machine-gun', 'flamer', 'small-pulse-laser', 'lrt-15',
  'risc-advanced-point-defense-system',
];

function isDefEquip(id: string): boolean {
  const lo = id.toLowerCase();
  return lo.includes('anti-missile') || lo.includes('antimissile') || lo.includes('ams') || lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') || lo.includes('bap') || lo.includes('beagle') || lo.includes('probe') || lo.includes('bloodhound') || lo.includes('light-active-probe') || lo.includes('null-signature') || (lo.includes('shield') && !lo.includes('blue-shield')) || lo.includes('apds') || lo.includes('advanced-point-defense') || lo.includes('point-defense-system');
}

for (const w of weapons) {
  if (isDefEquip(w)) {
    console.log(`CAUGHT as defensive: ${w}`);
  }
}
