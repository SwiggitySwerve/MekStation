import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IUnrecoveredCriticalSlot } from '@/types/unit/UnitLoadDiagnostics';

import { equipmentNameResolver } from '@/services/conversion/EquipmentNameResolver';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  getUnitDraftFingerprint,
  getUnitLibraryFingerprint,
} from '@/stores/unit/unitEditSnapshot';
import {
  normalizeUnitSaveEquipmentIds,
  stringifyUnitSaveFingerprint,
} from '@/stores/unitSaveFingerprints';
import {
  clearAllStores,
  hydrateOrCreateUnit,
} from '@/stores/unitStoreRegistry';
import { createUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import type { IRawSerializedUnit } from '../types';

import crab from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/King Crab KGC-0000.json';
import celerity from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Celerity CLR-03-O.json';
import scarecrow from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Scarecrow UCU-F4.json';
import uni from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Uni ATAE-70 ArtilleryMech.json';
import { mapMechLocation } from '../componentMappers';
import { mapTechBase, mapTechBaseMode } from '../componentMappers';
import { getCriticalSlotsForLocation } from '../criticalSlotEquipment';
import { mapEquipment, mapEquipmentWithDiagnostics } from '../equipmentMapping';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});
afterEach(() => {
  clearAllStores();
  localStorage.clear();
});

const loader = new UnitLoaderService();

function expectedCells(
  text: string,
  location: MechLocation,
  ...slots: number[]
): IUnrecoveredCriticalSlot[] {
  return slots.map((slot) => ({ text, location, slot }));
}
const L = MechLocation;
const SCARECROW_LOSS = [
  ...expectedCells('IS Endo-Composite', L.LEFT_ARM, 9, 10),
  ...expectedCells('Chameleon Light Polarization Shield', L.LEFT_ARM, 11),
  ...expectedCells('IS Endo-Composite', L.RIGHT_ARM, 9, 10),
  ...expectedCells('Chameleon Light Polarization Shield', L.RIGHT_ARM, 11),
  ...expectedCells('Jump Jet', L.LEFT_TORSO, 6),
  ...expectedCells('BloodhoundActiveProbe', L.LEFT_TORSO, 7, 8, 9),
  ...expectedCells('IS Endo-Composite', L.LEFT_TORSO, 10),
  ...expectedCells('Chameleon Light Polarization Shield', L.LEFT_TORSO, 11),
  ...expectedCells('Jump Jet', L.RIGHT_TORSO, 6),
  ...expectedCells('ISCASEII', L.RIGHT_TORSO, 8),
  ...expectedCells('IS Endo-Composite', L.RIGHT_TORSO, 9, 10),
  ...expectedCells('Chameleon Light Polarization Shield', L.RIGHT_TORSO, 11),
  ...expectedCells('Jump Jet', L.CENTER_TORSO, 8),
  ...expectedCells('Chameleon Light Polarization Shield', L.LEFT_LEG, 5),
  ...expectedCells('Chameleon Light Polarization Shield', L.RIGHT_LEG, 5),
];
const CELERITY_LOSS = [
  ...expectedCells('IS Endo Steel', L.FRONT_LEFT_LEG, 4, 5),
  ...expectedCells('IS Endo Steel', L.FRONT_RIGHT_LEG, 4, 5),
  ...expectedCells('ISMASC', L.LEFT_TORSO, 9),
  ...expectedCells('IS Endo Steel', L.LEFT_TORSO, 10, 11),
  ...expectedCells('ISDroneOperatingSystem', L.RIGHT_TORSO, 6),
  ...expectedCells('IS Endo Steel', L.RIGHT_TORSO, 7, 8, 9, 10),
  ...expectedCells('ISC3SlaveUnit (OMNIPOD)', L.HEAD, 5),
  ...expectedCells('IS Endo Steel', L.REAR_LEFT_LEG, 4, 5),
  ...expectedCells('IS Endo Steel', L.REAR_RIGHT_LEG, 4, 5),
];
const UNI_LOSS = [
  ...expectedCells('ISThumper', L.LEFT_TORSO, 0, 1, 2, 3, 4, 5, 6),
  ...expectedCells('Cargo:SIZE:1.0', L.LEFT_TORSO, 7, 8, 9),
  ...expectedCells('ISThumper', L.RIGHT_TORSO, 0, 1, 2, 3, 4, 5, 6),
  ...expectedCells('Cargo:SIZE:1.0', L.RIGHT_TORSO, 8, 9, 10),
  ...expectedCells('ISThumper', L.CENTER_TORSO, 10),
];

