const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function supportSystemsAnalysis() {
  const dbPath = path.join(__dirname, 'data/battletech_dev.sqlite');

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log('🔧 Support Systems Analysis - Phase 2, Step 5\n');

    // Get all equipment to search for support systems more broadly
    const allEquipment = await db.all(`
      SELECT internal_id, name, type, category, tech_base, data
      FROM equipment 
      ORDER BY name
    `);

    console.log(`🔧 Total equipment items to search: ${allEquipment.length}\n`);

    // Support systems analysis categories
    const supportSystems = {
      EngineSystems: {
        StandardEngines: [],
        XLEngines: [],
        LightEngines: [],
        CompactEngines: [],
        EngineShielding: [],
        FuelSystems: [],
      },
      HeatManagement: {
        StandardHeatSinks: [],
        DoubleHeatSinks: [],
        HeatSinkIntegration: [],
        CoolingSystems: [],
        HeatDissipation: [],
      },
      LifeSupportCockpit: {
        StandardCockpit: [],
        SmallCockpit: [],
        TorsoCockpit: [],
        CommandConsole: [],
        LifeSupport: [],
        EjectionSeat: [],
      },
      CommunicationSystems: {
        C3Computer: [],
        C3iComputer: [],
        NavalC3: [],
        AdvancedComm: [],
      },
      CoreSystems: {
        Actuators: [],
        Sensors: [],
        GyroSystems: [],
        PowerSystems: [],
      },
    };

    // Tech base variant analysis for support systems
    const supportTechBaseVariants = {
      ISVariants: [],
      ClanVariants: [],
      MixedClassification: [],
      MissingISVariant: [],
      MissingClanVariant: [],
      NeedsSeparation: [],
    };

    // Critical support systems for construction rules
    const criticalSupportSystems = {
      XLEngines: [],
      DoubleHeatSinks: [],
      EngineCriticals: [],
      CockpitSystems: [],
      GyroSystems: [],
      ActuatorSystems: [],
    };

    // Construction rule modifiers
    const constructionModifiers = {
      WeightModifiers: [],
      SlotModifiers: [],
      HeatModifiers: [],
      CostModifiers: [],
    };

    // Process each equipment item for support systems
    for (const equipment of allEquipment) {
      let parsedData;
      try {
        parsedData = JSON.parse(equipment.data);
      } catch (e) {
        console.error(`Failed to parse data for ${equipment.internal_id}`);
        continue;
      }

      // Categorize support system
      const category = categorizeSupportSystem(
        equipment.name,
        equipment.type,
        equipment.internal_id,
      );
      if (category.main && category.sub) {
        supportSystems[category.main][category.sub].push({
          internal_id: equipment.internal_id,
          name: equipment.name,
          type: equipment.type,
          tech_base: equipment.tech_base,
          data: parsedData,
        });
      }

      // Analyze tech base variants for support systems
      const techAnalysis = analyzeSupportSystemTechBase(equipment, parsedData);
      if (techAnalysis.classification !== 'NotSupportSystem') {
        supportTechBaseVariants[techAnalysis.classification].push({
          internal_id: equipment.internal_id,
          name: equipment.name,
          current_tech_base: equipment.tech_base,
          recommendation: techAnalysis.recommendation,
          base_system: techAnalysis.baseSystem,
          variant_needed: techAnalysis.variantNeeded,
        });
      }

      // Check if this is a critical support system for construction rules
      const criticalCheck = checkCriticalSupportSystem(equipment, parsedData);
      if (criticalCheck.isCritical) {
        criticalSupportSystems[criticalCheck.category].push({
          internal_id: equipment.internal_id,
          name: equipment.name,
          tech_base: equipment.tech_base,
          critical_reason: criticalCheck.reason,
          construction_impact: criticalCheck.impact,
          slots_required: criticalCheck.slots,
          weight_impact: criticalCheck.weight,
        });
      }

      // Check for construction rule modifiers
      const modifierCheck = checkConstructionModifiers(equipment, parsedData);
      modifierCheck.forEach((modifier) => {
        constructionModifiers[modifier.type].push({
          equipment: equipment.name,
          tech_base: equipment.tech_base,
          modifier: modifier,
        });
      });
    }

    // Generate detailed reports
    console.log('🔧 SUPPORT SYSTEMS CATEGORIZATION ANALYSIS');
    console.log('============================================');

    for (const [mainCategory, subCategories] of Object.entries(
      supportSystems,
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

    console.log('\n🎯 SUPPORT SYSTEMS TECH BASE ANALYSIS');
    console.log('======================================');

    for (const [classification, systems] of Object.entries(
      supportTechBaseVariants,
    )) {
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

    console.log('\n⚠️ CRITICAL SUPPORT SYSTEMS FOR CONSTRUCTION RULES');
    console.log('===================================================');

    for (const [category, systems] of Object.entries(criticalSupportSystems)) {
      if (systems.length > 0) {
        console.log(`\n${category}: ${systems.length} systems`);
        systems.forEach((system) => {
          console.log(`  - ${system.name} (${system.tech_base})`);
          console.log(`    Reason: ${system.critical_reason}`);
          console.log(`    Impact: ${system.construction_impact}`);
          if (system.slots_required)
            console.log(`    Slots: ${system.slots_required}`);
          if (system.weight_impact)
            console.log(`    Weight: ${system.weight_impact}`);
        });
      }
    }

    // Create IS vs Clan comparison for critical support systems
    const criticalSupportComparison = createCriticalSupportComparison(
      criticalSupportSystems,
      supportTechBaseVariants,
    );

    console.log('\n📊 IS vs CLAN CRITICAL SUPPORT SYSTEMS COMPARISON');
    console.log('=================================================');

    criticalSupportComparison.forEach((comparison) => {
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

    console.log('\n🔧 CONSTRUCTION RULE MODIFIERS ANALYSIS');
    console.log('========================================');

    for (const [modifierType, modifiers] of Object.entries(
      constructionModifiers,
    )) {
      if (modifiers.length > 0) {
        console.log(`\n${modifierType}: ${modifiers.length} modifiers`);
        modifiers.slice(0, 5).forEach((modifier) => {
          console.log(
            `  - ${modifier.equipment} (${modifier.tech_base}): ${modifier.modifier.description}`,
          );
        });
        if (modifiers.length > 5) {
          console.log(`  ... and ${modifiers.length - 5} more modifiers`);
        }
      }
    }

    // Save detailed analysis results
    const analysisResults = {
      summary: {
        total_support_systems: Object.values(supportSystems).reduce(
          (sum, cat) =>
            sum +
            Object.values(cat).reduce((subSum, arr) => subSum + arr.length, 0),
          0,
        ),
        engine_systems: Object.values(supportSystems.EngineSystems).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
        heat_management: Object.values(supportSystems.HeatManagement).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
        life_support_cockpit: Object.values(
          supportSystems.LifeSupportCockpit,
        ).reduce((sum, arr) => sum + arr.length, 0),
        communication_systems: Object.values(
          supportSystems.CommunicationSystems,
        ).reduce((sum, arr) => sum + arr.length, 0),
        critical_systems_count: Object.values(criticalSupportSystems).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
        tech_base_issues:
          supportTechBaseVariants.NeedsSeparation.length +
          supportTechBaseVariants.MissingISVariant.length +
          supportTechBaseVariants.MissingClanVariant.length,
      },
      support_systems: supportSystems,
      tech_base_variants: supportTechBaseVariants,
      critical_systems: criticalSupportSystems,
      construction_modifiers: constructionModifiers,
      critical_comparison: criticalSupportComparison,
      analysis_date: new Date().toISOString(),
    };

    fs.writeFileSync(
      'data/support_systems_analysis_results.json',
      JSON.stringify(analysisResults, null, 2),
    );
    console.log(
      '\n💾 Support systems analysis results saved to support_systems_analysis_results.json',
    );

    await db.close();
    console.log('\n✅ Support systems analysis complete!');
  } catch (error) {
    console.error('❌ Error during support systems analysis:', error);
  }
}

function categorizeSupportSystem(name, type, internal_id) {
  const nameLower = name.toLowerCase();
  const typeLower = (type || '').toLowerCase();
  const idLower = internal_id.toLowerCase();

  // Engine Systems
  if (
    nameLower.includes('xl engine') ||
    nameLower.includes('extra-light engine') ||
    nameLower.includes('extra light engine')
  ) {
    return { main: 'EngineSystems', sub: 'XLEngines' };
  }
  if (nameLower.includes('light engine')) {
    return { main: 'EngineSystems', sub: 'LightEngines' };
  }
  if (nameLower.includes('compact engine')) {
    return { main: 'EngineSystems', sub: 'CompactEngines' };
  }
  if (nameLower.includes('engine') && !nameLower.includes('targeting')) {
    return { main: 'EngineSystems', sub: 'StandardEngines' };
  }

  // Heat Management Systems
  if (nameLower.includes('double heat sink') || nameLower.includes('dhs')) {
    return { main: 'HeatManagement', sub: 'DoubleHeatSinks' };
  }
  if (nameLower.includes('heat sink') || nameLower.includes('heatsink')) {
    return { main: 'HeatManagement', sub: 'StandardHeatSinks' };
  }
  if (nameLower.includes('coolant')) {
    return { main: 'HeatManagement', sub: 'CoolingSystems' };
  }

  // Life Support & Cockpit Systems
  if (nameLower.includes('small cockpit')) {
    return { main: 'LifeSupportCockpit', sub: 'SmallCockpit' };
  }
  if (
    nameLower.includes('torso cockpit') ||
    nameLower.includes('torso-mounted cockpit')
  ) {
    return { main: 'LifeSupportCockpit', sub: 'TorsoCockpit' };
  }
  if (nameLower.includes('command console')) {
    return { main: 'LifeSupportCockpit', sub: 'CommandConsole' };
  }
  if (nameLower.includes('cockpit')) {
    return { main: 'LifeSupportCockpit', sub: 'StandardCockpit' };
  }
  if (nameLower.includes('life support')) {
    return { main: 'LifeSupportCockpit', sub: 'LifeSupport' };
  }
  if (
    nameLower.includes('ejection seat') ||
    nameLower.includes('ejector seat')
  ) {
    return { main: 'LifeSupportCockpit', sub: 'EjectionSeat' };
  }

  // Communication Systems
  if (nameLower.includes('c3i') || nameLower.includes('c3 improved')) {
    return { main: 'CommunicationSystems', sub: 'C3iComputer' };
  }
  if (nameLower.includes('c3') && !nameLower.includes('c3i')) {
    return { main: 'CommunicationSystems', sub: 'C3Computer' };
  }
  if (nameLower.includes('naval c3') || nameLower.includes('nc3')) {
    return { main: 'CommunicationSystems', sub: 'NavalC3' };
  }

  // Core Systems
  if (
    nameLower.includes('actuator') ||
    nameLower.includes('hip') ||
    nameLower.includes('leg') ||
    nameLower.includes('foot') ||
    nameLower.includes('shoulder') ||
    nameLower.includes('arm')
  ) {
    return { main: 'CoreSystems', sub: 'Actuators' };
  }
  if (
    nameLower.includes('sensors') &&
    !nameLower.includes('remote') &&
    !nameLower.includes('active')
  ) {
    return { main: 'CoreSystems', sub: 'Sensors' };
  }
  if (nameLower.includes('gyro')) {
    return { main: 'CoreSystems', sub: 'GyroSystems' };
  }

  return { main: null, sub: null };
}

function analyzeSupportSystemTechBase(equipment, parsedData) {
  const nameLower = equipment.name.toLowerCase();
  const techBase = equipment.tech_base;

  // Check if this is a support system
  if (
    !nameLower.includes('engine') &&
    !nameLower.includes('heat sink') &&
    !nameLower.includes('cockpit') &&
    !nameLower.includes('c3') &&
    !nameLower.includes('gyro') &&
    !nameLower.includes('actuator') &&
    !nameLower.includes('sensors') &&
    !nameLower.includes('life support')
  ) {
    return { classification: 'NotSupportSystem' };
  }

  // Determine base system type and variants needed
  let baseSystem = '';
  let variantNeeded = '';

  if (nameLower.includes('xl engine')) {
    baseSystem = 'XL Engine';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan XL Engine'
        : techBase === 'Clan'
          ? 'IS XL Engine'
          : 'Both variants';
  } else if (nameLower.includes('double heat sink')) {
    baseSystem = 'Double Heat Sink';
    variantNeeded =
      techBase === 'IS'
        ? 'Clan Double Heat Sink'
        : techBase === 'Clan'
          ? 'IS Double Heat Sink'
          : 'Both variants';
  } else if (nameLower.includes('light engine')) {
    baseSystem = 'Light Engine';
    variantNeeded = 'IS only technology';
  } else if (nameLower.includes('c3')) {
    baseSystem = 'C3 Computer';
    variantNeeded = 'IS only technology';
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

  if (
    techBase === 'IS' &&
    baseSystem &&
    baseSystem !== 'Light Engine' &&
    baseSystem !== 'C3 Computer'
  ) {
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

function checkCriticalSupportSystem(equipment, parsedData) {
  const nameLower = equipment.name.toLowerCase();

  // XL Engines - Critical for construction rules
  if (
    nameLower.includes('xl engine') ||
    nameLower.includes('extra-light engine') ||
    nameLower.includes('extra light engine')
  ) {
    return {
      isCritical: true,
      category: 'XLEngines',
      reason: 'Critical slot differences between IS and Clan XL engines',
      impact:
        'IS XL engines use 6 slots (3 each side torso), Clan use 4 slots (2 each side torso)',
      slots:
        equipment.tech_base === 'IS'
          ? '6 slots (3+3)'
          : equipment.tech_base === 'Clan'
            ? '4 slots (2+2)'
            : 'Varies',
      weight: '50% of standard fusion engine weight',
    };
  }

  // Double Heat Sinks - Critical for construction rules
  if (nameLower.includes('double heat sink') || nameLower.includes('dhs')) {
    return {
      isCritical: true,
      category: 'DoubleHeatSinks',
      reason: 'Critical slot differences between IS and Clan DHS',
      impact:
        'IS DHS use 3 slots outside engine, Clan DHS use 2 slots outside engine',
      slots:
        equipment.tech_base === 'IS'
          ? '3 slots outside engine'
          : equipment.tech_base === 'Clan'
            ? '2 slots outside engine'
            : 'Varies',
      weight: '1 ton each',
    };
  }

  // Engine Criticals - General engine components
  if (
    nameLower.includes('engine') &&
    !nameLower.includes('xl') &&
    !nameLower.includes('targeting')
  ) {
    return {
      isCritical: true,
      category: 'EngineCriticals',
      reason: 'Engine critical hits and integration',
      impact: 'Standard fusion engines have critical slots in center torso',
      slots: 'Center torso slots',
      weight: 'Varies by engine rating',
    };
  }

  // Cockpit Systems - Critical for pilot protection
  if (nameLower.includes('cockpit')) {
    return {
      isCritical: true,
      category: 'CockpitSystems',
      reason: 'Pilot protection and command systems',
      impact:
        'Standard cockpit uses 1 slot in head, variants use different slot counts',
      slots: nameLower.includes('small')
        ? '1 slot'
        : nameLower.includes('torso')
          ? '4 slots'
          : '1 slot',
      weight: nameLower.includes('small')
        ? '2 tons'
        : nameLower.includes('torso')
          ? '4 tons'
          : '3 tons',
    };
  }

  // Gyro Systems - Critical for movement
  if (nameLower.includes('gyro')) {
    return {
      isCritical: true,
      category: 'GyroSystems',
      reason: 'Essential for mech balance and movement',
      impact: 'Standard gyro uses 4 slots in center torso',
      slots: '4 slots in center torso',
      weight: 'Engine rating / 100 tons (rounded up)',
    };
  }

  // Actuator Systems - Critical for limb function
  if (
    nameLower.includes('actuator') ||
    nameLower.includes('hip') ||
    nameLower.includes('leg') ||
    nameLower.includes('foot')
  ) {
    return {
      isCritical: true,
      category: 'ActuatorSystems',
      reason: 'Essential for limb movement and weapon mounting',
      impact:
        'Actuators are required for limb function and determine weapon restrictions',
      slots: '1 slot each in appropriate limb',
      weight: '0 tons (included in structure)',
    };
  }

  return { isCritical: false };
}

function checkConstructionModifiers(equipment, parsedData) {
  const modifiers = [];
  const nameLower = equipment.name.toLowerCase();

  // XL Engine weight modifier
  if (nameLower.includes('xl engine')) {
    modifiers.push({
      type: 'WeightModifiers',
      description: '50% weight reduction from standard fusion engine',
      modifier_value: 0.5,
      applies_to: 'engine_weight',
    });
  }

  // Double Heat Sink efficiency modifier
  if (nameLower.includes('double heat sink')) {
    modifiers.push({
      type: 'HeatModifiers',
      description: 'Dissipates 2 heat points instead of 1',
      modifier_value: 2.0,
      applies_to: 'heat_dissipation',
    });
  }

  // Cockpit variant slot modifiers
  if (nameLower.includes('small cockpit')) {
    modifiers.push({
      type: 'SlotModifiers',
      description: 'Uses 1 slot instead of standard cockpit',
      modifier_value: 1,
      applies_to: 'head_slots',
    });
  }

  if (nameLower.includes('torso cockpit')) {
    modifiers.push({
      type: 'SlotModifiers',
      description: 'Uses 4 slots in center torso instead of 1 in head',
      modifier_value: 4,
      applies_to: 'center_torso_slots',
    });
  }

  return modifiers;
}

function createCriticalSupportComparison(criticalSystems, techBaseVariants) {
  const criticalSystemTypes = [
    'XL Engine',
    'Double Heat Sink',
    'Standard Engine',
    'Standard Heat Sink',
    'Standard Cockpit',
    'Small Cockpit',
    'Torso Cockpit',
    'Gyro',
    'C3 Computer',
    'C3i Computer',
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
      differences.push('Both: 50% weight of standard fusion engine');
    } else if (systemType === 'Double Heat Sink') {
      differences.push('IS Double Heat Sink: 3 critical slots outside engine');
      differences.push(
        'Clan Double Heat Sink: 2 critical slots outside engine',
      );
      differences.push('Both: Dissipate 2 heat points, 1 ton weight');
    } else if (systemType === 'Standard Cockpit') {
      differences.push('Same for both tech bases: 1 slot in head, 3 tons');
    } else if (systemType === 'C3 Computer') {
      differences.push('IS only technology');
      differences.push('Network-based command and control system');
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

supportSystemsAnalysis();
