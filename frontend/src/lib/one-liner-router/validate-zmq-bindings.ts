import type { Config } from '@/hooks/use-config';
import type { WidgetContract } from '@/widgets/framework';
import { z } from 'zod';
import type { RPCsMetadata } from './metadata';

// Map of widget type -> contract. Provided by the app so validation can look
// up the contract for each widget instance declared in the config.
export type WidgetContractRegistry = Readonly<Record<string, WidgetContract>>;

export type BindingIssue =
  | { instanceId: string; widgetType: string; kind: 'unknown-widget-type' }
  | { instanceId: string; widgetType: string; slot: string; kind: 'missing-slot-binding' }
  | { instanceId: string; widgetType: string; slot: string; rpc: string; kind: 'unknown-rpc' }
  | {
      instanceId: string;
      widgetType: string;
      slot: string;
      rpc: string;
      kind: 'params-schema-mismatch';
      expected: unknown;
      actual: unknown;
    }
  | {
      instanceId: string;
      widgetType: string;
      slot: string;
      rpc: string;
      kind: 'results-schema-mismatch';
      expected: unknown;
      actual: unknown;
    };

// JSON Schema keys we strip before comparing: pure metadata (title/description),
// runtime concerns (default), and strictness markers that Pydantic and Zod
// emit differently but that don't change the accepted shape for our purposes.
const IGNORED_JSON_SCHEMA_KEYS = new Set([
  '$schema',
  'title',
  'description',
  'default',
  'additionalProperties',
]);

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    if (IGNORED_JSON_SCHEMA_KEYS.has(key)) continue;
    let v = obj[key];
    // JS has no separate integer type, so treat Pydantic's "integer" the same
    // as Zod's "number" (and arrays like ["integer","null"] the same as
    // ["number","null"]).
    if (key === 'type') {
      if (v === 'integer') v = 'number';
      else if (Array.isArray(v)) v = v.map((t) => (t === 'integer' ? 'number' : t));
    }
    out[key] = canonicalize(v);
  }
  return out;
}

function schemasEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

/**
 * Check that every widget instance in the config has a known widget type, that
 * every slot in the contract has a binding to a real RPC, and that the RPC's
 * params/return JSON schemas match the ones declared by the contract slot.
 */
export function validateBindings(
  config: Config,
  contracts: WidgetContractRegistry,
  rpcs: RPCsMetadata,
): BindingIssue[] {
  const issues: BindingIssue[] = [];

  for (const [instanceId, widget] of Object.entries(config.widgets)) {
    const contract = contracts[widget.type];
    if (!contract) {
      issues.push({ instanceId, widgetType: widget.type, kind: 'unknown-widget-type' });
      continue;
    }

    for (const [slot, spec] of Object.entries(contract.slots)) {
      const rpcName = widget.bindings[slot];
      if (!rpcName) {
        issues.push({
          instanceId,
          widgetType: widget.type,
          slot,
          kind: 'missing-slot-binding',
        });
        continue;
      }

      const rpc = rpcs[rpcName];
      if (!rpc) {
        issues.push({
          instanceId,
          widgetType: widget.type,
          slot,
          rpc: rpcName,
          kind: 'unknown-rpc',
        });
        continue;
      }

      const expectedParams = z.toJSONSchema(spec.params);
      const expectedResults = z.toJSONSchema(spec.results);

      if (!schemasEqual(expectedParams, rpc.params_schema ?? {})) {
        issues.push({
          instanceId,
          widgetType: widget.type,
          slot,
          rpc: rpcName,
          kind: 'params-schema-mismatch',
          expected: expectedParams,
          actual: rpc.params_schema ?? null,
        });
      }
      if (!schemasEqual(expectedResults, rpc.return_schema ?? {})) {
        issues.push({
          instanceId,
          widgetType: widget.type,
          slot,
          rpc: rpcName,
          kind: 'results-schema-mismatch',
          expected: expectedResults,
          actual: rpc.return_schema ?? null,
        });
      }
    }
  }

  return issues;
}

export function formatBindingIssues(issues: BindingIssue[]): string {
  return issues
    .map((issue) => {
      switch (issue.kind) {
        case 'unknown-widget-type':
          return `[${issue.instanceId}] Unknown widget type "${issue.widgetType}" (not in the registry).`;
        case 'missing-slot-binding':
          return `[${issue.instanceId}] (${issue.widgetType}) Slot "${issue.slot}" has no binding in config.`;
        case 'unknown-rpc':
          return `[${issue.instanceId}] (${issue.widgetType}) Slot "${issue.slot}" is bound to RPC "${issue.rpc}", which is not in the metadata.`;
        case 'params-schema-mismatch':
          return (
            `[${issue.instanceId}] (${issue.widgetType}) Slot "${issue.slot}" params schema mismatch for RPC "${issue.rpc}":\n` +
            `  expected: ${JSON.stringify(issue.expected)}\n` +
            `  actual:   ${JSON.stringify(issue.actual)}`
          );
        case 'results-schema-mismatch':
          return (
            `[${issue.instanceId}] (${issue.widgetType}) Slot "${issue.slot}" results schema mismatch for RPC "${issue.rpc}":\n` +
            `  expected: ${JSON.stringify(issue.expected)}\n` +
            `  actual:   ${JSON.stringify(issue.actual)}`
          );
      }
    })
    .join('\n');
}
