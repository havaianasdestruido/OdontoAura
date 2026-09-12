'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, apiErrorMessage } from '@/lib/api';
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

const createDoctorSchema = z.object({
  userId: z.string().min(1, 'Selecione um usuário com perfil DOCTOR'),
  licenseNumber: z.string().min(3, 'Informe o número do CRM'),
  specialtyId: z.string().min(1, 'Selecione uma especialidade'),
  bio: z.string().optional(),
});

type CreateDoctorFormData = z.infer<typeof createDoctorSchema>;

export default function DoctorsPage() {
  const { user } = useAuthStore();
  const [modal, setModal] = useState(false);

  const doctorsQuery = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => (await api.get<Doctor[]>('/doctors')).data ?? [],
  });
  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => (await api.get<Specialty[]>('/specialties')).data ?? [],
  });
  const doctorUsersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<{ id: string; name: string; role: string }[]>('/users')).data ?? [],
    select: (data) => data.filter((u) => u.role === 'DOCTOR'),
  });

  const loading = doctorsQuery.isLoading || specialtiesQuery.isLoading || doctorUsersQuery.isLoading;
  if (loading) return <p className="text-gray-500">Carregando...</p>;

  const doctors = doctorsQuery.data ?? [];
  const specialties = specialtiesQuery.data ?? [];
  const users = doctorUsersQuery.data ?? [];
  const error = doctorsQuery.error || specialtiesQuery.error ? 'Erro ao carregar médicos' : '';

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
      {modal && user?.role === 'ADMIN' && (
        <CreateDoctorModal onClose={() => setModal(false)} specialties={specialties} users={users} />
      )}
    </div>
  );
}

function CreateDoctorModal({ onClose, specialties, users }: {
  onClose: () => void;
  specialties: Specialty[];
  users: { id: string; name: string }[];
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDoctorFormData>({
    resolver: zodResolver(createDoctorSchema),
    mode: 'onTouched',
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateDoctorFormData) => {
      await api.post('/doctors', { userId: data.userId, licenseNumber: data.licenseNumber, specialtyId: data.specialtyId, bio: data.bio || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Novo Médico</h2>
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-3">
          <div>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" {...register('userId')}>
              <option value="">Selecionar usuário (perfil DOCTOR)</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId.message}</p>}
          </div>
          <div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nº CRM" {...register('licenseNumber')} />
            {errors.licenseNumber && <p className="text-red-500 text-xs mt-1">{errors.licenseNumber.message}</p>}
          </div>
          <div>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" {...register('specialtyId')}>
              <option value="">Selecionar especialidade</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.specialtyId && <p className="text-red-500 text-xs mt-1">{errors.specialtyId.message}</p>}
          </div>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Bio (opcional)" {...register('bio')} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}