import type { ICapitalRecordSheetData } from '../../recordsheet/dataExtractors.capital';
import type { PipFill } from '../templateRecordSheetRenderer';

/** Presentation bindings only: numerical facts arrive from domain owners. */
export function bindCapital(data: ICapitalRecordSheetData): {
  texts: Record<string, string>;
  pips: PipFill[];
} {
  const row = (label: string) =>
    String(data.crew.find((r) => r.label === label)?.count ?? 0);
  const heat = (arc: string) => {
    const value = data.heatByArc.find((a) => a.arc === arc)?.heat;
    return value === undefined ? 'N/A' : String(value);
  };
  const texts: Record<string, string> = {
    title: `${data.shipType.toUpperCase()} RECORD SHEET`,
    type: data.header.unitName,
    fluffName: '',
    tonnage: String(data.header.tonnage),
    techBase: data.header.techBase,
    rulesLevel: data.header.rulesLevel,
    role: data.header.role ?? '',
    bv:
      data.bv.scope === 'complete'
        ? `${data.bv.total.toLocaleString('en-US')} (complete)`
        : data.bv.scope === 'defensive-only'
          ? `${data.bv.defensive.toLocaleString('en-US')} (defensive only)`
          : 'unavailable',
    textSI: String(data.structuralIntegrity ?? 'unavailable'),
    mpWalk: String(data.safeThrust ?? 'unavailable'),
    mpRun: String(data.maxThrust ?? 'unavailable'),
    hsCount: String(data.heatSinkCount ?? 'unavailable'),
    hsCountDouble:
      data.heatCapacity === undefined ||
      data.heatCapacity === data.heatSinkCount
        ? ''
        : `(${data.heatCapacity})`,
    noseHeat: heat('Nose'),
    foreSidesHeat: `${heat('FL')}/${heat('FR')}`,
    aftSidesHeat: `${heat('AL')}/${heat('AR')}`,
    aftHeat: heat('Aft'),
    broadsidesHeat: `${heat('LBS')}/${heat('RBS')}`,
    nCrew: row('Crew'),
    nPassengers: row('Passengers'),
    nMarines: row('Marines'),
    nBattleArmor: row('Battle Armor'),
    nOther: row(
      data.shipType === 'DropShip' ? 'Other Passengers' : 'Other Crew',
    ),
    lifeBoatsEscapePods: `Life Boats/Escape Pods: ${row('Lifeboats')}/${row('Escape Pods')}`,
    textKFDrive: String(data.integrity.kf ?? 'N/A'),
    textSail: String(data.integrity.sail ?? 'N/A'),
    textDockingCollars: String(
      data.transport.find((r) => r.label === 'Docking Collar')?.count ?? 0,
    ),
    gunnerySkill0: '4',
    pilotingSkill0: '5',
  };
  const pips: PipFill[] = data.armor.map((a) => ({
    groupId: `armorPips${a.code}`,
    count: a.points,
    className: 'capital-armor-pip',
  }));
  for (const a of data.armor) texts[`textArmor_${a.code}`] = `(${a.points})`;
  for (const [groupId, count] of [
    ['siPips', data.structuralIntegrity],
    ['kfPips', data.integrity.kf],
    ['sailPips', data.integrity.sail],
  ] as const)
    if (count !== undefined)
      pips.push({ groupId, count, className: 'capital-structure-pip' });
  return { texts, pips };
}
