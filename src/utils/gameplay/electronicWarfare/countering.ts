import { IECMSuite } from './types';

export function calculateECCMCountering(
  enemyECMs: readonly IECMSuite[],
  friendlyECCMs: readonly IECMSuite[],
): {
  readonly uncounteredEnemyECMs: readonly IECMSuite[];
  readonly counteredEnemyECMs: readonly IECMSuite[];
} {
  const sortedEnemies = [...enemyECMs].sort((a, b) => {
    const tierA = a.type === 'guardian' ? 0 : 1;
    const tierB = b.type === 'guardian' ? 0 : 1;
    return tierA - tierB;
  });

  const availableECCMs = [...friendlyECCMs].sort((a, b) => {
    const tierA = a.type === 'guardian' ? 1 : 0;
    const tierB = b.type === 'guardian' ? 1 : 0;
    return tierA - tierB;
  });

  const counteredEnemyECMs: IECMSuite[] = [];
  const usedECCMs = new Set<string>();

  for (const enemy of sortedEnemies) {
    const counterIdx = availableECCMs.findIndex((eccm) => {
      if (usedECCMs.has(eccm.entityId)) {
        return false;
      }

      if (enemy.type === 'guardian') {
        return true;
      }

      return eccm.type === 'angel' || eccm.type === 'clan';
    });

    if (counterIdx >= 0) {
      usedECCMs.add(availableECCMs[counterIdx].entityId);
      counteredEnemyECMs.push(enemy);
    }
  }

  const counteredIds = new Set(counteredEnemyECMs.map((ecm) => ecm.entityId));
  const uncounteredEnemyECMs = sortedEnemies.filter(
    (ecm) => !counteredIds.has(ecm.entityId),
  );

  return { uncounteredEnemyECMs, counteredEnemyECMs };
}
