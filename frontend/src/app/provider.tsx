import { ProviderErrorComponent } from '@/components/errors/provider';
import { useConfig } from '@/hooks/use-config';
import { fetchRPCMetadata } from '@/lib/one-liner-router/metadata';
import {
  formatBindingIssues,
  validateBindings,
} from '@/lib/one-liner-router/validate-zmq-bindings';
import { theme } from '@/lib/mantine-theme';
import { queryConfig } from '@/lib/react-query';
import { defaultWidgetContractRegistry } from '@/widgets';
import { Loader, MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider, useSuspenseQuery } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

type AppProviderProps = {
  children: React.ReactNode;
};

// Suspends on config + RPC metadata, then validates every widget instance's
// bindings against its contract and the backend's RPC schemas. If anything is
// wrong we throw so the ErrorBoundary above can display it.
const BindingsGate = ({ children }: { children: React.ReactNode }) => {
  const config = useConfig();
  const { data: rpcs } = useSuspenseQuery({
    queryKey: ['rpc-metadata', config.server.rpcs_endpoint],
    queryFn: () => fetchRPCMetadata(config.server.rpcs_endpoint),
    staleTime: Infinity,
  });

  const issues = validateBindings(config, defaultWidgetContractRegistry, rpcs);
  if (issues.length > 0) {
    throw new Error(`Widget binding validation failed:\n${formatBindingIssues(issues)}`);
  }

  return <>{children}</>;
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
            <BindingsGate>{children}</BindingsGate>
          </QueryClientProvider>
        </React.Suspense>
      </MantineProvider>
    </ErrorBoundary>
  );
};
