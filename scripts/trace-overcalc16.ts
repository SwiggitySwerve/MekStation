import * as fs from 'fs';
import * as path from 'path';

const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Check the Revenant UBM-2R2 in detail
const uid = 'revenant-ubm-2r2';
const iu = indexData.units.find((u: any) => u.id === uid);
const unitPath = path.resolve('public/data/units/battlemechs', iu!.path);
const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

console.log('=== REVENANT UBM-2R2 CRIT SLOTS ===');
console.log('Cockpit field:', unit.cockpit);
console.log('');

for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  console.log(`${loc}: ${JSON.stringify(slots)}`);
}

console.log('');

// Check if it has drone OS
const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
const critsLo = allCrits.map(s => (s as string).toLowerCase());

console.log('Has "droneoperatingsystem":', critsLo.some(s => s.includes('droneoperatingsystem')));
console.log('Has "drone operating system":', critsLo.some(s => s.includes('drone operating system')));
console.log('Has "small cockpit" in crits:', critsLo.some(s => s.includes('small cockpit')));
console.log('Cockpit field contains SMALL:', (unit.cockpit || '').toUpperCase().includes('SMALL'));

// Check if scanCrits detects any special cockpit
// From the code:
// detectedSmallCockpit: unit.cockpit && unit.cockpit.toUpperCase().includes('SMALL')
// detectedInterfaceCockpit: HEAD has 2 "Cockpit" entries AND no "Gyro" anywhere
// detectedDroneOS: allSlotsLo.some(s => s.includes('droneoperatingsystem') || s.includes('drone operating system'))

console.log('');
console.log('HEAD slots:', JSON.stringify(unit.criticalSlots?.HEAD));

const headSlots = (unit.criticalSlots?.HEAD || []) as string[];
const cockpitCount = headSlots.filter(s => s && s.toLowerCase().includes('cockpit')).length;
console.log('Cockpit entries in HEAD:', cockpitCount);

const hasGyroAnywhere = critsLo.some(s => s.includes('gyro'));
console.log('Has Gyro anywhere:', hasGyroAnywhere);

// If cockpitCount >= 2 and no gyro -> interface cockpit detected!
// Interface cockpit modifier = 1.3 (not 0.95)
// But wait - if it's detected as interface, the gyro BV would be set to 0 too.

console.log('');
console.log('=== DETECTION RESULTS ===');
console.log('detectedSmallCockpit:', (unit.cockpit || '').toUpperCase().includes('SMALL'));
console.log('detectedInterfaceCockpit:', cockpitCount >= 2 && !hasGyroAnywhere);
console.log('detectedDroneOS:', critsLo.some(s => s.includes('droneoperatingsystem') || s.includes('drone operating system')));

// Now let's check: is the difference between 693 and 658 really due to 0.95?
// 693 * 0.95 = 658.35 -> 658. YES!
// So SOMETHING is applying 0.95 to this unit.
// But the cockpit is STANDARD, no drone OS, no small cockpit.

// Wait - let me re-read the validate code more carefully.
// Maybe there's a DIFFERENT place where 0.95 is applied.

// Let me check the Revenant's chassis - is it a known special chassis?
console.log('');
console.log('Chassis:', unit.chassis);
console.log('Model:', unit.model);
console.log('Configuration:', unit.configuration);
console.log('Tech base:', unit.techBase);

// "Revenant" is not a Celestial OmniMech.
// UBM = "Undead Battle Mech" - the Revenant is an Undead Mech from ilClan era.
// In TechManual BV rules, there's no special modifier for this.

// Wait - UBM units use a Torso-Mounted Cockpit!
// The UBM (Undead BattleMech) series uses the Undead command system
// which might be treated as a non-standard cockpit.
// Let me check if the cockpit field says STANDARD but it should say TORSO_MOUNTED.

// Actually, looking at the crit slots, let me check more carefully.
// In MegaMek, some cockpit types are determined by the unit's construction type,
// not by the cockpit field in the data.
