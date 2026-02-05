const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function equipmentSystemsAnalysis() {
  const dbPath = path.join(__dirname, 'data/battletech_dev.sqlite');

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log('🔧 Equipment Systems Analysis - Phase 2, Step 4\n');

    // Get all non-weapon equipment from the database
    const allEquipment = await db.all(`
      SELECT internal_id, name, type, category, tech_base, data
      FROM equipment 
      WHERE NOT (
        type LIKE '%laser%' OR type LIKE '%ppc%' OR type LIKE '%flamer%' 
        OR type LIKE '%plasma%' OR type LIKE '%gauss%' OR type LIKE '%autocannon%' 
        OR type LIKE '%machinegun%' OR type LIKE '%lrm%' OR type LIKE '%srm%'
        OR type LIKE '%streak%' OR type LIKE '%atm%' OR type LIKE '%rocket%'
        OR type LIKE '%arrow%' OR type LIKE '%thunderbolt%'
        OR name LIKE '%laser%' OR name LIKE '%ppc%' OR name LIKE '%gauss%'
        OR name LIKE '%autocannon%' OR name LIKE '%ac/%' OR name LIKE '%ultra%'
        OR name LIKE '%lb %' OR name LIKE '%lrm%' OR name LIKE '%srm%'
        OR name LIKE '%streak%' OR name LIKE '%atm%' OR name LIKE '%mml%'
        OR name LIKE '%rocket%' OR name LIKE '%plasma%' OR name LIKE '%flamer%'
      )
      ORDER BY name
    `);

    console.log(
      `🔧 Total non-weapon equipment items found: ${allEquipment.length}\n`,
    );

    // Equipment systems analysis categories
    const equipmentSystems = {
      ElectronicWarfare: {
        ECMSuites: [],
        ActiveProbes: [],
        TAGSystems: [],
        NARCSystems: [],
        C3Systems: [],
        AdvancedSensors: [],
      },
      TargetingSystems: {
        TargetingComputers: [],
        ArtemisFCS: [],
        ApolloFCS: [],
        AdvancedFCS: [],
      },
      MobilitySystems: {
        JumpJets: [],
        MASCSystems: [],
        TSMSystems: [],
        Superchargers: [],
      },
      ProtectionSystems: {
        CASESystems: [],
        AMSSystems: [],
        StealthSystems: [],
        DefensiveSystems: [],
      },
      EngineSystems: {
        Engines: [],
        EngineShielding: [],
        FuelSystems: [],
      },
      HeatManagement: {
        HeatSinks: [],
        CoolingSystems: [],
        HeatDissipation: [],
      },
      LifeSupport: {
        CockpitSystems: [],
        LifeSupportSystems: [],
        SensorSystems: [],
        ActuatorSystems: [],
      },
      StructuralSystems: {
        ArmorTypes: [],
        StructureTypes: [],
        Reinforcement: [],
      },
    };

    // Tech base variant analysis
    const techBaseVariants = {
      ISVariants: [],
      ClanVariants: [],
      MixedClassification: [],
      MissingISVariant: [],
      MissingClanVariant: [],
      NeedsSeparation: [],
    };

    // Critical systems for construction rules
    const criticalSystems = {
      XLEngines: [],
      DoubleHeatSinks: [],
      EndoSteel: [],
      FerroFibrous: [],
      TargetingComputers: [],
      CASESystems: [],
    };

    // Process each equipment item
    for (const equipment of allEquipment) {
      let parsedData;
      try {
        parsedData = JSON.parse(equipment.data);
      } catch (e) {
        console.error(`Failed to parse data for ${equipment.internal_id}`);
        continue;
      }

      // Categorize equipment system
      const category = categorizeEquipmentSystem(
        equipment.name,
        equipment.type,
        equipment.internal_id,
      );
      if (category.main && category.sub) {
        equipmentSystems[category.main][category.sub].push({
          internal_id: equipment.internal_id,
          name: equipment.name,
          type: equipment.type,
          tech_base: equipment.tech_base,
          data: parsedData,
        });
      }

      // Analyze tech base variants
      const techAnalysis = analyzeSystemTechBase(equipment, parsedData);
      techBaseVariants[techAnalysis.classification].push({
        internal_id: equipment.internal_id,
        name: equipment.name,
        current_tech_base: equipment.tech_base,
        recommendation: techAnalysis.recommendation,
        base_system: techAnalysis.baseSystem,
        variant_needed: techAnalysis.variantNeeded,
      });

      // Check if this is a critical system for construction rules
      const criticalCheck = checkCriticalSystem(equipment, parsedData);
      if (criticalCheck.isCritical) {
        criticalSystems[criticalCheck.category].push({
          internal_id: equipment.internal_id,
          name: equipment.name,
          tech_base: equipment.tech_base,
          critical_reason: criticalCheck.reason,
          construction_impact: criticalCheck.impact,
        });
      }
    }

    // Generate detailed reports
    console.log('🔧 EQUIPMENT SYSTEMS CATEGORIZATION ANALYSIS');
    console.log('==============================================');

    for (const [mainCategory, subCategories] of Object.entries(
      equipmentSystems,
    )) {
      const totalInCategory = Object.values(subCategories).reduce(
        (sum, items) => sum + items.length,
        0,
      );
      if (totalInCategory > 0) {
        console.log(`\n${mainCategory}: ${totalInCategory} systems`);
        for (const [subCategory, systems] of Object.entries(subCategories)) {
          if (systems.length > 0) {
            console.log(`  ${subCategory}: ${systems.length} systems`);
            systems.slice(0, 5).forEach((system) => {
              console.log(`    - ${system.name} (${system.tech_base})`);
            });
            if (systems.length > 5) {
              console.log(`    ... and ${systems.length - 5} more systems`);
            }
          }
        }
      }
    }

    console.log('\n🎯 EQUIPMENT SYSTEMS TECH BASE ANALYSIS');
    console.log('========================================');

    for (const [classification, systems] of Object.entries(techBaseVariants)) {
      if (systems.length > 0) {
        console.log(`\n${classification}: ${systems.length} systems`);
        systems.slice(0, 8).forEach((system) => {
          if (system.base_system && system.variant_needed) {
            console.log(
              `  - ${system.name} (${system.current_tech_base}) -> ${system.recommendation}`,
            );
            console.log(
              `    Base: ${system.base_system}, Need: ${system.variant_needed}`,
            );
          } else {
            console.log(
              `  - ${system.name} (${system.current_tech_base}) -> ${system.recommendation}`,
            );
          }
        });
        if (systems.length > 8) {
          console.log(`  ... and ${systems.length - 8} more systems`);
        }
      }
    }

    console.log('\n⚠️ CRITICAL SYSTEMS FOR CONSTRUCTION RULES');
    console.log('===========================================');

    for (const [category, systems] of Object.entries(criticalSystems)) {
      if (systems.length > 0) {
        console.log(`\n${category}: ${systems.length} systems`);
        systems.forEach((system) => {
          console.log(`  - ${system.name} (${system.tech_base})`);
          console.log(`    Reason: ${system.critical_reason}`);
          console.log(`    Impact: ${system.construction_impact}`);
        });
      }
    }

    // Create IS vs Clan comparison for critical systems
    const criticalComparison = createCriticalSystemsComparison(
      criticalSystems,
      techBaseVariants,
    );

    console.log('\n📊 IS vs CLAN CRITICAL SYSTEMS COMPARISON');
    console.log('=========================================');

    criticalComparison.forEach((comparison) => {
      console.log(`\n${comparison.systemType}:`);
      console.log(`  IS Version: ${comparison.isVersion || 'Missing'}`);
      console.log(`  Clan Version: ${comparison.clanVersion || 'Missing'}`);
      if (comparison.differences.length > 0) {
        console.log(`  Critical Differences:`);
        comparison.differences.forEach((diff) => {
          console.log(`    - ${diff}`);
        });
      }
    });

    // Save detailed analysis results
    const analysisResults = {
      summary: {
        total_equipment_systems: allEquipment.length,
        electronic_warfare: Object.values(
          equipmentSystems.ElectronicWarfare,
        ).reduce((sum, arr) => sum + arr.length, 0),
        targeting_systems: Object.values(
          equipmentSystems.TargetingSystems,
        ).reduce((sum, arr) => sum + arr.length, 0),
        mobility_systems: Object.values(
          equipmentSystems.MobilitySystems,
        ).reduce((sum, arr) => sum + arr.length, 0),
        protection_systems: Object.values(
          equipmentSystems.ProtectionSystems,
        ).reduce((sum, arr) => sum + arr.length, 0),
        critical_systems_count: Object.values(criticalSystems).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
        tech_base_issues:
          techBaseVariants.NeedsSeparation.length +
          techBaseVariants.MissingISVariant.length +
          techBaseVariants.MissingClanVariant.length,
      },
      equipment_systems: equipmentSystems,
      tech_base_variants: techBaseVariants,
      critical_systems: criticalSystems,
      critical_comparison: criticalComparison,
      analysis_date: new Date().toISOString(),
    };

    fs.writeFileSync(
      'data/equipment_systems_analysis_results.json',
      JSON.stringify(analysisResults, null, 2),
    );
    console.log(
      '\n💾 Equipment systems analysis results saved to equipment_systems_analysis_results.json',
    );

    await db.close();
    console.log('\n✅ Equipment systems analysis complete!');
  } catch (error) {
    console.error('❌ Error during equipment systems analysis:', error);
  }
}

