/**
 * BattleArmor recoilless rifles: every pinned MegaMek 48fcb2f6 lookup name
 * (internal name first) resolves to the existing catalog record of that item.
 * Java defines these only in weapons/battleArmor/clan/CLBARecoillessRifle*.java.
 */
import { getEquipmentEntry } from '../equipmentBVResolver';

const cases: ReadonlyArray<[string, number, readonly string[]]> = [
  // CLBARecoillessRifleLight.java:59-64, bv = 12 (:74)
  [
    'balight-recoilless-rifle',
    12,
    [
      'CLBALight Recoilless Rifle',
      'CLBALightRecoillessRifle',
      'ISBALightRecoillessRifle',
      'ISLight Recoilless Rifle',
      'ISBALight Recoilless Rifle',
    ],
  ],
  // CLBARecoillessRifleMedium.java:59-65, bv = 19 (:78)
  [
    'bamedium-recoilless-rifle',
    19,
    [
      'CLBAMedium Recoilless Rifle',
      'CLBAMediumRecoillessRifle',
      'ISBAMediumRecoillessRifle',
      'IS BA Medium Recoilless Rifle',
      'ISBAMedium Recoilless Rifle',
    ],
  ],
  // CLBARecoillessRifleHeavy.java:59-64, bv = 22 (:74)
  [
    'baheavy-recoilless-rifle',
    22,
    [
      'CLBAHeavy Recoilless Rifle',
      'CLBAHeavyRecoillessRifle',
      'ISBAHeavyRecoillessRifle',
      'ISHeavy Recoilless Rifle',
      'ISBAHeavy Recoilless Rifle',
    ],
  ],
];

describe('BattleArmor recoilless rifles keep their Java identity', () => {
  it.each(
    cases.flatMap(([id, bv, names]) =>
      names.map((name) => [name, id, bv] as const),
    ),
  )('%s resolves to %s (BV %d)', (name, id, bv) => {
    const entry = getEquipmentEntry(name);
    expect(entry?.id).toBe(id);
    expect(entry?.battleValue).toBe(bv);
  });
});
