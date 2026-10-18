/**
 * Unified record-sheet service pipeline: preview, PDF, and print all share
 * getSVGString + bounded canvas rasterization. Also covers printRecordSheet
 * popup reservation, cleanup, and lossless PNG embedding.
 */

import type { IAerospaceRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IBattleArmorRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IInfantryRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IProtoMechRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IVehicleRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { IRecordSheetData } from '@/types/printing';

import { RecordSheetService } from '@/services/printing/RecordSheetService';
import {
  createMockCanvas,
  installSvgImageMock,
  restoreSvgImageMock,
} from '@/services/printing/svgRecordSheetRenderer/__tests__/canvas.test-helpers';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

const addImage = jest.fn();
const save = jest.fn();

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage,
    save,
  })),
}));

const LETTER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792" width="612" height="792"></svg>';
const A4_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595 842" width="595" height="842"></svg>';

const commonUnit = {
  id: 'fixture',
  name: 'Fixture Unit',
  chassis: 'Fixture',
  model: 'FX-1',
  tonnage: 50,
  techBase: 'Inner Sphere',
  rulesLevel: 'Standard',
  era: '3025',
  battleValue: 1000,
  cost: 2500000,
};

const mechUnit = {
  ...commonUnit,
  name: 'Atlas AS7-D',
  chassis: 'Atlas',
  model: 'AS7-D',
  tonnage: 100,
  configuration: 'Biped',
  engine: { type: 'Fusion', rating: 300 },
  gyro: { type: 'Standard' },
  structure: { type: 'Standard' },
  armor: {
    type: 'Standard',
    allocation: {
      head: 9,
      centerTorso: 32,
      centerTorsoRear: 14,
      leftTorso: 32,
      leftTorsoRear: 10,
      rightTorso: 32,
      rightTorsoRear: 10,
      leftArm: 34,
      rightArm: 34,
      leftLeg: 41,
      rightLeg: 41,
    },
  },
  heatSinks: { type: 'Single', count: 20 },
  movement: { walkMP: 3, runMP: 5, jumpMP: 0 },
  equipment: [],
  battleValue: 1897,
  cost: 9626000,
};

const vehicleUnit = {
  ...commonUnit,
  type: 'vehicle',
  chassis: 'Vedette',
  model: 'Medium Tank',
  motionType: 'Tracked',
  turretConfig: 'Single',
  cruiseMP: 4,
  flankMP: 6,
  armorType: 'Standard',
  armorAllocation: {
    Front: { current: 40, maximum: 40 },
    'Left Side': { current: 30, maximum: 30 },
    'Right Side': { current: 30, maximum: 30 },
    Rear: { current: 24, maximum: 24 },
    Turret: { current: 36, maximum: 36 },
  },
  crew: [
    { role: 'driver', gunnery: 5, piloting: 4 },
    { role: 'gunner', gunnery: 4, piloting: 5 },
    { role: 'commander', gunnery: 4, piloting: 4 },
  ],
  equipment: [],
} satisfies IVehicleRecordSheetUnitInput;

const aerospaceUnit = {
  ...commonUnit,
  type: 'aerospace',
  chassis: 'Shilone',
  model: 'SL-17',
  structuralIntegrity: 8,
  fuelPoints: 400,
  safeThrust: 6,
  maxThrust: 9,
  heatSinks: { type: 'Double', count: 10 },
  armorType: 'Ferro-Aluminum',
  armorArcs: {
    Nose: { current: 30, maximum: 30 },
    'Left Wing': { current: 24, maximum: 24 },
    'Right Wing': { current: 24, maximum: 24 },
    Aft: { current: 18, maximum: 18 },
  },
  equipment: [],
} satisfies IAerospaceRecordSheetUnitInput;

const battleArmorUnit = {
  ...commonUnit,
  type: 'battlearmor',
  chassis: 'Elemental',
  model: 'Point',
  squadSize: 5,
  troopers: Array.from({ length: 5 }, (_, index) => ({
    index: index + 1,
    armorPips: 10,
    maximumArmorPips: 10,
    modularWeapon: 'Small Laser',
    apWeapon: 'SMG',
    gunnery: 4,
    antiMech: 5,
  })),
  manipulators: { left: 'Battle Claw', right: 'Manipulator' },
  walkMP: 1,
  jumpMP: 3,
  umuMP: 0,
  vtolMP: 0,
} satisfies IBattleArmorRecordSheetUnitInput;

const infantryUnit = {
  ...commonUnit,
  type: 'infantry',
  chassis: 'Rifle Platoon',
  model: 'Marine Jump',
  platoonComposition: { squads: 7, troopersPerSquad: 4 },
  infantryMotive: 'Jump',
  armorKit: 'Flak',
  primaryWeaponId: 'inf-rifle',
  secondaryWeaponId: 'inf-srm2',
  secondaryWeaponCount: 7,
  hasAntiMechTraining: true,
  gunnery: 4,
  antiMech: 5,
} satisfies IInfantryRecordSheetUnitInput;

