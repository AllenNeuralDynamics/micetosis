export { MiceCloningFacility } from './MiceCloningFacility';
import { MiceCloningFacility, MiceCloningFacilityContract } from './MiceCloningFacility';
import type { WidgetContract } from './framework';

export const defaultWidgetRegistry = {
  MiceCloningFacility,
} as const;

export type DefaultWidgetType = keyof typeof defaultWidgetRegistry;

// Widget type -> contract, used by binding validation to compare each slot's
// declared schema against the actual RPC metadata schema.
export const defaultWidgetContractRegistry: Readonly<Record<string, WidgetContract>> = {
  [MiceCloningFacilityContract.type]: MiceCloningFacilityContract,
};
