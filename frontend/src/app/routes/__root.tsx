import { RouteErrorComponent } from '@/components/errors/route';
import { useConfig } from '@/hooks/use-config';
import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useEffect } from 'react';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RouteErrorComponent,
});

function RootComponent() {
  const { title } = useConfig();

  useEffect(() => {
    // Update the document title whenever the title from the config changes
    document.title = title;
  }, [title]);

  return (
    <>
      <main>
        <Outlet />
      </main>
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
    </>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4" role="alert">
      <h1 className="text-2xl font-semibold">404 — Page not found</h1>
      <Link to="/" className="text-blue-600 underline">
        Go home
      </Link>
    </div>
  );
}
