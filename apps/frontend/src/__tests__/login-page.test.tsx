import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../app/auth/login/page';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  return MockLink;
});

jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
  apiErrorMessage: jest.fn((err) => err?.response?.data?.message || 'Erro ao realizar login'),
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, token: null, status: 'unauthenticated' });
  });

  it('renders login form elements', () => {
    render(<LoginPage />);
    expect(screen.getByText('Entre na sua conta')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('handles successful login and redirects to /dashboard', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', role: 'PATIENT' };
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        user: mockUser,
        access_token: 'mock_token',
      },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().token).toBe('mock_token');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
