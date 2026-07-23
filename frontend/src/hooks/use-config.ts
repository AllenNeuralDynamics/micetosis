import { useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

// --------------------------------------------------------------------------------
//  Constants
// --------------------------------------------------------------------------------

const CONFIG_URL = '/api/config';

// --------------------------------------------------------------------------------
//  Schemas
// --------------------------------------------------------------------------------

const ConfigSchema = z.object({
  title: z.string().min(1),
  rpcs_endpoint: z.string(),
  streams_endpoint: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

// --------------------------------------------------------------------------------
//  Functions
// --------------------------------------------------------------------------------

/**
 * Retrieve the config from the backend and validate it against the schema.
 * @returns Config data
 */
const fetchConfig = async (): Promise<Config> => {
  let response: Response;
  try {
    response = await fetch(CONFIG_URL);
  } catch (cause) {
    throw new Error(`Could not reach ${CONFIG_URL}: is the backend running?`, { cause });
  }

  // Check for HTTP errors
  if (!response.ok) {
    const hint =
      response.status === 404
        ? ' The backend may be missing its config.json file or the /api/config endpoint.'
        : '';
    throw new Error(`Config request failed: ${response.status} ${response.statusText}.${hint}`);
  }

  // Check valid JSON
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new Error(`Config response from ${CONFIG_URL} was not valid JSON.`, { cause });
  }

  // Check valid config schema
  const parsed = ConfigSchema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Config from ${CONFIG_URL} failed validation:\n${issues}`);
  }

  return parsed.data;
};

// --------------------------------------------------------------------------------
//  Hook
// --------------------------------------------------------------------------------

export const useConfig = (): Config => {
  return useSuspenseQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
    staleTime: Infinity,
  }).data;
};
