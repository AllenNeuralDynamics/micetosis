// AUTO-GENERATED from RPC metadata. Do not edit by hand.

/**
 * Get a groovy dancer to dance to some tunes.
 * 
 * Parameters
 * ----------
 * name : str
 *     The name of the dancer.
 * moves : list[DanceMoves]
 *     The dance moves the dancer can perform.
 * 
 * Returns
 * -------
 * dict
 *     A dictionary representation of the dancer.
 * 
 * Examples
 * --------
 * >>> disco_device = DiscoDevice()
 * >>> disco_device.get_dancer(name="Jane Doe", moves=[DanceMoves.MOONWALK, DanceMoves.ROBOT])
 * {'name': 'Jane Doe', 'moves': ['moonwalk', 'robot']}
 */
export type DanceMoves = "moonwalk" | 123 | "salsa";

export interface GetDancerParams {
  name?: string;
  moves?: DanceMoves[];
}

export interface GetDancerResult {
  [k: string]: unknown;
}
