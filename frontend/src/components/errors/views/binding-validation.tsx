import { BindingValidationError, type BindingIssue } from '@/lib/one-liner-router/errors';
import {
  Accordion,
  Alert,
  Button,
  Code,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import type { FallbackProps } from 'react-error-boundary';
import { z } from 'zod';

const SUMMARY: Record<BindingIssue['kind'], string> = {
  'unknown-rpc': 'RPC is not advertised by the backend',
  'unknown-stream': 'Stream is not advertised by the backend',
  'rpc-params-mismatch': 'RPC params schema does not match the contract',
  'rpc-results-mismatch': 'RPC results schema does not match the contract',
  'stream-results-mismatch': 'Stream results schema does not match the contract',
};

// `expected` is a Zod schema, `actual` is raw JSON Schema from the backend.
const toJson = (value: unknown): string => {
  try {
    const schema = value instanceof z.ZodType ? z.toJSONSchema(value, { io: 'input' }) : value;
    return JSON.stringify(schema, null, 2);
  } catch {
    return String(value);
  }
};

/**
 * ZMQ Binding Validation Error View Component
 *
 * Error should be thrown for the following scenarios:
 *   - Backend does not advertise the expected RPC or stream
 *   - Backend advertises an RPC or stream but its params/results schema does not match the contract
 */
export const BindingValidationErrorView = ({ error }: FallbackProps) => {
  if (!(error instanceof BindingValidationError)) throw error;

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Title order={2}>Backend endpoints do not match the widget contracts</Title>
        <Alert color="red" title={`${error.issues.length} issue(s) found`}>
          <Text size="sm">
            The frontend contracts and the backend RPC/stream definitions have drifted. Update the
            contract, the backend function signature, or the binding name in your config.
          </Text>
        </Alert>

        <Accordion variant="separated" multiple>
          {error.issues.map((issue, index) => (
            <Accordion.Item key={`${issue.name}-${issue.kind}-${index}`} value={`${index}`}>
              <Accordion.Control>
                <Text size="sm">
                  <Code>{issue.name}</Code> — {SUMMARY[issue.kind]}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                {'expected' in issue ? (
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      Expected (contract)
                    </Text>
                    <Code block>{toJson(issue.expected)}</Code>
                    <Text size="sm" fw={600}>
                      Actual (backend)
                    </Text>
                    <Code block>{toJson(issue.actual)}</Code>
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    No endpoint with this name was advertised by the backend.
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>

        <Group>
          <Button onClick={() => window.location.reload()}>Reload after fixing</Button>
        </Group>
      </Stack>
    </Container>
  );
};
