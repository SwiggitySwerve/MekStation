import type { IPilot } from '@/types/pilot';

export interface UpdateQueryBuilder {
  fields: string[];
  values: unknown[];
}

export function buildUpdateQuery(
  updates: Partial<IPilot>,
  now: string,
): UpdateQueryBuilder {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.callsign !== undefined) {
    fields.push('callsign = ?');
    values.push(updates.callsign || null);
  }
  if (updates.affiliation !== undefined) {
    fields.push('affiliation = ?');
    values.push(updates.affiliation || null);
  }
  if (updates.portrait !== undefined) {
    fields.push('portrait = ?');
    values.push(updates.portrait || null);
  }
  if (updates.background !== undefined) {
    fields.push('background = ?');
    values.push(updates.background || null);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.skills !== undefined) {
    fields.push('gunnery = ?', 'piloting = ?');
    values.push(updates.skills.gunnery, updates.skills.piloting);
  }
  if (updates.wounds !== undefined) {
    fields.push('wounds = ?');
    values.push(updates.wounds);
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now);
  }

  return { fields, values };
}
