'use client';

import { useAuthStore } from '@/stores/auth.store';

// TODO: convert to server component — only reads zustand store, pass user as prop
export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Meu Perfil</h2>
        <div>
          <p className="text-sm text-gray-500">Nome</p>
          <p className="text-gray-900 font-medium">{user?.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-gray-900">{user?.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Perfil</p>
          <p className="text-gray-900">{user?.role}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Sistema</h2>
        <p className="text-sm text-gray-600">
          OdontoAura v0.1.0 — gestão de consultório odontológico. Dados persistidos em PostgreSQL local.
        </p>
      </div>
    </div>
  );
}