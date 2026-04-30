import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import App from '../src/App';

beforeEach(() => {
  // Stub fetch to avoid hitting the network during smoke tests.
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [], meta: {} }),
      } as Response),
    ),
  );
  // Clear any token state between tests
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('App smoke', () => {
  it('renders the home page', () => {
    renderAt('/');
    expect(
      screen.getByRole('heading', { name: /AI Workforce Operating System/i }),
    ).toBeInTheDocument();
  });

  it('renders the value-proposition page', () => {
    renderAt('/value-proposition');
    expect(
      screen.getByRole('heading', { name: /Value proposition/i }),
    ).toBeInTheDocument();
  });

  it('renders the login page', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('renders the register page', () => {
    renderAt('/register');
    expect(screen.getByRole('heading', { name: /Create your account/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated user from /hr-dashboard to /login', () => {
    renderAt('/hr-dashboard');
    expect(screen.getByRole('heading', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('renders 404 for unknown routes', () => {
    renderAt('/this-does-not-exist');
    expect(screen.getByRole('heading', { name: /Page not found/i })).toBeInTheDocument();
  });
});
