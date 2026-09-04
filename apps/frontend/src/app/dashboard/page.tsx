'use client';

import { useAuthStore } from '@/stores/auth.store';
import { Calendar, Users, Stethoscope, ClipboardList } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Consultas Hoje', value: '12', icon: Calendar, color: 'text-blue-600 bg-blue-50', href: '/dashboard/appointments' },
  { label: 'Pacientes Ativos', value: '348', icon: Users, color: 'text-green-600 bg-green-50', href: '/dashboard/patients' },
  { label: 'Médicos', value: '8', icon: Stethoscope, color: 'text-purple-600 bg-purple-50', href: '/dashboard/doctors' },
  { label: 'Prontuários', value: '1,204', icon: ClipboardList, color: 'text-orange-600 bg-orange-50', href: '/dashboard/records' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bem-vindo, {user?.name || 'Usuário'}</h1>
        <p className="text-gray-500 mt-1">Visão geral do sistema OdontoAura</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximas Consultas</h2>
        <div className="space-y-3">
          {[
            { time: '09:00', patient: 'Maria Santos', doctor: 'Dr. João', specialty: 'Clínica Geral' },
            { time: '10:30', patient: 'Pedro Costa', doctor: 'Dra. Ana', specialty: 'Pediatria' },
            { time: '14:00', patient: 'Lucia Ferreira', doctor: 'Dr. Carlos', specialty: 'Cardiologia' },
          ].map((apt, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
              <span className="text-sm font-mono font-medium text-primary-600 w-12">{apt.time}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{apt.patient}</p>
                <p className="text-xs text-gray-500">{apt.doctor} - {apt.specialty}</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Agendado</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
