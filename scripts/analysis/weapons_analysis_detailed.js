const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function detailedWeaponsAnalysis() {
  const dbPath = path.join(__dirname, 'data/battletech_dev.sqlite');

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log('⚔️ Detailed Weapons Analysis - Phase 2, Step 3\n');

    // Get all weapons from the audit results
    const allEquipment = await db.all(`
      SELECT internal_id, name, type, category, tech_base, data
      FROM equipment 
      WHERE type LIKE '%laser%' OR type LIKE '%ppc%' OR type LIKE '%flamer%' 
         OR type LIKE '%plasma%' OR type LIKE '%gauss%' OR type LIKE '%autocannon%' 
         OR type LIKE '%machinegun%' OR type LIKE '%lrm%' OR type LIKE '%srm%'
         OR type LIKE '%streak%' OR type LIKE '%atm%' OR type LIKE '%rocket%'
         OR type LIKE '%arrow%' OR type LIKE '%thunderbolt%'
         OR name LIKE '%laser%' OR name LIKE '%ppc%' OR name LIKE '%gauss%'
         OR name LIKE '%autocannon%' OR name LIKE '%ac/%' OR name LIKE '%ultra%'
         OR name LIKE '%lb %' OR name LIKE '%lrm%' OR name LIKE '%srm%'
         OR name LIKE '%streak%' OR name LIKE '%atm%' OR name LIKE '%mml%'
         OR name LIKE '%rocket%' OR name LIKE '%plasma%' OR name LIKE '%flamer%'
      ORDER BY name
    `);

    console.log(`🔫 Total weapon items found: ${allEquipment.length}\n`);

    // Weapon analysis categories
    const weaponCategories = {
      EnergyWeapons: {
        StandardLasers: [],
        ERLasers: [],
        PulseLasers: [],
        PPCs: [],
        PlasmaWeapons: [],
        Flamers: [],
        SpecialEnergy: [],
      },
      BallisticWeapons: {
        StandardAutocannons: [],
        UltraAutocannons: [],
        LBXAutocannons: [],
        GaussRifles: [],
        MachineGuns: [],
        SpecialBallistic: [],
      },
      MissileWeapons: {
        LRMSystems: [],
        SRMSystems: [],
        StreakSystems: [],
        ATMSystems: [],
        MMLSystems: [],
        RocketLaunchers: [],
        CapitalMissiles: [],
        SpecialMissile: [],
      },
    };

    // IS vs Clan variant analysis
    const techBaseVariants = {
      ISVariants: [],
      ClanVariants: [],
      MixedClassification: [],
      MissingISVariant: [],
      MissingClanVariant: [],
      NeedsSeparation: [],
    };

    // Performance comparison data
    const performanceComparisons = {
      WeightDifferences: [],
      SlotDifferences: [],
      RangeDifferences: [],
      DamageDifferences: [],
      HeatDifferences: [],
    };

    // Process each weapon
    for (const weapon of allEquipment) {
      let parsedData;
      try {
        parsedData = JSON.parse(weapon.data);
      } catch (e) {
        console.error(`Failed to parse data for ${weapon.internal_id}`);
        continue;
      }

      // Categorize weapon by type
      const category = categorizeWeapon(
        weapon.name,
        weapon.type,
        weapon.internal_id,
      );
      if (category.main && category.sub) {
        weaponCategories[category.main][category.sub].push({
          internal_id: weapon.internal_id,
          name: weapon.name,
          type: weapon.type,
          tech_base: weapon.tech_base,
          data: parsedData,
        });
      }

      // Analyze tech base variants
      const techAnalysis = analyzeWeaponTechBase(weapon, parsedData);
      techBaseVariants[techAnalysis.classification].push({
        internal_id: weapon.internal_id,
        name: weapon.name,
        current_tech_base: weapon.tech_base,
        recommendation: techAnalysis.recommendation,
        base_weapon: techAnalysis.baseWeapon,
        variant_needed: techAnalysis.variantNeeded,
      });

      // Analyze performance data
      const perfAnalysis = analyzeWeaponPerformance(weapon, parsedData);
      if (perfAnalysis.differences.length > 0) {
        perfAnalysis.differences.forEach((diff) => {
          performanceComparisons[diff.type].push({
            weapon: weapon.name,
            tech_base: weapon.tech_base,
            difference: diff,
          });
        });
      }
    }

    // Generate detailed reports
    console.log('⚔️ WEAPON CATEGORIZATION ANALYSIS');
    console.log('==================================');

    for (const [mainCategory, subCategories] of Object.entries(
      weaponCategories,
    )) {
      const totalInCategory = Object.values(subCategories).reduce(
        (sum, items) => sum + items.length,
        0,
      );
      if (totalInCategory > 0) {
        console.log(`\n${mainCategory}: ${totalInCategory} weapons`);
        for (const [subCategory, weapons] of Object.entries(subCategories)) {
          if (weapons.length > 0) {
            console.log(`  ${subCategory}: ${weapons.length} weapons`);
            weapons.slice(0, 5).forEach((weapon) => {
              console.log(`    - ${weapon.name} (${weapon.tech_base})`);
            });
            if (weapons.length > 5) {
              console.log(`    ... and ${weapons.length - 5} more weapons`);
            }
          }
        }
      }
    }

    console.log('\n🎯 WEAPON TECH BASE VARIANT ANALYSIS');
    console.log('=====================================');

    for (const [classification, weapons] of Object.entries(techBaseVariants)) {
      if (weapons.length > 0) {
        console.log(`\n${classification}: ${weapons.length} weapons`);
        weapons.slice(0, 8).forEach((weapon) => {
          if (weapon.base_weapon && weapon.variant_needed) {
            console.log(
              `  - ${weapon.name} (${weapon.current_tech_base}) -> ${weapon.recommendation}`,
            );
            console.log(
              `    Base: ${weapon.base_weapon}, Need: ${weapon.variant_needed}`,
            );
          } else {
            console.log(
              `  - ${weapon.name} (${weapon.current_tech_base}) -> ${weapon.recommendation}`,
            );
          }
        });
        if (weapons.length > 8) {
          console.log(`  ... and ${weapons.length - 8} more weapons`);
        }
      }
    }

    // Create IS vs Clan performance comparison matrix
    const performanceMatrix = createPerformanceMatrix(
      weaponCategories,
      techBaseVariants,
    );

    console.log('\n📊 IS vs CLAN PERFORMANCE COMPARISON MATRIX');
    console.log('===========================================');

    performanceMatrix.forEach((comparison) => {
      console.log(`\n${comparison.weaponType}:`);
      console.log(`  IS Variant: ${comparison.isVariant || 'Missing'}`);
      console.log(`  Clan Variant: ${comparison.clanVariant || 'Missing'}`);
      if (comparison.differences.length > 0) {
        console.log(`  Key Differences:`);
        comparison.differences.forEach((diff) => {
          console.log(`    - ${diff}`);
        });
      }
    });

    // Generate weapons specification matrix
    const weaponsSpecMatrix = generateWeaponsSpecMatrix(
      weaponCategories,
      allEquipment,
    );

    // Save detailed analysis results
    const analysisResults = {
      summary: {
        total_weapons: allEquipment.length,
        energy_weapons: Object.values(weaponCategories.EnergyWeapons).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
        ballistic_weapons: Object.values(
          weaponCategories.BallisticWeapons,
        ).reduce((sum, arr) => sum + arr.length, 0),
        missile_weapons: Object.values(weaponCategories.MissileWeapons).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
        tech_base_issues:
          techBaseVariants.NeedsSeparation.length +
          techBaseVariants.MissingISVariant.length +
          techBaseVariants.MissingClanVariant.length,
      },
      weapon_categories: weaponCategories,
      tech_base_variants: techBaseVariants,
      performance_comparisons: performanceComparisons,
      performance_matrix: performanceMatrix,
      weapons_specification_matrix: weaponsSpecMatrix,
      analysis_date: new Date().toISOString(),
    };

    fs.writeFileSync(
      'data/weapons_analysis_results.json',
      JSON.stringify(analysisResults, null, 2),
    );
    console.log(
      '\n💾 Detailed weapons analysis results saved to weapons_analysis_results.json',
    );

    await db.close();
    console.log('\n✅ Detailed weapons analysis complete!');
  } catch (error) {
    console.error('❌ Error during weapons analysis:', error);
  }
}

