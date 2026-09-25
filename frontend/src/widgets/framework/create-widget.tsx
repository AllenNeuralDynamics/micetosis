import { useConfig } from '@/hooks/use-config';
import type { ComponentType } from 'react';
import { useBoundResources, type ResourcesForContract } from './binding';
import type { WidgetContract } from './contract';

export type WidgetProps = { instanceId: string };

/**
 * Build a widget component from a contract and its view.
 *
 * Builds the widget component by:
 *  - finding widget instance bindings in the config
 *  - binding each slot to its RPC via `useBoundResources` = this constructs a `resource`
 *  - rendering the view with the resulting `resources` plus any additional props
 */
export function createWidget<
  C extends WidgetContract,
  ViewProps extends ResourcesForContract<C> & WidgetProps,
>(contract: C, View: ComponentType<ViewProps>) {
  // Props the caller must provide to the widget component.
  // view's props minus the resource keys (createWidget fills those in)
  type PublicProps = Omit<ViewProps, keyof ResourcesForContract<C>> & WidgetProps;

  function Widget(props: PublicProps) {
    const { instanceId } = props;
    const config = useConfig();
    if (!(instanceId in config.widgets)) {
      throw new Error(`Widget instance with ID "${instanceId}" is not found in the configuration.`);
    }
    const bound = useBoundResources(contract, config.widgets[instanceId].bindings);
    // Caller props spread last so they override bound resources on name collision.
    // Cast is needed because TS can't prove Omit<X,K> & Pick<X,K> === X through generics.
    return <View {...({ ...bound, ...props } as ViewProps)} />;
  }

  // Lets a registry of widget components derive its contracts instead of listing them again.
  Widget.contract = contract;
  Widget.displayName = `Widget(${contract.type})`;

  return Widget;
}
