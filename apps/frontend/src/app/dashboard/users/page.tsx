'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'DOCTOR', 'PATIENT']),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 6, 'Senha (se informada) deve ter no mínimo 6 caracteres'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

const roleColors: Record<string, string> = {
  ADMIN: 'bg-orange-100 text-orange-800',
  EMPLOYEE: 'bg-green-100 text-green-800',
  DOCTOR: 'bg-purple-100 text-purple-800',
  PATIENT: 'bg-blue-100 text-blue-800',
};

const PAGE_SIZE = 10;

export default function UsersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [formError, setFormError] = useState('');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<User[]>('/users')).data ?? [],
    enabled: user?.role === 'ADMIN',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
    defaultValues: { role: 'EMPLOYEE' },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      await api.post('/users', {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        password: data.password || undefined,
      });
    },
    onSuccess: () => {
      reset();
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => setFormError(apiErrorMessage(e)),
  });

  if (user?.role !== 'ADMIN') {
    return <p className="text-gray-500">Acesso restrito a administradores.</p>;
  }

  const users = usersQuery.data ?? [];
  const pages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visibleUsers = users.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Criar usuário</h2>
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <input className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Nome" {...register('name')} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <input className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Email" type="email" {...register('email')} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <input className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Telefone (opcional)" {...register('phone')} />
            <select className="border rounded-lg px-3 py-2 text-sm w-full" {...register('role')}>
              <option value="EMPLOYEE">Recepção</option>
              <option value="DOCTOR">Médico</option>
              <option value="PATIENT">Paciente</option>
            </select>
            <div>
              <input className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Senha temporária" type="password" {...register('password')} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          </div>
          {(formError || usersQuery.error) && (
            <p className="text-red-500 text-sm">{formError || 'Erro ao carregar usuários'}</p>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Criando...' : 'Criar usuário'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {usersQuery.isLoading ? (
            <p className="text-gray-500 p-6">Carregando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Telefone</th>
                  <th className="text-left px-4 py-3">Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600">{u.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">Página {currentPage + 1} de {pages}</span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pages - 1}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}