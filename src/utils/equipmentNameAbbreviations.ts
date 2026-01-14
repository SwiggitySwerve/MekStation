/**
 * Common equipment name abbreviations for compact UI display.
 * Used in equipment chips, tooltips, and mobile views.
 */

const ABBREVIATIONS: [RegExp, string][] = [
  [/\(Clan\)/gi, '(C)'],
  [/\(Inner Sphere\)/gi, '(IS)'],
  [/Inner Sphere/gi, 'IS'],
  [/Extended Range/gi, 'ER'],
  [/Large Pulse/gi, 'LPL'],
  [/Medium Pulse/gi, 'MPL'],
  [/Small Pulse/gi, 'SPL'],
  [/Ultra AC/gi, 'UAC'],
  [/LB \d+-X AC/gi, 'LBX'],
  [/Streak SRM/gi, 'SSRM'],
  [/Artemis IV/gi, 'Art IV'],
  [/Double Heat Sink/gi, 'DHS'],
  [/Heat Sink/gi, 'HS'],
  [/Jump Jet/gi, 'JJ'],
  [/Improved Jump Jet/gi, 'IJJ'],
  [/Targeting Computer/gi, 'TC'],
  [/Anti-Missile System/gi, 'AMS'],
  [/Electronic Countermeasures/gi, 'ECM'],
  [/Beagle Active Probe/gi, 'BAP'],
  [/Active Probe/gi, 'AP'],
  [/Command Console/gi, 'CC'],
  [/Communications Equipment/gi, 'Comm'],
  // Ferro-Fibrous is too long, abbreviate to Ferro-Fib
  [/Ferro-Fibrous/gi, 'Ferro-Fib'],
  // Note: Endo Steel is kept as full name
];

/**
 * Abbreviates equipment names for compact display.
 * Applies common BattleTech abbreviations to reduce text length.
 * 
 * @param name - The full equipment name
 * @returns Abbreviated name for compact display
 */
export function abbreviateEquipmentName(name: string): string {
  let result = name;
  for (const [pattern, replacement] of ABBREVIATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
