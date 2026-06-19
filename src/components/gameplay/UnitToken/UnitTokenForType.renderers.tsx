import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import { TokenUnitType } from '@/types/gameplay';

import type { IUnitEventState } from './tokenTypes';

import { AerospaceToken } from './AerospaceToken';
import { BattleArmorToken } from './BattleArmorToken';
import { InfantryToken } from './InfantryToken';
import { MechToken } from './MechToken';
import { ProtoMechToken } from './ProtoMechToken';
import { VehicleToken } from './VehicleToken';

export function renderUnitTokenForType(
  renderToken: IUnitToken,
  eventState: IUnitEventState,
): React.ReactElement {
  switch (renderToken.unitType) {
    case TokenUnitType.Vehicle:
      return <VehicleToken token={renderToken} eventState={eventState} />;

    case TokenUnitType.Aerospace:
      return <AerospaceToken token={renderToken} eventState={eventState} />;

    case TokenUnitType.BattleArmor:
      return <BattleArmorToken token={renderToken} eventState={eventState} />;

    case TokenUnitType.Infantry:
      return <InfantryToken token={renderToken} eventState={eventState} />;

    case TokenUnitType.ProtoMech:
      return <ProtoMechToken token={renderToken} eventState={eventState} />;

    case TokenUnitType.Mech:
      return <MechToken token={renderToken} eventState={eventState} />;
  }
}
