import { BindingValidationError } from '@/lib/one-liner-router/errors';
import { SlotValidationError } from '@/widgets/framework/errors';
import type { ComponentType } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { BindingValidationErrorView } from './views/binding-validation';
import { GenericWidgetBindingLevelErrorView } from './views/generic';
import { SlotValidationErrorView } from './views/slot-validation';

/********************************************************************************
 * Error Dispatcher
 ********************************************************************************
 *
 * There are three layers of error handling
 *   1. Provider-level: catches all errors in the main src/app/provider.tsx - before mantine provider
 *   2. Widget-Binding-level: handles errors related to ZMQ bindings - after mantine provider
 *   3. Router-level: handles all errors afterwards - after mantine and route provider
 *
 * Maps a thrown error to the component that knows how to present it.
 * To add a new error UI: write the view, then add one entry below. First match wins, so
 * put subclasses above their base class.
 *
 */

type ErrorViewEntry = {
  match: (error: unknown) => boolean;
  View: ComponentType<FallbackProps>;
};

const ERROR_VIEWS: readonly ErrorViewEntry[] = [
  { match: (error) => error instanceof SlotValidationError, View: SlotValidationErrorView },
  { match: (error) => error instanceof BindingValidationError, View: BindingValidationErrorView },
];

export const resolveErrorView = (error: unknown): ComponentType<FallbackProps> =>
  ERROR_VIEWS.find((entry) => entry.match(error))?.View ?? GenericWidgetBindingLevelErrorView;

export const ErrorDispatch = (props: FallbackProps) => {
  const View = resolveErrorView(props.error);
  return <View {...props} />;
};
