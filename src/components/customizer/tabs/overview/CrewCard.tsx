/**
 * Crew card
 *
 * Tripod and QuadVee crew seats for the record sheet. The seats come from the
 * unit's native crew type (TripodMek.java:115-117, Mek.java:7167,
 * QuadVee.java:164-166, MM 48fcb2f64); unassigned seats stay blank on the sheet.
 * A seat is assigned once it has a name and both skills (0 to Crew.MAX_SKILL).
 * MegaMekLab reads crew from the Entity or force and does not author it on a
 * design, so this is an app-level workflow.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useEffect, useState } from 'react';

import { useUnitStore } from '@/stores/useUnitStore';
import {
  getMechCrewType,
  MAX_CREW_SKILL,
  type IMechCrewSeat,
} from '@/types/pilot/MechCrewSeats';
import { getMechCrewRoles } from '@/types/pilot/MechCrewType';

import { customizerStyles as cs } from '../../styles';

interface ISeatDraft {
  readonly name: string;
  readonly gunnery: string;
  readonly piloting: string;
}

const EMPTY_DRAFT: ISeatDraft = { name: '', gunnery: '', piloting: '' };

function draftOf(seat: IMechCrewSeat | undefined): ISeatDraft {
  return seat
    ? {
        name: seat.name,
        gunnery: String(seat.gunnery),
        piloting: String(seat.piloting),
      }
    : EMPTY_DRAFT;
}

function parseSkill(text: string): number | undefined {
  if (!/^\d+$/.test(text)) return undefined;
  const value = Number(text);
  return value <= MAX_CREW_SKILL ? value : undefined;
}

/** The seat a draft describes, when it is complete and valid. */
function seatOf(slotIndex: number, draft: ISeatDraft): IMechCrewSeat | null {
  const gunnery = parseSkill(draft.gunnery);
  const piloting = parseSkill(draft.piloting);
  return draft.name.trim() !== '' &&
    gunnery !== undefined &&
    piloting !== undefined
    ? { slotIndex, name: draft.name, gunnery, piloting }
    : null;
}

function SeatRow({
  slotIndex,
  role,
  readOnly,
}: {
  readonly slotIndex: number;
  readonly role: string;
  readonly readOnly: boolean;
}): React.ReactElement {
  const seat = useUnitStore((s) =>
    s.crewSeats?.find((entry) => entry.slotIndex === slotIndex),
  );
  const setCrewSeat = useUnitStore((s) => s.setCrewSeat);
  const clearCrewSeat = useUnitStore((s) => s.clearCrewSeat);
  const [draft, setDraft] = useState<ISeatDraft>(() => draftOf(seat));

  // Follow the store when it changes elsewhere (undo, redo, reopen). A draft
  // that is still being typed, or that was emptied by clearing the name, stays.
  const seatName = seat?.name;
  const seatGunnery = seat?.gunnery;
  const seatPiloting = seat?.piloting;
  useEffect(() => {
    if (seatName !== undefined) {
      setDraft(
        draftOf({
          slotIndex,
          name: seatName,
          gunnery: seatGunnery ?? 0,
          piloting: seatPiloting ?? 0,
        }),
      );
    } else {
      setDraft((current) =>
        seatOf(slotIndex, current) ? EMPTY_DRAFT : current,
      );
    }
  }, [slotIndex, seatName, seatGunnery, seatPiloting]);

  const update = (patch: Partial<ISeatDraft>): void => {
    const next = { ...draft, ...patch };
    setDraft(next);
    const complete = seatOf(slotIndex, next);
    if (complete) setCrewSeat(complete);
    else if (seat) clearCrewSeat(slotIndex);
  };
  const skillInvalid = (text: string): boolean =>
    text !== '' && parseSkill(text) === undefined;
  const field = `${cs.input.full} ${cs.input.noSpinners}`;

  return (
    <div
      data-testid={`crew-seat-${slotIndex}`}
      data-role={role}
      className="grid grid-cols-2 gap-x-3 gap-y-3 @lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] @lg:gap-x-4"
    >
      <div className={`${cs.layout.field} col-span-2 @lg:col-span-1`}>
        <label className={cs.text.label} htmlFor={`crew-${slotIndex}-name`}>
          {role}
        </label>
        <input
          id={`crew-${slotIndex}-name`}
          type="text"
          aria-label={`${role} Name`}
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          disabled={readOnly}
          className={cs.input.full}
          placeholder="Unassigned"
        />
      </div>
      <div className={cs.layout.field}>
        <label className={cs.text.label} htmlFor={`crew-${slotIndex}-gunnery`}>
          Gunnery
        </label>
        <input
          id={`crew-${slotIndex}-gunnery`}
          type="number"
          inputMode="numeric"
          aria-label={`${role} Gunnery`}
          aria-invalid={skillInvalid(draft.gunnery) || undefined}
          value={draft.gunnery}
          onChange={(e) => update({ gunnery: e.target.value })}
          disabled={readOnly}
          min={0}
          max={MAX_CREW_SKILL}
          className={field}
        />
      </div>
      <div className={cs.layout.field}>
        <label className={cs.text.label} htmlFor={`crew-${slotIndex}-piloting`}>
          Piloting
        </label>
        <input
          id={`crew-${slotIndex}-piloting`}
          type="number"
          inputMode="numeric"
          aria-label={`${role} Piloting`}
          aria-invalid={skillInvalid(draft.piloting) || undefined}
          value={draft.piloting}
          onChange={(e) => update({ piloting: e.target.value })}
          disabled={readOnly}
          min={0}
          max={MAX_CREW_SKILL}
          className={field}
        />
      </div>
    </div>
  );
}

export function CrewCard({
  readOnly = false,
  className = '',
}: {
  readonly readOnly?: boolean;
  readonly className?: string;
}): React.ReactElement | null {
  const configuration = useUnitStore((s) => s.configuration);
  const tonnage = useUnitStore((s) => s.tonnage);
  const crewSeats = useUnitStore((s) => s.crewSeats);
  const crewType = getMechCrewType(configuration, tonnage);
  if (!crewType) return null;

  const roles = getMechCrewRoles(crewType);
  const hidden = (crewSeats ?? []).filter(
    (seat) => seat.slotIndex >= roles.length,
  );

  return (
    <section
      aria-labelledby="overview-crew-title"
      data-testid="overview-crew"
      className={`${cs.panel.main} @container ${className}`}
    >
      <div className="border-border-theme mb-4 flex flex-col gap-1 border-b pb-3 @sm:flex-row @sm:items-baseline @sm:justify-between">
        <h3 id="overview-crew-title" className={cs.text.cardTitle}>
          Crew
        </h3>
        <p className="text-text-theme-secondary text-sm @sm:text-right">
          {roles.join(' / ')}
        </p>
      </div>
      <p className="text-text-theme-secondary mb-4 text-sm">
        Printed on the record sheet. A seat is assigned once it has a name and
        both skills (0 to {MAX_CREW_SKILL}); other seats print blank.
      </p>
      <div className="space-y-4">
        {roles.map((role, slotIndex) => (
          <SeatRow
            key={role}
            slotIndex={slotIndex}
            role={role}
            readOnly={readOnly}
          />
        ))}
      </div>
      {hidden.length > 0 && (
        <p
          data-testid="crew-stored-seat-note"
          className="text-text-theme-secondary mt-4 text-sm"
        >
          A saved Tech Officer ({hidden[0].name}) is kept, but this unit has no
          Tech Officer seat at 100 tons or less, so it is not printed.
        </p>
      )}
    </section>
  );
}
