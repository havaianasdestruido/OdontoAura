'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface HealthPlan {
  id: string;
  name: string;
  provider: string;
  coveragePercentage: number;
  isActive: boolean;
}

interface MyPlan {
  id: string;
  healthPlanId: string;
  cardNumber: string;
  expiryDate: string;
  healthPlan?: HealthPlan;
}

const createPlanSchema = z.object({
  name: z.string().min(2, 'Informe o nome do plano'),
  provider: z.string().min(2, 'Informe a conveniada'),
  coveragePercentage: z.number({ message: 'Cobertura inválida' }).min(1, 'Cobertura mínima é 1%').max(100, 'Cobertura máxima é 100%'),
});

type CreatePlanFormData = z.infer<typeof createPlanSchema>;

export default function HealthPlansPage() {
  const { user } = useAuthStore();
  const [modal, setModal] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isPatient = user?.role === 'PATIENT';

  const plansQuery = useQuery({
    queryKey: ['health-plans'],
    queryFn: async () => (await api.get<HealthPlan[]>('/health-plans')).data ?? [],
  });

  const myPlansQuery = useQuery({
    queryKey: ['health-plans', 'mine'],
    queryFn: async () => (await api.get<MyPlan[]>(`/health-plans/patient/${user!.id}`)).data ?? [],
    enabled: isPatient,
  });

  const loading = plansQuery.isLoading || (isPatient && myPlansQuery.isLoading);
  if (loading) return <p className="text-gray-500">Carregando...</p>;

  const plans = plansQuery.data ?? [];
  const myPlans = myPlansQuery.data ?? [];
  const error = plansQuery.error ? 'Erro ao carregar planos' : '';

  if (isPatient) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Meus Planos de Saúde</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {myPlans.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-500 text-center py-8">Nenhum plano associado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPlans.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-900">{p.healthPlan?.name || 'Plano'}</p>
                <p className="text-sm text-gray-500 mt-1">Conveniada: {p.healthPlan?.provider}</p>
                <p className="text-sm text-gray-600 mt-1">Cobertura: {p.healthPlan?.coveragePercentage}%</p>
                <p className="text-sm text-gray-600">Cartão: {p.cardNumber}</p>
                <p className="text-sm text-gray-600">Válido até: {new Date(p.expiryDate).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Planos de Saúde</h1>
        {isAdmin && (
          <button onClick={() => setModal(true)} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
            + Novo Plano
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {plans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum plano cadastrado</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">Conveniada</th>
                  <th className="text-left px-4 py-3">Cobertura</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.provider}</td>
                    <td className="px-4 py-3 text-gray-600">{p.coveragePercentage}%</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {modal && isAdmin && <CreatePlanModal onClose={() => setModal(false)} />}
    </div>
  );
}

function CreatePlanModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePlanFormData>({
    resolver: zodResolver(createPlanSchema),
    mode: 'onTouched',
    defaultValues: { coveragePercentage: 80 },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePlanFormData) => {
      await api.post('/health-plans', { name: data.name, provider: data.provider, coveragePercentage: data.coveragePercentage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-plans'] });
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Novo Plano de Saúde</h2>
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-3">
          <div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nome do plano" {...register('name')} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Conveniada" {...register('provider')} />
            {errors.provider && <p className="text-red-500 text-xs mt-1">{errors.provider.message}</p>}
          </div>
          <div>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Cobertura (%)"
              type="number"
              min={0}
              max={100}
              {...register('coveragePercentage', { valueAsNumber: true })}
            />
            {errors.coveragePercentage && <p className="text-red-500 text-xs mt-1">{errors.coveragePercentage.message}</p>}
          </div>
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