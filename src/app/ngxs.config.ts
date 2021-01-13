import { NgxsModuleOptions } from "@ngxs/store";
import { appConfig } from "../environments/environment";

export const ngxsConfig: NgxsModuleOptions = {
    developmentMode: !appConfig.production,
    selectorOptions: {
      suppressErrors: false,
      injectContainerState: false
    },
    compatibility: {
      strictContentSecurityPolicy: true
    }
  };