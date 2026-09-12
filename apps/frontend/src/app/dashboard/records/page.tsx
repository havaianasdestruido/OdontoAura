'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface Record {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  anamnesis: string;
  diagnosis: string;
  prescription?: string;
  notes?: string;
  createdAt: string;
}

export default function RecordsPage() {
  const { user } = useAuthStore();
  const [selectedPatient, setSelectedPatient] = useState('');

  const isPatient = user?.role === 'PATIENT';
  const activePatientId = isPatient ? user!.id : selectedPatient;

  const patientsQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<{ id: string; name: string; role: string }[]>('/users')).data ?? [],
    enabled: !isPatient,
    select: (data) => data.filter((u) => u.role === 'PATIENT'),
  });

  const recordsQuery = useQuery({
    queryKey: ['medical-records', activePatientId],
    queryFn: async () => {
      if (!activePatientId) return [] as Record[];
      const { data } = await api.get<Record[]>(`/medical-records?patientId=${activePatientId}`);
      return data ?? [];
    },
    enabled: !!activePatientId,
  });

  const loading = isPatient ? recordsQuery.isLoading : patientsQuery.isLoading;
  if (loading) return <p className="text-gray-500">Carregando...</p>;

  const patients = patientsQuery.data ?? [];
  const records = recordsQuery.data ?? [];
  const error = recordsQuery.error ? 'Erro ao carregar prontuários' : '';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isPatient ? 'Meu Prontuário' : 'Prontuários'}
      </h1>
      {!isPatient && (
        <select
          className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm"
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
        >
          <option value="">Selecionar paciente</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {recordsQuery.isPending && selectedPatient ? (
        <p className="text-gray-500">Carregando prontuários...</p>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500 text-center py-8">Nenhum prontuário encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Consulta {r.appointmentId.slice(0, 8)}</span>
                <span>{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              {r.anamnesis && <p className="text-sm text-gray-700"><span className="font-medium">Anamnese:</span> {r.anamnesis}</p>}
              {r.diagnosis && <p className="text-sm text-gray-700"><span className="font-medium">Diagnóstico:</span> {r.diagnosis}</p>}
              {r.prescription && <p className="text-sm text-gray-700"><span className="font-medium">Prescrição:</span> {r.prescription}</p>}
              {r.notes && <p className="text-sm text-gray-700"><span className="font-medium">Observações:</span> {r.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}