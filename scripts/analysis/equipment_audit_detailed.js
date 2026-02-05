const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function detailedEquipmentAudit() {
  const dbPath = path.join(__dirname, 'data/battletech_dev.sqlite');

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log('🔧 Detailed Equipment Database Audit\n');

    // Get all equipment for analysis
    const allEquipment = await db.all(`
      SELECT internal_id, name, type, category, tech_base, data
      FROM equipment 
      ORDER BY name
    `);

    console.log(`📊 Total equipment items: ${allEquipment.length}\n`);

    // Equipment categorization analysis
    const equipmentCategories = {
      EnergyWeapon: [],
      BallisticWeapon: [],
      MissileWeapon: [],
      Equipment: [],
      Ammunition: [],
      Engine: [],
      HeatSink: [],
      ArmorType: [],
      StructureType: [],
      CockpitType: [],
      GyroType: [],
      ActuatorType: [],
      JumpJet: [],
      ElectronicWarfare: [],
      TargetingSystem: [],
      SpecialEquipment: [],
      IndustrialEquipment: [],
      Uncategorized: [],
    };

    // Tech base variant analysis
    const techBaseAnalysis = {
      NeedsSeparation: [], // Items marked as "Mixed" that should be separate IS/Clan
      ProperlyClassified: [], // Items correctly classified
      MissingClanVariant: [], // IS items that should have Clan variants
      MissingISVariant: [], // Clan items that should have IS variants
      TrulyMixed: [], // Items that are actually mixed tech
    };

    // Performance data analysis
    const performanceIssues = {
      MissingSlots: [],
      MissingTonnage: [],
      MissingCost: [],
      MissingBV: [],
      IncorrectData: [],
    };

    // Process each equipment item
    for (const item of allEquipment) {
      let parsedData;
      try {
        parsedData = JSON.parse(item.data);
      } catch (e) {
        console.error(`Failed to parse data for ${item.internal_id}`);
        continue;
      }

      // Categorize equipment by function
      const category = categorizeEquipment(
        item.name,
        item.type,
        item.internal_id,
      );
      equipmentCategories[category].push({
        internal_id: item.internal_id,
        name: item.name,
        type: item.type,
        tech_base: item.tech_base,
        data: parsedData,
      });

      // Analyze tech base classification
      const techAnalysis = analyzeTechBase(item, parsedData);
      techBaseAnalysis[techAnalysis.classification].push({
        internal_id: item.internal_id,
        name: item.name,
        current_tech_base: item.tech_base,
        recommendation: techAnalysis.recommendation,
        reason: techAnalysis.reason,
      });

      // Check performance data
      const perfIssues = checkPerformanceData(item, parsedData);
      perfIssues.forEach((issue) => {
        performanceIssues[issue.type].push({
          internal_id: item.internal_id,
          name: item.name,
          issue: issue.description,
          expected: issue.expected,
          actual: issue.actual,
        });
      });
    }

    // Generate reports
    console.log('🗂️ EQUIPMENT CATEGORIZATION ANALYSIS');
    console.log('=====================================');
    for (const [category, items] of Object.entries(equipmentCategories)) {
      if (items.length > 0) {
        console.log(`${category}: ${items.length} items`);
        if (items.length <= 10) {
          items.forEach((item) =>
            console.log(`  - ${item.name} (${item.tech_base})`),
          );
        } else {
          console.log(
            `  - ${items
              .slice(0, 5)
              .map((i) => i.name)
              .join(', ')}... (+${items.length - 5} more)`,
          );
        }
        console.log('');
      }
    }

    console.log('🎯 TECH BASE ANALYSIS');
    console.log('======================');
    for (const [classification, items] of Object.entries(techBaseAnalysis)) {
      if (items.length > 0) {
        console.log(`${classification}: ${items.length} items`);
        items.slice(0, 10).forEach((item) => {
          console.log(
            `  - ${item.name} (${item.current_tech_base}) -> ${item.recommendation}: ${item.reason}`,
          );
        });
        if (items.length > 10) {
          console.log(`  ... and ${items.length - 10} more items`);
        }
        console.log('');
      }
    }

    console.log('⚠️ PERFORMANCE DATA ISSUES');
    console.log('============================');
    for (const [issueType, items] of Object.entries(performanceIssues)) {
      if (items.length > 0) {
        console.log(`${issueType}: ${items.length} items`);
        items.slice(0, 5).forEach((item) => {
          console.log(
            `  - ${item.name}: ${item.issue} (Expected: ${item.expected}, Actual: ${item.actual})`,
          );
        });
        if (items.length > 5) {
          console.log(`  ... and ${items.length - 5} more items`);
        }
        console.log('');
      }
    }

    // Save detailed audit results
    const auditResults = {
      summary: {
        total_equipment: allEquipment.length,
        categorization_issues: equipmentCategories.Uncategorized.length,
        tech_base_issues: techBaseAnalysis.NeedsSeparation.length,
        performance_issues: Object.values(performanceIssues).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
      },
      categorization: equipmentCategories,
      tech_base_analysis: techBaseAnalysis,
      performance_issues: performanceIssues,
      audit_date: new Date().toISOString(),
    };

    fs.writeFileSync(
      'data/equipment_audit_results.json',
      JSON.stringify(auditResults, null, 2),
    );
    console.log(
      '💾 Detailed audit results saved to equipment_audit_results.json',
    );

    await db.close();
    console.log('\n✅ Detailed equipment audit complete!');
  } catch (error) {
    console.error('❌ Error during detailed audit:', error);
  }
}

