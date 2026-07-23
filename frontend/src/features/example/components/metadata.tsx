import { useRPCsMetadata, useStreamsMetadata } from '@/hooks/one-liner-router';
import { Code, Group, JsonInput, Text } from '@mantine/core';

export function MetadataComponent() {
  const { data: rpcsMetadata } = useRPCsMetadata();
  const { data: streamsMetadata } = useStreamsMetadata();
  return (
    <div className="space-y-5">
      <Text c="dimmed" className="text-xs">
        This example shows retrieving metadata for all the RPCs and Streams through using the{' '}
        <Code>useRPCsMetadata</Code> and <Code>useStreamsMetadata</Code> hooks.
        <br />
        <br />
        See<Code>src/features/example/components/metadata.tsx</Code> for the code
      </Text>
      <Group grow align="flex-start">
        <JsonInput
          autosize
          maxRows={20}
          label="RPCs"
          description="This is the metadata for all RPCs available."
          value={JSON.stringify(rpcsMetadata, null, 2)}
          readOnly
        />
        <JsonInput
          autosize
          maxRows={20}
          label="Streams"
          description="This is the metadata for all Streams available."
          value={JSON.stringify(streamsMetadata, null, 2)}
          readOnly
        />
      </Group>
    </div>
  );
}
