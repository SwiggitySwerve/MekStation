import React, { useState } from 'react';
import { EditableUnit } from '../../../types/editor';

interface ArmorDistributionPresetsProps {
  unit: EditableUnit;
  totalArmorPoints: number;
  onApplyDistribution: (distribution: ArmorDistribution) => void;
  disabled?: boolean;
}

interface ArmorDistribution {
  'Head': { front: number; rear: number };
  'Center Torso': { front: number; rear: number };
  'Left Torso': { front: number; rear: number };
  'Right Torso': { front: number; rear: number };
  'Left Arm': { front: number; rear: number };
  'Right Arm': { front: number; rear: number };
  'Left Leg': { front: number; rear: number };
  'Right Leg': { front: number; rear: number };
}

type PresetType = 'striker' | 'brawler' | 'sniper' | 'juggernaut' | 'scout' | 'balanced' | 'custom';

interface Preset {
  id: PresetType;
  name: string;
  description: string;
  distribution: {
    head: number;
    centerTorso: { front: number; rear: number };
    sideTorso: { front: number; rear: number };
    arms: number;
    legs: number;
  };
}

const DISTRIBUTION_PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Even distribution across all locations',
    distribution: {
      head: 1.0, // 100% of max
      centerTorso: { front: 0.7, rear: 0.3 },
      sideTorso: { front: 0.7, rear: 0.3 },
      arms: 0.8,
      legs: 0.9,
    },
  },
  {
    id: 'striker',
    name: 'Striker',
    description: 'Heavy front armor for aggressive combat',
    distribution: {
      head: 1.0,
      centerTorso: { front: 0.85, rear: 0.15 },
      sideTorso: { front: 0.8, rear: 0.2 },
      arms: 0.9,
      legs: 0.95,
    },
  },
  {
    id: 'brawler',
    name: 'Brawler',
    description: 'Maximum torso protection for close combat',
    distribution: {
      head: 1.0,
      centerTorso: { front: 0.75, rear: 0.25 },
      sideTorso: { front: 0.75, rear: 0.25 },
      arms: 0.85,
      legs: 0.9,
    },
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: 'Minimal rear armor for long-range combat',
    distribution: {
      head: 1.0,
      centerTorso: { front: 0.9, rear: 0.1 },
      sideTorso: { front: 0.85, rear: 0.15 },
      arms: 0.7,
      legs: 0.8,
    },
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    description: 'Maximum protection everywhere',
    distribution: {
      head: 1.0,
      centerTorso: { front: 0.7, rear: 0.3 },
      sideTorso: { front: 0.7, rear: 0.3 },
      arms: 0.95,
      legs: 0.95,
    },
  },
  {
    id: 'scout',
    name: 'Scout',
    description: 'Light armor focused on mobility',
    distribution: {
      head: 0.9,
      centerTorso: { front: 0.65, rear: 0.25 },
      sideTorso: { front: 0.6, rear: 0.2 },
      arms: 0.6,
      legs: 0.85,
    },
  },
];

