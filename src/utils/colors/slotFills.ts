/**
 * Critical Slot Fills
 *
 * One dark fill per category or family hue token (the token in the owner's
 * `border-l-<token>` accent class). Fills are explicit OKLCH colours, not a mix
 * with the theme surface, so each keeps its own hue on every theme: mixing a
 * warm hue into a navy surface cancels it to grey. Every fill keeps primary
 * text at 6:1 or better, and families that share a grid differ by at least
 * 6 OKLab units (ammunition also carries stripes).
 *
 * @spec openspec/specs/color-system/spec.md
 */

export const SLOT_FILLS: Readonly<Record<string, string>> = {
  // Fixed systems
  'orange-400': 'oklch(0.4 0.1 52)', // engine
  'purple-400': 'oklch(0.38 0.12 306)', // gyro
  'blue-400': 'oklch(0.38 0.1 255)', // actuators
  'slate-400': 'oklch(0.36 0.02 257)', // cockpit, life support, sensors
  // Equipment categories
  'yellow-300': 'oklch(0.48 0.095 92)', // energy
  'red-500': 'oklch(0.42 0.13 25)', // ballistic
  'teal-500': 'oklch(0.45 0.075 185)', // missile
  'cyan-400': 'oklch(0.49 0.09 224)', // heat sinks
  'lime-400': 'oklch(0.47 0.11 131)', // electronics
  'emerald-600': 'oklch(0.4 0.09 160)', // movement
  'violet-500': 'oklch(0.46 0.13 293)', // artillery
  'pink-400': 'oklch(0.44 0.13 350)', // physical
  'fuchsia-500': 'oklch(0.42 0.14 322)', // capital
  'slate-500': 'oklch(0.46 0.03 257)', // misc and structural
  'slate-300': 'oklch(0.46 0.03 257)', // ammunition with no weapon type (striped)
};

export function getSlotFill(token: string): string | undefined {
  return SLOT_FILLS[token];
}
