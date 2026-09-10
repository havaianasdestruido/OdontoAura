'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// TODO: expose queryClient via ref or context so logout can call queryClient.clear()
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
  }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
