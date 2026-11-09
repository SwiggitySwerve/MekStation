/**
 * Production validity against the pinned Java movement verdicts.
 *
 * Variants: each synthetic design is written as native BLK tags, parsed and validated by
 * the production handler (`ProtoMechUnitHandler.parse` then `validate`), and its movement
 * findings must equal `TestProtoMek.correctMovement` (MegaMek 48fcb2f64,
 * TestProtoMek.java:443-470) as recorded in `fixtures/movement-java-verdicts.json`.
 *
 * Canonical units: every one of the 86 pinned ProtoMeks goes through the production
 * mapper, the BLK exporter, the BLK parser and the handler, and none is given a
 * movement finding (Java's `correctMovement` passes all 86).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import fs from 'node:fs';
import path from 'node:path';

import { exportProtoMech } from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { createProtoMechHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { isProtoMech } from '@/types/unit/PersonnelInterfaces';

import fixture from './fixtures/movement-java-verdicts.json';

/** The four messages of TestProtoMek.correctMovement, as Java words them. */
const MOVEMENT_MESSAGES = [
  'Glider ProtoMeks have a minimum flanking MP of 4.',
  'Quad ProtoMeks have a minimum running MP of 3.',
  'Exceeds maximum jump MP.',
  'Exceeds maximum UMU MP.',
];

const handler = createProtoMechHandler();
const parser = new BlkParserService();

function movementFindings(content: string): string[] {
  const parsed = parser.parse(content);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  if (!isProtoMech(result.data.unit)) throw new Error('Wrong family');
  return handler
    .validate(result.data.unit)
    .errors.filter((error) => MOVEMENT_MESSAGES.includes(error));
}

function blk(variant: (typeof fixture.variants)[number]): string {
  const jet = variant.improvedJets
    ? 'ExtendedJumpJetSystem'
    : 'ProtoMechJumpJet';
  const equipment = [
    ...Array(variant.jump).fill(jet),
    ...Array(variant.umu).fill('ProtoMechUMU'),
  ].join('\n');
  const tags: Record<string, string> = {
    UnitType: 'ProtoMek',
    Name: 'Movement probe',
    Model: variant.name,
    year: '3060',
    type: 'Clan Level 2',
    Tonnage: String(variant.tonnage),
    motion_type: variant.motion,
    cruiseMP: String(variant.walk),
    jumpingMP: String(variant.jump),
    armor: '0\n0\n0\n0\n0\n0',
    'Body Equipment': equipment,
  };
  return Object.entries(tags)
    .map(([key, value]) => `<${key}>\n${value}\n</${key}>`)
    .join('\n');
}

describe('production validation of synthetic movement variants', () => {
  it.each(fixture.variants.map((v) => [v.name, v] as const))(
    '%s gets the Java movement verdict',
    (_name, variant) => {
      expect(movementFindings(blk(variant))).toEqual(
        variant.correctMovement ? [] : [variant.message],
      );
    },
  );
});

describe('production validation of the 86 canonical ProtoMeks', () => {
  const DIR = path.join(process.cwd(), 'public/data/units/protomechs');
  const JAVA = new Map(
    fixture.units.map((u) => [`${u.chassis}|${u.model}`, u]),
  );
  const rows = fs
    .readdirSync(DIR)
    .filter((file) => file !== 'index.json')
    .map((file) => {
      const definition = JSON.parse(
        fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, ''),
      );
      return {
        key: `${definition.chassis}|${definition.model ?? ''}`,
        state: mapProtoMechDefinitionToState(definition),
      };
    });

  it('covers exactly the units the probe ran', () => {
    expect(rows).toHaveLength(fixture.meta.units);
    expect(new Set(rows.map((r) => r.key))).toEqual(new Set(JAVA.keys()));
  });

  it.each(rows.map((r) => [r.key, r] as const))(
    '%s has no movement finding, as Java passes correctMovement',
    (key, row) => {
      const java = JAVA.get(key)!;
      expect(java.correctMovement).toBe(true);
      const exported = exportProtoMech(row.state);
      if (!exported.success || !exported.content)
        throw new Error(JSON.stringify(exported));
      // The exporter keeps the movement facts the rule reads.
      expect(row.state.cruiseMP).toBe(java.walk);
      expect(row.state.jumpMP).toBe(java.jump);
      expect(movementFindings(exported.content)).toEqual([]);
    },
  );
});