function categorizeEquipmentSystem(name, type, internal_id) {
  const nameLower = name.toLowerCase();
  const typeLower = (type || '').toLowerCase();
  const idLower = internal_id.toLowerCase();

  // Electronic Warfare Systems
  if (
    nameLower.includes('ecm') ||
    nameLower.includes('guardian') ||
    nameLower.includes('angel')
  ) {
    return { main: 'ElectronicWarfare', sub: 'ECMSuites' };
  }
  if (
    nameLower.includes('active probe') ||
    nameLower.includes('beagle') ||
    nameLower.includes('bloodhound')
  ) {
    return { main: 'ElectronicWarfare', sub: 'ActiveProbes' };
  }
  if (nameLower.includes('tag') && !nameLower.includes('targeting')) {
    return { main: 'ElectronicWarfare', sub: 'TAGSystems' };
  }
  if (nameLower.includes('narc') || nameLower.includes('inarc')) {
    return { main: 'ElectronicWarfare', sub: 'NARCSystems' };
  }
  if (nameLower.includes('c3') || nameLower.includes('nova')) {
    return { main: 'ElectronicWarfare', sub: 'C3Systems' };
  }

  // Targeting Systems
  if (nameLower.includes('targeting computer')) {
    return { main: 'TargetingSystems', sub: 'TargetingComputers' };
  }
  if (nameLower.includes('artemis')) {
    return { main: 'TargetingSystems', sub: 'ArtemisFCS' };
  }
  if (nameLower.includes('apollo')) {
    return { main: 'TargetingSystems', sub: 'ApolloFCS' };
  }

  // Mobility Systems
  if (nameLower.includes('jump') && !nameLower.includes('booster')) {
    return { main: 'MobilitySystems', sub: 'JumpJets' };
  }
  if (nameLower.includes('masc')) {
    return { main: 'MobilitySystems', sub: 'MASCSystems' };
  }
  if (nameLower.includes('myomer') || nameLower.includes('tsm')) {
    return { main: 'MobilitySystems', sub: 'TSMSystems' };
  }
  if (nameLower.includes('supercharger')) {
    return { main: 'MobilitySystems', sub: 'Superchargers' };
  }

  // Protection Systems
  if (nameLower.includes('case') && !nameLower.includes('suitcase')) {
    return { main: 'ProtectionSystems', sub: 'CASESystems' };
  }
  if (
    nameLower.includes('ams') ||
    nameLower.includes('anti-missile') ||
    nameLower.includes('antimissile')
  ) {
    return { main: 'ProtectionSystems', sub: 'AMSSystems' };
  }
  if (
    nameLower.includes('stealth') ||
    nameLower.includes('null signature') ||
    nameLower.includes('void signature')
  ) {
    return { main: 'ProtectionSystems', sub: 'StealthSystems' };
  }
  if (nameLower.includes('blue shield') || nameLower.includes('chameleon')) {
    return { main: 'ProtectionSystems', sub: 'DefensiveSystems' };
  }

  // Engine Systems
  if (nameLower.includes('engine') && !nameLower.includes('targeting')) {
    return { main: 'EngineSystems', sub: 'Engines' };
  }

  // Heat Management
  if (nameLower.includes('heat sink') || nameLower.includes('heatsink')) {
    return { main: 'HeatManagement', sub: 'HeatSinks' };
  }
  if (nameLower.includes('coolant')) {
    return { main: 'HeatManagement', sub: 'CoolingSystems' };
  }

  // Life Support Systems
  if (nameLower.includes('cockpit')) {
    return { main: 'LifeSupport', sub: 'CockpitSystems' };
  }
  if (nameLower.includes('life support')) {
    return { main: 'LifeSupport', sub: 'LifeSupportSystems' };
  }
  if (nameLower.includes('sensors') && !nameLower.includes('remote')) {
    return { main: 'LifeSupport', sub: 'SensorSystems' };
  }
  if (
    nameLower.includes('actuator') ||
    nameLower.includes('hip') ||
    nameLower.includes('leg') ||
    nameLower.includes('foot')
  ) {
    return { main: 'LifeSupport', sub: 'ActuatorSystems' };
  }

  // Structural Systems
  if (
    nameLower.includes('armor') ||
    nameLower.includes('ferro') ||
    nameLower.includes('reactive') ||
    nameLower.includes('reflective') ||
    nameLower.includes('lamellor')
  ) {
    return { main: 'StructuralSystems', sub: 'ArmorTypes' };
  }
  if (
    nameLower.includes('endo steel') ||
    nameLower.includes('endo composite') ||
    nameLower.includes('structure')
  ) {
    return { main: 'StructuralSystems', sub: 'StructureTypes' };
  }

  return { main: null, sub: null };
}

