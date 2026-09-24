import type { z } from 'zod';

/**
 * Slots represent the individual points of interaction a widget exposes. There are 2 types of slots:
 *  - RPC slots
 *  - Stream slots
 *
 * In total there are 4 KIND's of slots
 *  - 'action' (RPC)
 *  - 'data' (RPC)
 *  - 'channel' (Stream)
 *  - 'video' (Stream)
 *
 * Note: when creating contracts and defining slots. The contract MUST be declared with `as const`.
 * Typescript will widen literal objects so without it the `kind` property accepts any string.
 * Adding the `as const` ensures `kind` remains a literal type of your 4 kinds of slots.
 *
 * Example usage:
 * --------------
 * const myContract = {
 *   type: 'my-widget',
 *   slots: {
 *     doSomething: {
 *       kind: 'action',
 *       params: z.object({ foo: z.string() }),
 *       results: z.object({ bar: z.string() }),
 *     },
 *     myChannel: {
 *       kind: 'channel',
 *       results: z.object({ baz: z.string() }),
 *     },
 *   },
 * } as const; <============== DO THIS
 */

export type RPCSlotSpec = {
  readonly kind: 'action' | 'data';
  readonly params: z.ZodType;
  readonly results: z.ZodType;
};

// Stream slots are read-only: no `params`, just a schema for incoming messages.
export type StreamSlotSpec = {
  readonly kind: 'channel' | 'video';
  readonly results: z.ZodType;
};

export type SlotSpec = RPCSlotSpec | StreamSlotSpec;

// Minimal shape any widget contract must satisfy.
export type WidgetContract = {
  readonly type: string;
  readonly slots: Readonly<Record<string, SlotSpec>>;
};
