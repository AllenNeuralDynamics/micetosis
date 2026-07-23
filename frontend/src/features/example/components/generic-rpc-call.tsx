import { useDynamicRPCAction, useRPCsMetadata } from '@/hooks/one-liner-router';
import { Alert, Button, Code, Group, JsonInput, Select, Stack, Text } from '@mantine/core';
import { useState } from 'react';

export function GenericRPCCallComponent() {
  const { data: rpcsMetadata } = useRPCsMetadata();

  const [name, setName] = useState('');
  const [paramsText, setParamsText] = useState('{}');
  const { call, result, error, isLoading, metadata } = useDynamicRPCAction<unknown, unknown>(name);

  const rpcNames = Object.keys(rpcsMetadata ?? {});

  // Parse the params textarea. Result drives both button-disabled state and
  // what we hand to `call`, so we only parse once per render.
  const parsedParams = (() => {
    try {
      return { ok: true as const, value: JSON.parse(paramsText) as unknown };
    } catch {
      return { ok: false as const };
    }
  })();

  return (
    <div className="space-y-5">
      <Text c="dimmed" className="text-xs">
        This example demonstrates calling the various RPCs available on the server with the{' '}
        <Code>useDynamicRPCAction</Code> hook. <br />
        <br />
        <Code>useDynamicRPCAction</Code> is dynamically typed and performs validation the parameters
        against the RPC's schema at runtime. <br />
        <br />
        See <Code>src/features/example/components/generic-rpc-call.tsx</Code> for the code
      </Text>
      <Stack>
        <Group grow align="flex-start">
          <Select
            label="Select RPC"
            placeholder="Pick an RPC"
            data={rpcNames}
            value={name || null}
            onChange={(v) => {
              setName(v ?? '');
              setParamsText('{}');
            }}
            searchable
            clearable
            nothingFoundMessage="No matching RPCs"
          />
          <JsonInput
            label="Params Input"
            value={paramsText}
            onChange={setParamsText}
            validationError="Invalid JSON"
            formatOnBlur
            autosize
            minRows={3}
            maxRows={20}
          />
        </Group>
        <Group grow align="flex-start">
          {metadata?.params_schema && (
            <JsonInput
              autosize
              maxRows={20}
              label="Parameter Schema"
              value={JSON.stringify(metadata.params_schema, null, 2)}
              readOnly
            />
          )}
        </Group>
        <Button
          onClick={() => parsedParams.ok && call(parsedParams.value)}
          disabled={!name || !metadata || !parsedParams.ok || isLoading}
          loading={isLoading}
        >
          Submit
        </Button>
        {error && (
          <Alert color="red" title={error.name}>
            {error.message}
          </Alert>
        )}
        {result !== undefined && (
          <JsonInput
            autosize
            maxRows={20}
            label="Result"
            value={JSON.stringify(result, null, 2)}
            readOnly
          />
        )}
      </Stack>
    </div>
  );
}
