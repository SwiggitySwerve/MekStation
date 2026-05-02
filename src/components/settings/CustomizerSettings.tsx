import React from 'react';

import { ArmorDiagramModePreview } from '@/components/customizer/armor/ArmorDiagramPreview';
import { ArmorDiagramSettings } from '@/components/customizer/armor/ArmorDiagramSettings';
import { useCustomizerSettingsStore } from '@/stores/useCustomizerSettingsStore';

import {
  SettingsSection,
  SettingsSectionProps,
  Toggle,
} from './SettingsShared';

export function CustomizerSettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  const armorDiagramMode = useCustomizerSettingsStore(
    (s) => s.armorDiagramMode,
  );
  const setArmorDiagramMode = useCustomizerSettingsStore(
    (s) => s.setArmorDiagramMode,
  );
  const showArmorDiagramSelector = useCustomizerSettingsStore(
    (s) => s.showArmorDiagramSelector,
  );
  const setShowArmorDiagramSelector = useCustomizerSettingsStore(
    (s) => s.setShowArmorDiagramSelector,
  );

  return (
    <SettingsSection
      id="customizer"
      title="Customizer"
      description="Configure the mech customizer interface"
      isExpanded={isExpanded}
      onToggle={onToggle}
      onRef={onRef}
    >
      <div>
        <div className="text-text-theme-primary mb-2 text-sm font-medium">
          Armor Diagram Mode
        </div>
        <div className="text-text-theme-secondary mb-3 text-xs">
          Choose between schematic grid or silhouette SVG display
        </div>
        <ArmorDiagramModePreview
          selectedMode={armorDiagramMode}
          onSelectMode={setArmorDiagramMode}
        />
      </div>

      {armorDiagramMode === 'silhouette' && (
        <div>
          <div className="text-text-theme-primary mb-2 text-sm font-medium">
            Silhouette Aesthetic
          </div>
          <div className="text-text-theme-secondary mb-3 text-xs">
            Visual style for the armor diagram
          </div>
          <ArmorDiagramSettings />
        </div>
      )}

      <Toggle
        label="Show Design Selector (UAT)"
        description="Display the design variant dropdown in the armor tab for testing"
        checked={showArmorDiagramSelector}
        onChange={setShowArmorDiagramSelector}
      />
    </SettingsSection>
  );
}