function categorizeWeapon(name, type, internal_id) {
  const nameLower = name.toLowerCase();
  const typeLower = (type || '').toLowerCase();
  const idLower = internal_id.toLowerCase();

  // Energy Weapons Classification
  if (nameLower.includes('laser') || typeLower.includes('laser')) {
    if (nameLower.includes('er ') || nameLower.includes('extended range')) {
      return { main: 'EnergyWeapons', sub: 'ERLasers' };
    } else if (nameLower.includes('pulse')) {
      return { main: 'EnergyWeapons', sub: 'PulseLasers' };
    } else {
      return { main: 'EnergyWeapons', sub: 'StandardLasers' };
    }
  }

  if (nameLower.includes('ppc') || typeLower.includes('ppc')) {
    return { main: 'EnergyWeapons', sub: 'PPCs' };
  }

  if (nameLower.includes('plasma') || typeLower.includes('plasma')) {
    return { main: 'EnergyWeapons', sub: 'PlasmaWeapons' };
  }

  if (nameLower.includes('flamer') || typeLower.includes('flamer')) {
    return { main: 'EnergyWeapons', sub: 'Flamers' };
  }

  // Ballistic Weapons Classification
  if (nameLower.includes('gauss') || typeLower.includes('gauss')) {
    return { main: 'BallisticWeapons', sub: 'GaussRifles' };
  }

  if (
    nameLower.includes('ultra ac') ||
    nameLower.includes('ultraac') ||
    typeLower.includes('ultra')
  ) {
    return { main: 'BallisticWeapons', sub: 'UltraAutocannons' };
  }

  if (
    nameLower.includes('lb ') ||
    nameLower.includes('lb-') ||
    typeLower.includes('lbx')
  ) {
    return { main: 'BallisticWeapons', sub: 'LBXAutocannons' };
  }

  if (
    nameLower.includes('autocannon') ||
    nameLower.includes('ac/') ||
    nameLower.includes('ac ') ||
    typeLower.includes('autocannon')
  ) {
    return { main: 'BallisticWeapons', sub: 'StandardAutocannons' };
  }

  if (
    nameLower.includes('machine gun') ||
    nameLower.includes('mg ') ||
    typeLower.includes('machinegun')
  ) {
    return { main: 'BallisticWeapons', sub: 'MachineGuns' };
  }

  // Missile Weapons Classification
  if (nameLower.includes('streak')) {
    return { main: 'MissileWeapons', sub: 'StreakSystems' };
  }

  if (nameLower.includes('lrm') || typeLower.includes('lrm')) {
    return { main: 'MissileWeapons', sub: 'LRMSystems' };
  }

  if (nameLower.includes('srm') || typeLower.includes('srm')) {
    return { main: 'MissileWeapons', sub: 'SRMSystems' };
  }

  if (nameLower.includes('atm') || typeLower.includes('atm')) {
    return { main: 'MissileWeapons', sub: 'ATMSystems' };
  }

  if (nameLower.includes('mml') || typeLower.includes('mml')) {
    return { main: 'MissileWeapons', sub: 'MMLSystems' };
  }

  if (nameLower.includes('rocket') || typeLower.includes('rocket')) {
    return { main: 'MissileWeapons', sub: 'RocketLaunchers' };
  }

  if (
    nameLower.includes('arrow') ||
    nameLower.includes('thunderbolt') ||
    nameLower.includes('long tom')
  ) {
    return { main: 'MissileWeapons', sub: 'CapitalMissiles' };
  }

  // Default classification
  if (
    nameLower.includes('laser') ||
    nameLower.includes('ppc') ||
    nameLower.includes('flamer') ||
    nameLower.includes('plasma')
  ) {
    return { main: 'EnergyWeapons', sub: 'SpecialEnergy' };
  }
  if (
    nameLower.includes('autocannon') ||
    nameLower.includes('gauss') ||
    nameLower.includes('machine')
  ) {
    return { main: 'BallisticWeapons', sub: 'SpecialBallistic' };
  }
  if (nameLower.includes('missile') || nameLower.includes('rocket')) {
    return { main: 'MissileWeapons', sub: 'SpecialMissile' };
  }

  return { main: null, sub: null };
}

