import MainLayout from '@/components/layouts/main-layout';
import { MiceCloningFacility } from '@/widgets';
import { Card, Code, Container, List, Stack, Text } from '@mantine/core';
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
      <Container>
        <Stack gap="lg">
          <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
              <h1 className="text-4xl font-semibold">Anatomy of a Widget</h1>
              <Text size="sm">
                A widget is a fully independent UI that uses <Code>one-liner-router</Code> to pull
                data from the backend. Every widget is made of four pieces:
              </Text>

              <List spacing="xs" size="sm" listStyleType="none" style={{ paddingInlineStart: 0 }}>
                <List.Item>
                  <Text size="sm">
                    <span className="font-semibold">Contract</span> — declares the <i>slots</i> (the
                    data the view needs) and the expected parameter and return schemas each slot
                    must satisfy.
                  </Text>
                </List.Item>

                <List.Item>
                  <Text size="sm">
                    <span className="font-semibold">Config</span> — where the user defines every
                    widget instance. For each instance the user pairs each slot to a specific ZMQ
                    function name (a <i>binding</i>).
                  </Text>
                </List.Item>

                <List.Item>
                  <Text size="sm">
                    <span className="font-semibold">Wrapper</span> — the core. It gathers three
                    inputs and binds them together for the view:
                  </Text>
                  <List withPadding size="sm" spacing={2}>
                    <List.Item>
                      <span className="font-semibold">Contract</span>: expected shape of slots
                    </List.Item>
                    <List.Item>
                      <span className="font-semibold">Config</span>: mapping from slots to ZMQ
                      functions
                    </List.Item>
                    <List.Item>
                      <span className="font-semibold">Metadata</span>: actual ZMQ function metadata
                      from <Code>RouterClient</Code>
                    </List.Item>
                  </List>
                </List.Item>

                <List.Item>
                  <Text size="sm">
                    <span className="font-semibold">View</span> — the React component that renders
                    everything. By this point every slot is bound, so the view just reads data and
                    triggers calls.
                  </Text>
                </List.Item>
              </List>
            </Stack>
          </Card>
          <MiceCloningFacility instanceId={'facility1'} />
          <MiceCloningFacility instanceId={'facility2'} />
        </Stack>
      </Container>
    </MainLayout>
  );
}
