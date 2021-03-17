import { NgxsModuleOptions } from '@ngxs/store';
import { env } from '../environments/environment';

export const ngxsConfig: NgxsModuleOptions = {
  developmentMode: !env.production,
  selectorOptions: {
    suppressErrors: false,
    injectContainerState: false,
  },
  compatibility: {
    strictContentSecurityPolicy: true,
  },
};
