import { admitGmReplayCorrection } from '../GmReplayCorrectionAdmission';

describe('GM replay correction admission', () => {
  it.each(['activationIndex', 'initiativeOrder', 'activeUnitId'])(
    'refuses the unrepresented unit-order leaf %s',
    (leaf) => {
      expect(admitGmReplayCorrection([
        { family: 'turn-order', after: { [leaf]: 0 } },
      ])).toMatchObject({ kind: 'refused', reason: 'gm-correction-no-ordinary-carrier', leaf });
    },
  );

  it('refuses rescued even when false', () => {
    expect(admitGmReplayCorrection([
      { family: 'lifecycle', unitId: 'player', after: { rescued: false } },
    ])).toMatchObject({ kind: 'refused', reason: 'gm-correction-no-ordinary-carrier', leaf: 'rescued' });
  });

  it('refuses the whole reload family before inspecting or dropping snapshot leaves', () => {
    expect(admitGmReplayCorrection([
      { family: 'unit-reload', unitId: 'player', after: {} },
    ])).toMatchObject({ kind: 'refused', reason: 'gm-correction-unit-reload-unsupported' });
  });

  it('rejects private descendants instead of serializing them', () => {
    expect(admitGmReplayCorrection([
      { family: 'heat-ammo', unitId: 'player', after: { heat: 17 }, privateMetadata: { reason: 'PRIVATE_SENTINEL' } },
    ])).toMatchObject({ kind: 'refused', reason: 'gm-correction-invalid-effects' });
  });

  it('refuses full ammo-slot snapshots whose metadata AmmoConsumed does not carry', () => {
    expect(admitGmReplayCorrection([
      { family: 'heat-ammo', unitId: 'player', after: { ammoState: {
        bin: { binId: 'bin', weaponType: 'LRM', location: 'left_torso', remainingRounds: 5, maxRounds: 12, isExplosive: true },
      } } },
    ])).toMatchObject({ kind: 'refused', reason: 'gm-correction-no-ordinary-carrier', leaf: 'ammoState.*.location' });
  });
});
