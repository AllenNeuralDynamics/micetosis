import { useConfig } from '@/hooks/use-config';
import { OneLinerGate } from '@/lib/one-liner-router/gate';
import type { ExpectedRPC, ExpectedStream } from '@/lib/one-liner-router/validate-zmq-bindings.ts';
import type { WidgetContract } from './contract';
import { validateSlotBindings } from './validate-slots';

type WidgetGateProps = {
  registry: Readonly<Record<string, WidgetContract>>;
  children: React.ReactNode;
};

/**
 * WidgetGate is responsible for retrieving all unique slots from each widget's configuration
 * as well as the expected params/results schema from the widget's contract.
 *
 * The responsibility of this function is to retrieve all necessary WIDGET-related data
 * for the OneLinerGate to perform validation and eventual binding.
 */
export const WidgetGate = ({ registry, children }: WidgetGateProps) => {
  // Get config (mapping of slot resources to zmq call_names)
  const config = useConfig();

  const expectedStreams: Array<ExpectedStream> = [];
  const expectedRPCs: Array<ExpectedRPC> = [];

  validateSlotBindings(registry, config.widgets);

  // Iterate over each widget instance and grab the expected RPCs and streams the widget requires
  for (const [, widget] of Object.entries(config.widgets)) {
    const contract = registry[widget.type];
    for (const [slot, slotSpec] of Object.entries(contract.slots)) {
      if (slotSpec.kind === 'data' || slotSpec.kind === 'action') {
        expectedRPCs.push({
          name: widget.bindings[slot],
          params: slotSpec.params,
          results: slotSpec.results,
        });

        // TODO: need to handle video too
      } else if (slotSpec.kind === 'channel' || slotSpec.kind === 'video') {
        expectedStreams.push({
          name: widget.bindings[slot],
          results: slotSpec.results,
        });
      }
    }
  }

  return (
    <OneLinerGate expectedRPCs={expectedRPCs} expectedStreams={expectedStreams}>
      {children}
    </OneLinerGate>
  );
};
