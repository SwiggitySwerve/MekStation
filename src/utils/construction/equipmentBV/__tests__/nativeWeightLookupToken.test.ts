/** @spec establish-all-unit-data-parity/vehicle-unit-system */
import { getNativeWeightLookupToken } from '../normalization';

// One guarded owner for the native machine-gun-array weight token. The combat
// handler weight and the support registry mass both resolve their mount tokens
// through it, so a decorated array reaches the same registry identity as the
// plain array (MegaMek 48fcb2f64: ISMGA.java:70-83, ISLightMGA.java:69-82,
// ISHeavyMGA.java:70-83, all 0.5 t).
describe('native weight lookup token', () => {
  it.each([
    ['ISLMGA(ST)', 'islmga'],
    ['ISLMGA(ST):OMNI', 'islmga'],
    ['isLMGA(st)', 'islmga'],
    ['ISMGA(ST)', 'ismga'],
    ['ISMGA(ST):OMNI', 'ismga'],
    ['ISMGA:OMNI', 'ismga'],
    ['ISHMGA(ST)', 'ishmga'],
    ['ISHMGA(ST):OMNI', 'ishmga'],
    ['ISHMGA:OMNI', 'ishmga'],
  ])('selects the plain array identity for %s', (source, token) => {
    expect(getNativeWeightLookupToken(source)).toBe(token);
  });

  it.each([
    'ISLMGA',
    'ISMGA',
    'ISHMGA',
    'Machine Gun(ST)',
    'Light Machine Gun(ST)',
    'Medium Laser(ST)',
    'IS Ammo MG - Full',
    'CLMGA(ST)',
    'CLLMGA(ST)',
    'CLHMGA(ST):OMNI',
  ])('leaves %s to the ordinary lookup', (source) => {
    expect(getNativeWeightLookupToken(source)).toBe(source);
  });
});
