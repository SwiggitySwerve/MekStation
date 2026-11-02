import { computeSupportTransportWeights } from '../vehicle/supportTransport';
// MegaMek 48fcb2f6: *Bay.getWeight/getPersonnel; Quarters constructors.
const BAYS: Readonly<Record<string, readonly [number, number]>> = {
  asfbay: [150, 2],
  artsasfbay: [150, 0],
  smallcraftbay: [200, 5],
  mekbay: [150, 2],
  protomekbay: [50, 6],
  lightvehiclebay: [50, 5],
  heavyvehiclebay: [100, 8],
  battlearmorbay: [0, 6],
  dockingcollar: [1000, 0],
};
const QUARTERS: Readonly<Record<string, number>> = {
  crewquarters: 7,
  '1stclassquarters': 10,
  '2ndclassquarters': 7,
  steeragequarters: 5,
};
export function aerospaceBays(bays: readonly string[], clan: boolean) {
  let weight = 0,
    personnel = 0,
    berths = 0;
  const errors: string[] = [],
    facings = new Set<number>();
  for (const raw of bays) {
    const p = raw.toLowerCase().split(':'),
      kind = p[0],
      capacity = Number(p[1] ?? 0);
    const known = p.length > 1 && computeSupportTransportWeights([raw], clan);
    weight +=
      known && !known.unresolved.length
        ? known.controls + known.carryingSpace
        : (BAYS[kind]?.[0] ?? 0) * (kind === 'dockingcollar' ? 1 : capacity);
    if (QUARTERS[kind]) berths += Math.floor(capacity / QUARTERS[kind]);
    if (kind === 'infantrybay') {
      const platoon = Math.max(
        0,
        ['foot', 'jump', 'motorized', 'mechanized'].indexOf(p[4]),
      );
      personnel +=
        Math.trunc(capacity) *
        (clan ? [25, 20, 25, 5] : [28, 21, 28, 7])[platoon];
    } else
      personnel +=
        (kind === 'protomekbay' ? Math.ceil(capacity) : Math.trunc(capacity)) *
        (BAYS[kind]?.[1] ?? 0);
    if (/^(?:arts)?navalrepair|^dropshuttlebay/.test(kind)) {
      // BLKFile.ParsedBayInfo.normalizeTransporterNumbers: legacy fN or six numeric fields.
      const facing =
        p.length === 7
          ? Number(p[5])
          : p.length === 5 && /^f\d+$/.test(p[4])
            ? Number(p[4].slice(1))
            : -1;
      if (facing < 0 || facing >= 7)
        errors.push(`${kind} is not assigned a legal armor facing.`);
      else if (facings.has(facing))
        errors.push(
          'Exceeds maximum of one repair facility or drop shuttle bay per armor facing.',
        );
      facings.add(facing);
    }
  }
  return { weight, personnel, berths, errors };
}
