#!/usr/bin/env node
// -----------------------------------------------------------------------------
//  This was a vibe-coded one-off script to generate the RPC types from an API
//  endpoint. It is not necessary to run this script since the useRPC hooks are
//  already generically typed. 
//
//  Having this script gives us useful autocomplete and type checking for the
//  RPC endpoints, but it is not required for the app to function.
// -----------------------------------------------------------------------------
//  RPC type generator
// -----------------------------------------------------------------------------
//  Reads the RPC metadata (same shape your useRPCsMetadata hook fetches) and
//  emits static .ts so the compiler can give autocomplete + param checking.
//
//  Emits, into <outDir>:
//    <name>.ts        one file per endpoint: <Pascal>Params + <Pascal>Result
//                     (+ any $defs local to that endpoint, kept file-scoped so
//                      two endpoints can each define e.g. DanceMoves w/o clash)
//    endpoints.ts     the RPCEndpoints interface (name -> {params, result})
//                     and ROUTES map. This is what the typed facade rides on.
//
//  Usage:
//    node generate-rpc-types.mjs --in metadata.json --out ./generated
//    node generate-rpc-types.mjs --url http://host/rpcs --out ./generated
// -----------------------------------------------------------------------------

import { compile } from 'json-schema-to-typescript';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// ---- args -------------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const outDir = args.out ?? './generated';

// ---- helpers ----------------------------------------------------------------
const toPascal = (s) =>
  s.replace(/(^|[_\-\s]+)([a-zA-Z0-9])/g, (_, __, c) => c.toUpperCase());

// json-schema-to-typescript options shared by every compile call.
// additionalProperties:false => objects that DON'T declare additionalProperties
// get no `[k: string]: unknown` index signature (Pydantic objects are closed).
// A schema that explicitly sets additionalProperties:true (like get_dancer's
// return) still keeps its index signature, which is what we want.
const JS2TS = {
  bannerComment: '',
  additionalProperties: false,
  format: true,
};

// Pydantic stamps every property with a `title`, which makes
// json-schema-to-typescript hoist a named alias for each one
// (export type Name = string, etc). Strip titles everywhere EXCEPT inside
// `$defs`, where a title names a genuinely shared type we want to keep
// (e.g. DanceMoves). Mutates a clone, never the caller's object.
function stripPropertyTitles(node, insideDefs = false) {
  if (Array.isArray(node)) return node.map((n) => stripPropertyTitles(n, insideDefs));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'title' && !insideDefs) continue;
      out[k] = stripPropertyTitles(v, insideDefs || k === '$defs');
    }
    return out;
  }
  return node;
}

// Compile one schema into a `export type <Name> = ...` block, handling the
// edge cases this metadata actually contains.
async function compileNamed(schema, name, fallbackDoc) {
  // Empty schema {}  or null/undefined => no constraints => unknown.
  if (schema == null || (typeof schema === 'object' && Object.keys(schema).length === 0)) {
    return `export type ${name} = unknown;\n`;
  }
  const ts = await compile(stripPropertyTitles(schema), name, JS2TS);
  return ts;
}

async function main() {
  // ---- load metadata --------------------------------------------------------
  let metadata;
  if (args.url) {
    const res = await fetch(args.url);
    if (!res.ok) throw new Error(`fetch ${args.url}: ${res.status}`);
    metadata = await res.json();
  } else {
    metadata = JSON.parse(await readFile(args.in ?? 'metadata.json', 'utf8'));
  }

  await mkdir(outDir, { recursive: true });

  const names = Object.keys(metadata).sort();
  const registryRows = [];
  const routeRows = [];
  const imports = [];

  for (const name of names) {
    const m = metadata[name];
    const Pascal = toPascal(name);
    const ParamsT = `${Pascal}Params`;
    const ResultT = `${Pascal}Result`;

    const paramsBlock = m.params_schema
      ? await compileNamed(m.params_schema, ParamsT)
      : `export type ${ParamsT} = void;\n`;
    const resultBlock = await compileNamed(m.return_schema, ResultT);

    const doc = m.description
      ? `/**\n${m.description.split('\n').map((l) => ` * ${l}`).join('\n')}\n */\n`
      : '';

    const file = `// AUTO-GENERATED from RPC metadata. Do not edit by hand.\n\n${doc}${paramsBlock}\n${resultBlock}`;
    await writeFile(join(outDir, `${name}.ts`), file, 'utf8');

    imports.push(`import type { ${ParamsT}, ${ResultT} } from './${name}';`);
    registryRows.push(`  ${JSON.stringify(name)}: { params: ${ParamsT}; result: ${ResultT} };`);
    routeRows.push(`  ${JSON.stringify(name)}: ${JSON.stringify(m.route)},`);
  }

  const endpoints = `// AUTO-GENERATED from RPC metadata. Do not edit by hand.
${imports.join('\n')}

// Static map of RPC name -> { params, result }. The typed hook facade is
// generic over \`keyof RPCEndpoints\`, which is what turns \`name: string\`
// into an autocompleting union and binds params/result to the schema.
export interface RPCEndpoints {
${registryRows.join('\n')}
}

export type RPCName = keyof RPCEndpoints;

// Routes are also available statically if you ever need them off the hook path.
export const ROUTES = {
${routeRows.join('\n')}
} as const satisfies Record<RPCName, string>;
`;
  await writeFile(join(outDir, 'endpoints.ts'), endpoints, 'utf8');

  console.log(`Generated ${names.length} endpoints -> ${outDir}`);
  console.log(names.map((n) => `  - ${n}`).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
