/**
 * Mech Silhouette SVG Paths
 *
 * Provides path data and positioning for different mech silhouette styles.
 */

export type { LocationPosition, SilhouetteConfig } from './MechSilhouette.types';

export {
  REALISTIC_SILHOUETTE,
  BATTLEMECH_SILHOUETTE,
  MEGAMEK_SILHOUETTE,
  GEOMETRIC_SILHOUETTE,
} from './MechSilhouette.biped';

export { QUAD_SILHOUETTE } from './MechSilhouette.quad';

export { TRIPOD_SILHOUETTE } from './MechSilhouette.tripod';

export { FIGHTER_SILHOUETTE } from './MechSilhouette.fighter';

export {
  LOCATION_LABELS,
  QUAD_LOCATION_LABELS,
  FIGHTER_LOCATION_LABELS,
  TRIPOD_LOCATION_LABELS,
} from './MechSilhouette.labels';

export {
  getLocationCenter,
  getTorsoSplit,
  TORSO_LOCATIONS,
  hasTorsoRear,
} from './MechSilhouette.utils';