function analyzeSystemTechBase(equipment, parsedData) {
  const nameLower = equipment.name.toLowerCase();
  const techBase = equipment.tech_base;

  // Determine base system type and variants needed
  let baseSystem = '';
  let variantNeeded = '';

  if (nameLower.includes('double heat sink')) {
    baseSystem = 'Double Heat Sink';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Double Heat Sink'
        : techBase === 'Clan'
          ? 'IS Double Heat Sink'
          : 'Both variants';
  } else if (nameLower.includes('xl engine')) {
    baseSystem = 'XL Engine';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan XL Engine'
        : techBase === 'Clan'
          ? 'IS XL Engine'
          : 'Both variants';
  } else if (nameLower.includes('targeting computer')) {
    baseSystem = 'Targeting Computer';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Targeting Computer'
        : techBase === 'Clan'
          ? 'IS Targeting Computer'
          : 'Both variants';
  } else if (nameLower.includes('ecm')) {
    baseSystem = 'ECM Suite';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan ECM Suite'
        : techBase === 'Clan'
          ? 'IS ECM Suite'
          : 'Both variants';
  } else if (nameLower.includes('case')) {
    baseSystem = 'CASE System';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan CASE II'
        : techBase === 'Clan'
          ? 'IS CASE'
          : 'Both variants';
  } else if (nameLower.includes('endo steel')) {
    baseSystem = 'Endo Steel';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Endo Steel'
        : techBase === 'Clan'
          ? 'IS Endo Steel'
          : 'Both variants';
  } else if (
    nameLower.includes('ferro fibrous') ||
    nameLower.includes('ferro-fibrous')
  ) {
    baseSystem = 'Ferro-Fibrous';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Ferro-Fibrous'
        : techBase === 'Clan'
          ? 'IS Ferro-Fibrous'
          : 'Both variants';
  }

  // Classification logic
  if (techBase === 'Mixed') {
    if (baseSystem) {
      return {
        classification: 'NeedsSeparation',
        recommendation: 'Separate into IS and Clan variants',
        baseSystem,
        variantNeeded,
      };
    }
    return {
      classification: 'MixedClassification',
      recommendation: 'Review mixed tech classification',
      baseSystem: 'Unknown',
      variantNeeded: 'Needs analysis',
    };
  }

  if (techBase === 'IS' && baseSystem) {
    return {
      classification: 'MissingClanVariant',
      recommendation: 'Create Clan variant',
      baseSystem,
      variantNeeded,
    };
  }

  if (techBase === 'Clan' && baseSystem) {
    return {
      classification: 'MissingISVariant',
      recommendation: 'Create IS variant',
      baseSystem,
      variantNeeded,
    };
  }

  if (techBase === 'IS') {
    return {
      classification: 'ISVariants',
      recommendation: 'Properly classified IS system',
      baseSystem: baseSystem || equipment.name,
      variantNeeded: 'None',
    };
  }

  if (techBase === 'Clan') {
    return {
      classification: 'ClanVariants',
      recommendation: 'Properly classified Clan system',
      baseSystem: baseSystem || equipment.name,
      variantNeeded: 'None',
    };
  }

  return {
    classification: 'ISVariants',
    recommendation: 'Default IS classification',
    baseSystem: equipment.name,
    variantNeeded: 'None',
  };
}

