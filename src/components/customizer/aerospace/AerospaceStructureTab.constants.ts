/**
 * Aerospace Structure Tab — Option Constants
 *
 * Static option arrays consumed by the Structure Tab section components.
 * Extracted from AerospaceStructureTab.tsx during section decomposition.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 */

import { EngineType } from '@/types/construction/EngineType';
import {
  AerospaceCockpitType,
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

export const TONNAGE_OPTIONS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
  100,
];

export const SMALL_CRAFT_TONNAGE_OPTIONS = [
  100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
];

export const SUBTYPE_OPTIONS: { value: AerospaceSubType; label: string }[] = [
  {
    value: AerospaceSubType.AEROSPACE_FIGHTER,
    label: 'Aerospace Fighter (ASF)',
  },
  {
    value: AerospaceSubType.CONVENTIONAL_FIGHTER,
    label: 'Conventional Fighter',
  },
  { value: AerospaceSubType.SMALL_CRAFT, label: 'Small Craft' },
];

export const AEROSPACE_ENGINE_TYPE_OPTIONS: {
  value: AerospaceEngineType;
  label: string;
}[] = [
  { value: AerospaceEngineType.FUSION, label: 'Fusion (Standard)' },
  { value: AerospaceEngineType.XL, label: 'XL Fusion' },
  { value: AerospaceEngineType.COMPACT_FUSION, label: 'Compact Fusion' },
  { value: AerospaceEngineType.ICE, label: 'ICE (Combustion)' },
  { value: AerospaceEngineType.FUEL_CELL, label: 'Fuel Cell' },
];

export const LEGACY_ENGINE_TYPE_OPTIONS: {
  value: EngineType;
  label: string;
}[] = [
  { value: EngineType.STANDARD, label: 'Standard Fusion' },
  { value: EngineType.XL_IS, label: 'XL Engine (IS)' },
  { value: EngineType.XL_CLAN, label: 'XL Engine (Clan)' },
  { value: EngineType.LIGHT, label: 'Light Engine' },
  { value: EngineType.COMPACT, label: 'Compact Engine' },
];

export const COCKPIT_TYPE_OPTIONS: {
  value: AerospaceCockpitType;
  label: string;
}[] = [
  { value: AerospaceCockpitType.STANDARD, label: 'Standard' },
  { value: AerospaceCockpitType.SMALL, label: 'Small' },
  { value: AerospaceCockpitType.PRIMITIVE, label: 'Primitive' },
  { value: AerospaceCockpitType.COMMAND_CONSOLE, label: 'Command Console' },
];