function categorizeEquipment(name, type, internal_id) {
  const nameLower = name.toLowerCase();
  const typeLower = (type || '').toLowerCase();
  const idLower = internal_id.toLowerCase();

  // Energy Weapons
  if (
    nameLower.includes('laser') ||
    nameLower.includes('ppc') ||
    nameLower.includes('flamer') ||
    nameLower.includes('plasma') ||
    typeLower.includes('laser') ||
    typeLower.includes('ppc') ||
    typeLower.includes('flamer')
  ) {
    return 'EnergyWeapon';
  }

  // Ballistic Weapons
  if (
    nameLower.includes('autocannon') ||
    nameLower.includes('gauss') ||
    nameLower.includes('machine gun') ||
    nameLower.includes('ultra ac') ||
    nameLower.includes('lb ') ||
    nameLower.includes('ac/') ||
    typeLower.includes('autocannon') ||
    typeLower.includes('gauss') ||
    typeLower.includes('machinegun')
  ) {
    return 'BallisticWeapon';
  }

  // Missile Weapons
  if (
    nameLower.includes('lrm') ||
    nameLower.includes('srm') ||
    nameLower.includes('streak') ||
    nameLower.includes('atm') ||
    nameLower.includes('mml') ||
    nameLower.includes('rocket') ||
    nameLower.includes('arrow') ||
    nameLower.includes('thunderbolt') ||
    typeLower.includes('lrm') ||
    typeLower.includes('srm') ||
    typeLower.includes('streak')
  ) {
    return 'MissileWeapon';
  }

  // Ammunition
  if (
    nameLower.includes('ammo') ||
    nameLower.includes('ammunition') ||
    typeLower.includes('ammo')
  ) {
    return 'Ammunition';
  }

  // Engines
  if (
    nameLower.includes('engine') ||
    typeLower.includes('engine') ||
    idLower.includes('engine')
  ) {
    return 'Engine';
  }

  // Heat Sinks
  if (
    nameLower.includes('heat sink') ||
    typeLower.includes('heatsink') ||
    idLower.includes('heatsink')
  ) {
    return 'HeatSink';
  }

  // Armor Types
  if (
    nameLower.includes('armor') ||
    nameLower.includes('ferro') ||
    nameLower.includes('reactive') ||
    nameLower.includes('reflective') ||
    nameLower.includes('stealth')
  ) {
    return 'ArmorType';
  }

  // Structure Types
  if (
    nameLower.includes('endo steel') ||
    nameLower.includes('endo composite') ||
    nameLower.includes('structure')
  ) {
    return 'StructureType';
  }

  // Cockpit Types
  if (nameLower.includes('cockpit') || idLower.includes('cockpit')) {
    return 'CockpitType';
  }

  // Gyro Types
  if (nameLower.includes('gyro') || idLower.includes('gyro')) {
    return 'GyroType';
  }

  // Actuators
  if (
    nameLower.includes('actuator') ||
    nameLower.includes('hip') ||
    nameLower.includes('leg') ||
    nameLower.includes('foot') ||
    idLower.includes('actuator')
  ) {
    return 'ActuatorType';
  }

  // Jump Jets
  if (nameLower.includes('jump') || idLower.includes('jump')) {
    return 'JumpJet';
  }

  // Electronic Warfare
  if (
    nameLower.includes('ecm') ||
    nameLower.includes('active probe') ||
    nameLower.includes('tag') ||
    nameLower.includes('narc') ||
    nameLower.includes('c3') ||
    nameLower.includes('guardian')
  ) {
    return 'ElectronicWarfare';
  }

  // Targeting Systems
  if (
    nameLower.includes('targeting computer') ||
    nameLower.includes('artemis') ||
    nameLower.includes('apollo')
  ) {
    return 'TargetingSystem';
  }

  // Special Equipment
  if (
    nameLower.includes('case') ||
    nameLower.includes('masc') ||
    nameLower.includes('supercharger') ||
    nameLower.includes('tsm') ||
    nameLower.includes('myomer') ||
    nameLower.includes('ams')
  ) {
    return 'SpecialEquipment';
  }

  // Industrial Equipment
  if (
    nameLower.includes('cargo') ||
    nameLower.includes('lift') ||
    nameLower.includes('saw') ||
    nameLower.includes('drill') ||
    nameLower.includes('industrial')
  ) {
    return 'IndustrialEquipment';
  }

  // Life Support & Sensors
  if (
    nameLower.includes('life support') ||
    nameLower.includes('sensors') ||
    idLower.includes('lifesupport') ||
    idLower.includes('sensors')
  ) {
    return 'Equipment';
  }

  return 'Uncategorized';
}