function checkCriticalSystem(equipment, parsedData) {
  const nameLower = equipment.name.toLowerCase();

  // XL Engines - Critical for construction rules
  if (
    nameLower.includes('xl engine') ||
    nameLower.includes('extra-light engine')
  ) {
    return {
      isCritical: true,
      category: 'XLEngines',
      reason: 'Critical slot differences between IS and Clan',
      impact:
        'IS XL engines use 6 slots (3 each side torso), Clan use 4 slots (2 each side torso)',
    };
  }

  // Double Heat Sinks - Critical for construction rules
  if (nameLower.includes('double heat sink') || nameLower.includes('dhs')) {
    return {
      isCritical: true,
      category: 'DoubleHeatSinks',
      reason: 'Critical slot differences between IS and Clan',
      impact:
        'IS DHS use 3 slots, Clan DHS use 2 slots. Engine integration differs.',
    };
  }

  // Endo Steel - Critical for construction rules
  if (nameLower.includes('endo steel') || nameLower.includes('endo-steel')) {
    return {
      isCritical: true,
      category: 'EndoSteel',
      reason: 'Weight savings and slot requirements',
      impact:
        'Reduces internal structure weight by 50%, uses 14 critical slots distributed',
    };
  }

  // Ferro-Fibrous - Critical for construction rules
  if (
    nameLower.includes('ferro fibrous') ||
    nameLower.includes('ferro-fibrous')
  ) {
    return {
      isCritical: true,
      category: 'FerroFibrous',
      reason: 'Armor weight savings and slot requirements',
      impact:
        'Reduces armor weight by ~20%, uses 14 critical slots distributed',
    };
  }

  // Targeting Computer - Critical for construction rules
  if (nameLower.includes('targeting computer')) {
    return {
      isCritical: true,
      category: 'TargetingComputers',
      reason: 'Weapon integration and slot requirements',
      impact:
        'Affects weapon accuracy, requires slots based on weapons tonnage',
    };
  }

  // CASE Systems - Critical for construction rules
  if (nameLower.includes('case') && !nameLower.includes('suitcase')) {
    return {
      isCritical: true,
      category: 'CASESystems',
      reason: 'Ammunition explosion containment',
      impact:
        'IS CASE vs Clan CASE II have different slot requirements and capabilities',
    };
  }

  return { isCritical: false };
}

