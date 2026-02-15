import type { IForce, IForceWithHierarchy, IForceSummary } from '@/types/force';

import { getForceRepository } from './ForceRepository';

export function buildForceHierarchy(force: IForce): IForceWithHierarchy {
  const repository = getForceRepository();

  const buildHierarchy = (f: IForce): IForceWithHierarchy => {
    const children = repository.getChildForces(f.id);
    return {
      ...f,
      children: children.map((child) => buildHierarchy(child)),
    };
  };

  return buildHierarchy(force);
}

export function buildForceSummaries(): readonly IForceSummary[] {
  const repository = getForceRepository();
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

    const children = repository.getChildForces(force.id);
    for (const child of children) {
      addForce(child, depth + 1);
    }
  };

  const rootForces = repository.getRootForces();
  for (const force of rootForces) {
    addForce(force, 0);
  }

  return summaries;
}

export function findAssignmentForce(assignmentId: string): IForce | null {
  const repository = getForceRepository();
  const allForces = repository.getAllForces();
  for (const force of allForces) {
    const assignment = force.assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      return force;
    }
  }
  return null;
}
