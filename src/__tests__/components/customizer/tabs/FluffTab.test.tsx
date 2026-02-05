import { render, screen } from '@testing-library/react';
import React from 'react';

import { FluffTab } from '@/components/customizer/tabs/FluffTab';

describe('FluffTab', () => {
  it('should render fluff tab', () => {
    render(<FluffTab />);

    expect(screen.getByText('Unit Identity')).toBeInTheDocument();
    expect(screen.getByText('Manufacturing')).toBeInTheDocument();
  });

  it('should display chassis input', () => {
    render(<FluffTab chassis="Atlas" />);

    expect(screen.getByDisplayValue('Atlas')).toBeInTheDocument();
  });

  it('should display model input', () => {
    render(<FluffTab model="AS7-D" />);

    expect(screen.getByDisplayValue('AS7-D')).toBeInTheDocument();
  });

  it('should disable inputs in read-only mode', () => {
    render(<FluffTab readOnly={true} />);

    const chassisInput = screen.getByPlaceholderText(/Atlas/i);
    expect(chassisInput).toBeDisabled();
  });

  it('should apply custom className', () => {
    const { container } = render(<FluffTab className="custom-class" />);

    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});