/** Independent observation of the persisted grid, including configuration cells. */
function lostCells(source: IRawSerializedUnit, reopened: IRawSerializedUnit) {
  return Object.entries(source.criticalSlots ?? {}).flatMap(([key, slots]) => {
    const location = mapMechLocation(key);
    const after = getCriticalSlotsForLocation(reopened.criticalSlots, location);
    return slots.flatMap((text, slot) =>
      text && !equipmentNameResolver.isSystemComponent(text) && !after?.[slot]
        ? [{ text, location, slot }]
        : [],
    );
  });
}

it.each([
  // The old marker losses were defects: o3a keeps these seven/fourteen cells.
  [
    scarecrow,
    SCARECROW_LOSS.filter((cell) => cell.text !== 'IS Endo-Composite'),
    13,
  ],
  [celerity, CELERITY_LOSS.filter((cell) => cell.text !== 'IS Endo Steel'), 3],
  [uni, UNI_LOSS, 21],
  [crab, [], 0],
] as const)(
  '$chassis $model exposes exactly the cells really lost on save/reopen',
  (source, expected, count) => {
    const state = loader.mapToUnitState(parseUnit(source), true);
    const saved = serializeCustomUnitState(state, {
      id: 'saved-probe',
      chassis: state.chassis,
      variant: state.model,
      era: Era.LATE_SUCCESSION_WARS,
    });
    const reopened = loader.mapToUnitState(parseUnit(saved), false);
    const reopenedSource = reopened.bvContext?.source;
    if (!reopenedSource) throw new Error('Missing reopened source');
    const actualLoss = lostCells(parseUnit(source), reopenedSource);
    expect(actualLoss).toEqual(expected);
    expect(actualLoss).toHaveLength(count);
    expect(state.unrecoveredCriticalSlots).toEqual(actualLoss);
    expect(reopened.unrecoveredCriticalSlots).toEqual([]);
    expect(saved).not.toHaveProperty('unrecoveredCriticalSlots');
  },
);

it.each([scarecrow, celerity, uni, crab])(
  'keeps the array facade equipment identical for $chassis $model',
  (source) => {
    const args = [
      source.equipment,
      mapTechBase(source.techBase),
      mapTechBaseMode(source.techBase),
      source.criticalSlots,
      source.tonnage,
    ] as const;
    expect(normalizeUnitSaveEquipmentIds(mapEquipment(...args))).toEqual(
      normalizeUnitSaveEquipmentIds(
        mapEquipmentWithDiagnostics(...args).equipment,
      ),
    );
  },
);

it('automatically removes a cell once a mount occupies it, without changing a notice kind list', () => {
  const source = {
    ...uni,
    equipment: [
      ...uni.equipment,
      { id: 'cargo', location: 'LEFT_TORSO', slots: [7] },
    ],
  };
  const state = loader.mapToUnitState(parseUnit(source), true);
  expect(state.unrecoveredCriticalSlots).toHaveLength(20);
  expect(state.unrecoveredCriticalSlots).not.toContainEqual({
    text: 'Cargo:SIZE:1.0',
    location: 'Left Torso',
    slot: 7,
  });
});

it('retains the loader list through browser draft hydration without changing the fingerprint', () => {
  const state = loader.mapToUnitState(parseUnit(scarecrow), true);
  const before = getUnitDraftFingerprint(state);
  createUnitStore(state).setState({ isModified: false });
  const restored = hydrateOrCreateUnit(state.id, {
    name: state.name,
    tonnage: state.tonnage,
    techBase: state.techBase,
  }).getState();
  expect(restored.unrecoveredCriticalSlots).toEqual(
    state.unrecoveredCriticalSlots,
  );
  expect(getUnitDraftFingerprint(restored)).toBe(before);
});

