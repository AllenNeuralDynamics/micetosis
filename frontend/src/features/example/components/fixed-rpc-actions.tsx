import type { RPCEndpoints } from '@/hooks/one-liner-router';
import { useRPCAction } from '@/hooks/one-liner-router';
import { Button, Code, JsonInput, Stack, Text } from '@mantine/core';
import { useState } from 'react';

type ChangeTuneParams = RPCEndpoints['change_tune']['params'];

export const FixedRPCActions = () => {
  const [paramsText, setParamsText] = useState('{ "tune": "" }');
  const changeTune = useRPCAction('change_tune');

  return (
    <Stack>
      <Text className="text-xs" c="dimmed">
        This example demonstrates using the <Code>useRPCAction</Code> hook. <br />
        <br />
        <Code>useRPCAction</Code> is statically typed and performs validation of the parameters at
        compile time. It is statically typed through the use of a script that auto-generates
        TypeScript types for all the RPCs available on the server. <br />
        <br />
        See <Code>src/features/example/components/fixed-rpc-actions.tsx</Code> for the code
      </Text>
      <JsonInput
        autosize
        maxRows={20}
        label="change_tune params"
        value={paramsText}
        onChange={setParamsText}
        validationError="Invalid JSON"
        formatOnBlur
      />
      <Button
        onClick={() => changeTune.call(JSON.parse(paramsText) as ChangeTuneParams)}
        loading={changeTune.isLoading}
      >
        Change Tune
      </Button>
      {changeTune.result !== undefined && (
        <JsonInput
          autosize
          maxRows={20}
          label="Result:"
          value={JSON.stringify(changeTune.result, null, 2)}
          formatOnBlur
        />
      )}
    </Stack>
  );
};
