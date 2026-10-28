/**
 * Protected Critical Slot Colours
 *
 * The approved colour treatment for the Critical Slots view, kept as literals
 * so the guard test (`__tests__/protectedSlotColors.test.tsx`) fails if the
 * colour owners or the slot rows drift from it. The owners stay the source the
 * app reads: `src/utils/colors/slotColors.ts` (fixed systems),
 * `src/utils/colors/equipmentColors*.ts` (equipment) and
 * `src/utils/colors/slotFills.ts` (fills); each slot takes the hue token from
 * its owner accent class. Tests import their expectations from here; change a
 * value only with a new `decisions` entry.
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

export const PROTECTED_SLOT_COLORS = {
  /** Every occupied slot: its hue token's fill and a bar in the full hue. */
  tint: {
    className: 'criticalTintedSlot',
    colorVar: '--critical-slot-color',
    fillVar: '--critical-slot-fill',
    barWidth: '4px',
    hoverOverlay: 'rgb(255 255 255 / 0.07)',
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
    [EquipmentCategory.PHYSICAL_WEAPON]: 'pink-400',
    [EquipmentCategory.AMMUNITION]: 'slate-300',
    [EquipmentCategory.ELECTRONICS]: 'lime-400',
    [EquipmentCategory.MOVEMENT]: 'emerald-600',
    [EquipmentCategory.STRUCTURAL]: 'slate-500',
    [EquipmentCategory.MISC_EQUIPMENT]: 'slate-500',
    heatsink: 'cyan-400',
  },
  /**
   * Each hue token's fill. Explicit OKLCH keeps every fill in its own hue on
   * every theme; a mix with the theme surface turned warm hues grey.
   */
  fills: {
    'orange-400': 'oklch(0.4 0.1 52)',
    'purple-400': 'oklch(0.38 0.12 306)',
    'blue-400': 'oklch(0.38 0.1 255)',
    'slate-400': 'oklch(0.36 0.02 257)',
    'yellow-300': 'oklch(0.48 0.095 92)',
    'red-500': 'oklch(0.42 0.13 25)',
    'teal-500': 'oklch(0.45 0.075 185)',
    'cyan-400': 'oklch(0.49 0.09 224)',
    'lime-400': 'oklch(0.47 0.11 131)',
    'emerald-600': 'oklch(0.4 0.09 160)',
    'violet-500': 'oklch(0.46 0.13 293)',
    'pink-400': 'oklch(0.44 0.13 350)',
    'fuchsia-500': 'oklch(0.42 0.14 322)',
    'slate-500': 'oklch(0.46 0.03 257)',
    'slate-300': 'oklch(0.46 0.03 257)',
  },
  /**
   * Ammunition takes its weapon type's hue and adds stripes; ammunition with
   * no weapon type keeps the neutral `equipment[AMMUNITION]` hue.
   */
  ammo: {
    missile: 'teal-500',
    ballistic: 'red-500',
    patternClass: 'criticalAmmo',
    /** Global class striping the ammunition bar wherever it appears. */
    edgeClass: 'ammo-accent',
    keyLabel: 'Ammo (Striped)',
  },
  /** Heat sinks are a solid cyan fill with no pattern, told apart by colour. */
  heatSink: {
    label: 'Heat Sink',
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
    {
      date: '2026-10-27',
      approvedBy: 'Wes',
      decision:
        "Ammunition takes its weapon type's colour plus stripes, freeing the ammo amber. Fills become one explicit OKLCH colour per hue token instead of the 24% mix with the theme surface, which measured as grey for energy, engine, ammo and ballistic. Electronics move to lime and physical to pink so close pairs separate; heat sinks use the lighter cyan-400. Values meet the hill-climb run-3 measured thresholds (fill chroma 0.05+, hue within 30 degrees of the bar, fills 6+ OKLab apart, marks 10+ apart, text 4.5:1+).",
      source:
        'User: "Four colors that are too close. We may want to have some other pattern to apply that shows it is a different type of things so we have more colors to play with. For instance, ammo could be in the same color as the type of weapon, just with some patterning. So the previous color for ammo is now open to use for literally anything else"',
    },
    {
      date: '2026-10-27',
      approvedBy: 'Wes',
      decision:
        'Heat sinks drop the hatch and become a solid cyan fill, oklch(0.49 0.09 224), told apart by colour alone: at least 7 OKLab units from every fill that can share their grid, with primary text at 5.5:1. Supersedes the 2026-10-26 hatch decision; ammunition keeps its stripes.',
      source:
        'User: "I don\'t think we need a striped pattern for heat sinks, they just need to be solid colored and easily identifiable"',
    },
  ],
} as const;