// Captured from unchanged main 9736ad5c70ed27e4923f7c330cfad06dbfe3b2b1 before implementation.
const SCARECROW_DRAFT_LITERAL =
  '{"armActuators":{"Left Arm":{"hand":false,"lowerArm":false},"Right Arm":{"hand":false,"lowerArm":false}},"armorAllocation":{"Center Leg":0,"Center Torso":18,"centerTorsoRear":5,"Front Left Leg":0,"Front Right Leg":0,"Head":9,"Left Arm":11,"Left Leg":18,"Left Torso":14,"leftTorsoRear":5,"Rear Left Leg":0,"Rear Right Leg":0,"Right Arm":11,"Right Leg":18,"Right Torso":14,"rightTorsoRear":5},"armorTonnage":8,"armorType":"Standard","baseChassisHeatSinks":-1,"chassis":"Scarecrow","clanName":"","cockpitType":"Standard","componentTechBases":{"armor":"Inner Sphere","chassis":"Inner Sphere","engine":"Inner Sphere","gyro":"Inner Sphere","heatsink":"Inner Sphere","movement":"Inner Sphere","myomer":"Inner Sphere","targeting":"Inner Sphere"},"configuration":"Biped","engineRating":200,"engineType":"XL Engine (IS)","enhancement":null,"equipment":[{"category":"Misc Equipment","criticalSlots":1,"equipmentId":"b-pod","heat":0,"instanceId":"equipment-0","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Leg","name":"B-Pod","slots":[4],"techBase":"Inner Sphere","weight":1},{"category":"Misc Equipment","criticalSlots":1,"equipmentId":"b-pod","heat":0,"instanceId":"equipment-1","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Leg","name":"B-Pod","slots":[4],"techBase":"Inner Sphere","weight":1},{"category":"Energy Weapon","criticalSlots":1,"equipmentId":"clan-er-medium-laser","heat":5,"instanceId":"equipment-2","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","name":"ER Medium Laser (Clan)","slots":[2],"techBase":"Clan","weight":1},{"category":"Energy Weapon","criticalSlots":1,"equipmentId":"medium-pulse-laser","heat":4,"instanceId":"equipment-3","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","name":"Medium Pulse Laser","slots":[3],"techBase":"Inner Sphere","weight":2},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"clan-light-machine-gun","heat":0,"instanceId":"equipment-4","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","name":"Light Machine Gun (Clan)","slots":[4],"techBase":"Clan","weight":0.25},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"clan-light-machine-gun","heat":0,"instanceId":"equipment-5","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","name":"Light Machine Gun (Clan)","slots":[5],"techBase":"Clan","weight":0.25},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"clan-light-machine-gun","heat":0,"instanceId":"equipment-6","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","name":"Light Machine Gun (Clan)","slots":[6],"techBase":"Clan","weight":0.25},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"clan-light-machine-gun","heat":0,"instanceId":"equipment-7","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","name":"Light Machine Gun (Clan)","slots":[7],"techBase":"Clan","weight":0.25},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"lmga","heat":0,"instanceId":"equipment-8","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","name":"Light Machine Gun Array","slots":[8],"techBase":"Clan","weight":0.25},{"category":"Energy Weapon","criticalSlots":1,"equipmentId":"clan-er-medium-laser","heat":5,"instanceId":"equipment-9","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","name":"ER Medium Laser (Clan)","slots":[2],"techBase":"Clan","weight":1},{"category":"Energy Weapon","criticalSlots":1,"equipmentId":"medium-pulse-laser","heat":4,"instanceId":"equipment-10","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","name":"Medium Pulse Laser","slots":[3],"techBase":"Inner Sphere","weight":2},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"clan-light-machine-gun","heat":0,"instanceId":"equipment-11","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","name":"Light Machine Gun (Clan)","slots":[4],"techBase":"Clan","weight":0.25},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"clan-light-machine-gun","heat":0,"instanceId":"equipment-12","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","name":"Light Machine Gun (Clan)","slots":[5],"techBase":"Clan","weight":0.25},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"clan-light-machine-gun","heat":0,"instanceId":"equipment-13","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","name":"Light Machine Gun (Clan)","slots":[6],"techBase":"Clan","weight":0.25},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"clan-light-machine-gun","heat":0,"instanceId":"equipment-14","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","name":"Light Machine Gun (Clan)","slots":[7],"techBase":"Clan","weight":0.25},{"category":"Ballistic Weapon","criticalSlots":1,"equipmentId":"lmga","heat":0,"instanceId":"equipment-15","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","name":"Light Machine Gun Array","slots":[8],"techBase":"Clan","weight":0.25},{"category":"Energy Weapon","criticalSlots":1,"equipmentId":"clan-er-medium-laser","heat":5,"instanceId":"equipment-16","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Center Torso","name":"ER Medium Laser (Clan)","slots":[9],"techBase":"Clan","weight":1},{"category":"Energy Weapon","criticalSlots":1,"equipmentId":"er-flamer","heat":4,"instanceId":"equipment-17","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Center Torso","name":"ER Flamer","slots":[10],"techBase":"Inner Sphere","weight":1},{"category":"Energy Weapon","criticalSlots":1,"equipmentId":"er-flamer","heat":4,"instanceId":"equipment-18","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Head","name":"ER Flamer","slots":[3],"techBase":"Inner Sphere","weight":1},{"category":"Misc Equipment","criticalSlots":3,"equipmentId":"double-heat-sink","heat":0,"instanceId":"equipment-19","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":false,"location":"Left Torso","name":"Double Heat Sink","slots":[3,4,5],"techBase":"Inner Sphere","weight":1},{"category":"Misc Equipment","criticalSlots":3,"equipmentId":"double-heat-sink","heat":0,"instanceId":"equipment-20","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":false,"location":"Right Torso","name":"Double Heat Sink","slots":[3,4,5],"techBase":"Inner Sphere","weight":1},{"category":"Ammunition","criticalSlots":1,"equipmentId":"light-machine-gun-ammo-half","heat":0,"instanceId":"equipment-21","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Torso","name":"Light Machine Gun Ammo [Half]","slots":[7],"techBase":"Inner Sphere","weight":0.5}],"fluff":{"capabilities":"<p>Built on a Corean Model 000 endo-composite chassis and powered by a GM 200 XL engine, the Scarecrow achieves a top speed of 86 kph, supplemented by three Rawlings 80 jump jets providing 90 meters of jump capability. While not fast by medium BattleMech standards, the Scarecrow is more than quick enough to run down any conventional infantry formation. A compact gyroscope frees internal volume for the design\'s extensive weapons suite and electronic warfare systems.</p><p>The Scarecrow carries an impressive anti-infantry arsenal. Three ExoStar Pinnacle Clan-specification extended-range medium lasers provide accurate fire at range, while two Omicron 950 medium pulse lasers deliver punishing close-range salvos. Eight GM Ultralight Clan light machine guns, paired in two Corean Bulletstorm machine gun arrays, shred unarmored infantry with devastating efficiency. Two Zippo Longtorch extended-range flamers flush entrenched troops from cover, and two Federated Mantrap anti-battle armor pods ensure even armored infantry cannot safely close. Eight tons of StarGuard III armor with CASE II protection provides adequate survivability, while a Chameleon Light Polarization Shield and Bloodhound Active Probe allow the Scarecrow to hunt its prey undetected.</p><p>The Scarecrow\'s extreme specialization is also its greatest weakness. The design carries no weapons effective against hardened targets, leaving it dangerously vulnerable in any engagement against other BattleMechs or combat vehicles. Its armor, sufficient to shrug off small arms fire, offers little protection against autocannon or PPC fire, and the reliance on an XL engine means that a single unlucky torso hit can end the engagement. Pilots assigned to the Scarecrow must rely entirely on stealth and mobility to avoid enemy heavy assets, and any breakdown in situational awareness can prove fatal.</p>","deployment":"<p>The base UCU-F4 Scarecrow is fielded exclusively by specialized AFFS anti-infantry formations, typically operating in pairs or lances attached to larger combined-arms task forces. These units are deployed to contested worlds where enemy infantry concentrations threaten supply lines, forward bases, or civilian populations. The Scarecrow\'s stealth systems allow it to operate ahead of friendly lines, identifying and eliminating infantry formations before they can entrench or disperse. Field commanders value the design for its ability to clear urban districts and dense terrain that would otherwise require costly infantry-on-infantry operations, though its complete dependence on friendly units for protection against armored threats limits its independent operational range.</p>","history":"<p>The Scarecrow emerged from a classified Corean Enterprises program in the late thirty-first century, entering production in 3099. Incorporating both Clan and Inner Sphere technology, including Clan-specification weapons manufactured under license by Corean and General Motors, the design pushed the boundaries of what the AFFS was willing to field. The AFFS deliberately kept the design secret, officially denying its existence for over four decades. This secrecy reflected the political sensitivity surrounding a BattleMech designed explicitly to kill infantry, a role that attracted criticism from humanitarian organizations and foreign governments alike.</p><p>The most storied, if unverified, deployment of the Scarecrow took place on McComb over a fifteen-year period. Draconis Combine Mustered Soldiery infantrymen deployed to raid the world propagated the legend of the Dragon of Gorman Heights, a spectral figure of fire and steel said to appear and annihilate entire platoons of foot soldiers. While never officially confirmed, most analysts believe repeated Scarecrow deployments designed to attack DCMS infantry on a psychological scale reinforced this legend.</p><p>When the AFFS finally acknowledged the Scarecrow in the 3140s, humanitarian agencies condemned its deployment, arguing that a BattleMech designed solely to kill infantry crossed ethical boundaries. The AFFS largely dismissed these complaints, with defenders of the program citing the long history of anti-infantry designs stretching back to machines like the Piranha and the Stinger. Reports place Scarecrows along the Periphery March border, suggesting the AFFS intends to use them to dissuade pirate attacks, though the pressures of Capellan and Combine incursions make broader deployment likely only a matter of time.</p>","manufacturer":"Corean Enterprises","overview":"<p>The Scarecrow is a rare, mixed-technology medium BattleMech introduced in 3099 by Corean Enterprises at their Augusta facility. Designed exclusively for the Armed Forces of the Federated Suns, the Scarecrow was purpose-built for a single grim mission: the eradication of enemy infantry. Combining advanced technology from multiple sources, including Clan-specification weapons manufactured under license, the design is a deliberate and controversial approach to anti-infantry warfare that has drawn both praise from military planners and condemnation from humanitarian organizations. Few Scarecrows are known to exist, and the design has never been observed outside Federated Suns service.</p>","primaryFactory":"Augusta","systemManufacturer":{"ARMOR":"StarGuard","CHASSIS":"Corean","COMMUNICATIONS":"Achernar Electronics","ENGINE":"GM","JUMP_JET":"Rawlings","TARGETING":"Federated Stalker"}},"gyroType":"Compact Gyro","heatSinkCount":10,"heatSinkType":"Double (IS)","internalStructureType":"Endo-Composite","isOmni":false,"jumpJetType":"Standard","jumpMP":3,"lamMode":"Mech","model":"UCU-F4","mulId":"6336","name":"Scarecrow UCU-F4","quadVeeMode":"Mech","role":"Brawler","rulesLevel":"Standard","selectionMemory":{"armor":{},"cockpit":{},"engine":{},"gyro":{},"heatSink":{},"structure":{}},"techBase":"Inner Sphere","techBaseMode":"mixed","tonnage":40,"unitType":"BattleMech","year":3099}';
