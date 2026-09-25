import { useRPCAction, useRPCData } from '@/lib/one-liner-router';
import { useChannel, useStream } from '@/lib/webrtc/call-streams';
import type { z } from 'zod';
import type { SlotSpec, WidgetContract } from './contract';
import {
  toActionResource,
  toChannelResource,
  toDataResource,
  toStreamResource,
  type ActionResource,
  type ChannelResource,
  type DataResource,
  type StreamResource,
} from './resources';

// --------------------------------------------------------------------------------
//  Contract Resources type
// --------------------------------------------------------------------------------

// Resource shape for a slot, determined by `kind` property
type ResourceForSlot<S extends SlotSpec> = S extends {
  kind: 'action';
  params: infer P extends z.ZodType;
  results: infer R extends z.ZodType;
}
  ? ActionResource<z.infer<R>, z.infer<P>>
  : S extends { kind: 'data'; results: infer R extends z.ZodType }
    ? DataResource<z.infer<R>>
    : S extends { kind: 'channel'; results: infer R extends z.ZodType }
      ? ChannelResource<z.infer<R>>
      : S extends { kind: 'video' }
        ? StreamResource
        : never;

// Contract resources shape where slots are converted to its corresponding resource types
export type ResourcesForContract<C extends WidgetContract> = {
  [K in keyof C['slots']]: ResourceForSlot<C['slots'][K]>;
};

// --------------------------------------------------------------------------------
//  Binding Function
// --------------------------------------------------------------------------------

/**
 * Bind every slot in a widget contract to its RPC or stream and return a
 * props object of resources for the view. Throws if a slot has no binding.
 *
 * Definitions:
 *   Slot: zmq RPC/stream with function signature shape the widget expects.
 *   Binding: name of the backend endpoint (RPC or stream) corresponding to a slot.
 *   Resource: view-facing object connected to the backend endpoint fulfilling the slot.
 *
 * @param contract The widget contract declaring the slots.
 * @param bindings Mapping of slot name → endpoint name for this widget's instance.
 */
export function useBoundResources<C extends WidgetContract>(
  contract: C,
  bindings: Record<string, string>,
): ResourcesForContract<C> {
  const props: Record<string, unknown> = {};
  for (const [slotName, slotSpec] of Object.entries(contract.slots)) {
    // Retrieve the binding name (zmq call name) for the current slot.
    const bindingName = bindings[slotName];
    if (!bindingName) {
      throw new Error(`Missing binding for slot "${slotName}" in contract "${contract.type}".`);
    }

    // Bind the slot to its corresponding one-liner hook based on its kind.
    // The one-liner hooks is how we interact with the backend endpoints in a React-friendly way.
    if (slotSpec.kind === 'action') {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- contract.slots is `as const`, iteration is stable
      props[slotName] = toActionResource(useRPCAction(bindingName));
    } else if (slotSpec.kind === 'data') {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- contract.slots is `as const`, iteration is stable
      props[slotName] = toDataResource(useRPCData(bindingName));
    } else if (slotSpec.kind === 'channel') {
      props[slotName] = toChannelResource(useChannel(bindingName));
    } else if (slotSpec.kind === 'video') {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- contract.slots is `as const`, iteration is stable
      props[slotName] = toStreamResource(useStream(bindingName));
    } else {
      // This shouldn't be possible if user sets up contract properly (see contract.ts comment)
      throw new Error(
        `Unsupported slot kind "${slotSpec.kind}" for slot "${slotName}" in contract "${contract.type}".`,
      );
    }
  }
  return props as ResourcesForContract<C>;
}
