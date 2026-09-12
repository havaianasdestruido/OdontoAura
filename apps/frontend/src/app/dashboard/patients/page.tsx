'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export default function PatientsPage() {
  const { user } = useAuthStore();

  const patientsQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<Patient[]>('/users');
      return (data || []).filter((u) => u.role === 'PATIENT');
    },
    enabled: user?.role !== 'PATIENT',
    select: (data) => data,
  });

  const isPatient = user?.role === 'PATIENT';
  const patients = isPatient
    ? [{ id: user!.id, name: user.name, email: user.email, phone: undefined }]
    : patientsQuery.data ?? [];
  const loading = !isPatient && patientsQuery.isLoading;

  if (loading) return <p className="text-gray-500">Carregando...</p>;
  if (patientsQuery.error) return <p className="text-red-500 text-sm">Erro ao carregar pacientes</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isPatient ? 'Meu Perfil' : 'Pacientes'}
      </h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
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
    </div>
  );
}