import MainLayout from '@/components/layouts/main-layout';
import { ExampleView } from '@/features/example/components/example-view';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/example')({
  component: ExampleComponent,
  staticData: {
    label: 'Example',
  },
});

function ExampleComponent() {
  return (
    <MainLayout>
      <ExampleView />
    </MainLayout>
  );
}
