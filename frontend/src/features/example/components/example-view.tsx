import { Accordion, Container } from '@mantine/core';
import { FixedRPCActions } from './fixed-rpc-actions';
import { FixedRPCData } from './fixed-rpc-data';
import { GenericRPCCallComponent } from './generic-rpc-call';
import { MetadataComponent } from './metadata';
export function ExampleView() {
  return (
    <Container className="space-y-5">
      <h1 className="text-2xl font-semibold">Examples</h1>
      <Accordion defaultValue="metadata" variant="contained">
        <Accordion.Item value="metadata">
          <Accordion.Control>Metadata</Accordion.Control>
          <Accordion.Panel>
            <MetadataComponent />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="generic-rpc-call">
          <Accordion.Control>Generic RPC Call</Accordion.Control>
          <Accordion.Panel>
            <GenericRPCCallComponent />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="fixed-rpc-action">
          <Accordion.Control>Fixed RPC Action Call</Accordion.Control>
          <Accordion.Panel>
            <FixedRPCActions />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="fixed-rpc-data">
          <Accordion.Control>Fixed RPC Data</Accordion.Control>
          <Accordion.Panel>
            <FixedRPCData />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}
