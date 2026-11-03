import { createHash } from 'node:crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';

import { createVehicleHandler } from '../VehicleUnitHandler';
import fixture from './fixtures/bellona-case.json';

function validate(content: string) {
  const doc = new BlkParserService().parse(content);
  if (!doc.success) throw new Error('Expected BLK parse');
  const handler = createVehicleHandler(),
    parsed = handler.parse(doc.data.document);
  if (!parsed.success) throw new Error('Expected source loading');
  return { unit: parsed.data.unit, result: handler.validate(parsed.data.unit) };
}

it('retains Bellona source loading and reports Java CASE placement illegality', () => {
  expect(createHash('sha256').update(fixture.content).digest('hex')).toBe(
    fixture.sha256,
  );
  expect(fixture.javaValid).toBe(false);
  const { unit, result } = validate(fixture.content);
  expect(result.isValid).toBe(false);
  expect(result.errors).toContain('CASE must be mounted in the body.');
  expect(unit.validationErrors).toContain('CASE must be mounted in the body.');
});

it('clears the error when Bellona CASE is moved into the body', () => {
  const moved = fixture.content
    .replace('<Rear Equipment>\nCLCASE\n', '<Rear Equipment>\n')
    .replace('<Body Equipment>\n', '<Body Equipment>\nCLCASE\n');
  expect(moved).not.toBe(fixture.content);
  expect(validate(moved).result.isValid).toBe(true);
});
