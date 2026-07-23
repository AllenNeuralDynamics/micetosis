import MainLayout from '@/components/layouts/main-layout';
import { Button, Text } from '@mantine/core';
import { createFileRoute, Link } from '@tanstack/react-router';

import micetosisBanner from '@/assets/micetosis.png';

export const Route = createFileRoute('/')({
  component: HomeComponent,
  staticData: { label: 'Home' },
});

function HomeComponent() {
  return (
    <MainLayout>
      <div className="flex flex-col min-h-[calc(100vh-96px)] items-center justify-center">
        <Text>Micetosis: an instrument UI template</Text>
        <Text className="text-xs" c="dimmed">
          Remove this and the example page to start building your own instrument UI. <br />
        </Text>

        <img src={micetosisBanner} alt="Logo" className="mb-4 w-1/5" />
        <Button component={Link} to="/example">
          Example
        </Button>
      </div>
    </MainLayout>
  );
}
