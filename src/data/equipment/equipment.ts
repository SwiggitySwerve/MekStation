import { Equipment } from './types';

// CASE - Original ammunition protection equipment
export const CASE: Equipment = {
  id: 'case',
  name: 'CASE',
  category: 'Equipment',
  baseType: 'CASE',
  description: 'Cellular Ammunition Storage Equipment - Basic ammo explosion protection',
  requiresAmmo: false,
  introductionYear: 2476,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 50000,
      battleValue: 0
    }
  }
};

// CASE II - Enhanced ammunition protection equipment
export const CASEII: Equipment = {
  id: 'caseii',
  name: 'CASEII',
  category: 'Equipment',
  baseType: 'CASEII',
  description: 'Cellular Ammunition Storage Equipment II - Enhanced ammo explosion protection',
  requiresAmmo: false,
  introductionYear: 3143,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 175000,
      battleValue: 0
    }
  }
};

export const ANTI_PERSONNEL_PODS: Equipment = {
  id: 'anti_personnel_pods',
  name: 'Anti-Personnel Pods',
  category: 'Equipment',
  baseType: 'Anti-Personnel Pods',
  description: 'Anti-personnel protection pods for defending against infantry',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 1500,
      battleValue: 1
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 1500,
      battleValue: 1
    }
  }
};

export const CARGO: Equipment = {
  id: 'cargo',
  name: 'Cargo',
  category: 'Equipment',
  baseType: 'Cargo',
  description: 'Cargo storage space for transporting materials',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 0,
      battleValue: 0
    },
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 0,
      battleValue: 0
    }
  }
};

export const COMMUNICATIONS_EQUIPMENT: Equipment = {
  id: 'communications_equipment',
  name: 'Communications Equipment',
  category: 'Equipment',
  baseType: 'Communications Equipment',
  description: 'Enhanced communications equipment for improved battlefield coordination',
  requiresAmmo: false,
  introductionYear: 2100,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 10000,
      battleValue: 0
    },
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 10000,
      battleValue: 0
    }
  }
};

export const COOLANT_POD: Equipment = {
  id: 'coolant_pod',
  name: 'Coolant Pod',
  category: 'Equipment',
  baseType: 'Coolant Pod',
  description: 'Emergency coolant system for heat management',
  requiresAmmo: false,
  introductionYear: 3058,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 50000,
      battleValue: 0
    },
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 50000,
      battleValue: 0
    }
  }
};

export const DIRECT_NEURAL_INTERFACE: Equipment = {
  id: 'direct_neural_interface',
  name: 'Direct Neural Interface',
  category: 'Equipment',
  baseType: 'Direct Neural Interface',
  description: 'Direct neural interface connection for enhanced pilot control',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0,
      crits: 0,
      heat: 0,
      minRange: 0,
      cost: 50000,
      battleValue: 0
    }
  }
};

// Equipment category contains legitimate browsable installable equipment
export const EQUIPMENT: Equipment[] = [
  CASE,
  CASEII,
  ANTI_PERSONNEL_PODS,
  CARGO,
  COMMUNICATIONS_EQUIPMENT,
  COOLANT_POD,
  DIRECT_NEURAL_INTERFACE
];
