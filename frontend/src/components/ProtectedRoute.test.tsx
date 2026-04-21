import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/api-tester']}>
      <Routes>
        <Route
          path="/api-tester"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('renders nothing while loading', () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: false, loading: true });

    const { container } = renderWithRoutes();

    expect(container).toBeEmptyDOMElement();
  });

  it('redirects to login when unauthenticated', () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: false, loading: false });

    renderWithRoutes();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: true, loading: false });

    renderWithRoutes();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
