import {
  getMTFCriticalSlotSystemIdentity,
  isMTFCriticalSlotSystemName,
  MTF_CRITICAL_SLOT_SYSTEM_NAMES,
} from '../MTFVocabulary';

it.each(MTF_CRITICAL_SLOT_SYSTEM_NAMES)(
  'keeps existing exact system admission for %s',
  (name) => {
    expect(isMTFCriticalSlotSystemName(name)).toBe(true);
    expect(isMTFCriticalSlotSystemName(`  ${name.toUpperCase()}  `)).toBe(true);
  },
);

it.each([
  ['Fusion Engine', 'engine'],
  ['XL Fusion Engine (Clan)', 'engine'],
  ['Engine', 'engine'],
  ['Compact Gyro', 'gyro'],
  ['Torso-Mounted Cockpit', 'cockpit'],
  ['Hip', 'hip'],
  ['Upper Leg Actuator', 'upper leg'],
  ['Upper Leg', 'upper leg'],
] as const)('maps the exact system %s to %s', (name, identity) => {
  expect(getMTFCriticalSlotSystemIdentity(name)).toBe(identity);
});

it.each([
  'Fusion Engine Repair Kit',
  'Engine Computer',
  'Life Support Computer',
  'ISERPPC',
])('rejects non-system %s', (name) => {
  expect(getMTFCriticalSlotSystemIdentity(name)).toBeUndefined();
  expect(isMTFCriticalSlotSystemName(name)).toBe(false);
});
