import { NgxsModuleOptions } from '@ngxs/store';
import { env } from '../environments/environment';

export const ngxsConfig: NgxsModuleOptions = {
  //if development mode is enabled, the state id deeply frozen to ensure it is not mutated
  // NGXS throws an error if typed array buffers are included in the state since they cannot be frozen
  // a work-around is to use immer adapter with the  @ImmutableContext() decorator, but this incurs a performance hit
  developmentMode: false,
  selectorOptions: {
    suppressErrors: false,
    injectContainerState: false,
  },
  compatibility: {
    strictContentSecurityPolicy: true,
  },
};
