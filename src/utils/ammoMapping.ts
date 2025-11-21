// Ammo to weapon mapping for linking ammo types to their compatible weapons

export interface AmmoMapping {
  ammoType: string;
  compatibleWeapons: string[];
}

export const AMMO_MAPPINGS: AmmoMapping[] = [
  {
    ammoType: 'AC/2 Ammo',
    compatibleWeapons: ['AC/2', 'Ultra AC/2', 'LB 2-X AC', 'Rotary AC/2']
  },
  {
    ammoType: 'AC/5 Ammo',
    compatibleWeapons: ['AC/5', 'Ultra AC/5', 'LB 5-X AC', 'Rotary AC/5']
  },
  {
    ammoType: 'AC/10 Ammo',
    compatibleWeapons: ['AC/10', 'Ultra AC/10', 'LB 10-X AC']
  },
  {
    ammoType: 'AC/20 Ammo',
    compatibleWeapons: ['AC/20', 'Ultra AC/20', 'LB 20-X AC']
  },
  {
    ammoType: 'Gauss Ammo',
    compatibleWeapons: ['Gauss Rifle', 'Light Gauss Rifle', 'Heavy Gauss Rifle']
  },
  {
    ammoType: 'SRM Ammo',
    compatibleWeapons: ['SRM 2', 'SRM 4', 'SRM 6', 'Streak SRM 2', 'Streak SRM 4', 'Streak SRM 6']
  },
  {
    ammoType: 'LRM Ammo',
    compatibleWeapons: ['LRM 5', 'LRM 10', 'LRM 15', 'LRM 20', 'Enhanced LRM 5', 'Enhanced LRM 10', 'Enhanced LRM 15', 'Enhanced LRM 20']
  },
  {
    ammoType: 'MRM Ammo',
    compatibleWeapons: ['MRM 10', 'MRM 20', 'MRM 30', 'MRM 40']
  },
  {
    ammoType: 'ATM Standard Ammo',
    compatibleWeapons: ['ATM 3', 'ATM 6', 'ATM 9', 'ATM 12']
  },
  {
    ammoType: 'ATM ER Ammo',
    compatibleWeapons: ['ATM 3', 'ATM 6', 'ATM 9', 'ATM 12']
  },
  {
    ammoType: 'ATM HE Ammo',
    compatibleWeapons: ['ATM 3', 'ATM 6', 'ATM 9', 'ATM 12']
  },
  {
    ammoType: 'Machine Gun Ammo',
    compatibleWeapons: ['Machine Gun', 'Light Machine Gun', 'Heavy Machine Gun', 'Machine Gun Array']
  },
  {
    ammoType: 'Flamer Ammo',
    compatibleWeapons: ['Vehicle Flamer', 'Heavy Flamer']
  },
  {
    ammoType: 'AMS Ammo',
    compatibleWeapons: ['Anti-Missile System', 'Laser Anti-Missile System']
  },
  {
    ammoType: 'Narc Ammo',
    compatibleWeapons: ['Narc Missile Beacon', 'Improved Narc Launcher']
  },
  {
    ammoType: 'Arrow IV Ammo',
    compatibleWeapons: ['Arrow IV']
  },
  {
    ammoType: 'Long Tom Ammo',
    compatibleWeapons: ['Long Tom Artillery']
  },
  {
    ammoType: 'Sniper Ammo',
    compatibleWeapons: ['Sniper Artillery']
  },
  {
    ammoType: 'Thumper Ammo',
    compatibleWeapons: ['Thumper Artillery']
  }
];

export function getCompatibleWeapons(ammoType: string): string[] {
  const mapping = AMMO_MAPPINGS.find(m => m.ammoType === ammoType);
  return mapping ? mapping.compatibleWeapons : [];
}

export function getCompatibleAmmo(weaponName: string): string[] {
  const compatibleAmmo: string[] = [];
  
  AMMO_MAPPINGS.forEach(mapping => {
    if (mapping.compatibleWeapons.some(weapon => 
      weaponName.includes(weapon) || weapon.includes(weaponName)
    )) {
      compatibleAmmo.push(mapping.ammoType);
    }
  });
  
  return compatibleAmmo;
}

export function hasCompatibleWeapon(ammoType: string, loadedWeapons: string[]): boolean {
  const compatibleWeapons = getCompatibleWeapons(ammoType);
  
  return loadedWeapons.some(weaponName => 
    compatibleWeapons.some(compatible => 
      weaponName.includes(compatible) || compatible.includes(weaponName)
    )
  );
}

export function getAmmoWarning(ammoType: string, loadedWeapons: string[]): string | null {
  if (!hasCompatibleWeapon(ammoType, loadedWeapons)) {
    const compatibleWeapons = getCompatibleWeapons(ammoType);
    if (compatibleWeapons.length > 0) {
      return `No compatible weapon loaded. This ammo requires: ${compatibleWeapons.join(', ')}`;
    }
  }
  return null;
}