function analyzeWeaponTechBase(weapon, parsedData) {
  const nameLower = weapon.name.toLowerCase();
  const techBase = weapon.tech_base;

  // Determine base weapon type
  let baseWeapon = '';
  let variantNeeded = '';

  if (nameLower.includes('large laser')) {
    baseWeapon = 'Large Laser';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Large Laser'
        : techBase === 'Clan'
          ? 'IS Large Laser'
          : 'Both variants';
  } else if (nameLower.includes('medium laser')) {
    baseWeapon = 'Medium Laser';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Medium Laser'
        : techBase === 'Clan'
          ? 'IS Medium Laser'
          : 'Both variants';
  } else if (nameLower.includes('small laser')) {
    baseWeapon = 'Small Laser';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Small Laser'
        : techBase === 'Clan'
          ? 'IS Small Laser'
          : 'Both variants';
  } else if (nameLower.includes('ppc')) {
    baseWeapon = 'PPC';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan PPC'
        : techBase === 'Clan'
          ? 'IS PPC'
          : 'Both variants';
  } else if (nameLower.includes('gauss rifle')) {
    baseWeapon = 'Gauss Rifle';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Gauss Rifle'
        : techBase === 'Clan'
          ? 'IS Gauss Rifle'
          : 'Both variants';
  } else if (nameLower.includes('ultra ac')) {
    baseWeapon = 'Ultra Autocannon';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Ultra AC'
        : techBase === 'Clan'
          ? 'IS Ultra AC'
          : 'Both variants';
  } else if (nameLower.includes('lb ')) {
    baseWeapon = 'LB-X Autocannon';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan LB-X AC'
        : techBase === 'Clan'
          ? 'IS LB-X AC'
          : 'Both variants';
  }

  // Classification logic
  if (techBase === 'Mixed') {
    if (baseWeapon) {
      return {
        classification: 'NeedsSeparation',
        recommendation: 'Separate into IS and Clan variants',
        baseWeapon,
        variantNeeded,
      };
    }
    return {
      classification: 'MixedClassification',
      recommendation: 'Review mixed tech classification',
      baseWeapon: 'Unknown',
      variantNeeded: 'Needs analysis',
    };
  }

  if (techBase === 'IS' && baseWeapon) {
    return {
      classification: 'MissingClanVariant',
      recommendation: 'Create Clan variant',
      baseWeapon,
      variantNeeded,
    };
  }

  if (techBase === 'Clan' && baseWeapon) {
    return {
      classification: 'MissingISVariant',
      recommendation: 'Create IS variant',
      baseWeapon,
      variantNeeded,
    };
  }

  if (techBase === 'IS') {
    return {
      classification: 'ISVariants',
      recommendation: 'Properly classified IS weapon',
      baseWeapon: baseWeapon || weapon.name,
      variantNeeded: 'None',
    };
  }

  if (techBase === 'Clan') {
    return {
      classification: 'ClanVariants',
      recommendation: 'Properly classified Clan weapon',
      baseWeapon: baseWeapon || weapon.name,
      variantNeeded: 'None',
    };
  }

  return {
    classification: 'ISVariants',
    recommendation: 'Default IS classification',
    baseWeapon: weapon.name,
    variantNeeded: 'None',
  };
}

