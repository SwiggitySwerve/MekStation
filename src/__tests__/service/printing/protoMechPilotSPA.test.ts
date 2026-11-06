import type { IProtoMechRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IPilotAbilityRef } from '@/types/pilot';

import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { renderRecordSheetSVG } from '@/services/printing/svgRecordSheetRenderer/renderer';

const unit: IProtoMechRecordSheetUnitInput = {
  id: 'roc-point',
  type: 'protomech',
  name: 'Roc Point',
  chassis: 'Roc',
  model: 'Point',
  tonnage: 9,
  techBase: 'Clan',
  rulesLevel: 'Standard',
  era: '3060',
  pointSize: 5,
  walkMP: 5,
  pilot: { name: 'Point Commander', gunnery: 4, piloting: 5, wounds: 0 },
};

const specialist: IPilotAbilityRef = {
  abilityId: 'weapon_specialist',
  acquiredDate: '2026-01-01',
  designation: {
    kind: 'weapon_type',
    weaponTypeId: 'ppc',
    displayLabel: 'PPC',
  },
};

describe('ProtoMech supplied pilot SPAs', () => {
  const service = new RecordSheetService();

  it('prints the supplied designated ability through the existing fallback SVG renderer', () => {
    const data = service.extractData(unit, [specialist]);
    if (data.unitType !== 'protomech')
      throw new Error('Expected ProtoMech data');
    const svg = renderRecordSheetSVG(data);

    expect(svg).toContain('Weapon Specialist (PPC)');
    expect(data.specialAbilities).toEqual([
      expect.objectContaining({ headline: 'Weapon Specialist (PPC)' }),
    ]);
    expect(data).toEqual({
      ...service.extractData(unit),
      specialAbilities: data.specialAbilities,
    });
  });

  it('keeps the legacy output when no pilot abilities are supplied', () => {
    const legacy = service.extractData(unit);
    const empty = service.extractData(unit, []);
    if (legacy.unitType !== 'protomech' || empty.unitType !== 'protomech') {
      throw new Error('Expected ProtoMech data');
    }

    expect(empty).toEqual(legacy);
    expect(legacy.specialAbilities).toBeUndefined();
    expect(renderRecordSheetSVG(empty)).toBe(renderRecordSheetSVG(legacy));
    expect(renderRecordSheetSVG(legacy)).not.toContain('Weapon Specialist');
  });
});
