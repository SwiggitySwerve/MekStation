import { BlkParserService } from '@/services/conversion/BlkParserService';
import { createSupportRegistryMass } from '@/services/units/handlers/supportRegistryMass';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';

import { computeSupportVehicleWeight } from '../supportWeight';
import fixture from './supportMiscMasses.pinned.json';

export { fixture };
export type MiscMassRow = (typeof fixture.rows)[number];

const LOCATIONS = ['Body', 'Front', 'Right', 'Left', 'Rear', 'Turret'];

/** A row replaces every equipment block of its base (unlisted blocks are emptied). */
export function blk(row: MiscMassRow): string {
  let text = fixture.bases[row.base as keyof typeof fixture.bases];
  const blocks = row.blocks as Record<string, string[]>;
  for (const loc of LOCATIONS) {
    const body = (blocks[loc] ?? []).map((item) => `${item}\n`).join('');
    const block = `<${loc} Equipment>\n${body}</${loc} Equipment>`;
    const present = new RegExp(
      `<${loc} Equipment>\\n[\\s\\S]*?</${loc} Equipment>`,
    );
    if (present.test(text)) text = text.replace(present, block);
    else if (body)
      text = text.replace(
        '</Body Equipment>\n',
        `</Body Equipment>\n\n${block}\n`,
      );
  }
  return text;
}

const handler = new SupportVehicleUnitHandler();
export function weigh(row: MiscMassRow) {
  const parsed = new BlkParserService().parse(blk(row));
  if (!parsed.success) throw new Error(`parse ${row.name}`);
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw new Error(`handler ${row.name}`);
  const unit = result.data.unit;
  return computeSupportVehicleWeight(
    unit,
    createSupportRegistryMass(unit.techBase),
  );
}
