import { z } from 'zod';

/**
 * The trailing `as const`` is necessary for compile-time intellisense, narrows the types of the
 * fields with its literal types rather than widening them to general types.
 *
 * Meaning, for `kind`, it will be narrowed to the literal type `'action'` or `'data'` instead of
 * the general `string` type.
 *
 * This ensure later on, typescript can correctly infer the types of the slots and their resources.
 *
 */
export const MiceCloningFacilityContract = {
  type: 'MiceCloningFacility',
  slots: {
    cloneMice: {
      params: z.object({ mouse: z.string(), num_of_clones: z.number().optional() }),
      results: z.string(),
      kind: 'action',
    },
    checkCloneCount: { params: z.object({}), results: z.number(), kind: 'data' },
    executeOrder67: { params: z.object({}), results: z.unknown(), kind: 'action' },
    getManufacturerInfo: { params: z.object({}), results: z.unknown(), kind: 'data' },
    getFaultyMachineInfo: { params: z.object({}), results: z.unknown(), kind: 'data' },
  },
} as const;
