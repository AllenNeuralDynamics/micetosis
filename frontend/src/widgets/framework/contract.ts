import type { z } from 'zod';

// A single slot in a widget contract.
// Contracts must be declared with `as const` (or captured via a `const`-generic
// helper) so `kind` stays a literal — otherwise `ResourceForSlot` in ./binding
// can't discriminate action from data.
export type SlotSpec = {
  readonly kind: 'action' | 'data';
  readonly params: z.ZodType;
  readonly results: z.ZodType;
};

// Minimal shape any widget contract must satisfy.
export type WidgetContract = {
  readonly type: string;
  readonly slots: Readonly<Record<string, SlotSpec>>;
};
