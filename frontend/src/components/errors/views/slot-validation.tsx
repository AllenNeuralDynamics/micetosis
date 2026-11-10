import type { SlotIssue } from '@/widgets/framework/errors';
import { SlotValidationError } from '@/widgets/framework/errors';
import { Alert, Button, Code, Container, Group, Stack, Table, Text, Title } from '@mantine/core';
import type { FallbackProps } from 'react-error-boundary';

const LOCATION: Record<SlotIssue['kind'], string> = {
  'unknown-widget-type': 'widget registry',
  'missing-in-config': 'config.json',
  'missing-in-contract': 'widget contract',
};

/**
 * Slot Validation Error View Component
 *
 * Error should be thrown for the following scenarios:
 *  - A slot exists in the widget contract but is missing in the configuration, or vice versa.
 *  - A registered widget type is missing or unknown in the widget registry
 */
export const SlotValidationErrorView = ({ error }: FallbackProps) => {
  if (!(error instanceof SlotValidationError)) throw error;

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Title order={2}>Widget configuration does not match its contract</Title>
        <Alert color="red" title={`${error.issues.length} mismatch(es) found`}>
          <Text size="sm">
            Each row below is a slot that exists on one side only. Fix it by adding the binding to
            your config, removing the extra binding, or updating the widget contract.
          </Text>
        </Alert>

        <Table striped withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Instance</Table.Th>
              <Table.Th>Widget type</Table.Th>
              <Table.Th>Slot</Table.Th>
              <Table.Th>Missing in</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {error.issues.map((issue, index) => (
              <Table.Tr key={`${issue.instanceId}-${issue.kind}-${index}`}>
                <Table.Td>
                  <Code>{issue.instanceId}</Code>
                </Table.Td>
                <Table.Td>
                  <Code>{issue.widgetType}</Code>
                </Table.Td>
                <Table.Td>
                  {issue.kind === 'unknown-widget-type' ? (
                    <Text size="sm" c="dimmed">
                      (whole widget)
                    </Text>
                  ) : (
                    <Code>{issue.slot}</Code>
                  )}
                </Table.Td>
                <Table.Td>{LOCATION[issue.kind]}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Text size="sm" c="dimmed">
          Registered widget types: {error.knownTypes.join(', ') || '(none)'}
        </Text>

        <Group>
          <Button onClick={() => window.location.reload()}>Reload after fixing</Button>
        </Group>
      </Stack>
    </Container>
  );
};
