import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MacroBar } from '@/components/MacroBar';

describe('MacroBar', () => {
  it('renders current/target text', () => {
    render(<MacroBar label="Cal" current={1500} target={2000} color="bg-canvas-ink" unit="" />);
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
    expect(screen.getByText(/\/2,000/)).toBeInTheDocument();
  });

  it('does not show over-indicator when under target', () => {
    render(<MacroBar label="Cal" current={1500} target={2000} color="bg-canvas-ink" />);
    expect(screen.queryByTestId('over-indicator')).toBeNull();
  });

  it('shows over-indicator when current exceeds target', () => {
    render(<MacroBar label="Cal" current={2400} target={2000} color="bg-canvas-ink" />);
    expect(screen.getByTestId('over-indicator')).toBeInTheDocument();
  });
});
