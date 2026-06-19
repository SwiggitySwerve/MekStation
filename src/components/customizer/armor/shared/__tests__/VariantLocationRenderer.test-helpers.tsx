import { render } from '@testing-library/react';
import React from 'react';

import { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';
import { MechLocation } from '@/types/construction';

import {
  LocationArmorValues,
  VariantLocation,
  VariantLocationProps,
} from '../VariantLocationRenderer';

// ===========================================================================
// Test Helpers
// ===========================================================================

export function makeProps(
  overrides: Partial<VariantLocationProps> = {},
): VariantLocationProps {
  return {
    location: MechLocation.CENTER_TORSO,
    label: 'CT',
    pos: { x: 50, y: 50, width: 80, height: 120 },
    data: { current: 30, maximum: 47, rear: 10, rearMaximum: 23 },
    showRear: false,
    isSelected: false,
    isHovered: false,
    variant: 'clean-tech',
    onClick: jest.fn(),
    onHover: jest.fn(),
    ...overrides,
  };
}

/** Render inside an SVG wrapper so SVG children mount correctly */
export function renderInSvg(props: VariantLocationProps) {
  return render(
    <svg>
      <VariantLocation {...props} />
    </svg>,
  );
}

// ===========================================================================
// Test Data Fixtures
// ===========================================================================

export const ARMOR_DATA_FULL: LocationArmorValues = {
  current: 47,
  maximum: 47,
  rear: 23,
  rearMaximum: 23,
};

export const ARMOR_DATA_PARTIAL: LocationArmorValues = {
  current: 30,
  maximum: 47,
  rear: 10,
  rearMaximum: 23,
};

export const ARMOR_DATA_EMPTY: LocationArmorValues = {
  current: 0,
  maximum: 47,
  rear: 0,
  rearMaximum: 23,
};

export const ARMOR_DATA_NO_REAR: LocationArmorValues = {
  current: 20,
  maximum: 24,
};

export const ALL_VARIANTS: ArmorDiagramVariant[] = [
  'clean-tech',
  'neon-operator',
  'tactical-hud',
  'premium-material',
  'megamek',
];
