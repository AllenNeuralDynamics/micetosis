import { useRPCsMetadata } from '@/lib/one-liner-router';
import type { ResourcesForContract } from '@/widgets/framework';
import {
  Accordion,
  Button,
  Card,
  Code,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import { z } from 'zod';
import { MiceCloningFacilityContract } from './contract';

const contractDisplay = {
  type: MiceCloningFacilityContract.type,
  slots: Object.fromEntries(
    Object.entries(MiceCloningFacilityContract.slots).map(([name, slot]) => [
      name,
      {
        kind: slot.kind,
        params: z.toJSONSchema(slot.params),
        results: z.toJSONSchema(slot.results),
      },
    ]),
  ),
};

export type MiceCloningFacilityProps = ResourcesForContract<typeof MiceCloningFacilityContract> & {
  instanceId: string;
};

export const MiceCloningFacilityView = ({
  instanceId,
  cloneMice,
  checkCloneCount,
  executeOrder67,
  getManufacturerInfo,
  getFaultyMachineInfo,
}: MiceCloningFacilityProps) => {
  const [mouseName, setMouseName] = useState('Mickey');
  const [numOfClones, setNumOfClones] = useState<number>(2);
  const rpcsMetadata = useRPCsMetadata();

  const handleCloneMice = async () => {
    await cloneMice.call({ mouse: mouseName, num_of_clones: numOfClones });
    checkCloneCount.refetch();
  };

  return (
    <div>
      <Card shadow="sm" padding="lg" withBorder>
        <Stack gap="md">
          <h1 className="text-xl font-semibold">Mice Cloning Facility: {instanceId}</h1>

          <Group align="stretch" grow gap="md">
            <Paper withBorder p="sm">
              <Stack gap="xs">
                <Text size="sm" fw={600}>
                  Widget Contract
                </Text>
                <ScrollArea h={200}>
                  <Code block>{JSON.stringify(contractDisplay, null, 2)}</Code>
                </ScrollArea>
              </Stack>
            </Paper>

            <Paper withBorder p="sm">
              <Stack gap="xs">
                <Text size="sm" fw={600}>
                  RPCs Metadata
                </Text>
                <ScrollArea h={200}>
                  {rpcsMetadata.isLoading && <Text size="sm">Loading…</Text>}
                  {rpcsMetadata.error && (
                    <Text size="sm" c="red">
                      {rpcsMetadata.error.message}
                    </Text>
                  )}
                  {rpcsMetadata.data && (
                    <Code block>{JSON.stringify(rpcsMetadata.data, null, 2)}</Code>
                  )}
                </ScrollArea>
              </Stack>
            </Paper>
          </Group>

          <Accordion>
            <Accordion.Item value="Clone Mice">
              <Accordion.Control>Clone Mice</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Group grow align="flex-end">
                    <TextInput
                      label="Mouse name"
                      value={mouseName}
                      onChange={(e) => setMouseName(e.currentTarget.value)}
                    />
                    <NumberInput
                      label="Number of clones"
                      min={1}
                      value={numOfClones}
                      onChange={(v) => setNumOfClones(typeof v === 'number' ? v : Number(v) || 0)}
                    />
                  </Group>
                  <Button onClick={handleCloneMice} disabled={!mouseName.trim() || numOfClones < 1}>
                    Clone Mice
                  </Button>
                  <Text>Results: {cloneMice.result}</Text>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="Execute Order 67">
              <Accordion.Control>Execute Order 67</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Button onClick={() => executeOrder67.call({})}>Execute Order 67</Button>
                  <Text>Results: {JSON.stringify(executeOrder67.result, null, 2)}</Text>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="Check Clone Count">
              <Accordion.Control>Check Clone Count</Accordion.Control>
              <Accordion.Panel>
                <div>{checkCloneCount.data}</div>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="Manufacturer Info">
              <Accordion.Control>Manufacturer Info</Accordion.Control>
              <Accordion.Panel>
                <Code block>{JSON.stringify(getManufacturerInfo.data, null, 2)}</Code>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="Faulty Machine Info">
              <Accordion.Control>Faulty Machine Info</Accordion.Control>
              <Accordion.Panel>
                {getFaultyMachineInfo.error && (
                  <Text c="red">{getFaultyMachineInfo.error.message}</Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Card>
    </div>
  );
};
