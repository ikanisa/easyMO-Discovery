import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';

describe('ThemeContext', () => {
  it('provides theme context to children', () => {
    render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>
    );
    
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
});
