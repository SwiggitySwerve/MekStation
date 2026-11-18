/**
 * The save dialog's chassis and variant fields for one open session. A fresh
 * open mount already starts from the initial names, so text typed before the
 * open effect runs is kept; reopening this instance, or new initial names,
 * reset the fields.
 */
import { useEffect, useRef, useState } from 'react';

const namesKey = (chassis: string, variant: string): string =>
  JSON.stringify([chassis, variant]);

export function useOpenSessionNames(
  isOpen: boolean,
  initialChassis: string,
  initialVariant: string,
): {
  readonly chassis: string;
  readonly setChassis: (chassis: string) => void;
  readonly variant: string;
  readonly setVariant: (variant: string) => void;
} {
  const [chassis, setChassis] = useState(initialChassis);
  const [variant, setVariant] = useState(initialVariant);
  // The names this instance last opened with; null while closed.
  const openedWith = useRef(
    isOpen ? namesKey(initialChassis, initialVariant) : null,
  );
  useEffect(() => {
    if (!isOpen) {
      openedWith.current = null;
      return;
    }
    const names = namesKey(initialChassis, initialVariant);
    if (openedWith.current !== names) {
      setChassis(initialChassis);
      setVariant(initialVariant);
    }
    openedWith.current = names;
  }, [isOpen, initialChassis, initialVariant]);
  return { chassis, setChassis, variant, setVariant };
}
