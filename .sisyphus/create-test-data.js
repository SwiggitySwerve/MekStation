#!/usr/bin/env node

/**
 * Create test data for UX audit
 * This script creates all required entities via the API
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

// Ensure evidence directory exists
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const manifest = {
  units: {},
  pilots: {},
  forces: {},
  encounters: {},
  campaigns: {},
  compendiumUnitExample: 'atlas-as7-d',
  compendiumEquipmentExample: 'medium-laser',
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
       res.on('end', () => {
         try {
           const parsed = JSON.parse(data);
           resolve({ status: res.statusCode, data: parsed });
         } catch {
           resolve({ status: res.statusCode, data: data });
         }
       });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Create a custom unit
 */
async function createUnit(chassis, variant, unitType = 'Mek') {
  const body = {
    chassis: chassis,
    variant: variant,
    data: {
      type: unitType,
      tonnage: 70,
      techBase: 'IS',
      rules: 'Standard',
    },
  };

  const response = await makeRequest('POST', '/api/units/custom', body);
  if (response.status === 201 && response.data.id) {
    console.log(`✓ Created ${unitType}: ${response.data.id}`);
    return response.data.id;
  } else {
    console.error(`✗ Failed to create ${unitType}:`, response.data);
    return null;
  }
}

/**
 * Create a pilot
 */
async function createPilot(name, callsign) {
  const body = {
    mode: 'full',
    options: {
      type: 'persistent',
      identity: {
        name: name,
        callsign: callsign,
      },
      statblock: {
        gunnery: 3,
        piloting: 3,
        wounds: 0,
        xp: 0,
      },
    },
  };

  const response = await makeRequest('POST', '/api/pilots', body);
  if (response.status === 201 && response.data.id) {
    console.log(`✓ Created pilot: ${response.data.id}`);
    return response.data.id;
  } else {
    console.error(`✗ Failed to create pilot:`, response.data);
    return null;
  }
}

/**
 * Create a force
 */
async function createForce(name, pilotId, unitId) {
  const body = {
    name: name,
    forceType: 'lance',
    affiliation: 'Federated Suns',
  };

  const response = await makeRequest('POST', '/api/forces', body);
  if (response.status === 201 && response.data.force && response.data.force.id) {
    const forceId = response.data.force.id;
    console.log(`✓ Created force: ${forceId}`);
    
    if (pilotId && unitId) {
      const assignResponse = await makeRequest(
        'POST',
        `/api/forces/${forceId}/assignments`,
        { pilotId, unitId, position: 'lead' }
      );
      if (assignResponse.status === 201) {
        console.log(`  ✓ Assigned pilot and unit to force`);
      }
    }
    
    return forceId;
  } else {
    console.error(`✗ Failed to create force:`, response.data);
    return null;
  }
}

/**
 * Create an encounter
 */
async function createEncounter(name) {
   const body = {
     name: name,
     description: 'Test encounter for UX audit',
   };

  const response = await makeRequest('POST', '/api/encounters', body);
  if (response.status === 201 && response.data.encounter && response.data.encounter.id) {
    console.log(`✓ Created encounter: ${response.data.encounter.id}`);
    return response.data.encounter.id;
  } else {
    console.error(`✗ Failed to create encounter:`, response.data);
    return null;
  }
}

/**
 * Create a campaign
 */
async function createCampaign() {
   console.log(`⚠ Campaign API not yet implemented, skipping campaign creation`);
   return null;
}

/**
 * Main execution
 */
async function main() {
  console.log('Creating test data for UX audit...\n');

  try {
    // Create 6 unit types
    console.log('Creating units...');
    manifest.units.battlemech = await createUnit('Atlas', 'AS7-D-Custom-2', 'Mek');
    manifest.units.vehicle = await createUnit('Hunchback', 'HBK-4G-Custom-2', 'Vehicle');
    manifest.units.aerospace = await createUnit('Locust', 'LCT-1V-Custom-2', 'Aerospace');
    manifest.units.battleArmor = await createUnit('Elemental', 'BA-Custom-2', 'BattleArmor');
    manifest.units.infantry = await createUnit('Rifle Squad', 'INF-Custom-2', 'Infantry');
    manifest.units.protomech = await createUnit('Sprite', 'SPR-H-Custom-2', 'ProtoMech');

    // Create pilot
    console.log('\nCreating pilot...');
    manifest.pilots.pilot1 = await createPilot('Test Pilot', 'Ace');

    // Create force
    console.log('\nCreating force...');
    if (manifest.units.battlemech && manifest.pilots.pilot1) {
      manifest.forces.force1 = await createForce(
        'Test Force',
        manifest.pilots.pilot1,
        manifest.units.battlemech
      );
    }

    // Create encounter
    console.log('\nCreating encounter...');
    if (manifest.forces.force1) {
      manifest.encounters.encounter1 = await createEncounter(
        'Test Encounter',
        manifest.forces.force1
      );
    }

     // Create campaign
     console.log('\nCreating campaign...');
     if (manifest.forces.force1) {
       manifest.campaigns.campaign1 = await createCampaign();
     }

    // Write manifest
    console.log('\nWriting manifest...');
    const manifestPath = path.join(EVIDENCE_DIR, 'test-data-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✓ Manifest written to ${manifestPath}`);

    console.log('\n✓ Test data creation complete!');
    console.log('\nManifest:');
    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

main();
