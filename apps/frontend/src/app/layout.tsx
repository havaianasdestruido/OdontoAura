import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

// TODO: add openGraph (title, description, images) and robots (index, follow) to metadata
export const metadata: Metadata = {
  title: 'OdontoAura - Gestão de Clínica',
  description: 'Sistema de gerenciamento e agendamento de consultas médicas',
};

// TODO: export viewport config with themeColor for mobile PWA support (Next.js 15)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
