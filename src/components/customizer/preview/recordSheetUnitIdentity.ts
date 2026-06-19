export interface RecordSheetUnitIdentityInput {
  id: string;
  name: string;
  chassis: string;
  model: string;
  techBase: string;
  rulesLevel: string;
  year: number;
}

export interface RecordSheetUnitIdentityWithTonnageInput extends RecordSheetUnitIdentityInput {
  tonnage: number;
}

export function buildRecordSheetNameParts(
  input: Pick<RecordSheetUnitIdentityInput, 'name' | 'chassis' | 'model'>,
): { chassis: string; model: string } {
  return {
    chassis: input.chassis || input.name.split(' ')[0] || 'Unknown',
    model: input.model || input.name.split(' ').slice(1).join(' ') || 'Custom',
  };
}

export function buildRecordSheetUnitIdentity(
  input: RecordSheetUnitIdentityWithTonnageInput,
): {
  id: string;
  name: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  rulesLevel: string;
  era: string;
} {
  const { chassis, model } = buildRecordSheetNameParts(input);
  return {
    id: input.id,
    name: input.name,
    chassis,
    model,
    tonnage: input.tonnage,
    techBase: String(input.techBase),
    rulesLevel: String(input.rulesLevel),
    era: `Year ${input.year}`,
  };
}
