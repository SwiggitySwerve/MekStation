/**
 * Mock API Service - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function fetchUnits(): Promise<ApiResponse<unknown[]>> {
  return { success: true, data: [] };
}

export async function fetchUnit(id: string): Promise<ApiResponse<unknown>> {
  return { success: true, data: null };
}

export async function saveUnit(unit: unknown): Promise<ApiResponse<string>> {
  return { success: true, data: 'saved' };
}

export async function deleteUnit(id: string): Promise<ApiResponse<boolean>> {
  return { success: true, data: true };
}

export async function fetchEquipment(): Promise<ApiResponse<unknown[]>> {
  return { success: true, data: [] };
}

export async function getMetadata(_path?: string): Promise<string[]> {
  return [];
}


