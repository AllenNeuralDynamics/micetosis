import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useConfig } from '../use-config';

// --------------------------------------------------------------------------------
//  Schemas
// --------------------------------------------------------------------------------

export const RPCMetadataSchema = z.object({
  name: z.string(),
  route: z.string(),
  params_schema: z.record(z.string(), z.unknown()).nullish(),
  return_schema: z.record(z.string(), z.unknown()).nullish(),
  description: z.string().nullish(),
});
export type RPCMetadata = z.infer<typeof RPCMetadataSchema>;
export const RPCsMetadataSchema = z.record(z.string(), RPCMetadataSchema);
export type RPCsMetadata = z.infer<typeof RPCsMetadataSchema>;

export const StreamMetadataSchema = z.object({
  name: z.string(),
  encoding: z.string(),
  route: z.string(),
  params_schema: z.record(z.string(), z.unknown()).nullish(),
  return_schema: z.record(z.string(), z.unknown()).nullish(),
  description: z.string().nullish(),
});
export type StreamMetadata = z.infer<typeof StreamMetadataSchema>;
export const StreamsMetadataSchema = z.record(z.string(), StreamMetadataSchema);
export type StreamsMetadata = z.infer<typeof StreamsMetadataSchema>;

// --------------------------------------------------------------------------------
//  API Fetch Functions
// --------------------------------------------------------------------------------

/**
 * Fetch ALL RPC metadata from the given URL.
 * @param url - The URL to fetch RPC metadata from.
 * @returns The parsed RPC metadata.
 */
export async function fetchRPCMetadata(url: string): Promise<RPCsMetadata> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch RPC metadata: ${res.status} ${await res.text()}`);
  return RPCsMetadataSchema.parse(await res.json());
}

/**
 * Fetch ALL Stream metadata from the given URL.
 * @param url - The URL to fetch Stream metadata from.
 * @returns The parsed Stream metadata.
 */
export async function fetchStreamMetadata(url: string): Promise<StreamsMetadata> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to fetch Stream metadata: ${res.status} ${await res.text()}`);
  return StreamsMetadataSchema.parse(await res.json());
}

// --------------------------------------------------------------------------------
//  Hook
// --------------------------------------------------------------------------------

// Hook to fetch all RPC metadata
export const useRPCsMetadata = () => {
  const { rpcs_endpoint } = useConfig();
  return useQuery<RPCsMetadata>({
    queryKey: ['rpc-metadata', rpcs_endpoint],
    queryFn: () => fetchRPCMetadata(rpcs_endpoint),
    staleTime: Infinity, // RPC metadata is unlikely to change during a session
  });
};

// Hook to fetch all Stream metadata
export const useStreamsMetadata = () => {
  const { streams_endpoint } = useConfig();
  return useQuery<StreamsMetadata>({
    queryKey: ['stream-metadata', streams_endpoint],
    queryFn: () => fetchStreamMetadata(streams_endpoint),
    staleTime: Infinity, // Streams metadata is unlikely to change during a session
  });
};
