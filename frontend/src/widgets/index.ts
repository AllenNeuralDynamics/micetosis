export { MiceCloningFacility } from './MiceCloningFacility';
import { MiceCloningFacility } from './MiceCloningFacility';
import type { WidgetContract } from './framework';

// NOTE: this is where you register a widget, everything else is derived from this
export const defaultWidgetRegistry = {
  MiceCloningFacility,
} as const;

export type DefaultWidgetType = keyof typeof defaultWidgetRegistry;

// Map of widget type to its contract
export const defaultWidgetContractRegistry: Readonly<Record<string, WidgetContract>> =
  Object.fromEntries(
    Object.values(defaultWidgetRegistry).map((widget) => [widget.contract.type, widget.contract]),
  );
