import type { RPCEndpoints } from '@/hooks/one-liner-router';
import { useRPCData } from '@/hooks/one-liner-router';
import { Code, JsonInput, Stack, Text } from '@mantine/core';

type GetDancerResult = RPCEndpoints['get_dancer']['result'];

export const FixedRPCData = () => {
  const dancerData: GetDancerResult | undefined = useRPCData('get_dancer').result;

  return (
    <Stack>
      <Text className="text-xs" c="dimmed">
        This example demonstrates using the <Code>useRPCData</Code> hook. <br />
        <br />
        <Code>useRPCData</Code> is statically typed and performs validation of the parameters at
        compile time. It is statically typed through the use of a script that auto-generates
        TypeScript types for all the RPCs available on the server. <br />
        <br />
        See <Code>src/features/example/components/fixed-rpc-data.tsx</Code> for the code
      </Text>
      <JsonInput
        autosize
        maxRows={20}
        label="Result:"
        value={JSON.stringify(dancerData, null, 2)}
        formatOnBlur
      />
    </Stack>
  );
};