const protoMechUnit = {
  ...commonUnit,
  type: 'protomech',
  chassis: 'Roc',
  model: 'Point',
  pointSize: 5,
  protos: Array.from({ length: 5 }, (_, index) => ({
    index: index + 1,
    armorByLocation: {
      Head: { current: 6, maximum: 6 },
      Torso: { current: 6, maximum: 6 },
      'Left Arm': { current: 6, maximum: 6 },
      'Right Arm': { current: 6, maximum: 6 },
      Legs: { current: 6, maximum: 6 },
      'Main Gun': { current: 6, maximum: 6 },
    },
  })),
  walkMP: 5,
  jumpMP: 0,
  equipment: [],
} satisfies IProtoMechRecordSheetUnitInput;

function createPrintWindow(overrides?: {
  missingDocument?: boolean;
  missingEventListener?: boolean;
}) {
  const close = jest.fn();
  const print = jest.fn();
  const write = jest.fn();
  const docClose = jest.fn();
  const addEventListener = jest.fn();

  return {
    document: overrides?.missingDocument
      ? undefined
      : {
          write,
          close: docClose,
          open: jest.fn(),
          fonts: { ready: Promise.resolve() },
          images: [] as HTMLImageElement[],
        },
    close,
    print,
    addEventListener: overrides?.missingEventListener
      ? undefined
      : addEventListener,
  };
}

function mockWindowOpen(
  result: ReturnType<typeof createPrintWindow> | null,
): void {
  jest
    .spyOn(window, 'open')
    .mockImplementation((() => result) as unknown as typeof window.open);
}