const SCARECROW_LIBRARY_LITERAL =
  '{"armor":{"allocation":{"Center Leg":0,"Center Torso":{"front":18,"rear":5},"Front Left Leg":0,"Front Right Leg":0,"Head":9,"Left Arm":11,"Left Leg":18,"Left Torso":{"front":14,"rear":5},"Rear Left Leg":0,"Rear Right Leg":0,"Right Arm":11,"Right Leg":18,"Right Torso":{"front":14,"rear":5}},"type":"STANDARD"},"baseChassisHeatSinks":-1,"chassis":"Scarecrow","cockpit":"STANDARD","componentTechBases":{"armor":"INNER_SPHERE","chassis":"INNER_SPHERE","engine":"INNER_SPHERE","gyro":"INNER_SPHERE","heatsink":"INNER_SPHERE","movement":"INNER_SPHERE","myomer":"INNER_SPHERE","targeting":"INNER_SPHERE"},"configuration":"Biped","criticalSlots":{"Center Torso":[null,null,null,null,null,null,null,null,null,"ER Medium Laser (Clan)","ER Flamer",null],"Head":[null,null,null,"ER Flamer",null,null],"Left Arm":["Shoulder","Upper Arm","ER Medium Laser (Clan)","Medium Pulse Laser","Light Machine Gun (Clan)","Light Machine Gun (Clan)","Light Machine Gun (Clan)","Light Machine Gun (Clan)","Light Machine Gun Array",null,null,null],"Left Leg":[null,null,null,null,"B-Pod",null],"Left Torso":[null,null,null,"Double Heat Sink","Double Heat Sink","Double Heat Sink",null,null,null,null,null,null],"Right Arm":["Shoulder","Upper Arm","ER Medium Laser (Clan)","Medium Pulse Laser","Light Machine Gun (Clan)","Light Machine Gun (Clan)","Light Machine Gun (Clan)","Light Machine Gun (Clan)","Light Machine Gun Array",null,null,null],"Right Leg":[null,null,null,null,"B-Pod",null],"Right Torso":[null,null,null,"Double Heat Sink","Double Heat Sink","Double Heat Sink",null,"Light Machine Gun Ammo [Half]",null,null,null,null]},"engine":{"rating":200,"type":"XL"},"equipment":[{"id":"b-pod","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Leg","slots":[4]},{"id":"b-pod","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Leg","slots":[4]},{"id":"clan-er-medium-laser","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","slots":[2]},{"id":"medium-pulse-laser","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","slots":[3]},{"id":"clan-light-machine-gun","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","slots":[4]},{"id":"clan-light-machine-gun","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","slots":[5]},{"id":"clan-light-machine-gun","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","slots":[6]},{"id":"clan-light-machine-gun","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","slots":[7]},{"id":"lmga","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Left Arm","slots":[8]},{"id":"clan-er-medium-laser","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","slots":[2]},{"id":"medium-pulse-laser","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","slots":[3]},{"id":"clan-light-machine-gun","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","slots":[4]},{"id":"clan-light-machine-gun","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","slots":[5]},{"id":"clan-light-machine-gun","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","slots":[6]},{"id":"clan-light-machine-gun","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","slots":[7]},{"id":"lmga","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Arm","slots":[8]},{"id":"clan-er-medium-laser","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Center Torso","slots":[9]},{"id":"er-flamer","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Center Torso","slots":[10]},{"id":"er-flamer","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Head","slots":[3]},{"id":"double-heat-sink","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":false,"location":"Left Torso","slots":[3,4,5]},{"id":"double-heat-sink","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":false,"location":"Right Torso","slots":[3,4,5]},{"id":"light-machine-gun-ammo-half","isOmniPodMounted":false,"isRearMounted":false,"isRemovable":true,"location":"Right Torso","slots":[7]}],"era":"Early Republic","fluff":{"capabilities":"<p>Built on a Corean Model 000 endo-composite chassis and powered by a GM 200 XL engine, the Scarecrow achieves a top speed of 86 kph, supplemented by three Rawlings 80 jump jets providing 90 meters of jump capability. While not fast by medium BattleMech standards, the Scarecrow is more than quick enough to run down any conventional infantry formation. A compact gyroscope frees internal volume for the design\'s extensive weapons suite and electronic warfare systems.</p><p>The Scarecrow carries an impressive anti-infantry arsenal. Three ExoStar Pinnacle Clan-specification extended-range medium lasers provide accurate fire at range, while two Omicron 950 medium pulse lasers deliver punishing close-range salvos. Eight GM Ultralight Clan light machine guns, paired in two Corean Bulletstorm machine gun arrays, shred unarmored infantry with devastating efficiency. Two Zippo Longtorch extended-range flamers flush entrenched troops from cover, and two Federated Mantrap anti-battle armor pods ensure even armored infantry cannot safely close. Eight tons of StarGuard III armor with CASE II protection provides adequate survivability, while a Chameleon Light Polarization Shield and Bloodhound Active Probe allow the Scarecrow to hunt its prey undetected.</p><p>The Scarecrow\'s extreme specialization is also its greatest weakness. The design carries no weapons effective against hardened targets, leaving it dangerously vulnerable in any engagement against other BattleMechs or combat vehicles. Its armor, sufficient to shrug off small arms fire, offers little protection against autocannon or PPC fire, and the reliance on an XL engine means that a single unlucky torso hit can end the engagement. Pilots assigned to the Scarecrow must rely entirely on stealth and mobility to avoid enemy heavy assets, and any breakdown in situational awareness can prove fatal.</p>","deployment":"<p>The base UCU-F4 Scarecrow is fielded exclusively by specialized AFFS anti-infantry formations, typically operating in pairs or lances attached to larger combined-arms task forces. These units are deployed to contested worlds where enemy infantry concentrations threaten supply lines, forward bases, or civilian populations. The Scarecrow\'s stealth systems allow it to operate ahead of friendly lines, identifying and eliminating infantry formations before they can entrench or disperse. Field commanders value the design for its ability to clear urban districts and dense terrain that would otherwise require costly infantry-on-infantry operations, though its complete dependence on friendly units for protection against armored threats limits its independent operational range.</p>","history":"<p>The Scarecrow emerged from a classified Corean Enterprises program in the late thirty-first century, entering production in 3099. Incorporating both Clan and Inner Sphere technology, including Clan-specification weapons manufactured under license by Corean and General Motors, the design pushed the boundaries of what the AFFS was willing to field. The AFFS deliberately kept the design secret, officially denying its existence for over four decades. This secrecy reflected the political sensitivity surrounding a BattleMech designed explicitly to kill infantry, a role that attracted criticism from humanitarian organizations and foreign governments alike.</p><p>The most storied, if unverified, deployment of the Scarecrow took place on McComb over a fifteen-year period. Draconis Combine Mustered Soldiery infantrymen deployed to raid the world propagated the legend of the Dragon of Gorman Heights, a spectral figure of fire and steel said to appear and annihilate entire platoons of foot soldiers. While never officially confirmed, most analysts believe repeated Scarecrow deployments designed to attack DCMS infantry on a psychological scale reinforced this legend.</p><p>When the AFFS finally acknowledged the Scarecrow in the 3140s, humanitarian agencies condemned its deployment, arguing that a BattleMech designed solely to kill infantry crossed ethical boundaries. The AFFS largely dismissed these complaints, with defenders of the program citing the long history of anti-infantry designs stretching back to machines like the Piranha and the Stinger. Reports place Scarecrows along the Periphery March border, suggesting the AFFS intends to use them to dissuade pirate attacks, though the pressures of Capellan and Combine incursions make broader deployment likely only a matter of time.</p>","manufacturer":"Corean Enterprises","overview":"<p>The Scarecrow is a rare, mixed-technology medium BattleMech introduced in 3099 by Corean Enterprises at their Augusta facility. Designed exclusively for the Armed Forces of the Federated Suns, the Scarecrow was purpose-built for a single grim mission: the eradication of enemy infantry. Combining advanced technology from multiple sources, including Clan-specification weapons manufactured under license, the design is a deliberate and controversial approach to anti-infantry warfare that has drawn both praise from military planners and condemnation from humanitarian organizations. Few Scarecrows are known to exist, and the design has never been observed outside Federated Suns service.</p>","primaryFactory":"Augusta","systemManufacturer":{"ARMOR":"StarGuard","CHASSIS":"Corean","COMMUNICATIONS":"Achernar Electronics","ENGINE":"GM","JUMP_JET":"Rawlings","TARGETING":"Federated Stalker"}},"gyro":{"type":"COMPACT"},"heatSinks":{"count":10,"type":"DOUBLE"},"id":"","isOmni":false,"model":"UCU-F4","movement":{"enhancements":[],"jump":3,"jumpJetType":"STANDARD","walk":5},"mulId":6336,"role":"Brawler","rulesLevel":"STANDARD","schemaVersion":"1.0.0","structure":{"type":"ENDO_COMPOSITE"},"techBase":"MIXED","tonnage":40,"unitType":"BattleMech","variant":"UCU-F4","year":3099}';

