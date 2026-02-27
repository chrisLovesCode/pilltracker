import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('MediRoutine App - Basic Tests', () => {

  it('sollte die App rendern', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText('MediRoutine')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('sollte Medications Tab laden', async () => {
    render(<App />);
    
    await waitFor(() => {
      // Check for medication-related elements rather than exact text
      const addButton = screen.queryByTestId('empty-state-add-button');
      expect(addButton).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
