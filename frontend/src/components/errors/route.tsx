import MainLayout from '@/components/layouts/main-layout';
import { Alert, Button, Container, Group, Text } from '@mantine/core';
import { useLocation, useMatch, useRouter } from '@tanstack/react-router';

/********************************************************************************
 * ROUTE-LEVEL Error Component
 ********************************************************************************
 *
 * Rendered when a route throws an error. Uses tanstack/react-router's error
 * handling, which is separate from the app-level ErrorBoundary.
 *
 * ErrorBoundary is used in the ProviderLevel Error Component
 *
 */

type ErrorComponentProps = {
  error: Error; // whatever was thrown
  info?: { componentStack: string }; // React stack (render errors only)
  reset: () => void; // re-runs the failed match (loaders + component)
};

export function RouteErrorComponent({ error, info, reset }: ErrorComponentProps) {
  const location = useLocation();
  const match = useMatch({ strict: false });
  const router = useRouter();

  return (
    <MainLayout>
      <Container className="flex flex-col gap-4">
        <Alert color="red" title="Something went wrong on this page">
          <Text size="sm">
            Route: <code>{match.routeId}</code>
          </Text>
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
