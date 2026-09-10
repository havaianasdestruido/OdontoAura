import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  return MockLink;
});

describe('Home Page', () => {
  it('renders the OdontoAura title', () => {
    render(<Home />);
    expect(screen.getByText('OdontoAura')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<Home />);
    expect(screen.getByText('Sistema de Gestão e Agendamento de Consultas')).toBeInTheDocument();
  });

  // TODO: Add tests verifying each role card links to the correct route (e.g. href contains /auth/login)
  // TODO: assert accessible names / aria labels on role cards to catch missing accessibility attributes
  // TODO: add test for Suspense / loading boundary if Home page uses next/dynamic or streaming
  // TODO: assert accessible names / aria labels on role cards — currently only text content is verified
  it('renders all four role cards', () => {
    render(<Home />);
    expect(screen.getByText('Paciente')).toBeInTheDocument();
    expect(screen.getByText('Recepção')).toBeInTheDocument();
    expect(screen.getByText('Médico')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  // TODO: add test for Suspense / loading boundary if Home page uses next/dynamic or streaming
});
