import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from '../pages/LoginPage';
import * as apiClient from '../api/client';

vi.mock('../api/client');

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('uses the active theme background and lets the user toggle themes', () => {
    const { container } = render(
      <LoginPage onAuthenticated={vi.fn()} />
    );

    expect(container.firstElementChild).toHaveClass('bg-background');

    const toggle = screen.getByTestId('theme-toggle');
    fireEvent.click(toggle);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('erp_foodlab.theme')).toBe('dark');
    expect(toggle.querySelector('[aria-hidden="true"] > span')).toHaveClass(
      'left-0.5',
      'translate-x-3'
    );

    fireEvent.click(toggle);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(toggle.querySelector('[aria-hidden="true"] > span')).toHaveClass(
      'left-0.5',
      'translate-x-0'
    );
  });

  it('submits credentials and hands the issued token to the app', async () => {
    vi.mocked(apiClient.login).mockResolvedValue({
      data: {
        user: {
          id: 1,
          name: 'ERP Administrator',
          email: 'admin@foodlab.test',
        },
        token: 'token-123',
        token_type: 'Bearer',
      },
    });
    const onAuthenticated = vi.fn();

    render(<LoginPage onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@foodlab.test' },
    });
    fireEvent.change(screen.getByLabelText('Kata Sandi'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith('token-123', false);
    });
    expect(apiClient.login).toHaveBeenCalledWith({
      email: 'admin@foodlab.test',
      password: 'password',
      device_name: 'erp-web',
    });
  });

  it('passes development mode when the login option is checked', async () => {
    vi.mocked(apiClient.login).mockResolvedValue({
      data: {
        user: {
          id: 1,
          name: 'ERP Administrator',
          email: 'admin@foodlab.test',
        },
        token: 'token-123',
        token_type: 'Bearer',
      },
    });
    const onAuthenticated = vi.fn();

    render(<LoginPage onAuthenticated={onAuthenticated} />);
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Mode pengembangan/ })
    );
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@foodlab.test' },
    });
    fireEvent.change(screen.getByLabelText('Kata Sandi'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith('token-123', true);
    });
  });

  it('displays the API error when login fails', async () => {
    vi.mocked(apiClient.login).mockRejectedValue(
      new Error('Login gagal: 422 - These credentials do not match our records.')
    );

    render(<LoginPage onAuthenticated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@foodlab.test' },
    });
    fireEvent.change(screen.getByLabelText('Kata Sandi'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'These credentials do not match our records.'
    );
  });
});
