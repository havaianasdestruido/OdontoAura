'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface Specialty {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  userId: string;
  licenseNumber: string;
  bio?: string;
  specialties: { id: string; name: string }[];
  availability: { id: string; dayOfWeek: number; startTime: string; endTime: string }[];
}

function dayName(d: number) {
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d] ?? d;
}

// TODO: migrate to useQuery (appointments page is already migrated)
export default function DoctorsPage() {
  const { user } = useAuthStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);

  async function load() {
    const [docRes, specRes] = await Promise.all([api.get<Doctor[]>('/doctors'), api.get<Specialty[]>('/specialties')]);
    setDoctors(docRes.data);
    setSpecialties(specRes.data);
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
        const us = await api.get<{ id: string; name: string; role: string }[]>('/users').catch(() => null);
        if (us) setUsers((us.data || []).filter((u) => u.role === 'DOCTOR'));
      } catch (e) {
        setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao carregar médicos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Médicos</h1>
        {user?.role === 'ADMIN' && (
          <button onClick={() => setModal(true)} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
            + Novo Médico
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {doctors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500 text-center py-8">Nenhum médico cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">{d.specialties.map((s) => s.name).join(', ')}</p>
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{dayName(d.availability[0]?.dayOfWeek ?? 0)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">CRM: {d.licenseNumber}</p>
              {d.bio && <p className="text-sm text-gray-600 mt-2">{d.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {d.availability.map((s) => (
                  <span key={s.id} className="text-xs px-2 py-1 rounded bg-primary-50 text-primary-700">
                    {dayName(s.dayOfWeek)} {s.startTime}-{s.endTime}
                  </span>
                ))}
                {d.availability.length === 0 && <span className="text-xs text-gray-400">Sem agenda definida</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && user?.role === 'ADMIN' && <CreateDoctorModal onClose={() => setModal(false)} onCreated={load} specialties={specialties} users={users} />}
    </div>
  );
}

function CreateDoctorModal({ onClose, onCreated, specialties, users }: {
  onClose: () => void;
  onCreated: () => Promise<void>;
  specialties: Specialty[];
  users: { id: string; name: string }[];
}) {
  const [userId, setUserId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function create() {
    setError('');
    setLoading(true);
    try {
      await api.post('/doctors', { userId, licenseNumber, specialtyId, bio: bio || undefined });
      await onCreated();
      onClose();
    } catch (e) {
      // TODO: map backend errors (e.g. "user already has doctor profile") to user-friendly PT messages
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar médico');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Novo Médico</h2>
        <select className="w-full border rounded-lg px-3 py-2 text-sm" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Selecionar usuário (perfil DOCTOR)</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nº CRM" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
        <select className="w-full border rounded-lg px-3 py-2 text-sm" value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
          <option value="">Selecionar especialidade</option>
          {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Bio (opcional)" value={bio} onChange={(e) => setBio(e.target.value)} />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          {/* TODO: also disable when userId, licenseNumber or specialtyId are empty to prevent unnecessary 400 */}
          <button onClick={create} disabled={loading} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}