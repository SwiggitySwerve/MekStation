/** Native critical-slot suffix parsing shared by unit-loader consumers. */
export function parseCriticalSlotToken(token: string): {
  readonly lookupToken: string;
  readonly isRearMounted: boolean;
  readonly isOmniPodMounted: boolean;
} {
  const rearSuffix = / *[(](?:R|Rear)[)] *$/i;
  const podSuffix = /\s*\(OMNIPOD\)\s*$/i;
  let isOmniPodMounted = false;
  // MtfFile.java:952-956,1010-1021: armor, pod, Mek turret, then rear markers.
  const unarmored = token.replace(/\s*\(ARMORED\)\s*$/i, '');
  const mountName = unarmored
    .replace(podSuffix, () => {
      isOmniPodMounted = true;
      return '';
    })
    .replace(/\s*\(T\)\s*$/i, '');
  // Java reads variable size before the pod flag (:1005-1013). Keep the
  // established lookup spelling while observing that same pre-size suffix.
  const sizeIndex = unarmored.toUpperCase().indexOf(':SIZE:');
  if (sizeIndex > 0)
    isOmniPodMounted = podSuffix.test(unarmored.slice(0, sizeIndex));
  return {
    lookupToken: mountName.replace(rearSuffix, '').trim(),
    isRearMounted: rearSuffix.test(mountName),
    isOmniPodMounted,
  };
}
