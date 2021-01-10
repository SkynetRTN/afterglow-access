import { State, Action, Selector, StateContext, Store } from "@ngxs/store";
import { AppAction } from "./app.actions";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { DataFilesState } from "./data-files/data-files.state";
import { WorkbenchState } from "./workbench/workbench.state";
import { IHdu, ImageHdu } from "./data-files/models/data-file";
import { HduType } from "./data-files/models/data-file-type";
import { LoadHdu } from "./data-files/data-files.actions";

export interface AppStateModel {
  items: string[];
}

@State<AppStateModel>({
  name: "app",
  defaults: {
    items: [],
  },
})
export class AppState {
  constructor(private store: Store) {}

  @Selector()
  public static getState(state: AppStateModel) {
    return state;
  }

  @Action(AppAction)
  public add(ctx: StateContext<AppStateModel>, { payload }: AppAction) {
    const stateModel = ctx.getState();
    stateModel.items = [...stateModel.items, payload];
    ctx.setState(stateModel);
  }
}
