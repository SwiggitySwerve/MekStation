/**
 * Batch fix quad mechs with missing leg data by extracting from MTF source files.
 * Reads MTF files, parses leg sections, updates unit JSON files.
 */
const fs = require('fs');
const path = require('path');

const MTF_ROOT = 'E:/Projects/mm-data/data/mekfiles/meks';
const UNIT_DIR = 'public/data/units/battlemechs';

// Find all JSON unit files
function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

// Find all MTF files
function findMtfFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMtfFiles(full));
    else if (entry.name.endsWith('.mtf')) results.push(full);
  }
  return results;
}

// Parse leg sections from MTF file content
function parseMtfLegs(content) {
  const lines = content.split(/\r?\n/);
  const legSections = {};
  const legNames = ['Front Left Leg', 'Front Right Leg', 'Rear Left Leg', 'Rear Right Leg'];
  const legKeys = {
    'Front Left Leg': 'FRONT_LEFT_LEG',
    'Front Right Leg': 'FRONT_RIGHT_LEG',
    'Rear Left Leg': 'REAR_LEFT_LEG',
    'Rear Right Leg': 'REAR_RIGHT_LEG',
  };

  let currentSection = null;
  for (const line of lines) {
    const trimmed = line.trim();
    // Check if this is a section header
    if (trimmed.endsWith(':')) {
      const sectionName = trimmed.slice(0, -1);
      if (legNames.includes(sectionName)) {
        currentSection = sectionName;
        legSections[legKeys[currentSection]] = [];
      } else {
        currentSection = null;
      }
    } else if (currentSection && trimmed && trimmed !== '-Empty-') {
      // Strip "(armored)" suffix and any OmniPod markers
      let item = trimmed.replace(/\s*\(armored\)\s*$/, '').replace(/\s*\(OMNIPOD\)\s*$/, '').trim();
      if (item && item !== '-Empty-') {
        legSections[legKeys[currentSection]].push(item);
      }
    }
  }

  return legSections;
}

// Check if MTF is a quad
function isMtfQuad(content) {
  return /^Config:\s*Quad$/mi.test(content);
}

// Get chassis+model from MTF
function getMtfId(content) {
  const lines = content.split(/\r?\n/);
  let chassis = '', model = '';
  for (const line of lines) {
    if (line.startsWith('chassis:')) chassis = line.slice(8).trim();
    if (line.startsWith('model:')) model = line.slice(6).trim();
  }
  return { chassis, model };
}

// Build MTF index: key = "chassis model" lowercase -> mtf file path
console.log('Building MTF index...');
const mtfFiles = findMtfFiles(MTF_ROOT);
console.log(`Found ${mtfFiles.length} MTF files`);

const mtfIndex = new Map();
for (const f of mtfFiles) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    if (!isMtfQuad(content)) continue;
    const { chassis, model } = getMtfId(content);
    const key = `${chassis} ${model}`.toLowerCase().trim();
    mtfIndex.set(key, f);
  } catch {}
}
console.log(`Indexed ${mtfIndex.size} quad MTF files`);

// Find quad unit JSONs with missing legs
const unitFiles = findJsonFiles(UNIT_DIR);
let fixed = 0, notFound = 0, alreadyHasLegs = 0, noEquip = 0;
const fixLog = [];

for (const f of unitFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (data.configuration !== 'Quad') continue;

    const crits = data.criticalSlots || {};
    const hasLegs = crits.REAR_LEFT_LEG || crits.REAR_RIGHT_LEG || crits.FRONT_LEFT_LEG || crits.FRONT_RIGHT_LEG;
    if (hasLegs) { alreadyHasLegs++; continue; }

    // Try to find matching MTF
    const key = `${data.chassis} ${data.model}`.toLowerCase().trim();
    const mtfPath = mtfIndex.get(key);
    if (!mtfPath) {
      notFound++;
      continue;
    }

    const mtfContent = fs.readFileSync(mtfPath, 'utf8');
    const legs = parseMtfLegs(mtfContent);

    if (Object.keys(legs).length === 0) {
      notFound++;
      continue;
    }

    // Check if legs have any equipment beyond actuators
    const actuatorItems = new Set(['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator']);
    let hasEquipment = false;
    for (const [loc, items] of Object.entries(legs)) {
      for (const item of items) {
        if (!actuatorItems.has(item) && !item.includes('Endo Steel') && !item.includes('Ferro-Fibrous')
            && !item.includes('Endo-Steel') && !item.includes('Endo Composite')) {
          hasEquipment = true;
        }
      }
    }

    // Add legs to JSON
    data.criticalSlots = { ...crits, ...legs };
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
    fixed++;

    const equipNote = hasEquipment ? 'HAS EQUIPMENT' : 'actuators/structure only';
    fixLog.push(`  ${data.chassis} ${data.model}: ${equipNote} - ${path.relative(UNIT_DIR, f)}`);
  } catch {}
}

console.log(`\nResults:`);
console.log(`  Already has legs: ${alreadyHasLegs}`);
console.log(`  Fixed: ${fixed}`);
console.log(`  MTF not found: ${notFound}`);
console.log(`\nFixed units:`);
for (const l of fixLog) console.log(l);
