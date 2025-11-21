import React, { useMemo } from 'react';
import { EditableUnit } from '../../../types/editor';

interface SummaryPanelProps {
  unit: EditableUnit;
  structureWeight: number;
  engineWeight: number;
  gyroWeight: number;
  cockpitWeight: number;
  heatSinkWeight: number;
  armorWeight: number;
  jumpJetWeight: number;
  equipmentWeight: number;
  myomerWeight: number;
}

interface ComponentSummary {
  name: string;
  weight: number;
  crits: number;
  availability: string;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  unit,
  structureWeight,
  engineWeight,
  gyroWeight,
  cockpitWeight,
  heatSinkWeight,
  armorWeight,
  jumpJetWeight,
  equipmentWeight,
  myomerWeight,
}) => {
  // Calculate total weight
  const totalWeight = useMemo(() => {
    return structureWeight + engineWeight + gyroWeight + cockpitWeight + 
           heatSinkWeight + armorWeight + jumpJetWeight + equipmentWeight + myomerWeight;
  }, [structureWeight, engineWeight, gyroWeight, cockpitWeight, heatSinkWeight, 
      armorWeight, jumpJetWeight, equipmentWeight, myomerWeight]);

  // Calculate remaining tonnage
  const remainingTonnage = useMemo(() => {
    return unit.mass - totalWeight;
  }, [unit.mass, totalWeight]);

  // Get unit type string
  const unitType = useMemo(() => {
    const config = unit.data?.config || 'Biped';
    const isOmni = unit.data?.is_omnimech ? 'Omni' : '';
    return `${config} ${isOmni}${isOmni ? 'mech' : ''}`.trim();
  }, [unit.data?.config, unit.data?.is_omnimech]);

  // Calculate critical slots used
  const getCriticalSlots = (componentType: string): number => {
    switch (componentType) {
      case 'structure':
        const structureType = unit.data?.structure?.type || 'standard';
        if (structureType === 'endo_steel') return 14;
        if (structureType === 'endo_steel_clan') return 7;
        return 0;
      case 'engine':
        const engineType = unit.data?.engine?.type || 'fusion';
        if (engineType === 'xl' || engineType === 'light') return 12;
        if (engineType === 'xl_clan') return 10;
        if (engineType === 'compact') return 3;
        return 6;
      case 'gyro':
        const gyroType = unit.data?.gyro?.type || 'standard';
        if (gyroType === 'xl') return 6;
        if (gyroType === 'compact') return 2;
        if (gyroType === 'none') return 0;
        return 4;
      case 'cockpit':
        const cockpitType = unit.data?.cockpit?.type || 'standard';
        if (cockpitType === 'command_console') return 2;
        return 1;
      case 'heatsinks':
        // TODO: Calculate based on heat sink type and count
        return 10; // Placeholder
      case 'armor':
        const armorType = unit.armorAllocation?.['Center Torso']?.type?.id || 'standard';
        if (armorType === 'ferro_fibrous') return 14;
        if (armorType === 'ferro_fibrous_clan') return 7;
        if (armorType === 'stealth') return 12;
        return 0;
      case 'jumpjets':
        return unit.data?.movement?.jump_mp || 0;
      default:
        return 0;
    }
  };

  // Get availability rating
  const getAvailability = (componentType: string): string => {
    // Simplified availability ratings - in real implementation would use lookup tables
    const techBase = unit.tech_base === 'Clan' ? 'C' : 'D';
    switch (componentType) {
      case 'structure':
        const structureType = unit.data?.structure?.type || 'standard';
        if (structureType === 'endo_steel') return `${techBase}/X-E-D-C`;
        if (structureType === 'composite') return `${techBase}/X-F-E-D`;
        return `${techBase}/C-E-D-C`;
      case 'engine':
        const engineType = unit.data?.engine?.type || 'fusion';
        if (engineType === 'xl') return `${techBase}/D-F-E-D`;
        if (engineType === 'light') return `${techBase}/X-X-E-D`;
        return `${techBase}/C-E-D-D`;
      case 'gyro':
        const gyroType = unit.data?.gyro?.type || 'standard';
        if (gyroType === 'xl') return `${techBase}/X-X-F-E`;
        if (gyroType === 'compact') return `${techBase}/X-F-E-D`;
        return `${techBase}/C-C-C-C`;
      case 'cockpit':
        const cockpitType = unit.data?.cockpit?.type || 'standard';
        if (cockpitType === 'small') return `${techBase}/X-X-F-E`;
        if (cockpitType === 'command_console') return `${techBase}/X-X-E-D`;
        return `${techBase}/C-C-C-C`;
      case 'heatsinks':
        const hsType = unit.data?.heat_sinks?.type || 'single';
        if (hsType === 'double') return `${techBase}/E-E-D-C`;
        return 'C/B-B-B-B';
      case 'armor':
        const armorType = unit.armorAllocation?.['Center Torso']?.type?.id || 'standard';
        if (armorType === 'ferro_fibrous') return `${techBase}/E-F-D-C`;
        if (armorType === 'stealth') return `${techBase}/X-X-F-E`;
        return `${techBase}/C-C-C-B`;
      default:
        return '-';
    }
  };

  // Calculate earliest possible year
  const earliestYear = useMemo(() => {
    // Simplified - would need full tech progression tables
    const structureType = unit.data?.structure?.type || 'standard';
    const engineType = unit.data?.engine?.type || 'fusion';
    const isPrimitive = unit.data?.rules_level === 1;
    
    if (isPrimitive) return 2463;
    if (structureType === 'endo_steel' || engineType === 'xl') return 2556;
    if (engineType === 'light') return 3055;
    return 2470;
  }, [unit.data?.structure?.type, unit.data?.engine?.type, unit.data?.rules_level]);

  // Component summary data
  const components: ComponentSummary[] = [
    {
      name: 'Structure',
      weight: structureWeight,
      crits: getCriticalSlots('structure'),
      availability: getAvailability('structure'),
    },
    {
      name: 'Engine',
      weight: engineWeight,
      crits: getCriticalSlots('engine'),
      availability: getAvailability('engine'),
    },
    {
      name: 'Gyro',
      weight: gyroWeight,
      crits: getCriticalSlots('gyro'),
      availability: getAvailability('gyro'),
    },
    {
      name: 'Cockpit',
      weight: cockpitWeight,
      crits: getCriticalSlots('cockpit'),
      availability: getAvailability('cockpit'),
    },
    {
      name: 'Heatsinks',
      weight: heatSinkWeight,
      crits: getCriticalSlots('heatsinks'),
      availability: getAvailability('heatsinks'),
    },
    {
      name: 'Armor',
      weight: armorWeight,
      crits: getCriticalSlots('armor'),
      availability: getAvailability('armor'),
    },
  ];

  // Add optional components
  if (jumpJetWeight > 0) {
    components.push({
      name: 'Jump Jets',
      weight: jumpJetWeight,
      crits: getCriticalSlots('jumpjets'),
      availability: '-',
    });
  }

  if (equipmentWeight > 0) {
    components.push({
      name: 'Equipment',
      weight: equipmentWeight,
      crits: 0, // Calculated separately
      availability: '-',
    });
  }

  if (myomerWeight > 0) {
    components.push({
      name: 'Myomer',
      weight: myomerWeight,
      crits: 0,
      availability: '-',
    });
  }

  return (
    <div className="summary-panel bg-white rounded-lg border border-gray-300 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Summary</h3>
      
      {/* Unit Type */}
      <div className="mb-3">
        <span className="text-xs text-gray-600">Unit Type: </span>
        <span className="text-xs font-medium">{unitType}</span>
      </div>

      {/* Component Table */}
      <div className="mb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1 pr-2">Component</th>
              <th className="text-right px-2">Weight</th>
              <th className="text-right px-2">Crits</th>
              <th className="text-left pl-2">Availability</th>
            </tr>
          </thead>
          <tbody>
            {components.map((component, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-1 pr-2">{component.name}:</td>
                <td className="text-right px-2">
                  {component.weight > 0 ? `${component.weight} t` : '-'}
                </td>
                <td className="text-right px-2">
                  {component.crits > 0 ? component.crits : '-'}
                </td>
                <td className="text-xs pl-2 text-gray-600">
                  {component.availability}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-medium">
              <td className="py-1 pr-2">Total:</td>
              <td className="text-right px-2">{totalWeight.toFixed(1)} t</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Weight Summary */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Chassis Tonnage:</span>
          <span className="font-medium">{unit.mass} tons</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Weight Used:</span>
          <span className={`font-medium ${
            totalWeight > unit.mass ? 'text-red-600' : 
            totalWeight === unit.mass ? 'text-green-600' : 
            'text-blue-600'
          }`}>
            {totalWeight.toFixed(1)} tons
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Free Tonnage:</span>
          <span className={`font-medium ${
            remainingTonnage < 0 ? 'text-red-600' : 
            remainingTonnage === 0 ? 'text-green-600' : 
            remainingTonnage < 1 ? 'text-yellow-600' :
            'text-blue-600'
          }`}>
            {remainingTonnage.toFixed(1)} tons
          </span>
        </div>
      </div>

      {/* Validation Status Box */}
      <div className={`mt-3 p-2 rounded border ${
        totalWeight > unit.mass 
          ? 'bg-red-50 border-red-300' 
          : totalWeight === unit.mass 
          ? 'bg-green-50 border-green-300' 
          : remainingTonnage < 1 
          ? 'bg-yellow-50 border-yellow-300'
          : 'bg-blue-50 border-blue-300'
      }`}>
        <p className={`text-xs font-medium ${
          totalWeight > unit.mass 
            ? 'text-red-700' 
            : totalWeight === unit.mass 
            ? 'text-green-700' 
            : remainingTonnage < 1 
            ? 'text-yellow-700'
            : 'text-blue-700'
        }`}>
          {totalWeight > unit.mass 
            ? `⚠️ Overweight by ${(totalWeight - unit.mass).toFixed(1)} tons!`
            : totalWeight === unit.mass 
            ? '✅ Tonnage perfectly allocated'
            : remainingTonnage < 1 
            ? `⚡ ${remainingTonnage.toFixed(1)} tons free (nearly full)`
            : `💡 ${remainingTonnage.toFixed(1)} tons available`
          }
        </p>
      </div>

      {/* Earliest Year */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-600">Earliest Possible Year: </span>
        <span className="text-xs font-medium">{earliestYear}</span>
      </div>
    </div>
  );
};

export default SummaryPanel;