const ArmorDistributionPresets: React.FC<ArmorDistributionPresetsProps> = ({
  unit,
  totalArmorPoints,
  onApplyDistribution,
  disabled = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('balanced');
  const [customDistribution, setCustomDistribution] = useState<ArmorDistribution | null>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  // Get max armor for each location
  const getMaxArmorForLocation = (location: string, mass: number): number => {
    switch (location) {
      case 'Head':
        return mass > 100 ? 12 : 9;
      case 'Center Torso':
        return Math.floor(mass * 2 * 0.4);
      case 'Left Torso':
      case 'Right Torso':
        return Math.floor(mass * 2 * 0.3);
      case 'Left Arm':
      case 'Right Arm':
      case 'Left Leg':
      case 'Right Leg':
        return Math.floor(mass * 2 * 0.25);
      default:
        return Math.floor(mass * 2 * 0.2);
    }
  };

  // Calculate distribution based on preset
  const calculateDistribution = (preset: Preset): ArmorDistribution => {
    const mass = unit.tonnage || 0;
    const distribution: ArmorDistribution = {
      'Head': { front: 0, rear: 0 },
      'Center Torso': { front: 0, rear: 0 },
      'Left Torso': { front: 0, rear: 0 },
      'Right Torso': { front: 0, rear: 0 },
      'Left Arm': { front: 0, rear: 0 },
      'Right Arm': { front: 0, rear: 0 },
      'Left Leg': { front: 0, rear: 0 },
      'Right Leg': { front: 0, rear: 0 },
    };

    // Calculate target points for each location
    const headMax = getMaxArmorForLocation('Head', mass);
    const ctMax = getMaxArmorForLocation('Center Torso', mass);
    const stMax = getMaxArmorForLocation('Left Torso', mass);
    const armMax = getMaxArmorForLocation('Left Arm', mass);
    const legMax = getMaxArmorForLocation('Left Leg', mass);

    // Head (no rear)
    distribution['Head'].front = Math.floor(headMax * preset.distribution.head);

    // Center Torso
    const ctTotal = Math.floor(ctMax * (preset.distribution.centerTorso.front + preset.distribution.centerTorso.rear));
    distribution['Center Torso'].front = Math.floor(ctTotal * (preset.distribution.centerTorso.front / (preset.distribution.centerTorso.front + preset.distribution.centerTorso.rear)));
    distribution['Center Torso'].rear = ctTotal - distribution['Center Torso'].front;

    // Side Torsos
    const stTotal = Math.floor(stMax * (preset.distribution.sideTorso.front + preset.distribution.sideTorso.rear));
    const stFront = Math.floor(stTotal * (preset.distribution.sideTorso.front / (preset.distribution.sideTorso.front + preset.distribution.sideTorso.rear)));
    const stRear = stTotal - stFront;
    
    distribution['Left Torso'].front = stFront;
    distribution['Left Torso'].rear = stRear;
    distribution['Right Torso'].front = stFront;
    distribution['Right Torso'].rear = stRear;

    // Arms (no rear)
    distribution['Left Arm'].front = Math.floor(armMax * preset.distribution.arms);
    distribution['Right Arm'].front = Math.floor(armMax * preset.distribution.arms);

    // Legs (no rear)
    distribution['Left Leg'].front = Math.floor(legMax * preset.distribution.legs);
    distribution['Right Leg'].front = Math.floor(legMax * preset.distribution.legs);

    // Calculate total used
    let totalUsed = 0;
    Object.values(distribution).forEach(loc => {
      totalUsed += loc.front + loc.rear;
    });

    // Scale down if over budget
    if (totalUsed > totalArmorPoints) {
      const scale = totalArmorPoints / totalUsed;
      Object.keys(distribution).forEach(location => {
        const loc = distribution[location as keyof ArmorDistribution];
        loc.front = Math.floor(loc.front * scale);
        loc.rear = Math.floor(loc.rear * scale);
      });
    }

    return distribution;
  };

  const handleApplyPreset = () => {
    const preset = DISTRIBUTION_PRESETS.find(p => p.id === selectedPreset);
    if (preset) {
      const distribution = calculateDistribution(preset);
      onApplyDistribution(distribution);
    } else if (selectedPreset === 'custom' && customDistribution) {
      onApplyDistribution(customDistribution);
    }
  };

  const handleCustomEdit = () => {
    setShowCustomDialog(true);
  };

  return (
    <div className="armor-distribution-presets bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-100 mb-3">Distribution Presets</h3>

      {/* Preset Selection */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {DISTRIBUTION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setSelectedPreset(preset.id)}
              disabled={disabled}
              className={`p-3 rounded text-left transition-colors ${
                selectedPreset === preset.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-sm font-medium">{preset.name}</div>
              <div className="text-xs opacity-80">{preset.description}</div>
            </button>
          ))}
          
          {/* Custom Option */}
          <button
            onClick={() => setSelectedPreset('custom')}
            disabled={disabled}
            className={`p-3 rounded text-left transition-colors ${
              selectedPreset === 'custom'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-sm font-medium">Custom</div>
            <div className="text-xs opacity-80">Define your own distribution</div>
          </button>
        </div>

        {/* Preview of selected preset */}
        {selectedPreset !== 'custom' && (
          <div className="bg-gray-900 rounded p-3">
            <h4 className="text-xs font-medium text-gray-400 mb-2">Preview Distribution</h4>
            <div className="text-xs space-y-1">
              {(() => {
                const preset = DISTRIBUTION_PRESETS.find(p => p.id === selectedPreset);
                if (!preset) return null;
                const dist = calculateDistribution(preset);
                const totalUsed = Object.values(dist).reduce((sum, loc) => sum + loc.front + loc.rear, 0);
                
                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-gray-300">
                      <div>Head: {dist['Head'].front}</div>
                      <div>CT: {dist['Center Torso'].front}/{dist['Center Torso'].rear}</div>
                      <div>ST: {dist['Left Torso'].front}/{dist['Left Torso'].rear}</div>
                      <div>Arms: {dist['Left Arm'].front}</div>
                      <div>Legs: {dist['Left Leg'].front}</div>
                      <div>Total: {totalUsed}/{totalArmorPoints}</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApplyPreset}
            disabled={disabled || (selectedPreset === 'custom' && !customDistribution)}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              disabled || (selectedPreset === 'custom' && !customDistribution)
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Apply Distribution
          </button>
          
          {selectedPreset === 'custom' && (
            <button
              onClick={handleCustomEdit}
              disabled={disabled}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                disabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              Edit Custom
            </button>
          )}
        </div>
      </div>

      {/* Note about remaining points */}
      <div className="mt-3 text-xs text-gray-400">
        Distributions will be scaled to fit within available armor points
      </div>
    </div>
  );
};

export default ArmorDistributionPresets;
