import MainLayout from '@/components/layouts/main-layout';
import { Alert, Button, Code, Container, Group, Stack, Text, Title } from '@mantine/core';
import { useLocation, useRouter } from '@tanstack/react-router';
import type { FallbackProps } from 'react-error-boundary';
import { resolveErrorView } from '../dispatch';

// --------------------------------------------------------------------------------
//  Generic Provider-Level Error Component
//  (render with plain HTML, no dependency on other providers)
// --------------------------------------------------------------------------------

export const GenericProviderLevelErrorView = ({ error, resetErrorBoundary }: FallbackProps) => {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
        color: '#111',
        background: '#fff',
      }}
    >
      <div style={{ maxWidth: 600, width: '100%' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
          An error occurred in the application provider
        </h1>
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            border: '1px solid #f5c2c2',
            background: '#fdecec',
            color: '#7a1f1f',
            borderRadius: 4,
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
          }}
        >
          {message}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={resetErrorBoundary}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              background: '#f5f5f5',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            Refresh page
          </button>
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------------
//  Generic Widget-Binding-Level Error Component
//  (mantine components available)
// --------------------------------------------------------------------------------

export const GenericWidgetBindingLevelErrorView = ({
  error,
  resetErrorBoundary,
}: FallbackProps) => {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : 'Error';

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Title order={2}>Something went wrong</Title>
        <Alert color="red" title={name}>
          <Text size="sm">
            The application failed before the interface could finish loading. The message below is
            the raw error.
          </Text>
        </Alert>

        <Code block>{message}</Code>

        <Group>
          <Button onClick={resetErrorBoundary}>Retry</Button>
          <Button variant="light" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};

// --------------------------------------------------------------------------------
//  Generic Route-Level Error Component
//  (route information & mantine components available)
// --------------------------------------------------------------------------------

type ErrorComponentProps = {
  error: Error; // whatever was thrown
  info?: { componentStack: string }; // React stack (render errors only)
  reset: () => void; // re-runs the failed match (loaders + component)
};

export function GenericRouteLevelErrorView({ error, reset }: ErrorComponentProps) {
  const location = useLocation();
  const router = useRouter();

  // Check for whether the error should be handled by a custom view
  const View = resolveErrorView(error);
  if (View !== GenericWidgetBindingLevelErrorView) {
    return (
      <MainLayout>
        <View error={error} resetErrorBoundary={reset} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container className="flex flex-col gap-4">
        <Alert color="red" title="Something went wrong on this page">
          <Text size="sm">
            URL: <code>{location.pathname}</code>
          </Text>
          {import.meta.env.DEV && (
            <Text size="sm" mt="xs" ff="monospace">
              {error.toString()}
            </Text>
          )}
        </Alert>

        <Group>
          <Button onClick={reset}>Retry</Button>
          <Button variant="light" onClick={() => router.invalidate()}>
            Reload data
          </Button>
        </Group>
      </Container>
    </MainLayout>
  );
}
