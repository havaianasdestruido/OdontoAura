'use client';

import Link from 'next/link';

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 text-center">
        <h1 className="text-xl font-bold text-gray-800">Algo deu errado</h1>
        <p className="text-gray-500 mt-2 text-sm">Não foi possível carregar esta página.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
          >
            Tentar novamente
          </button>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 py-2 px-4 rounded-lg transition"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    </div>
  );
}