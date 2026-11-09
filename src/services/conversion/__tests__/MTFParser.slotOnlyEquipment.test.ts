import { MTFParserService } from '../MTFParserService';

it.each(['XL', 'XL Gyro'])(
  'preserves the declared %s gyro through the existing mapper',
  (gyro) => {
    const result = new MTFParserService().parse(
      `chassis:XL source\nmass:40\ngyro:${gyro}`,
    );
    expect(result.unit?.gyro.type).toBe('XL');
  },
);

it.each([
  'Standard Gyro',
  'Compact Gyro',
  'Heavy-Duty Gyro',
  'Superheavy Gyro',
  'None',
  'Unknown Gyro',
  '',
])('keeps current non-XL gyro behavior for %s', (gyro) => {
  expect(
    new MTFParserService().parse(`chassis:Other source\nmass:40\ngyro:${gyro}`)
      .unit?.gyro.type,
  ).toBe('STANDARD');
});
