import { State, Action, Selector, StateContext, Store } from "@ngxs/store";
import { LoadAfterglowConfig, LoadAfterglowConfigSuccess, LoadAfterglowConfigFail } from "./app.actions";
import { AfterglowConfigService } from "./afterglow-config.service";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { tap, flatMap, catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterglowConfig } from './afterglow-config';
import { Injectable } from '@angular/core';

export interface AppStateModel {
  configLoading: boolean;
  configLoaded: boolean;
  configError: string;
}

@State<AppStateModel>({
  name: "app",
  defaults: {
    configLoading: false,
    configLoaded: false,
    configError: null,
  },
})
@Injectable()
export class AppState {
  constructor(private store: Store, private configService: AfterglowConfigService) {}

  @Selector()
  public static getState(state: AppStateModel) {
    return state;
  }

  @Selector()
  public static getConfigLoading(state: AppStateModel) {
    return state.configLoading;
  }

  @Selector()
  public static getConfigLoaded(state: AppStateModel) {
    return state.configLoaded;
  }


  @Selector()
  public static getConfigError(state: AppStateModel) {
    return state.configError;
  }

  @Action(LoadAfterglowConfig)
  @ImmutableContext()
  public loadAfterglowConfig({ setState, dispatch }: StateContext<AppStateModel>, {}: LoadAfterglowConfig) {
    setState((state: AppStateModel) => {
      state.configLoading = true;
      return state;
    })
    return this.configService.loadConfig().pipe(
      flatMap(config => {
        setState((state: AppStateModel) => {
          state.configLoading = false;
          state.configLoaded = true;
          return state;
        })
        return dispatch(new LoadAfterglowConfigSuccess(config))
      }),
      catchError((err) => {
        setState((state: AppStateModel) => {
          state.configLoading = false;
          state.configLoaded = false;
          state.configError = (err as HttpErrorResponse).error;
          return state;
        })
        return dispatch(new LoadAfterglowConfigFail(err))
      })
    )
    
  }
}
