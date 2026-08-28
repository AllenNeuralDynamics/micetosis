import { useConfig } from '@/hooks/use-config';
import { useBoundResources } from '@/widgets/framework';
import { MiceCloningFacilityContract } from './contract';
import { MiceCloningFacilityView } from './view';

/**
 * Wrapper component for the MiceCloningFacility widget.
 *
 * It takes the `instanceId` and gets the corresponding contract & configuration for that instance.
 * With the contract & the configuration, it will bind the RPC functions to the widget's slots.
 * Finally, it renders the MiceCloningFacilityView component with the bound resources as props.
 *
 * @param instanceId The unique identifier for the widget instance.
 * @returns The rendered MiceCloningFacility widget component.
 */
export const MiceCloningFacility = ({ instanceId }: { instanceId: string }) => {
  // Grab config (for the bindings between slot names and RPC names)
  const config = useConfig();

  // Check if widget instance was defined in the configuration
  if (!(instanceId in config.widgets)) {
    throw new Error(`Widget instance with ID "${instanceId}" is not found in the configuration.`);
  }
  const widgetConfig = config.widgets[instanceId];

  // useBoundResources takes slots from widget contract, binds them to its respective RPC function, and returns the bound resources
  // for more information read comments in useBoundResources hook
  const props = useBoundResources(MiceCloningFacilityContract, widgetConfig.bindings);

  return <MiceCloningFacilityView instanceId={instanceId} {...props} />;
};
