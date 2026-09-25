import { z } from 'zod';
import { BindingValidationError, type BindingIssue } from './errors';
import type { RPCsMetadata, StreamsMetadata } from './metadata';

// --------------------------------------------------------------------------------
//  Types
// --------------------------------------------------------------------------------

export type ExpectedRPC = {
  name: string;
  params: z.ZodType;
  results: z.ZodType;
};

export type ExpectedStream = {
  name: string;
  results: z.ZodType;
};

type Json = Record<string, any>;

type CompareResult = { match: true; extras: string[] } | { match: false };

// --------------------------------------------------------------------------------
//  Utility - comparing pydantic model vs zod model
// --------------------------------------------------------------------------------

const IGNORED = new Set([
  '$schema',
  '$id',
  '$comment',
  'title',
  'description',
  'default',
  'examples',
  'deprecated',
  'readOnly',
  'writeOnly',
  'discriminator',
  'propertyNames',
]);
const SCHEMA_MAPS = new Set(['properties', '$defs']);
const SCHEMA_LISTS = new Set(['anyOf', 'prefixItems']);
const SCHEMA_SINGLE = new Set(['items', 'additionalProperties']);
const SAFE = Number.MAX_SAFE_INTEGER;

export function compareSchemas(expected: z.ZodType, actual: Json): CompareResult {
  let a: unknown;
  try {
    // Round-trip the JSON Schema through Zod so both sides come out of the same
    // emitter: $refs resolved, allOf merged, nullability and integers written
    // the same way. Unsupported keywords (e.g. `not`) throw -> no match.
    a = canon(z.toJSONSchema(z.fromJSONSchema(actual as any), { io: 'input' }));
  } catch {
    return { match: false };
  }
  const e = canon(z.toJSONSchema(expected, { io: 'input' }));
  const extras: string[] = [];
  return subset(e, a, '$', extras) ? { match: true, extras } : { match: false };
}

// Remove the remaining cosmetic differences between the two emitted schemas.
function canon(s: unknown): unknown {
  if (!isObj(s)) return s;
  const out: Json = Object.create(null);
  for (const key of Object.keys(s)) {
    if (IGNORED.has(key)) continue;
    let v = s[key];
    if (key === 'oneOf') {
      out.anyOf = v.map(canon);
      continue;
    }
    if (key === 'type') v = Array.isArray(v) ? [...new Set(v.map(int2num))].sort() : int2num(v);
    else if (key === 'enum')
      v = [...v].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
    else if (SCHEMA_MAPS.has(key))
      v = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, canon(x)]));
    else if (SCHEMA_LISTS.has(key)) v = v.map(canon);
    else if (SCHEMA_SINGLE.has(key)) {
      // `{}`, `true` and `false` here only say "open" or "closed"; drop them.
      if (v === true || v === false || (isObj(v) && Object.keys(v).length === 0)) continue;
      v = canon(v);
    }
    out[key] = v;
  }
  // An empty `properties` or `required` says nothing; drop so both sides agree.
  if (isObj(out.properties) && Object.keys(out.properties).length === 0) delete out.properties;
  if (Array.isArray(out.required) && out.required.length === 0) delete out.required;
  // z.int() adds safe-integer bounds; z.number() doesn't. Treat them as equal.
  if (s.type === 'integer' && out.minimum === -SAFE && out.maximum === SAFE) {
    delete out.minimum;
    delete out.maximum;
  }
  return out;
}

