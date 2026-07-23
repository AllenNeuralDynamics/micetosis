import { ProviderErrorComponent } from '@/components/errors/provider';
import { theme } from '@/lib/mantine-theme';
import { queryConfig } from '@/lib/react-query';
import { Loader, MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

type AppProviderProps = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: queryConfig,
      }),
  );

  return (
    <ErrorBoundary FallbackComponent={ProviderErrorComponent}>
      <MantineProvider theme={theme}>
        <React.Suspense
          fallback={
            <div className="flex h-screen w-screen items-center justify-center">
              <Loader size="xl" type="dots" />
            </div>
          }
        >
          <QueryClientProvider client={queryClient}>
            {import.meta.env.DEV && <ReactQueryDevtools />}
            {children}
          </QueryClientProvider>
        </React.Suspense>
      </MantineProvider>
    </ErrorBoundary>
  );
};
