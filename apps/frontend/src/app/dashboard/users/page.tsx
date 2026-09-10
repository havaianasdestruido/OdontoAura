'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

// TODO: migrate to useQuery (appointments page is already migrated)
export default function UsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [password, setPassword] = useState('');

  async function load() {
    try {
      const { data } = await api.get<User[]>('/users');
      setUsers(data);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
    else setLoading(false);
  }, [user]);

  async function create() {
    setError('');
    try {
      await api.post('/users', { name, email, phone: phone || undefined, role, password: password || undefined });
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      await load();
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar usuário');
    }
  }

  if (user?.role !== 'ADMIN') {
    return <p className="text-gray-500">Acesso restrito a administradores.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Criar usuário</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Telefone (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <select className="border rounded-lg px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="EMPLOYEE">Recepção</option>
            <option value="DOCTOR">Médico</option>
            <option value="PATIENT">Paciente</option>
          </select>
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Senha temporária" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {/* TODO: add client-side validation (rhf/zod) — name, email, and role are required by backend but unchecked here */}
        <button onClick={create} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg">Criar usuário</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* TODO: wrap table in overflow-x-auto for small screens */}
        {/* TODO: add pagination — backend returns all users but list can grow large */}
        {loading ? (
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
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone || '-'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{u.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}