// `expected` must be contained in `actual`; actual may add properties/required.
function subset(e: unknown, a: unknown, path: string, extras: string[]): boolean {
  if (!isObj(e) || !isObj(a)) {
    if (Array.isArray(e) && Array.isArray(a)) {
      return e.length === a.length && e.every((x, i) => subset(x, a[i], `${path}[${i}]`, extras));
    }
    return JSON.stringify(e) === JSON.stringify(a);
  }

  const eKeys = Object.keys(e);
  if (eKeys.length !== Object.keys(a).length || !eKeys.every((k) => Object.hasOwn(a, k)))
    return false;

  for (const key of eKeys) {
    const ev = e[key],
      av = a[key];
    if (key === 'required') {
      if (!ev.every((r: string) => av.includes(r))) return false;
    } else if (key === 'properties') {
      for (const p of Object.keys(ev)) {
        if (!Object.hasOwn(av, p) || !subset(ev[p], av[p], `${path}.${p}`, extras)) return false;
      }
      for (const p of Object.keys(av)) if (!Object.hasOwn(ev, p)) extras.push(`${path}.${p}`);
    } else if (key === 'anyOf') {
      // Order-independent: pair each expected branch with a distinct actual branch.
      if (ev.length !== av.length) return false;
      const free = [...av];
      for (const branch of ev) {
        const i = free.findIndex((x) => subset(branch, x, path, []));
        if (i < 0) return false;
        subset(branch, free[i], path, extras);
        free.splice(i, 1);
      }
    } else if (!subset(ev, av, `${path}.${key}`, extras)) {
      return false;
    }
  }
  return true;
}

const int2num = (t: unknown) => (t === 'integer' ? 'number' : t);
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

// --------------------------------------------------------------------------------
//  Validator function
// --------------------------------------------------------------------------------

/**
 * For each expected RPC/stream, verify the backend advertises it and that its
 * params/return JSON schemas match. Throws BindingValidationError listing every
 * issue found; the caller can inspect `err.issues` for structured details.
 *
 * The caller owns how expectations are built (from widget contracts + config,
 * from tests, etc.). This function only sees the flat list.
 */
export function validateBindings(
  expectedRPCs: readonly ExpectedRPC[],
  expectedStreams: readonly ExpectedStream[],
  rpcs: RPCsMetadata,
  streams: StreamsMetadata,
): void {
  const issues: BindingIssue[] = [];

  const warnExtras = (label: string, extras: readonly string[]) => {
    if (extras.length === 0) return;
    console.warn(
      `[validateBindings] ${label} advertises extra schema fields not in expected: ${extras.join(', ')}`,
    );
  };

  // Check RPCS
  for (const exp of expectedRPCs) {
    const expectedParams = exp.params;
    const expectedResults = exp.results;

    const actual = rpcs[exp.name];
    if (!actual) {
      issues.push({ kind: 'unknown-rpc', name: exp.name });
      continue;
    }
    const paramsResult = compareSchemas(expectedParams, actual.params_schema ?? {});
    if (!paramsResult.match) {
      issues.push({
        kind: 'rpc-params-mismatch',
        name: exp.name,
        expected: expectedParams,
        actual: actual.params_schema ?? null,
      });
    } else {
      warnExtras(`RPC "${exp.name}" params`, paramsResult.extras);
    }
    const resultsResult = compareSchemas(expectedResults, actual.return_schema ?? {});
    if (!resultsResult.match) {
      issues.push({
        kind: 'rpc-results-mismatch',
        name: exp.name,
        expected: expectedResults,
        actual: actual.return_schema ?? null,
      });
    } else {
      warnExtras(`RPC "${exp.name}" results`, resultsResult.extras);
    }
  }

  // Check Streams
  for (const exp of expectedStreams) {
    const expectedResults = exp.results;

    const actual = streams[exp.name];
    if (!actual) {
      issues.push({ kind: 'unknown-stream', name: exp.name });
      continue;
    }
    const resultsResult = compareSchemas(expectedResults, actual.return_schema ?? {});
    if (!resultsResult.match) {
      issues.push({
        kind: 'stream-results-mismatch',
        name: exp.name,
        expected: expectedResults,
        actual: actual.return_schema ?? null,
      });
    } else {
      warnExtras(`Stream "${exp.name}" results`, resultsResult.extras);
    }
  }

  if (issues.length > 0) throw new BindingValidationError(issues);
}
