import type { Config } from '@/hooks/use-config';
import type { WidgetContract } from './contract';
import { SlotValidationError, type SlotIssue } from './errors';

type WidgetRegistry = Readonly<Record<string, WidgetContract>>;
type WidgetInstances = Config['widgets'];

/**
 * Check that every widget instance in the config binds exactly the slots its contract declares.
 *
 * A slot can be missing in two directions:
 *  - `missing-in-config`: the contract declares the slot but the instance has no binding for it
 *  - `missing-in-contract`: the instance binds a slot the contract never declares
 *
 * @param registry All known widget contracts, keyed by widget type.
 * @param widgets All widget instances from the config, keyed by instance id.
 * @throws SlotValidationError listing every issue found across all instances.
 */
export function validateSlotBindings(registry: WidgetRegistry, widgets: WidgetInstances): void {
  const issues: SlotIssue[] = [];

  for (const [instanceId, widget] of Object.entries(widgets)) {
    const contract = registry[widget.type];
    if (!contract) {
      issues.push({ kind: 'unknown-widget-type', instanceId, widgetType: widget.type });
      continue;
    }

    for (const slot of Object.keys(contract.slots)) {
      if (!widget.bindings[slot]) {
        issues.push({ kind: 'missing-in-config', instanceId, widgetType: widget.type, slot });
      }
    }
    for (const slot of Object.keys(widget.bindings)) {
      if (!(slot in contract.slots)) {
        issues.push({ kind: 'missing-in-contract', instanceId, widgetType: widget.type, slot });
      }
    }
  }

  if (issues.length > 0) throw new SlotValidationError(issues, Object.keys(registry));
}
