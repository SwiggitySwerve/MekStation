import {
  hasActiveDNI,
  hasDNIImplant,
  hasRepresentedActiveDNI,
} from '../neuralInterface';

// MegaMek 48fcb2f6 Entity.hasDNIImplant/hasActiveDNI and
// NeuralInterfaceMode.grantsBenefit: Off, Pilot Abilities Only, Full Tracking.
describe.each(['vdni', 'bvdni', 'proto_dni'])('DNI implant %s', (implant) => {
  it.each([
    ['Off', false, false],
    ['Off', true, false],
    ['Pilot Abilities Only', false, true],
    ['Pilot Abilities Only', true, true],
    ['Full Tracking', false, false],
    ['Full Tracking', true, true],
  ] as const)(
    'mode %s with hardware %s is active=%s',
    (mode, hardware, expected) => {
      const abilities = Object.freeze([implant]);
      expect(hasDNIImplant(abilities)).toBe(true);
      expect(
        hasActiveDNI(abilities, { mode, hasDNICockpitMod: hardware }),
      ).toBe(expected);
      expect(abilities).toEqual([implant]);
    },
  );

  it('keeps represented flag compatibility separate from native default Off', () => {
    expect(hasRepresentedActiveDNI([implant])).toBe(true);
    expect(hasRepresentedActiveDNI([implant], true)).toBe(true);
    expect(hasRepresentedActiveDNI([implant], false)).toBe(false);
    expect(hasActiveDNI([implant], {})).toBe(false);
  });
});

it.each([
  { abilities: [] },
  { abilities: ['ei_implant'] },
  { abilities: ['triple_core_processor'] },
  { abilities: ['unknown-implant'] },
])(
  'does not treat unrelated or missing implants as DNI: $abilities',
  ({ abilities }) => {
    expect(hasDNIImplant(abilities)).toBe(false);
    expect(hasRepresentedActiveDNI(abilities, true)).toBe(false);
    expect(
      hasActiveDNI(abilities, {
        mode: 'Full Tracking',
        hasDNICockpitMod: true,
      }),
    ).toBe(false);
  },
);

it.each([undefined, null, '', ' ', 'full tracking', 'invalid'])(
  'defaults native mode %j to Off',
  (mode) => {
    expect(hasActiveDNI(['vdni'], { mode, hasDNICockpitMod: true })).toBe(
      false,
    );
  },
);

it('trims the exact native mode and requires hardware in Full Tracking', () => {
  expect(hasActiveDNI(['vdni'], { mode: ' Pilot Abilities Only ' })).toBe(true);
  expect(hasActiveDNI(['vdni'], { mode: 'Full Tracking' })).toBe(false);
});
