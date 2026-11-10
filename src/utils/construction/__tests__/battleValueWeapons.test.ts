import { hasBVTargetingComputer } from '../battleValueWeapons';

/** MiscType.java:6799-6811,6836-6848, MegaMek 48fcb2f64: F_TARGETING_COMPUTER. */
describe('shared targeting-computer chassis capability', () => {
  it.each([
    'targeting-computer',
    'clan-targeting-computer',
    'ISTargeting Computer',
    'CLTargeting Computer',
    'ISTargeting Computer:OMNI',
    'CLTargeting Computer:OMNI',
    'istargeting-computer-registry',
    'cltargeting-computer-registry',
    'istargeting-computer-registry:OMNI',
    'cltargeting-computer-registry:OMNI',
  ])('recognizes the resolved capability for %s', (id) => {
    expect(hasBVTargetingComputer([id])).toBe(true);
  });

  it.each([
    { ids: [] },
    { ids: ['medium-laser'] },
    { ids: ['ecm-suite'] },
    { ids: ['not-a-targeting-computer'] },
  ])(
    'does not infer capability from unrelated or unknown equipment: $ids',
    ({ ids }) => expect(hasBVTargetingComputer(ids)).toBe(false),
  );

  it('finds the capability without changing mount order or native identities', () => {
    const ids = ['medium-laser', 'CLTargeting Computer:OMNI', 'ecm-suite'];
    const original = [...ids];
    expect(hasBVTargetingComputer(ids)).toBe(true);
    expect(ids).toEqual(original);
  });
});
