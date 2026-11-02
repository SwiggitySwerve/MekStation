import type { IInfantry } from '@/types/unit/PersonnelInterfaces';

import { calculateTMM } from '../battleValueMovement';
// MiscType.create*InfArmor, MegaMek 48fcb2f64: exact kit aliases and stealth flags.
const KIT_FLAGS = new Map<string, readonly string[]>();
for (const row of [
  'DEST Infiltration Suit|DESTSuit=dest',
  'Sneak Suit (Camo)|ISSneakSuitCamo=sneakcamo',
  'Sneak Suit (IR)|ISSneakSuitIR=sneakir',
  'Sneak Suit (ECM)|ISSneakSuitECM=sneakecm',
  'Sneak Suit (Camo/IR)|ISSneakSuitCamoIR=sneakcamo sneakir',
  'Sneak Suit (Camo/ECM)|ISSneakSuitCamoECM=sneakcamo sneakecm',
  'Sneak Suit (IR/ECM)|ISSneakSuitIRECM=sneakir sneakecm',
  'Sneak Suit (Camo/IR/ECM)|ISSneakSuitCamoIRECM=sneakcamo sneakir sneakecm',
]) {
  const [aliases, flags] = row.split('=');
  for (const alias of aliases.split('|'))
    KIT_FLAGS.set(alias.toLowerCase(), flags.split(' '));
}
export function infantryBVArmorFlags(
  tags: Readonly<Record<string, string | string[]>>,
  kit?: string,
): readonly string[] {
  return kit
    ? (KIT_FLAGS.get(kit.toLowerCase()) ?? [])
    : ['dest', 'sneakcamo', 'sneakir', 'sneakecm'].filter(
        (flag) => flag in tags,
      );
}
// InfantryBVCalculator.java:83-113; BVCalculator.java:650-688 at the pin.
export function infantryDefensiveFactor(
  source: IInfantry['bvOffense'],
  flags: readonly string[] = [],
  hasArmorKit = false,
): number {
  if (
    source?.runMP === undefined ||
    source.jumpMP === undefined ||
    source.umuMP === undefined
  )
    return 1;
  const tmm = Math.max(
    calculateTMM(Math.max(source.runMP, source.umuMP), source.jumpMP),
    source.dermalCamoEligible && !hasArmorKit ? 3 : 0,
  );
  return (
    1 +
    tmm / 10 +
    ['dest', 'sneakcamo', 'sneakir'].filter((flag) => flags.includes(flag))
      .length *
      0.2 +
    (flags.includes('sneakecm') ? 0.1 : 0)
  );
}
// InfantryBVCalculator.java:253-300: one additive modifier; engineer mask once.
export function infantrySpecializationModifier(mask: number): number {
  return [
    [63, 0.1],
    [64, 0.3],
    [128, 0.2],
    [512, 0.1],
    [4096, 0.1],
    [2048, 0.1],
  ].reduce((sum, [bits, bonus]) => sum + (mask & bits ? bonus : 0), 1);
}
// ProstheticEnhancementType.java:44-65; ConvInfantry.java:2318-2325.
const PROSTHETIC_DAMAGE: Readonly<Record<string, number>> = {
  LASER: 0.11,
  BALLISTIC: 0.01,
  NEEDLER: 0.04,
  SHOTGUN: 0.05,
  SONIC_STUNNER: 0.05,
  SMG: 0.05,
  BLADE: 0.02,
  SHOCKER: 0.04,
  VIBROBLADE: 0.14,
  RUMAL_GARROTE: 0.14,
  GRAPPLER: 0,
  CLIMBING_CLAWS: 0.02,
};
export function infantryProstheticDamage(
  tags: Readonly<Record<string, string | string[]>>,
  augmentations: readonly string[],
): number {
  if (!augmentations.some((a) => a === 'pl_enhanced' || a === 'pl_ienhanced'))
    return 0;
  return [1, 2].reduce((sum, slot) => {
    const key =
      slot === 1 && !('prostheticEnhancement1' in tags)
        ? 'prostheticEnhancement'
        : `prostheticEnhancement${slot}`;
    const name = String(tags[key] ?? '')
      .toUpperCase()
      .replace(/[ /]/g, '_');
    if (!name) return sum;
    const damage = PROSTHETIC_DAMAGE[name];
    if (damage === undefined)
      throw new Error(`Unknown prosthetic enhancement: ${name}`);
    return (
      sum + damage * Math.max(0, Math.min(2, Number(tags[key + 'Count'] ?? 1)))
    );
  }, 0);
}
