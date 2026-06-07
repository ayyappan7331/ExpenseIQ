import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils/render';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('starts on dark and flips to light on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByLabelText('Toggle theme');
    expect(button).toHaveAttribute('title', 'Switch to light');

    await user.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(button).toHaveAttribute('title', 'Switch to dark');
  });

  it('flips back to dark on a second click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByLabelText('Toggle theme');
    await user.click(button);
    await user.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
