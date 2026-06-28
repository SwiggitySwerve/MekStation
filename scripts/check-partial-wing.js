const bvAnalysis = require('./bv-analysis-helpers.cjs');
const r = bvAnalysis.loadBvValidationReport();

const unitMap = bvAnalysis.loadBattleMechUnitMap();

// Find all units with partial wing
console.log('=== All Partial Wing units ===\n');
let pwTotal = 0;
let pwDoubleCount = 0;
let pwFixWouldHelp = 0;

for (const u of r.allResults) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;

  const crits = data.criticalSlots || {};
  const allCrits = Object.values(crits).flat().filter(Boolean);
  const hasPartialWing = allCrits.some(
    (s) =>
      (s.toLowerCase().includes('partial') &&
        s.toLowerCase().includes('wing')) ||
      s.toLowerCase().includes('partialwing'),
  );
  if (!hasPartialWing) continue;

  pwTotal++;

  // Count actual JJ slots
  const jjCount = allCrits.filter((s) => {
    const lo = s.toLowerCase();
    return (
      lo === 'jump jet' || lo === 'improved jump jet' || lo.includes('jumpjet')
    );
  }).length;

  const dataJump = data.movement?.jump || 0;
  const tonnage = data.tonnage;
  const pwBonus = tonnage <= 55 ? 2 : 1;

  // Check if data.jump includes partial wing
  const baseJumpFromJJ = jjCount; // Each JJ = 1 jump MP for standard
  const expectedWithPW = baseJumpFromJJ + pwBonus;
  const jumpIncludesPW = dataJump === expectedWithPW;
  const jumpIsBase = dataJump === baseJumpFromJJ;

  const b = u.breakdown || {};

  // If data includes PW bonus and we add it again, jump would be dataJump + pwBonus
  const actualJumpUsed = b.jumpMP || 0;
  const expectedCorrect = dataJump; // If data already includes PW, don't add more
  const doubleCounted = actualJumpUsed === dataJump + pwBonus;

  if (doubleCounted) {
    pwDoubleCount++;
    // Estimate fix: what would BV be with correct jumpMP?
    // This affects both speedFactor and defensiveFactor (TMM)
    console.log(
      `${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference}`,
    );
    console.log(
      `  JJ slots: ${jjCount}, data.jump: ${dataJump}, tonnage: ${tonnage}, pwBonus: ${pwBonus}`,
    );
    console.log(
      `  Expected with PW: ${expectedWithPW}, jumpUsed: ${actualJumpUsed}, doubleCount: ${doubleCounted}`,
    );
    console.log(
      `  jumpIncludesPW: ${jumpIncludesPW}, jumpIsBase: ${jumpIsBase}`,
    );
    console.log(`  sf=${b.speedFactor} runMP=${b.runMP} jumpMP=${b.jumpMP}`);
    console.log('');
  } else {
    console.log(
      `${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% JJ=${jjCount} data.jump=${dataJump} used=${actualJumpUsed} [NOT DOUBLE-COUNTED]`,
    );
  }
}

console.log(`\nTotal partial wing units: ${pwTotal}`);
console.log(`Double-counted: ${pwDoubleCount}`);
