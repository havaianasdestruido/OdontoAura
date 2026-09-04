import { render, screen } from '@testing-library/react';
import Home from '../app/page';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
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

  it('renders all four role cards', () => {
    render(<Home />);
    expect(screen.getByText('Paciente')).toBeInTheDocument();
    expect(screen.getByText('Recepção')).toBeInTheDocument();
    expect(screen.getByText('Médico')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
