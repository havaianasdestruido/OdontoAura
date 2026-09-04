import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary-700 mb-4">OdontoAura</h1>
          <p className="text-xl text-gray-600">Sistema de Gestão e Agendamento de Consultas</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { title: 'Paciente', desc: 'Agende suas consultas', href: '/auth/login', color: 'bg-blue-500' },
            { title: 'Recepção', desc: 'Gerencie a fila do dia', href: '/auth/login', color: 'bg-green-500' },
            { title: 'Médico', desc: 'Acesse sua agenda', href: '/auth/login', color: 'bg-purple-500' },
            { title: 'Admin', desc: 'Painel de controle', href: '/auth/login', color: 'bg-orange-500' },
          ].map((item) => (
            <Link key={item.title} href={item.href} className="group block bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 text-center">
              <div className={`w-12 h-12 ${item.color} rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-lg`}>
                {item.title[0]}
              </div>
              <h3 className="font-semibold text-gray-800 group-hover:text-primary-600">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
