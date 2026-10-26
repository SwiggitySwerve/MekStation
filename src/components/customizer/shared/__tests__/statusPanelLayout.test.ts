import {
  computeStatusPanelLayout,
  STATUS_DRAWER_FALLBACK_WIDTH,
  STATUS_PANEL_WIDTH,
  type LayoutBox,
} from '../statusPanelLayout';

const trigger: LayoutBox = { left: 1100, right: 1260, top: 108, bottom: 152 };
const rail: LayoutBox = { left: 1200, right: 1440, top: 153, bottom: 900 };
const workspace: LayoutBox = { left: 0, right: 1200, top: 153, bottom: 900 };
const desktop = { viewportWidth: 1440, viewportHeight: 900, trigger };

describe('computeStatusPanelLayout', () => {
  it('opens a bottom sheet on phones', () => {
    expect(
      computeStatusPanelLayout({
        viewportWidth: 390,
        viewportHeight: 844,
        trigger,
        rail,
        workspace,
      }),
    ).toEqual({ mode: 'sheet' });
  });

  it('docks a drawer over the loadout rail: same edge and width, full height below the header', () => {
    expect(computeStatusPanelLayout({ ...desktop, rail, workspace })).toEqual({
      mode: 'drawer',
      left: 1200,
      top: 153,
      width: 240,
      height: 747,
      maxHeight: 747,
    });
  });

  it('docks to the workspace edge when the rail is hidden or collapsed', () => {
    const hidden = { left: 0, right: 0, top: 0, bottom: 0 };
    for (const noRail of [null, undefined, hidden]) {
      expect(
        computeStatusPanelLayout({ ...desktop, rail: noRail, workspace }),
      ).toMatchObject({
        mode: 'drawer',
        left: 1440 - STATUS_DRAWER_FALLBACK_WIDTH,
        top: 153,
        width: STATUS_DRAWER_FALLBACK_WIDTH,
      });
    }
  });

  it('falls back to a popover under the button outside the workbench', () => {
    expect(computeStatusPanelLayout(desktop)).toEqual({
      mode: 'popover',
      left: 1260 - STATUS_PANEL_WIDTH,
      top: 156,
      width: STATUS_PANEL_WIDTH,
      maxHeight: 900 - 156 - 8,
    });
  });
});
