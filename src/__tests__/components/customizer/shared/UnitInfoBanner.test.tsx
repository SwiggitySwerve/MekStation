import React from 'react';
import { render, screen } from '@testing-library/react';
import { UnitInfoBanner, UnitStats } from '@/components/customizer/shared/UnitInfoBanner';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';

describe('UnitInfoBanner', () => {
  const createStats = (overrides?: Partial<UnitStats>): UnitStats => ({
    name: 'Atlas AS7-D',
    tonnage: 100,
    techBaseMode: TechBaseMode.INNER_SPHERE,
    engineRating: 300,
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    weightUsed: 50,
    weightRemaining: 50,
    armorPoints: 200,
    maxArmorPoints: 307,
    criticalSlotsUsed: 40,
    criticalSlotsTotal: 78,
    heatGenerated: 20,
    heatDissipation: 30,
    validationStatus: 'valid',
    errorCount: 0,
    warningCount: 0,
    ...overrides,
  });

  it('should render unit name', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('Atlas AS7-D')).toBeInTheDocument();
  });

  it('should render tech base badge', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('IS')).toBeInTheDocument();
  });

  it('should render validation badge', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should display movement stats as separate boxes', () => {
    const stats = createStats({ walkMP: 4, runMP: 6, jumpMP: 3 });
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('W')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display max run MP as R+ when enhancement is active', () => {
    const stats = createStats({ runMP: 5, maxRunMP: 10 });
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('R+')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should display weight stats', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('WT')).toBeInTheDocument();
    expect(screen.getByText(/50.0/)).toBeInTheDocument();
  });

  it('should display armor stats', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('ARM')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('307')).toBeInTheDocument();
  });

  it('should display critical slots stats', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('SLOTS')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
  });

  it('should display heat stats', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('HEAT')).toBeInTheDocument();
    const heatLabel = screen.getByText('HEAT');
    const heatContainer = heatLabel.closest('div');
    expect(heatContainer).toHaveTextContent('20');
    expect(heatContainer).toHaveTextContent('30');
  });

  it('should display tonnage stat', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('TON')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display engine rating stat', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('ENG')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('should display battle value when provided', () => {
    const stats = createStats({ battleValue: 2500 });
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('BV')).toBeInTheDocument();
    expect(screen.getByText('2,500')).toBeInTheDocument();
  });

  it('should display dash for battle value when not provided', () => {
    const stats = createStats({ battleValue: undefined });
    render(<UnitInfoBanner stats={stats} />);
    
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
