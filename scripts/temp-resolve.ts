#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const testIds = [
  'improved-heavy-medium-laser',
  'clan-improved-heavy-medium-laser',
  'CLImprovedMediumHeavyLaser',
  'er-large-pulse-laser',
  'CLERLargePulseLaser',
  'CLERMediumPulseLaser',
  'CLERSmallPulseLaser',
  'CLERMicroLaser',
  'NovaCEWS',
  'WatchdogECMSuite',
  'Watchdog CEWS',
  'CL Super Charger',
  'ISAES',
  'CLModularArmor',
  'Autocannon/10',
  'Autocannon/5',
  'Autocannon/20',
  'Autocannon/2',
  'Light Auto Cannon/5',
  'Particle Cannon',
  'ER Flamer',
  'TSEMP Cannon',
  'ISMediumVariableSpeedLaser',
  'CLLightTAG',
  'CLLightMG',
  'CLHeavyMG',
  'ISNarc Pods',
  'CLNarc Pods',
  'CLArrowIV',
  'ISArrowIV',
  'ISC3iUnit',
  'ISC3MasterUnit',
  'Retractable Blade',
  'ISQuadTurret',
  'RemoteSensorDispenser',
];

console.warn = () => {};

for (const id of testIds) {
  const result = resolveEquipmentBV(id);
  const norm = normalizeEquipmentId(id);
  console.log(`${id.padEnd(40)} → norm="${norm.padEnd(30)}" BV=${String(result.battleValue).padStart(4)} heat=${result.heat} resolved=${result.resolved}`);
}
