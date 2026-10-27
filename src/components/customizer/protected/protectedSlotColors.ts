/**
 * Protected Critical Slot Colours
 *
 * The approved colour treatment for the Critical Slots view, kept as literals
 * so the guard test (`__tests__/protectedSlotColors.test.tsx`) fails if the
 * colour owners or the slot rows drift from it. The owners stay the source the
 * app reads: `src/utils/colors/slotColors.ts` (fixed systems) and
 * `src/utils/colors/equipmentColors*.ts` (equipment); each slot takes the hue
 * token from its owner accent class. Tests import their expectations from
 * here; change a value only with a new `decisions` entry.
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

export const PROTECTED_SLOT_COLORS = {
  /** Every occupied slot: a background tint and a bar in its own hue. */
  tint: {
    className: 'criticalTintedSlot',
    colorVar: '--critical-slot-color',
    barWidth: '4px',
    restMix: '24%',
    hoverMix: '32%',
  },
  /** Tailwind hue tokens per fixed-system family. */
  fixedSystems: {
    engine: 'orange-400',
    gyro: 'purple-400',
    actuator: 'blue-400',
    cockpit: 'slate-400',
    lifesupport: 'slate-400',
    sensors: 'slate-400',
  },
  /** Tailwind hue tokens per equipment category. */
  equipment: {
    [EquipmentCategory.ENERGY_WEAPON]: 'yellow-300',
    [EquipmentCategory.BALLISTIC_WEAPON]: 'red-500',
    [EquipmentCategory.MISSILE_WEAPON]: 'teal-500',
    [EquipmentCategory.ARTILLERY]: 'violet-500',
    [EquipmentCategory.CAPITAL_WEAPON]: 'fuchsia-500',
    [EquipmentCategory.PHYSICAL_WEAPON]: 'rose-500',
    [EquipmentCategory.AMMUNITION]: 'amber-600',
    [EquipmentCategory.ELECTRONICS]: 'cyan-500',
    [EquipmentCategory.MOVEMENT]: 'emerald-500',
    [EquipmentCategory.STRUCTURAL]: 'lime-500',
    [EquipmentCategory.MISC_EQUIPMENT]: 'slate-500',
    heatsink: 'cyan-500',
  },
  /**
   * Heat sinks share the electronics cyan, so they also carry a faint hatch
   * (CSS module class) drawn in the slot hue, never grey.
   */
  heatSink: {
    label: 'Heat Sink',
    hatchClass: 'criticalHeatSink',
  },
  decisions: [
    {
      date: '2026-10-26',
      approvedBy: 'Wes',
      decision:
        'Every occupied critical slot is tinted in its equipment-category or fixed-system-family hue (24% mix, 32% on hover) with a 4px bar in the same hue; engine, gyro, actuators and cockpit/life support/sensors differ; text stays the primary text colour. Supersedes the 2px muted accents on neutral tiles.',
      source:
        'User: "I was looking at stuff like the gyro or the fusion engine and saw that it had no color and no differentiation and just looked like a block of Gray, at least the weapons like the ac 20 actually had a proper background of red on the equipment"',
    },
    {
      date: '2026-10-26',
      approvedBy: 'Wes',
      decision:
        'Heat sinks keep the full "Heat Sink" label and a restrained hatch in the heat-sink cyan as a non-colour cue.',
      source:
        'User correction to the accent-restore brief: the hatch is a later accepted non-colour cue and stays protected.',
    },
  ],
} as const;
