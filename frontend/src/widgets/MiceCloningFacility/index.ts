import { createWidget } from '@/widgets/framework';
import { MiceCloningFacilityContract } from './contract';
import { MiceCloningFacilityView } from './view';

export { MiceCloningFacilityContract } from './contract';
export const MiceCloningFacility = createWidget(MiceCloningFacilityContract, MiceCloningFacilityView);
