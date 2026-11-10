/**
 * Errors thrown while checking widget config against widget contracts.
 * Issues are kept structured so the UI can render them; `message` is only for logs.
 */

export type SlotIssue =
  | { kind: 'unknown-widget-type'; instanceId: string; widgetType: string }
  | { kind: 'missing-in-config'; instanceId: string; widgetType: string; slot: string }
  | { kind: 'missing-in-contract'; instanceId: string; widgetType: string; slot: string };

export function formatSlotIssues(issues: readonly SlotIssue[]): string {
  return issues
    .map((issue) => {
      switch (issue.kind) {
        case 'unknown-widget-type':
          return `Instance "${issue.instanceId}" declares unknown widget type "${issue.widgetType}".`;
        case 'missing-in-config':
          return `Instance "${issue.instanceId}" (type "${issue.widgetType}") is missing a binding for slot "${issue.slot}" declared by the contract.`;
        case 'missing-in-contract':
          return `Instance "${issue.instanceId}" (type "${issue.widgetType}") binds slot "${issue.slot}", which the contract does not declare.`;
      }
    })
    .join('\n');
}

export class SlotValidationError extends Error {
  readonly issues: readonly SlotIssue[];
  readonly knownTypes: readonly string[];

  constructor(issues: readonly SlotIssue[], knownTypes: readonly string[]) {
    super(`Slot validation failed with ${issues.length} issue(s):\n${formatSlotIssues(issues)}`);
    this.name = 'SlotValidationError';
    this.issues = issues;
    this.knownTypes = knownTypes;
  }
}