function analyzeWeaponPerformance(weapon, parsedData) {
  const differences = [];
  const nameLower = weapon.name.toLowerCase();

  // Expected performance differences for common weapons
  if (nameLower.includes('large laser')) {
    if (weapon.tech_base === 'IS') {
      differences.push({
        type: 'WeightDifferences',
        expected: 'Clan 20% lighter (4 tons vs 5 tons)',
      });
      differences.push({
        type: 'SlotDifferences',
        expected: 'Clan half slots (1 vs 2 slots)',
      });
    } else if (weapon.tech_base === 'Clan') {
      differences.push({
        type: 'WeightDifferences',
        expected: 'IS 25% heavier (5 tons vs 4 tons)',
      });
      differences.push({
        type: 'SlotDifferences',
        expected: 'IS double slots (2 vs 1 slot)',
      });
    }
  }

  if (nameLower.includes('medium laser')) {
    if (weapon.tech_base === 'IS') {
      differences.push({
        type: 'WeightDifferences',
        expected: 'Clan 50% lighter (0.5 tons vs 1 ton)',
      });
      differences.push({
        type: 'SlotDifferences',
        expected: 'Same slots (1 slot each)',
      });
    }
  }

  if (nameLower.includes('gauss rifle')) {
    differences.push({
      type: 'WeightDifferences',
      expected: 'Clan slightly lighter',
    });
    differences.push({
      type: 'RangeDifferences',
      expected: 'Similar range profiles',
    });
  }

  return { differences };
}