it('keeps the original literal old-draft and save fingerprints with their real residual entries', () => {
  const current = loader.mapToUnitState(parseUnit(scarecrow), true);
  // Open the retained old draft itself. Its literal and missing allocations
  // remain evidence; do not replace it with a regenerated canonical fixture.
  const state = createUnitStore({
    ...current,
    ...JSON.parse(SCARECROW_DRAFT_LITERAL),
    unrecoveredCriticalSlots: SCARECROW_LOSS,
  }).getState();
  expect(state.unrecoveredCriticalSlots).toHaveLength(20);
  expect(getUnitDraftFingerprint(state)).toBe(SCARECROW_DRAFT_LITERAL);
  expect(getUnitLibraryFingerprint(state)).toBe(SCARECROW_LIBRARY_LITERAL);
  const changedDiagnostics = { ...state, unrecoveredCriticalSlots: [] };
  expect(getUnitDraftFingerprint(changedDiagnostics)).toBe(
    SCARECROW_DRAFT_LITERAL,
  );
  expect(getUnitLibraryFingerprint(changedDiagnostics)).toBe(
    SCARECROW_LIBRARY_LITERAL,
  );
});

it('extends the frozen fingerprints with exactly seven recovered Scarecrow marker allocations', () => {
  const state = loader.mapToUnitState(parseUnit(scarecrow), true);
  const cells = [
    ...expectedCells('IS Endo-Composite', L.LEFT_ARM, 9, 10),
    ...expectedCells('IS Endo-Composite', L.RIGHT_ARM, 9, 10),
    ...expectedCells('IS Endo-Composite', L.LEFT_TORSO, 10),
    ...expectedCells('IS Endo-Composite', L.RIGHT_TORSO, 9, 10),
  ];
  const draft: Record<string, unknown> & { equipment: unknown[] } = JSON.parse(
    SCARECROW_DRAFT_LITERAL,
  );
  const library: Record<string, unknown> & {
    equipment: unknown[];
    criticalSlots: Record<string, (string | null)[]>;
  } = JSON.parse(SCARECROW_LIBRARY_LITERAL);
  const added = cells.map(({ location, slot }, index) => ({
    category: 'Structural',
    criticalSlots: 1,
    equipmentId: 'internal-structure-slot-IS Endo-Composite',
    heat: 0,
    instanceId: `equipment-${22 + index}`,
    isOmniPodMounted: false,
    isRearMounted: false,
    isRemovable: false,
    location,
    name: 'IS Endo-Composite',
    slots: [slot],
    techBase: 'Inner Sphere',
    weight: 0,
  }));
  for (const { location, slot } of cells)
    library.criticalSlots[location][slot] = 'IS Endo-Composite';
  const libraryAdded = added.map(
    ({
      equipmentId,
      location,
      slots,
      isOmniPodMounted,
      isRearMounted,
      isRemovable,
    }) => ({
      id: equipmentId,
      location,
      slots,
      isOmniPodMounted,
      isRearMounted,
      isRemovable,
    }),
  );
  expect(state.unrecoveredCriticalSlots).toHaveLength(13);
  expect(getUnitDraftFingerprint(state)).toBe(
    stringifyUnitSaveFingerprint({
      ...draft,
      equipment: [...draft.equipment, ...added],
    }),
  );
  expect(getUnitLibraryFingerprint(state)).toBe(
    stringifyUnitSaveFingerprint({
      ...library,
      equipment: [...library.equipment, ...libraryAdded],
    }),
  );
});
