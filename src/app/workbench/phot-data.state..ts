import { State, Action, Selector, StateContext, Store, Actions, ofActionSuccessful } from "@ngxs/store";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { PhotData } from "./models/source-phot-data";
import { UpdatePhotData } from "./phot-data.actions";
import { CorrelationIdGenerator } from "../utils/correlated-action";
import { ResetState } from "../auth/auth.actions";

export interface PhotDataStateModel {
  version: string;
  ids: string[];
  entities: { [id: string]: PhotData };
}

const photDataDefaultState: PhotDataStateModel = {
  version: '7960c17e-fca1-43ba-9559-1376f42ae8ca',
  ids: [],
  entities: {},
};

@State<PhotDataStateModel>({
  name: "sourcesPhotData",
  defaults: photDataDefaultState,
})
export class PhotDataState {
  constructor(private store: Store, private correlationIdGenerator: CorrelationIdGenerator, private actions$: Actions) {}

  @Selector()
  public static getState(state: PhotDataStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: PhotDataStateModel) {
    return state.entities;
  }

  @Selector()
  public static getSourcesPhotData(state: PhotDataStateModel) {
    return Object.values(state.entities);
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<PhotDataStateModel>, {}: ResetState) {
    setState((state: PhotDataStateModel) => {
      return photDataDefaultState;
    });
  }

  @Action(UpdatePhotData)
  @ImmutableContext()
  public updatePhotData(
    { getState, setState, dispatch }: StateContext<PhotDataStateModel>,
    { photDataId, changes }: UpdatePhotData
  ) {
    setState((state: PhotDataStateModel) => {
      state.entities[photDataId] = {
        ...state.entities[photDataId],
        ...changes,
      };
      return state;
    });
  }
}
