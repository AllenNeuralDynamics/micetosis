import {
  toActionResource,
  toDataResource,
  useRPCAction,
  useRPCData,
  type ActionResource,
  type DataResource,
} from '@/lib/one-liner-router';
import type { z } from 'zod';
import type { SlotSpec, WidgetContract } from './contract';

// Resource shape for one slot, picked by `kind`.
type ResourceForSlot<S extends SlotSpec> = S['kind'] extends 'action'
  ? ActionResource<z.infer<S['results']>, z.infer<S['params']>>
  : DataResource<z.infer<S['results']>>;

// Full resources object matching every slot in a contract.
export type ResourcesForContract<C extends WidgetContract> = {
  [K in keyof C['slots']]: ResourceForSlot<C['slots'][K]>;
};

/**
 * Bind every slot in a widget contract to its RPC hook and return a props
 * object of resources for the view. Throws if a slot has no binding.
 *
 * Definitions:
 *   Slot: declaration of a prop the widget view needs.
 *   RPC: named function on the backend (served by the router server).
 *   Resource: view-facing object connected to an RPC; what the view uses to
 *     call the backend or read its state.
 *
 * @param contract The widget contract declaring the slots.
 * @param bindings Mapping of slot name → RPC name for this widget instance.
 */
export function useBoundResources<C extends WidgetContract>(
  contract: C,
  bindings: Record<string, string>,
): ResourcesForContract<C> {
  const props: Record<string, unknown> = {};
  for (const [slotName, slotSpec] of Object.entries(contract.slots)) {
    const rpcName = bindings[slotName];
    if (!rpcName) {
      throw new Error(`Missing binding for slot "${slotName}" in contract "${contract.type}".`);
    }
    if (slotSpec.kind === 'action') {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- contract.slots is `as const`, iteration is stable
      props[slotName] = toActionResource(useRPCAction(rpcName));
    } else {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- contract.slots is `as const`, iteration is stable
      props[slotName] = toDataResource(useRPCData(rpcName));
    }
  }
  return props as ResourcesForContract<C>;
}
