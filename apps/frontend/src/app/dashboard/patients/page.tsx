'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

// TODO: migrate to useQuery (appointments page is already migrated)
export default function PatientsPage() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (user?.role === 'PATIENT') {
          setPatients([{ id: user.id, name: user.name, email: user.email, phone: undefined }]);
          return;
        }
        const { data } = await api.get<Patient[]>('/users');
        setPatients((data || []).filter((u) => u.role === 'PATIENT'));
      } catch (e) {
        setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao carregar pacientes');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {user?.role === 'PATIENT' ? 'Meu Perfil' : 'Pacientes'}
      </h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {patients.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum paciente encontrado</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email}</td>
                  <td className="px-4 py-3 text-gray-600">{p.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}