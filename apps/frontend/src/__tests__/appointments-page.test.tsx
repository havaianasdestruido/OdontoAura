import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppointmentsPage from '../app/dashboard/appointments/page';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: { id: 'emp_1', name: 'Recepção', email: 'recep@odonto.test', role: 'EMPLOYEE' },
    setUser: jest.fn(),
  }),
}));

import { api } from '@/lib/api';

const apiGet = api.get as jest.Mock;
const apiPost = api.post as jest.Mock;

const appointments = [
  { id: 'apt_1', patientId: 'pat_1', doctorId: 'doc_1', specialtyId: 'spe_1', scheduledAt: '2026-09-11T14:00:00.000Z', durationMinutes: 30, status: 'CONFIRMED', notes: 'Primeira consulta' },
];
const patients = [
  { id: 'pat_1', name: 'Paciente Ana', role: 'PATIENT' },
  { id: 'emp_9', name: 'Recepcionista Pedro', role: 'EMPLOYEE' },
];
const doctors = [{ id: 'doc_1', licenseNumber: 'CRM-123', specialties: [{ name: 'Ortodontia' }] }];
const specialties = [{ id: 'spe_1', name: 'Ortodontia' }];

function mockApi() {
  apiGet.mockImplementation((url: string) => {
    switch (url) {
      case '/appointments':
        return Promise.resolve({ data: appointments });
      case '/doctors':
        return Promise.resolve({ data: doctors });
      case '/specialties':
        return Promise.resolve({ data: specialties });
      case '/users':
        return Promise.resolve({ data: patients });
      default:
        return Promise.resolve({ data: [] });
    }
  });
  apiPost.mockResolvedValue({ data: {} });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppointmentsPage />
    </QueryClientProvider>,
  );
}

describe('AppointmentsPage', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    mockApi();
  });

  // TODO: Add tests for error states (API failure) and loading states (spinner/skeleton rendering)
  // TODO: assert that patient select is hidden when user role is DOCTOR (role-based UI gating)
  // TODO: assert that patient select is hidden when user role is DOCTOR — role-based UI gating is not tested
  // TODO: add test for login/register flows — no auth page coverage exists in the test suite
  // TODO: add test verifying that query errors surface a user-facing error message (not just unhandled rejection)
  it('renders appointments and their details from the API', async () => {
    renderPage();

    // TODO: Derive expected text from fixture data instead of asserting hard-coded strings like '30 min' and fixed dates
    expect(await screen.findByText('CONFIRMED')).toBeInTheDocument();
    expect(screen.getByText('Primeira consulta')).toBeInTheDocument();
    expect(await screen.findByText('30 min')).toBeInTheDocument();
  });

  it('only offers patients as booking options for staff members', async () => {
    renderPage();

    await screen.findByText('CONFIRMED');
    fireEvent.click(screen.getByRole('button', { name: /Nova Consulta/ }));

    const combos = await screen.findAllByRole('combobox');
    expect(combos).toHaveLength(4);
    await screen.findByRole('option', { name: 'Paciente Ana' });
    expect(screen.getByRole('option', { name: /CRM-123/ })).toBeInTheDocument();

    expect(screen.getByRole('option', { name: 'Paciente Ana' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Recepcionista Pedro' })).not.toBeInTheDocument();
  });

  it('creates an appointment and refetches the list afterwards', async () => {
    renderPage();
    await screen.findByText('CONFIRMED');

    fireEvent.click(screen.getByRole('button', { name: /Nova Consulta/ }));

    const combos = screen.getAllByRole('combobox');
    fireEvent.change(combos[0], { target: { value: 'pat_1' } });
    fireEvent.change(combos[1], { target: { value: 'doc_1' } });
    fireEvent.change(combos[2], { target: { value: 'spe_1' } });

    const datetime = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(datetime, { target: { value: '2026-09-15T10:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar agendamento/ }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/appointments', expect.objectContaining({
        patientId: 'pat_1',
        doctorId: 'doc_1',
        specialtyId: 'spe_1',
        durationMinutes: 30,
      }));
    });

    await waitFor(() => {
      const appointmentCalls = apiGet.mock.calls.filter(c => c[0] === '/appointments');
      expect(appointmentCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});