'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface Specialty { id: string; name: string }
interface Doctor { id: string; licenseNumber: string; specialties: { name: string }[] }
interface Appt {
  id: string;
  patientId: string;
  doctorId: string;
  specialtyId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  notes?: string;
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-700',
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientOptions, setPatientOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');

  const isStaff = user?.role === 'EMPLOYEE' || user?.role === 'ADMIN';
  const isPatient = user?.role === 'PATIENT';

  async function loadAppointments() {
    const { data } = await api.get<Appt[]>('/appointments');
    setAppointments(data || []);
  }

  useEffect(() => {
    (async () => {
      try {
        const appointmentsRes = await api.get<Appt[]>('/appointments');
        const doctorsRes = await api.get<Doctor[]>('/doctors');
        const specialtiesRes = await api.get<Specialty[]>('/specialties');
        setAppointments(appointmentsRes.data || []);
        setDoctors(doctorsRes.data || []);
        setSpecialties(specialtiesRes.data || []);
        if (isStaff) {
          const usersRes = await api.get<{ id: string; name: string; role: string }[]>('/users');
          setPatientOptions((usersRes.data || []).filter((x) => x.role === 'PATIENT'));
        }
      } catch (e) {
        setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao carregar consultas');
      } finally {
        setLoading(false);
      }
    })();
  }, [isStaff]);

  async function create() {
    setError('');
    if (!user || !doctorId || !specialtyId || !scheduledAt) {
      setError('Preencha médico, especialidade e data/horário.');
      return;
    }
    if (isStaff && !patientId) {
      setError('Selecione o paciente para o agendamento.');
      return;
    }
    try {
      await api.post('/appointments', {
        patientId: isPatient ? user.id : patientId,
        doctorId,
        specialtyId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        notes: notes || undefined,
      });
      setPatientId(''); setDoctorId(''); setSpecialtyId(''); setScheduledAt(''); setNotes(''); setDurationMinutes(30);
      setShowForm(false);
      await loadAppointments();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Erro ao agendar consulta');
    }
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Consultas</h1>
        {user?.role !== 'DOCTOR' && (
          <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + Nova Consulta
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {showForm && user?.role !== 'DOCTOR' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Agendar consulta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isStaff && (
              <select className="border rounded-lg px-3 py-2 text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                <option value="">Selecionar paciente</option>
                {patientOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select className="border rounded-lg px-3 py-2 text-sm" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Selecionar médico</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  CRM {d.licenseNumber} — {d.specialties.map((s) => s.name).join(', ') || 'Sem especialidade'}
                </option>
              ))}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
              <option value="">Selecionar especialidade</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="border rounded-lg px-3 py-2 text-sm" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}>
              {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
            <input className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button onClick={create} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Confirmar agendamento</button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {appointments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma consulta encontrada</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Data/Horário</th>
                <th className="text-left px-4 py-3">Duração</th>
                <th className="text-left px-4 py-3">Observações</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-gray-900">{new Date(a.scheduledAt).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-gray-600">{a.durationMinutes} min</td>
                  <td className="px-4 py-3 text-gray-600 max-w-sm truncate">{a.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[a.status] || 'bg-gray-100'}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}