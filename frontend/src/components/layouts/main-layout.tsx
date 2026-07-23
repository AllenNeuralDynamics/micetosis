import aiLogo from '@/assets/ai_logo.svg';
import { useConfig } from '@/hooks/use-config';
import { AppShell, Breadcrumbs, Container } from '@mantine/core';
import { Link, useRouter } from '@tanstack/react-router';

type MainLayoutProps = {
  children: React.ReactNode;
};

const MainLayout = ({ children }: MainLayoutProps) => {
  const { title } = useConfig();

  const router = useRouter();
  const items = Object.values(router.routesByPath)
    .map((route) => (
      <Link key={route.fullPath} to={route.fullPath}>
        {route.options.staticData?.label ?? route.fullPath}
      </Link>
    ))

  return (
    <AppShell header={{ height: 96 }} padding="md">
      <AppShell.Header className="flex">
        <img
          src={aiLogo}
          alt="Allen Institute Logo"
          className="absolute left-0 hidden h-full p-4 2xl:block"
        />
        <Container className="flex w-full items-center justify-between">
          <h1 className="text-2xl font-semibold">Instrument/{title}</h1>
          <Breadcrumbs>{items}</Breadcrumbs>
        </Container>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};

export default MainLayout;
