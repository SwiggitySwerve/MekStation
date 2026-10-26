import React, { createContext, useContext } from 'react';

type RegisterHost = (host: HTMLElement | null) => void;

/** Lets an editor layout host the active unit's edit history (undo/redo). */
export const UnitEditStatusSlotContext = createContext<RegisterHost | null>(
  null,
);

/**
 * Place for undo/redo inside an existing band. An editor that renders this
 * slot also shows the save state itself (next to its validation status).
 * Editors without a slot keep the dedicated history-and-save row that
 * MultiUnitTabs renders as its fallback.
 */
export function UnitEditStatusSlot({
  className = '',
}: {
  className?: string;
}): React.ReactElement | null {
  const register = useContext(UnitEditStatusSlotContext);
  return register ? (
    <div
      ref={register}
      className={className}
      data-testid="unit-edit-status-slot"
    />
  ) : null;
}
