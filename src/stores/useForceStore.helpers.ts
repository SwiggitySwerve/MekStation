import { IForce, IForceSummary } from '@/types/force';

export function getForceSummariesLogic(forces: IForce[]): IForceSummary[] {
  const summaries: IForceSummary[] = [];

  const addForce = (force: IForce, depth: number): void => {
    summaries.push({
      id: force.id,
      name: force.name,
      forceType: force.forceType,
      status: force.status,
      affiliation: force.affiliation,
      stats: force.stats,
      depth,
      parentId: force.parentId,
    });

    const children = forces.filter((f) => f.parentId === force.id);
    for (const child of children) {
      addForce(child, depth + 1);
    }
  };

  const rootForces = forces.filter((f) => !f.parentId);
  for (const force of rootForces) {
    addForce(force, 0);
  }

  return summaries;
}
