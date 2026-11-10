import type { AuthorizedViewerResolver, IAuthorizedViewer } from './authorization/AuthorizedViewer';
import { authorizeHumanAction } from './authorization/HumanActionAuthorizationGate';

/** Durable GM membership, including a GM with a spectator-shaped tactical seat. */
export async function authorizeGmCombatCorrection(
  resolver: AuthorizedViewerResolver,
  verifiedPrincipalId: string,
  envelopePrincipalId: string,
  matchId: string,
): Promise<IAuthorizedViewer> {
  if (verifiedPrincipalId !== envelopePrincipalId)
    throw new Error('gm-correction-principal-mismatch');
  // This existing boundary checks the viewer brand and resolves fresh durable
  // membership. Neither being tactical host nor sharing a side grants GM role.
  const viewer = await authorizeHumanAction(resolver, verifiedPrincipalId, matchId, { kind: 'command' });
  if (viewer.role !== 'gm') throw new Error('gm-correction-gm-required');
  return viewer;
}
