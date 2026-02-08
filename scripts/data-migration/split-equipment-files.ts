/**
 * Split large equipment JSON files into smaller sub-type-based files.
 * Run: npx tsx scripts/data-migration/split-equipment-files.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const BASE = path.resolve(__dirname, '../../public/data/equipment/official');

interface EquipmentItem {
  id: string;
  name: string;
  category?: string;
  subType?: string;
  [key: string]: unknown;
}

interface EquipmentFile {
  $schema?: string;
  items: EquipmentItem[];
}

function readFile(relPath: string): EquipmentFile {
  const full = path.join(BASE, relPath);
  return JSON.parse(fs.readFileSync(full, 'utf-8'));
}

function writeFile(relPath: string, items: EquipmentItem[], schema?: string) {
  const full = path.join(BASE, relPath);
  const dir = path.dirname(full);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const obj: Record<string, unknown> = { items };
  if (schema) obj.$schema = schema;
  fs.writeFileSync(full, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
  console.log(`  ${relPath}: ${items.length} items`);
}

// ── Classify ballistic weapons ──
function classifyBallistic(item: EquipmentItem): string {
  const id = item.id.toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (id.includes('gauss') || name.includes('gauss')) return 'gauss';
  if (id.includes('machine-gun') || id.includes('machinegun') || name.includes('machine gun')) return 'machinegun';
  if (id.includes('ac/') || id.includes('ac-') || id.includes('autocannon') ||
      id.includes('uac') || id.includes('ultra') || id.includes('lbx') || id.includes('lb-') ||
      id.includes('rac') || id.includes('rotary') || id.includes('hvac') || id.includes('hyper') ||
      name.includes('autocannon') || name.includes('ultra ac') || name.includes('lb ') ||
      name.includes('rotary') || name.includes('hyper-velocity')) return 'autocannon';
  return 'other';
}

// ── Classify missile weapons ──
function classifyMissile(item: EquipmentItem): string {
  const id = item.id.toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (id.includes('atm') || id.includes('iatm') || name.includes('atm')) return 'atm';
  if (id.includes('mrm') || name.includes('mrm')) return 'mrm';
  if ((id.includes('srm') || name.includes('srm')) && !id.includes('lrm')) return 'srm';
  if (id.includes('lrm') || name.includes('lrm')) return 'lrm';
  return 'other';
}

// ── Classify ammunition ──
function classifyAmmo(item: EquipmentItem): string {
  const id = item.id.toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (id.includes('atm') || id.includes('iatm') || name.includes('atm')) return 'atm';
  if (id.includes('mrm') || name.includes('mrm')) return 'mrm';
  if ((id.includes('srm') || name.includes('srm')) && !id.includes('lrm')) return 'srm';
  if (id.includes('lrm') || name.includes('lrm') || id.includes('elrm') || id.includes('enhanced-lrm')) return 'lrm';
  if (id.includes('gauss') || name.includes('gauss')) return 'gauss';
  if (id.includes('machine-gun') || id.includes('machinegun') || id.includes('mg-') || name.includes('machine gun')) return 'machinegun';
  if (id.includes('narc') || id.includes('inarc') || name.includes('narc')) return 'narc';
  if (id.includes('arrow') || id.includes('long-tom') || id.includes('sniper-') || id.includes('thumper') ||
      name.includes('arrow') || name.includes('long tom') || name.includes('sniper') || name.includes('thumper')) return 'artillery';
  if (id.includes('ac/') || id.includes('ac-') || id.includes('autocannon') ||
      id.includes('uac') || id.includes('ultra') || id.includes('lbx') || id.includes('lb-') ||
      id.includes('rac') || id.includes('rotary') || id.includes('hvac') || id.includes('hyper') ||
      name.includes('autocannon') || name.includes('ultra ac') || name.includes('lb ') ||
      name.includes('rotary') || name.includes('hyper-velocity')) return 'autocannon';
  return 'other';
}

function splitAndWrite(
  sourceRelPath: string,
  destPrefix: string,
  classifier: (item: EquipmentItem) => string,
  schema?: string,
): Record<string, string> {
  const data = readFile(sourceRelPath);
  const buckets = new Map<string, EquipmentItem[]>();
  for (const item of data.items) {
    const cat = classifier(item);
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(item);
  }
  const fileMap: Record<string, string> = {};
  for (const [cat, items] of [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const fileName = `${destPrefix}${cat}.json`;
    writeFile(fileName, items, schema);
    fileMap[cat] = fileName;
  }
  return fileMap;
}

// ── Main ──
console.log('Splitting equipment files...\n');

// 1. Split ballistic weapons
console.log('=== Ballistic Weapons ===');
const ballisticData = readFile('weapons/ballistic.json');
const ballisticFiles = splitAndWrite('weapons/ballistic.json', 'weapons/ballistic-', classifyBallistic, ballisticData.$schema);

// 2. Split missile weapons
console.log('\n=== Missile Weapons ===');
const missileData = readFile('weapons/missile.json');
const missileFiles = splitAndWrite('weapons/missile.json', 'weapons/missile-', classifyMissile, missileData.$schema);

// 3. Split ammunition
console.log('\n=== Ammunition ===');
const ammoData = readFile('ammunition.json');
const ammoFiles = splitAndWrite('ammunition.json', 'ammunition/', classifyAmmo, ammoData.$schema);

// 4. Energy and physical stay as-is
console.log('\n=== Kept As-Is ===');
const energyData = readFile('weapons/energy.json');
console.log(`  weapons/energy.json: ${energyData.items.length} items`);
const physicalData = readFile('weapons/physical.json');
console.log(`  weapons/physical.json: ${physicalData.items.length} items`);

// 5. Generate updated index.json
console.log('\n=== Generating index.json ===');
const allWeaponFiles: Record<string, string> = { energy: 'weapons/energy.json' };
for (const [cat, file] of Object.entries(ballisticFiles)) allWeaponFiles[`ballistic-${cat}`] = file;
for (const [cat, file] of Object.entries(missileFiles)) allWeaponFiles[`missile-${cat}`] = file;
allWeaponFiles.physical = 'weapons/physical.json';

const allAmmoFiles: Record<string, string> = {};
for (const [cat, file] of Object.entries(ammoFiles)) allAmmoFiles[cat] = file;

const electronicsData = readFile('electronics.json');
const miscData = readFile('miscellaneous.json');

const totalWeapons = energyData.items.length + ballisticData.items.length + missileData.items.length + physicalData.items.length;
const totalAmmo = ammoData.items.length;

const index = {
  version: '2.0.0',
  generatedAt: new Date().toISOString(),
  files: {
    weapons: allWeaponFiles,
    ammunition: allAmmoFiles,
    electronics: 'electronics.json',
    miscellaneous: 'miscellaneous.json',
  },
  totalItems: {
    weapons: totalWeapons,
    ammunition: totalAmmo,
    electronics: electronicsData.items.length,
    miscellaneous: miscData.items.length,
  },
};

fs.writeFileSync(path.join(BASE, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf-8');
console.log('  index.json updated');

// 6. Verify item counts
console.log('\n=== Verification ===');
let splitWeaponCount = energyData.items.length + physicalData.items.length;
for (const file of Object.values(ballisticFiles)) {
  const d = readFile(file);
  splitWeaponCount += d.items.length;
}
for (const file of Object.values(missileFiles)) {
  const d = readFile(file);
  splitWeaponCount += d.items.length;
}
let splitAmmoCount = 0;
for (const file of Object.values(ammoFiles)) {
  const d = readFile(file);
  splitAmmoCount += d.items.length;
}

const weaponMatch = splitWeaponCount === totalWeapons;
const ammoMatch = splitAmmoCount === totalAmmo;
console.log(`  Weapons: ${splitWeaponCount}/${totalWeapons} ${weaponMatch ? 'OK' : 'MISMATCH'}`);
console.log(`  Ammunition: ${splitAmmoCount}/${totalAmmo} ${ammoMatch ? 'OK' : 'MISMATCH'}`);

// 7. Summary
console.log('\n=== Summary ===');
console.log(`Weapons: ${Object.keys(allWeaponFiles).length} files (${totalWeapons} total items)`);
console.log(`Ammunition: ${Object.keys(allAmmoFiles).length} files (${totalAmmo} total items)`);
console.log(`Electronics: 1 file (${electronicsData.items.length} items)`);
console.log(`Miscellaneous: 1 file (${miscData.items.length} items)`);

if (!weaponMatch || !ammoMatch) {
  console.error('\nERROR: Item count mismatch! Do not delete original files.');
  process.exit(1);
}

console.log('\nOld files can be removed after verification:');
console.log('  weapons/ballistic.json, weapons/missile.json, ammunition.json');
