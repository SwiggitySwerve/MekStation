#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
console.warn = () => {};
const tests = [
  'improved-heavy-medium-laser', 'improved-heavy-large-laser', 'improved-heavy-small-laser',
  'er-large-pulse-laser', 'er-medium-pulse-laser', 'er-small-pulse-laser',
  'clan-er-micro-laser', 'clan-light-machine-gun', 'clan-heavy-machine-gun',
  'clan-light-tag', 'clan-arrow-iv-launcher', 'arrow-iv-launcher',
  'c3-master', 'watchdog-cews',
  'CLImprovedMediumHeavyLaser', 'CLERLargePulseLaser', 'NovaCEWS', 'WatchdogECMSuite',
  'CLLightTAG', 'CLLightMG', 'CLHeavyMG', 'CLArrowIV', 'ISArrowIV',
  'ISC3MasterUnit',
  'Autocannon/10', 'Autocannon/5', 'Light Auto Cannon/5',
  'TSEMP Cannon', 'ER Flamer', 'Particle Cannon',
];
for (const t of tests) {
  const r = resolveEquipmentBV(t);
  const n = normalizeEquipmentId(t);
  console.log(`${t.padEnd(40)} norm=${n.padEnd(30)} BV=${String(r.battleValue).padStart(4)} resolved=${r.resolved}`);
}
