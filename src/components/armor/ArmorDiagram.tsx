import React, { useState } from 'react';
import { ArmorLocation } from './ArmorLocation';

export type ArmorLocationKey =
  | 'head'
  | 'centerTorso'
  | 'leftTorso'
  | 'rightTorso'
  | 'leftArm'
  | 'rightArm'
  | 'leftLeg'
  | 'rightLeg';

export interface ArmorData {
  front: Record<ArmorLocationKey, number>;
  rear: Record<ArmorLocationKey, number>;
  max: Record<ArmorLocationKey, number>;
}

export interface ArmorDiagramProps {
  armor: ArmorData;
  onArmorChange: (location: ArmorLocationKey, value: number, facing: 'front' | 'rear') => void;
  className?: string;
}

const LOCATION_LABELS: Record<ArmorLocationKey, string> = {
  head: 'Head',
  centerTorso: 'Center Torso',
  leftTorso: 'Left Torso',
  rightTorso: 'Right Torso',
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
};

export function ArmorDiagram({ armor, onArmorChange, className = '' }: ArmorDiagramProps): React.ReactElement {
  const [facing, setFacing] = useState<'front' | 'rear'>('front');

  const handleArmorChange = (location: ArmorLocationKey, value: number) => {
    onArmorChange(location, value, facing);
  };

  return (
    <div className={`armor-diagram ${className}`.trim()}>
      {/* Front/Rear Toggle */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setFacing('front')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] min-w-[44px] ${
              facing === 'front'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-pressed={facing === 'front'}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setFacing('rear')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] min-w-[44px] ${
              facing === 'rear'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-pressed={facing === 'rear'}
          >
            Rear
          </button>
        </div>
      </div>

      {/* Desktop Silhouette Layout (CSS Grid) */}
      <div className="hidden lg:grid armor-diagram-grid" style={{
        display: 'grid',
        gridTemplateAreas: `
          ". head . . . ."
          "left-torso center-torso center-torso right-torso ."
          "left-arm center-torso center-torso right-arm ."
          "left-leg center-torso center-torso right-leg ."
        `,
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '0.5rem',
      }}>
        {/* Head */}
        <div style={{ gridArea: 'head' }}>
          <ArmorLocation
            location={LOCATION_LABELS.head}
            currentArmor={armor[facing].head}
            maxArmor={armor.max.head}
            onArmorChange={(value) => handleArmorChange('head', value)}
          />
        </div>

        {/* Center Torso */}
        <div style={{ gridArea: 'center-torso' }}>
          <ArmorLocation
            location={LOCATION_LABELS.centerTorso}
            currentArmor={armor[facing].centerTorso}
            maxArmor={armor.max.centerTorso}
            onArmorChange={(value) => handleArmorChange('centerTorso', value)}
          />
        </div>

        {/* Left Torso */}
        <div style={{ gridArea: 'left-torso' }}>
          <ArmorLocation
            location={LOCATION_LABELS.leftTorso}
            currentArmor={armor[facing].leftTorso}
            maxArmor={armor.max.leftTorso}
            onArmorChange={(value) => handleArmorChange('leftTorso', value)}
          />
        </div>

        {/* Right Torso */}
        <div style={{ gridArea: 'right-torso' }}>
          <ArmorLocation
            location={LOCATION_LABELS.rightTorso}
            currentArmor={armor[facing].rightTorso}
            maxArmor={armor.max.rightTorso}
            onArmorChange={(value) => handleArmorChange('rightTorso', value)}
          />
        </div>

        {/* Left Arm */}
        <div style={{ gridArea: 'left-arm' }}>
          <ArmorLocation
            location={LOCATION_LABELS.leftArm}
            currentArmor={armor[facing].leftArm}
            maxArmor={armor.max.leftArm}
            onArmorChange={(value) => handleArmorChange('leftArm', value)}
          />
        </div>

        {/* Right Arm */}
        <div style={{ gridArea: 'right-arm' }}>
          <ArmorLocation
            location={LOCATION_LABELS.rightArm}
            currentArmor={armor[facing].rightArm}
            maxArmor={armor.max.rightArm}
            onArmorChange={(value) => handleArmorChange('rightArm', value)}
          />
        </div>

        {/* Left Leg */}
        <div style={{ gridArea: 'left-leg' }}>
          <ArmorLocation
            location={LOCATION_LABELS.leftLeg}
            currentArmor={armor[facing].leftLeg}
            maxArmor={armor.max.leftLeg}
            onArmorChange={(value) => handleArmorChange('leftLeg', value)}
          />
        </div>

        {/* Right Leg */}
        <div style={{ gridArea: 'right-leg' }}>
          <ArmorLocation
            location={LOCATION_LABELS.rightLeg}
            currentArmor={armor[facing].rightLeg}
            maxArmor={armor.max.rightLeg}
            onArmorChange={(value) => handleArmorChange('rightLeg', value)}
          />
        </div>
      </div>

      {/* Mobile Vertical Stack */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Head */}
        <ArmorLocation
          location={LOCATION_LABELS.head}
          currentArmor={armor[facing].head}
          maxArmor={armor.max.head}
          onArmorChange={(value) => handleArmorChange('head', value)}
        />

        {/* Torso Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">Torso</h4>
          <ArmorLocation
            location={LOCATION_LABELS.centerTorso}
            currentArmor={armor[facing].centerTorso}
            maxArmor={armor.max.centerTorso}
            onArmorChange={(value) => handleArmorChange('centerTorso', value)}
          />
          <ArmorLocation
            location={LOCATION_LABELS.leftTorso}
            currentArmor={armor[facing].leftTorso}
            maxArmor={armor.max.leftTorso}
            onArmorChange={(value) => handleArmorChange('leftTorso', value)}
          />
          <ArmorLocation
            location={LOCATION_LABELS.rightTorso}
            currentArmor={armor[facing].rightTorso}
            maxArmor={armor.max.rightTorso}
            onArmorChange={(value) => handleArmorChange('rightTorso', value)}
          />
        </div>

        {/* Arms Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">Arms</h4>
          <ArmorLocation
            location={LOCATION_LABELS.leftArm}
            currentArmor={armor[facing].leftArm}
            maxArmor={armor.max.leftArm}
            onArmorChange={(value) => handleArmorChange('leftArm', value)}
          />
          <ArmorLocation
            location={LOCATION_LABELS.rightArm}
            currentArmor={armor[facing].rightArm}
            maxArmor={armor.max.rightArm}
            onArmorChange={(value) => handleArmorChange('rightArm', value)}
          />
        </div>

        {/* Legs Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">Legs</h4>
          <ArmorLocation
            location={LOCATION_LABELS.leftLeg}
            currentArmor={armor[facing].leftLeg}
            maxArmor={armor.max.leftLeg}
            onArmorChange={(value) => handleArmorChange('leftLeg', value)}
          />
          <ArmorLocation
            location={LOCATION_LABELS.rightLeg}
            currentArmor={armor[facing].rightLeg}
            maxArmor={armor.max.rightLeg}
            onArmorChange={(value) => handleArmorChange('rightLeg', value)}
          />
        </div>
      </div>
    </div>
  );
}
