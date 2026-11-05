/** Shared vehicle transport mass. Pinned MegaMek 48fcb2f6 TestEntity.java:1995-2003,
 * TestSupportVehicle.java:818-833. Quarters are controls; they are not added twice.
 */
export function computeSupportTransportWeights(
  transporters: readonly string[],
  clan: boolean,
): {
  controls: number;
  carryingSpace: number;
  unresolved: string[];
} {
  let controls = 0,
    carryingSpace = 0;
  const unresolved: string[] = [];
  for (const raw of transporters) {
    const [type, amount, , , platoon, , flags] = raw.toLowerCase().split(':');
    if (type === 'battlearmorhandles - troopers') continue; // BLKFile ignores it, including sentinel -1
    const capacity = Number(amount);
    if (!Number.isFinite(capacity) || capacity < 0)
      throw new Error(`Invalid support transporter: ${raw}`);
    let weight: number;
    // Quarters classes keep source tons, not berth counts (constructors :66-67).
    if (
      [
        'crewquarters',
        '1stclassquarters',
        '2ndclassquarters',
        'steeragequarters',
      ].includes(type)
    )
      weight = capacity;
    // StandardSeatCargoBay.java:65; PillionSeatCargoBay.java:62;
    // EjectionSeatCargoBay.java:66. All inherit isQuarters() = true.
    else if (type === 'standardseats') weight = capacity * 0.075;
    else if (type === 'pillionseats') weight = capacity * 0.025;
    else if (type === 'ejectionseats') weight = capacity * 0.1;
    else {
      // Bay.getWeight :397-399; specialized cargo constructors :67-68.
      switch (type) {
        case 'cargobay':
        case 'troopspace':
          weight = capacity;
          break;
        case 'liquidcargobay':
          weight = capacity / 0.91;
          break;
        case 'insulatedcargobay': // InsulatedCargoBay.java:66-67,109-110.
        case 'refrigeratedcargobay':
          weight = capacity / 0.87;
          break;
        case 'livestockcargobay':
          weight = capacity / 0.83;
          break;
        case 'lightvehiclebay':
          weight = capacity * 50;
          break; // LightVehicleBay.java:91-92
        case 'battlearmorbay':
          weight =
            capacity *
            2 *
            (Number(flags) & 2 || (flags === undefined && clan)
              ? 5
              : Number(flags) & 1
                ? 6
                : 4);
          break; // :135-136
        case 'infantrybay':
          weight =
            capacity *
            ({ foot: 5, jump: 6, motorized: 7, mechanized: 8 }[platoon] ?? 5);
          break; // InfantryBay.java:74; PlatoonType.java:43-46
        default:
          unresolved.push(raw);
          continue;
      }
      carryingSpace += weight;
      continue;
    }
    controls += weight;
  }
  return {
    controls: Math.round(controls * 1000) / 1000,
    carryingSpace,
    unresolved,
  };
}
