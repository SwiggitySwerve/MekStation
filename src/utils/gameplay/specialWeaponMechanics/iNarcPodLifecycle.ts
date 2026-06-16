import type { IINarcPodState } from '@/types/gameplay';

type INarcPodIdentity = Pick<IINarcPodState, 'teamId' | 'podType'> &
  Partial<Pick<IINarcPodState, 'location'>>;

export interface INarcPodBrushOffTargetOption {
  readonly id: string;
  readonly carrierUnitId: string;
  readonly name: string;
  readonly selectedINarcPod: IINarcPodState;
}

export function isEquivalentINarcPod(
  left: INarcPodIdentity,
  right: INarcPodIdentity,
): boolean {
  return left.teamId === right.teamId && left.podType === right.podType;
}

export function iNarcPodTargetKey(pod: INarcPodIdentity): string {
  return `${pod.teamId}:${pod.podType}`;
}

export function iNarcPodBrushOffTargetId(
  carrierUnitId: string,
  pod: INarcPodIdentity,
): string {
  return `inarc-pod:${carrierUnitId}:${iNarcPodTargetKey(pod)}`;
}

export function iNarcPodDisplayName(pod: INarcPodIdentity): string {
  const podType =
    pod.podType.charAt(0).toUpperCase() + pod.podType.slice(1).toLowerCase();
  return `${podType} iNarc pod from Team ${pod.teamId}`;
}

export function uniqueINarcPodTargets(
  pods: readonly IINarcPodState[] | undefined,
): readonly IINarcPodState[] {
  if (!pods || pods.length === 0) return [];

  return pods.filter(
    (pod, index) =>
      pods.findIndex((candidate) => isEquivalentINarcPod(candidate, pod)) ===
      index,
  );
}

export function buildINarcPodBrushOffTargetOptions(options: {
  readonly carrierUnitId: string;
  readonly carrierName: string;
  readonly pods: readonly IINarcPodState[] | undefined;
}): readonly INarcPodBrushOffTargetOption[] {
  return uniqueINarcPodTargets(options.pods).map((pod) => ({
    id: iNarcPodBrushOffTargetId(options.carrierUnitId, pod),
    carrierUnitId: options.carrierUnitId,
    name: `${options.carrierName} - ${iNarcPodDisplayName(pod)}`,
    selectedINarcPod: pod,
  }));
}

export function removeEquivalentINarcPod(
  pods: readonly IINarcPodState[] | undefined,
  targetPod: INarcPodIdentity,
): readonly IINarcPodState[] {
  if (!pods || pods.length === 0) return [];

  const targetIndex = pods.findIndex((pod) =>
    isEquivalentINarcPod(pod, targetPod),
  );
  if (targetIndex === -1) return pods;

  return [...pods.slice(0, targetIndex), ...pods.slice(targetIndex + 1)];
}