function createPerformanceMatrix(weaponCategories, techBaseVariants) {
  const matrix = [];
  const commonWeapons = [
    'Small Laser',
    'Medium Laser',
    'Large Laser',
    'ER Small Laser',
    'ER Medium Laser',
    'ER Large Laser',
    'Small Pulse Laser',
    'Medium Pulse Laser',
    'Large Pulse Laser',
    'PPC',
    'ER PPC',
    'AC/2',
    'AC/5',
    'AC/10',
    'AC/20',
    'Ultra AC/5',
    'Ultra AC/10',
    'Ultra AC/20',
    'LB 10-X AC',
    'LB 20-X AC',
    'Gauss Rifle',
    'LRM 5',
    'LRM 10',
    'LRM 15',
    'LRM 20',
    'SRM 2',
    'SRM 4',
    'SRM 6',
    'Streak SRM 2',
    'Streak SRM 4',
    'Streak SRM 6',
  ];

  commonWeapons.forEach((weaponType) => {
    const isVariant = techBaseVariants.ISVariants.find((w) =>
      w.name.toLowerCase().includes(weaponType.toLowerCase()),
    );
    const clanVariant = techBaseVariants.ClanVariants.find((w) =>
      w.name.toLowerCase().includes(weaponType.toLowerCase()),
    );
    const mixed = techBaseVariants.NeedsSeparation.find(
      (w) => w.base_weapon === weaponType,
    );

    const differences = [];

    // Add expected differences based on weapon type
    if (weaponType.includes('Laser')) {
      differences.push('Clan typically 20% lighter weight');
      differences.push('Clan often requires fewer critical slots');
      differences.push('Same damage and heat generation');
    } else if (weaponType.includes('PPC')) {
      differences.push('Clan ER PPC has extended range');
      differences.push('Similar weight and slot requirements');
    } else if (weaponType.includes('Ultra AC')) {
      differences.push('Clan versions typically more reliable');
      differences.push('Different ammunition compatibility');
    } else if (weaponType.includes('Gauss')) {
      differences.push('Clan versions slightly more efficient');
      differences.push('Similar performance profiles');
    }

    matrix.push({
      weaponType,
      isVariant: isVariant?.name,
      clanVariant: clanVariant?.name,
      mixedItem: mixed?.name,
      differences,
    });
  });

  return matrix;
}

function generateWeaponsSpecMatrix(weaponCategories, allWeapons) {
  const specMatrix = {
    energyWeapons: [],
    ballisticWeapons: [],
    missileWeapons: [],
  };

  // Process energy weapons
  Object.values(weaponCategories.EnergyWeapons)
    .flat()
    .forEach((weapon) => {
      specMatrix.energyWeapons.push({
        name: weapon.name,
        tech_base: weapon.tech_base,
        type: weapon.type,
        specs_needed: [
          'weight',
          'slots',
          'damage',
          'heat',
          'range',
          'cost',
          'bv',
        ],
      });
    });

  // Process ballistic weapons
  Object.values(weaponCategories.BallisticWeapons)
    .flat()
    .forEach((weapon) => {
      specMatrix.ballisticWeapons.push({
        name: weapon.name,
        tech_base: weapon.tech_base,
        type: weapon.type,
        specs_needed: [
          'weight',
          'slots',
          'damage',
          'range',
          'ammo_per_ton',
          'cost',
          'bv',
        ],
      });
    });

  // Process missile weapons
  Object.values(weaponCategories.MissileWeapons)
    .flat()
    .forEach((weapon) => {
      specMatrix.missileWeapons.push({
        name: weapon.name,
        tech_base: weapon.tech_base,
        type: weapon.type,
        specs_needed: [
          'weight',
          'slots',
          'damage',
          'range',
          'ammo_per_ton',
          'cost',
          'bv',
        ],
      });
    });

  return specMatrix;
}

detailedWeaponsAnalysis();
