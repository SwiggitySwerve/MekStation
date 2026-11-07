import type { IRecordSheetMechCrew } from '@/types/printing';

import { getMechCrewRoles } from '@/types/pilot';

/** Native indexed identity/visibility; MML62bf193 PrintEntity:495-535,595-616. */
export function renderNativeMechCrew(
  root: SVGSVGElement,
  crew: IRecordSheetMechCrew,
): void {
  const roles = getMechCrewRoles(crew.crewType);
  const element = (id: string): SVGGraphicsElement | null =>
    root.querySelector(`#${id}`);
  const visible = (id: string, show: boolean): void => {
    element(id)?.setAttribute('visibility', show ? 'visible' : 'hidden');
  };
  // PrintMek:343-348 selects the native frame independently of seat assignments.
  for (const [index, suffix] of ['Single', 'Dual', 'Triple'].entries()) {
    visible(`warriorData${suffix}`, roles.length === index + 1);
  }
  for (
    let index = 0;
    index < getMechCrewRoles('SUPERHEAVY_TRIPOD').length;
    index++
  ) {
    const active = index < roles.length;
    const pilot = active ? crew.slots[index].pilot : undefined;
    for (const prefix of [
      'crewDamage',
      'crewName',
      'gunnerySkillText',
      'pilotingSkillText',
    ]) {
      visible(`${prefix}${index}`, active);
    }
    const label = element(`crewName${index}`) as SVGTextElement | null;
    let offset = 0;
    if (active && label) {
      const oldWidth = label.getComputedTextLength();
      label.textContent = `${roles[index]}:`;
      offset = label.getBBox().width - oldWidth;
    }
    const name = element(`pilotName${index}`) as SVGTextElement | null;
    if (active && name && offset !== 0) {
      const previous = name.getAttribute('x');
      name.setAttribute(
        'x',
        String(
          offset +
            (previous?.trim()
              ? Number(previous)
              : name.getStartPositionOfChar(0).x),
        ),
      );
    }
    for (const [prefix, value] of [
      ['pilotName', pilot?.name ?? ''],
      ['gunnerySkill', pilot ? String(pilot.gunnery) : ''],
      ['pilotingSkill', pilot ? String(pilot.piloting) : ''],
    ]) {
      const field = element(`${prefix}${index}`);
      if (field) field.textContent = value;
      visible(`${prefix}${index}`, active && pilot !== undefined);
    }
    visible(`blanksCrew${index}`, active && !pilot);
    visible(`blankCrewName${index}`, active && !pilot?.name);
    visible(`blankGunnerySkill${index}`, active && !pilot);
    visible(`blankPilotingSkill${index}`, active && !pilot);
    if (active && !pilot && offset !== 0) {
      const blank = element(`blankCrewName${index}`);
      if (blank) {
        const rect = blank.getBBox();
        blank.setAttribute(
          'd',
          `M ${rect.x + offset},${rect.y} ${rect.x + rect.width},${rect.y}`,
        );
      }
    }
  }
}
