import { canonicalizeSPAIds } from './index';

const DNI_IMPLANT_IDS: ReadonlySet<string> = new Set([
  'vdni',
  'bvdni',
  'proto_dni',
]);

export interface IActiveDNIOptions {
  /** Native game-option value; absent/unrecognized values mean Off. */
  readonly mode?: string | null;
  readonly hasDNICockpitMod?: boolean;
}

/** MegaMek Entity.hasDNIImplant; EI and TCP alone are not DNI implants. */
export function hasDNIImplant(abilities: readonly string[]): boolean {
  return canonicalizeSPAIds(abilities).some((id) => DNI_IMPLANT_IDS.has(id));
}

/** Native activity query. Does not infer mode or hardware from a jack-in flag. */
export function hasActiveDNI(
  abilities: readonly string[],
  options: IActiveDNIOptions = {},
): boolean {
  if (!hasDNIImplant(abilities)) return false;
  switch (options.mode?.trim()) {
    case 'Pilot Abilities Only':
      return true;
    case 'Full Tracking':
      return options.hasDNICockpitMod === true;
    default:
      return false;
  }
}

/** Existing combat-flag compatibility; does not resolve native game policy. */
export function hasRepresentedActiveDNI(
  abilities: readonly string[],
  neuralInterfaceActive = true,
): boolean {
  return neuralInterfaceActive && hasDNIImplant(abilities);
}
