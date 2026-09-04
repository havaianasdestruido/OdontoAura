'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { LogOut, Calendar, Users, Stethoscope, Settings, ClipboardList, Shield } from 'lucide-react';

const roleNavItems: Record<string, { label: string; href: string; icon: any }[]> = {
  PATIENT: [
    { label: 'Minhas Consultas', href: '/dashboard/appointments', icon: Calendar },
    { label: 'Prontuário', href: '/dashboard/records', icon: ClipboardList },
  ],
  EMPLOYEE: [
    { label: 'Agenda do Dia', href: '/dashboard/appointments', icon: Calendar },
    { label: 'Pacientes', href: '/dashboard/patients', icon: Users },
  ],
  DOCTOR: [
    { label: 'Minha Agenda', href: '/dashboard/appointments', icon: Calendar },
    { label: 'Prontuários', href: '/dashboard/records', icon: ClipboardList },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: Shield },
    { label: 'Usuários', href: '/dashboard/users', icon: Users },
    { label: 'Médicos', href: '/dashboard/doctors', icon: Stethoscope },
    { label: 'Consultas', href: '/dashboard/appointments', icon: Calendar },
    { label: 'Planos de Saúde', href: '/dashboard/health-plans', icon: ClipboardList },
    { label: 'Configurações', href: '/dashboard/settings', icon: Settings },
  ],
};

const roleLabels: Record<string, string> = {
  PATIENT: 'Paciente',
  EMPLOYEE: 'Recepção',
  DOCTOR: 'Médico',
  ADMIN: 'Administrador',
};

const roleColors: Record<string, string> = {
  PATIENT: 'bg-blue-100 text-blue-800',
  EMPLOYEE: 'bg-green-100 text-green-800',
  DOCTOR: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-orange-100 text-orange-800',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  if (!user) return null;

  const navItems = roleNavItems[user.role] || roleNavItems.PATIENT;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100">
          <Link href="/dashboard">
            <h2 className="text-xl font-bold text-primary-700">OdontoAura</h2>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-16 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
              {roleLabels[user.role]}
            </span>
            <span className="text-sm text-gray-700 hidden sm:block">{user.name}</span>
            <button onClick={() => { logout(); router.push('/auth/login'); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700" title="Sair">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