function createCriticalSystemsComparison(criticalSystems, techBaseVariants) {
  const criticalSystemTypes = [
    'XL Engine',
    'Double Heat Sink',
    'Endo Steel',
    'Ferro-Fibrous',
    'Targeting Computer',
    'CASE System',
    'ECM Suite',
    'Active Probe',
    'Jump Jet',
    'MASC',
  ];

  const comparison = [];

  criticalSystemTypes.forEach((systemType) => {
    const isVariant = techBaseVariants.ISVariants.find((s) =>
      s.name.toLowerCase().includes(systemType.toLowerCase()),
    );
    const clanVariant = techBaseVariants.ClanVariants.find((s) =>
      s.name.toLowerCase().includes(systemType.toLowerCase()),
    );
    const mixed = techBaseVariants.NeedsSeparation.find(
      (s) => s.base_system === systemType,
    );

    const differences = [];

    // Add expected differences based on system type
    if (systemType === 'XL Engine') {
      differences.push('IS XL Engine: 6 critical slots (3 each side torso)');
      differences.push('Clan XL Engine: 4 critical slots (2 each side torso)');
      differences.push('Same weight savings (50% of standard engine)');
    } else if (systemType === 'Double Heat Sink') {
      differences.push('IS Double Heat Sink: 3 critical slots outside engine');
      differences.push(
        'Clan Double Heat Sink: 2 critical slots outside engine',
      );
      differences.push('Same heat dissipation (2 heat points)');
    } else if (systemType === 'Targeting Computer') {
      differences.push('IS Targeting Computer: Weight varies by weapons');
      differences.push('Clan Targeting Computer: Weight varies by weapons');
      differences.push('Different integration with weapons systems');
    } else if (systemType === 'CASE System') {
      differences.push('IS CASE: Basic ammunition explosion containment');
      differences.push(
        'Clan CASE II: Advanced containment with damage reduction',
      );
    }

    comparison.push({
      systemType,
      isVersion: isVariant?.name,
      clanVersion: clanVariant?.name,
      mixedItem: mixed?.name,
      differences,
    });
  });

  return comparison;
}

equipmentSystemsAnalysis();
