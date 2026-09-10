'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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

// TODO: migrate to useQuery (appointments page is already migrated)
export default function HealthPlansPage() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [myPlans, setMyPlans] = useState<MyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<HealthPlan[]>('/health-plans');
        setPlans(data || []);
        if (user?.role === 'PATIENT') {
          const mine = await api.get<MyPlan[]>(`/health-plans/patient/${user.id}`);
          setMyPlans(mine.data || []);
        }
      } catch (e) {
        setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao carregar planos');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  if (user?.role === 'PATIENT') {
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
        {/* TODO: wrap table in overflow-x-auto for small screens */}
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
      {modal && isAdmin && <CreatePlanModal onClose={() => setModal(false)} onCreated={async () => {
        const { data } = await api.get<HealthPlan[]>('/health-plans');
        setPlans(data || []);
      }} />}
    </div>
  );
}

function CreatePlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [coveragePercentage, setCoveragePercentage] = useState<number>(80);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function create() {
    setError('');
    setLoading(true);
    try {
      await api.post('/health-plans', { name, provider, coveragePercentage });
      await onCreated();
      onClose();
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar plano');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900">Novo Plano de Saúde</h2>
        {/* TODO: add client-side validation — name and provider are required but modal allows empty submit */}
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nome do plano" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Conveniada" value={provider} onChange={(e) => setProvider(e.target.value)} />
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Cobertura (%)"
          type="number"
          min={0}
          max={100}
          value={coveragePercentage}
          onChange={(e) => setCoveragePercentage(Number(e.target.value))}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          {/* TODO: add confirmation dialog before creating plan and optimistic update for instant feedback */}
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={create} disabled={loading} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}