describe('RecordSheetService unified pipeline', () => {
  let service: RecordSheetService;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    jest.clearAllMocks();
    installSvgImageMock();
    service = new RecordSheetService();
  });

  afterEach(() => {
    restoreSvgImageMock();
    jest.restoreAllMocks();
    document.createElement = originalCreateElement;
  });

  function allFamilyData(): IRecordSheetData[] {
    return [
      service.extractData(mechUnit),
      service.extractData(vehicleUnit),
      service.extractData(aerospaceUnit),
      service.extractData(battleArmorUnit),
      service.extractData(infantryUnit),
      service.extractData(protoMechUnit),
    ];
  }

  it('routes preview for all six families through getSVGString at the selected paper size', async () => {
    const canvas = createMockCanvas();
    const getSVG = jest
      .spyOn(service, 'getSVGString')
      .mockResolvedValue(A4_SVG);

    for (const data of allFamilyData()) {
      getSVG.mockClear();
      await service.renderPreview(
        canvas as unknown as HTMLCanvasElement,
        data,
        PaperSize.A4,
      );
      expect(getSVG).toHaveBeenCalledTimes(1);
      expect(getSVG).toHaveBeenCalledWith(data, PaperSize.A4);
    }
  });

  it('rasterizes non-mech preview at the same bounded 4x paper size as mech preview', async () => {
    const canvas = createMockCanvas();
    jest.spyOn(service, 'getSVGString').mockResolvedValue(LETTER_SVG);
    const data = service.extractData(vehicleUnit);

    await service.renderPreview(
      canvas as unknown as HTMLCanvasElement,
      data,
      PaperSize.LETTER,
    );

    const letter = PAPER_DIMENSIONS[PaperSize.LETTER];
    expect(canvas.width).toBe(letter.width * 4);
    expect(canvas.height).toBe(letter.height * 4);
  });

  it('embeds a lossless PNG in the PDF using the shared getSVGString pipeline', async () => {
    const canvas = createMockCanvas();
    document.createElement = jest.fn((tag: string) => {
      if (tag === 'canvas') {
        return canvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    }) as unknown as typeof document.createElement;

    const data = service.extractData(mechUnit);
    const getSVG = jest
      .spyOn(service, 'getSVGString')
      .mockResolvedValue(LETTER_SVG);

    await service.exportPDF(data, {
      paperSize: PaperSize.LETTER,
      includePilotData: false,
    });

    expect(getSVG).toHaveBeenCalledWith(data, PaperSize.LETTER);
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(addImage).toHaveBeenCalledWith(
      'data:image/png;base64,png-payload',
      'PNG',
      0,
      0,
      PAPER_DIMENSIONS[PaperSize.LETTER].width,
      PAPER_DIMENSIONS[PaperSize.LETTER].height,
      undefined,
      'FAST',
    );
    expect(addImage.mock.calls[0][1]).not.toBe('JPEG');
    expect(addImage.mock.calls[0][7]).toBe('FAST');
  });

  it('opens the print popup synchronously before awaiting SVG construction', async () => {
    const data = service.extractData(mechUnit);
    const printWindow = createPrintWindow();
    let openedBeforeAwait = false;
    mockWindowOpen(printWindow);

    jest.spyOn(service, 'getSVGString').mockImplementation(async () => {
      openedBeforeAwait = jest.mocked(window.open).mock.calls.length > 0;
      return LETTER_SVG;
    });

    await service.printRecordSheet(data, PaperSize.LETTER);

    expect(window.open).toHaveBeenCalled();
    expect(openedBeforeAwait).toBe(true);
    expect(printWindow?.print).toHaveBeenCalledTimes(1);
    expect(printWindow?.close).not.toHaveBeenCalled();
  });

  it('writes the selected A4 page size and SVG into the print window', async () => {
    const data = service.extractData(vehicleUnit);
    const printWindow = createPrintWindow();
    mockWindowOpen(printWindow);
    jest.spyOn(service, 'getSVGString').mockResolvedValue(A4_SVG);

    await service.printRecordSheet(data, PaperSize.A4);

    const written = String(
      printWindow?.document?.write.mock.calls[0]?.[0] ?? '',
    );
    expect(written).toContain('595');
    expect(written).toContain('842');
    expect(written).toContain('body > svg');
    expect(written).toContain('body > img');
    expect(written).not.toMatch(/^\s*svg,\s*img\s*\{/m);
    expect(written).toContain(A4_SVG);
    expect(printWindow?.print).toHaveBeenCalledTimes(1);
    expect(printWindow?.close).not.toHaveBeenCalled();
  });

  it('adds a 0 0 576 375 root viewBox for a viewBox-less vehicle SVG in print HTML', async () => {
    const vehicleSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="576" height="375"><rect width="576" height="375"/></svg>';
    const data = service.extractData(vehicleUnit);
    const printWindow = createPrintWindow();
    mockWindowOpen(printWindow);
    jest.spyOn(service, 'getSVGString').mockResolvedValue(vehicleSvg);

    await service.printRecordSheet(data, PaperSize.LETTER);

    const written = String(
      printWindow?.document?.write.mock.calls[0]?.[0] ?? '',
    );
    expect(written).toContain('viewBox="0 0 576 375"');
    expect(written).toContain('612pt');
    expect(written).toContain('792pt');
  });

  it('preserves an existing negative-margin viewBox in print HTML', async () => {
    const margined =
      '<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="-18 -18 612 792"></svg>';
    const data = service.extractData(mechUnit);
    const printWindow = createPrintWindow();
    mockWindowOpen(printWindow);
    jest.spyOn(service, 'getSVGString').mockResolvedValue(margined);

    await service.printRecordSheet(data, PaperSize.LETTER);

    const written = String(
      printWindow?.document?.write.mock.calls[0]?.[0] ?? '',
    );
    expect(written).toContain('viewBox="-18 -18 612 792"');
    expect(written).not.toContain('viewBox="0 0 612 792"');
    expect(written).toContain(margined);
  });

  it('throws on a blocked popup without attempting to close a null window', async () => {
    mockWindowOpen(null);
    const data = service.extractData(mechUnit);

    await expect(
      service.printRecordSheet(data, PaperSize.LETTER),
    ).rejects.toThrow('Could not open print window');
  });

  it('closes an owned popup without browser event support before printing', async () => {
    const printWindow = createPrintWindow({ missingEventListener: true });
    mockWindowOpen(printWindow);
    const data = service.extractData(mechUnit);
    jest.spyOn(service, 'getSVGString').mockResolvedValue(LETTER_SVG);

    await expect(
      service.printRecordSheet(data, PaperSize.LETTER),
    ).rejects.toThrow('Print window does not support afterprint events');

    expect(printWindow.close).toHaveBeenCalledTimes(1);
    expect(printWindow.print).not.toHaveBeenCalled();
  });

  it('closes an owned print window when SVG construction fails', async () => {
    const printWindow = createPrintWindow();
    mockWindowOpen(printWindow);
    const data = service.extractData(mechUnit);
    jest
      .spyOn(service, 'getSVGString')
      .mockRejectedValue(new Error('template missing'));

    await expect(
      service.printRecordSheet(data, PaperSize.LETTER),
    ).rejects.toThrow('template missing');

    expect(printWindow?.close).toHaveBeenCalledTimes(1);
    expect(printWindow?.print).not.toHaveBeenCalled();
  });

  it('keeps the legacy print(canvas) API working', () => {
    const canvas = createMockCanvas();
    const printWindow = createPrintWindow();
    mockWindowOpen(printWindow);

    service.print(canvas as unknown as HTMLCanvasElement);

    expect(window.open).toHaveBeenCalled();
    expect(printWindow?.document?.write).toHaveBeenCalled();
    expect(printWindow?.document?.close).toHaveBeenCalled();
  });
});
