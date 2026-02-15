import React from 'react';

import type {
  ArmorDiagramMode,
  ArmorDiagramVariant,
} from '@/stores/useCustomizerSettingsStore';
import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { SchematicDiagram } from '@/components/armor/schematic';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';

import {
  CleanTechDiagram,
  NeonOperatorDiagram,
  TacticalHUDDiagram,
  PremiumMaterialDiagram,
  MegaMekDiagram,
} from '../armor/variants';
import { LAMArmorDiagram } from '../armor/variants/LAMArmorDiagram';
import { QuadArmorDiagram } from '../armor/variants/QuadArmorDiagram';
import { QuadVeeArmorDiagram } from '../armor/variants/QuadVeeArmorDiagram';
import { TripodArmorDiagram } from '../armor/variants/TripodArmorDiagram';

interface ArmorDiagramPanelProps {
  readonly configuration: MechConfiguration;
  readonly armorDiagramMode: ArmorDiagramMode;
  readonly armorDiagramVariant: ArmorDiagramVariant;
  readonly armorData: LocationArmorData[];
  readonly selectedLocation: MechLocation | null;
  readonly pointsDelta: number;
  readonly onLocationClick: (location: MechLocation) => void;
}

export function ArmorDiagramPanel({
  configuration,
  armorDiagramMode,
  armorDiagramVariant,
  armorData,
  selectedLocation,
  pointsDelta,
  onLocationClick,
}: ArmorDiagramPanelProps): React.ReactElement {
  return (
    <div className="space-y-4" data-testid="armor-diagram">
      {configuration === MechConfiguration.QUAD && (
        <QuadArmorDiagram
          armorData={armorData}
          selectedLocation={selectedLocation}
          unallocatedPoints={pointsDelta}
          onLocationClick={onLocationClick}
          variant={armorDiagramVariant}
        />
      )}

      {configuration === MechConfiguration.TRIPOD && (
        <TripodArmorDiagram
          armorData={armorData}
          selectedLocation={selectedLocation}
          unallocatedPoints={pointsDelta}
          onLocationClick={onLocationClick}
          variant={armorDiagramVariant}
        />
      )}

      {configuration === MechConfiguration.LAM && (
        <LAMArmorDiagram
          armorData={armorData}
          selectedLocation={selectedLocation}
          unallocatedPoints={pointsDelta}
          onLocationClick={onLocationClick}
          variant={armorDiagramVariant}
        />
      )}

      {configuration === MechConfiguration.QUADVEE && (
        <QuadVeeArmorDiagram
          armorData={armorData}
          selectedLocation={selectedLocation}
          unallocatedPoints={pointsDelta}
          onLocationClick={onLocationClick}
          variant={armorDiagramVariant}
        />
      )}

      {configuration === MechConfiguration.BIPED && (
        <>
          {armorDiagramMode === 'schematic' && (
            <SchematicDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              onLocationClick={onLocationClick}
            />
          )}

          {armorDiagramMode === 'silhouette' &&
            armorDiagramVariant === 'clean-tech' && (
              <CleanTechDiagram
                armorData={armorData}
                selectedLocation={selectedLocation}
                unallocatedPoints={pointsDelta}
                onLocationClick={onLocationClick}
              />
            )}
          {armorDiagramMode === 'silhouette' &&
            armorDiagramVariant === 'neon-operator' && (
              <NeonOperatorDiagram
                armorData={armorData}
                selectedLocation={selectedLocation}
                unallocatedPoints={pointsDelta}
                onLocationClick={onLocationClick}
              />
            )}
          {armorDiagramMode === 'silhouette' &&
            armorDiagramVariant === 'tactical-hud' && (
              <TacticalHUDDiagram
                armorData={armorData}
                selectedLocation={selectedLocation}
                unallocatedPoints={pointsDelta}
                onLocationClick={onLocationClick}
              />
            )}
          {armorDiagramMode === 'silhouette' &&
            armorDiagramVariant === 'premium-material' && (
              <PremiumMaterialDiagram
                armorData={armorData}
                selectedLocation={selectedLocation}
                unallocatedPoints={pointsDelta}
                onLocationClick={onLocationClick}
              />
            )}
          {armorDiagramMode === 'silhouette' &&
            armorDiagramVariant === 'megamek' && (
              <MegaMekDiagram
                armorData={armorData}
                selectedLocation={selectedLocation}
                unallocatedPoints={pointsDelta}
                onLocationClick={onLocationClick}
              />
            )}
        </>
      )}
    </div>
  );
}
