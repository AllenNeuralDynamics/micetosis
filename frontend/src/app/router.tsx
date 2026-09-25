import { createRouter } from '@tanstack/react-router';

import { GenericRouteLevelErrorView } from '@/components/errors/views/generic';
import { routeTree } from '@/app/routes/routeTree.gen';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultErrorComponent: GenericRouteLevelErrorView,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
