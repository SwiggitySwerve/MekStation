import { render, screen } from '@testing-library/react';
import React from 'react';

import { UNIT_TEMPLATES } from '@/stores/useMultiUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  AEROSPACE_TEMPLATES,
  BATTLE_ARMOR_TEMPLATES,
  INFANTRY_TEMPLATES,
  PROTOMECH_TEMPLATES,
  VEHICLE_TEMPLATES,
} from '../NewTabModal.constants';
import { NewTabModalNewMode } from '../NewTabModalNewMode';

it('shows upward-rounded movement on medium and assault vehicle templates', () => {
  render(
    <NewTabModalNewMode
      unitType={UnitType.VEHICLE}
      setUnitType={jest.fn()}
      selectedMechTemplate={UNIT_TEMPLATES[0]}
      setSelectedMechTemplate={jest.fn()}
      selectedVehicleTemplate={VEHICLE_TEMPLATES[0]}
      setSelectedVehicleTemplate={jest.fn()}
      selectedAerospaceTemplate={AEROSPACE_TEMPLATES[0]}
      setSelectedAerospaceTemplate={jest.fn()}
      selectedBattleArmorTemplate={BATTLE_ARMOR_TEMPLATES[0]}
      setSelectedBattleArmorTemplate={jest.fn()}
      selectedInfantryTemplate={INFANTRY_TEMPLATES[0]}
      setSelectedInfantryTemplate={jest.fn()}
      selectedProtoMechTemplate={PROTOMECH_TEMPLATES[0]}
      setSelectedProtoMechTemplate={jest.fn()}
      techBase={TechBase.INNER_SPHERE}
      setTechBase={jest.fn()}
    />,
  );
  expect(
    screen.getByRole('button', { name: /Medium Vehicle/ }),
  ).toHaveTextContent('5/8 MP');
  expect(
    screen.getByRole('button', { name: /Assault Vehicle/ }),
  ).toHaveTextContent('3/5 MP');
});
