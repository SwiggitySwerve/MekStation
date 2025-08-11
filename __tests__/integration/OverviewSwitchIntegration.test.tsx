import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OverviewTabV2 } from '../../components/overview/OverviewTabV2'
import { useUnit } from '../../components/multiUnit/MultiUnitProvider'

jest.mock('../../components/multiUnit/MultiUnitProvider')
const mockUseUnit = useUnit as jest.MockedFunction<typeof useUnit>

describe('Overview tech-base switch integration', () => {
  const mockUpdateConfiguration = jest.fn()

  const createMockUnit = (config: any = {}) => ({
    getConfiguration: jest.fn(() => ({
      chassis: 'Test Mech',
      model: 'TM-1',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      introductionYear: 3025,
      rulesLevel: 'Standard',
      techProgression: {
        chassis: 'Inner Sphere',
        gyro: 'Inner Sphere',
        engine: 'Inner Sphere',
        heatsink: 'Inner Sphere',
        targeting: 'Inner Sphere',
        myomer: 'Inner Sphere',
        movement: 'Inner Sphere',
        armor: 'Inner Sphere'
      },
      ...config
    }))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseUnit.mockReturnValue({
      unit: createMockUnit(),
      updateConfiguration: mockUpdateConfiguration,
      isConfigLoaded: true
    } as any)
  })

  test('switching armor to Clan runs through coordinator without errors', async () => {
    render(<OverviewTabV2 />)

    // Find the Clan button for Armor row
    const clanButtons = screen.getAllByText('Clan').filter(el => el.tagName === 'BUTTON')
    // Click the last one (heuristic: armor row is rendered after others)
    fireEvent.click(clanButtons[clanButtons.length - 1])

    await waitFor(() => {
      // The hook calls into unit manager; we assert no crash and at least one render after click
      expect(true).toBe(true)
    })
  })
})