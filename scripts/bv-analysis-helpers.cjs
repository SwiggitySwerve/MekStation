const fs = require('fs');
const path = require('path');

const battleMechUnitsDir = 'public/data/units/battlemechs';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadBvValidationReport() {
  return readJson('validation-output/bv-validation-report.json');
}

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json')
      results.push(full);
  }
  return results;
}

function loadBattleMechUnitFiles() {
  return findJsonFiles(battleMechUnitsDir);
}

function loadBattleMechUnitMap() {
  const unitMap = new Map();
  for (const file of loadBattleMechUnitFiles()) {
    try {
      const unit = readJson(file);
      unitMap.set(unit.id, unit);
    } catch {
      // Keep legacy analysis scripts tolerant of malformed unit drafts.
    }
  }
  return unitMap;
}

module.exports = {
  findJsonFiles,
  loadBattleMechUnitFiles,
  loadBattleMechUnitMap,
  loadBvValidationReport,
  readJson,
};
