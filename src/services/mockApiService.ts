// battletech-editor-app/services/mockApiService.ts

// This service is now primarily for fetching static metadata files (like dropdown options)
// from the /public/mockdata directory.
// Functions for fetching main unit/equipment lists (getUnits, getEquipment) have been
// removed as components now call the actual API routes.

async function fetchMockDataFile(filePath: string): Promise<any> {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Mock API Error: Could not fetch ${filePath} - ${response.statusText}`);
  }
  return response.json();
}

export const getMetadata = async (filePath: string): Promise<string[]> => {
    console.log("Mock API: getMetadata called for:", filePath);
    return fetchMockDataFile(filePath);
};