function analyzeTechBase(item, parsedData) {
  const nameLower = item.name.toLowerCase();
  const techBase = item.tech_base;

  // Items that should definitely be separate IS/Clan variants
  if (techBase === 'Mixed') {
    // Check if this is actually mixed tech or should be separated
    if (
      nameLower.includes('large laser') ||
      nameLower.includes('medium laser') ||
      nameLower.includes('small laser') ||
      nameLower.includes('er large') ||
      nameLower.includes('er medium') ||
      nameLower.includes('er small') ||
      nameLower.includes('pulse laser') ||
      nameLower.includes('ultra ac') ||
      nameLower.includes('lb ') ||
      nameLower.includes('gauss rifle') ||
      nameLower.includes('double heat sink') ||
      nameLower.includes('xl engine')
    ) {
      return {
        classification: 'NeedsSeparation',
        recommendation: 'Separate into IS and Clan variants',
        reason: 'Different performance characteristics between tech bases',
      };
    }

    // Check if truly mixed (like C3 systems)
    if (
      nameLower.includes('c3') ||
      nameLower.includes('artemis') ||
      nameLower.includes('narc')
    ) {
      return {
        classification: 'TrulyMixed',
        recommendation: 'Keep as Mixed',
        reason: 'Actually used by both tech bases with same specs',
      };
    }

    return {
      classification: 'NeedsSeparation',
      recommendation: 'Review for tech base assignment',
      reason: 'Mixed classification needs verification',
    };
  }

  // Check IS items that might need Clan variants
  if (techBase === 'IS') {
    if (
      nameLower.includes('large laser') ||
      nameLower.includes('medium laser') ||
      nameLower.includes('small laser') ||
      nameLower.includes('er ') ||
      nameLower.includes('pulse') ||
      nameLower.includes('ultra') ||
      nameLower.includes('lb ') ||
      nameLower.includes('gauss') ||
      nameLower.includes('double heat sink')
    ) {
      return {
        classification: 'MissingClanVariant',
        recommendation: 'Create Clan variant',
        reason: 'Equipment exists in both tech bases with different specs',
      };
    }
  }

  // Check Clan items that might need IS variants
  if (techBase === 'Clan') {
    if (
      nameLower.includes('large laser') ||
      nameLower.includes('medium laser') ||
      nameLower.includes('small laser') ||
      nameLower.includes('er ') ||
      nameLower.includes('pulse') ||
      nameLower.includes('ultra') ||
      nameLower.includes('lb ') ||
      nameLower.includes('gauss') ||
      nameLower.includes('double heat sink')
    ) {
      return {
        classification: 'MissingISVariant',
        recommendation: 'Create IS variant',
        reason: 'Equipment exists in both tech bases with different specs',
      };
    }
  }

  return {
    classification: 'ProperlyClassified',
    recommendation: 'No change needed',
    reason: 'Tech base classification appears correct',
  };
}

function checkPerformanceData(item, parsedData) {
  const issues = [];
  const nameLower = item.name.toLowerCase();

  // Check critical slots
  if (
    parsedData.critical_slots === 0 ||
    parsedData.critical_slots === null ||
    parsedData.critical_slots === undefined
  ) {
    if (
      !nameLower.includes('ammo') &&
      !nameLower.includes('armor') &&
      !nameLower.includes('structure')
    ) {
      issues.push({
        type: 'MissingSlots',
        description: 'Critical slots missing or zero',
        expected: 'Non-zero slots for equipment',
        actual: parsedData.critical_slots,
      });
    }
  }

  // Check tonnage
  if (
    parsedData.tonnage === 0 ||
    parsedData.tonnage === null ||
    parsedData.tonnage === undefined
  ) {
    if (
      !nameLower.includes('actuator') &&
      !nameLower.includes('life support') &&
      !nameLower.includes('sensors') &&
      !nameLower.includes('cockpit') &&
      !nameLower.includes('gyro')
    ) {
      issues.push({
        type: 'MissingTonnage',
        description: 'Tonnage missing or zero',
        expected: 'Non-zero tonnage for most equipment',
        actual: parsedData.tonnage,
      });
    }
  }

  // Check cost
  if (parsedData.cost_cbills === null || parsedData.cost_cbills === undefined) {
    issues.push({
      type: 'MissingCost',
      description: 'Cost data missing',
      expected: 'Cost in C-Bills',
      actual: 'null',
    });
  }

  // Check Battle Value
  if (
    parsedData.battle_value === null ||
    parsedData.battle_value === undefined
  ) {
    issues.push({
      type: 'MissingBV',
      description: 'Battle Value missing',
      expected: 'Battle Value for combat equipment',
      actual: 'null',
    });
  }

  return issues;
}

detailedEquipmentAudit();
