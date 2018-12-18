import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Store } from "@ngrx/store";
import { Observable, from } from "rxjs";
import { withLatestFrom, flatMap, map } from "rxjs/operators";

import {
  ImageFile,
  getWidth,
  getHeight
} from "../../data-files/models/data-file";
import { DataFileType } from "../../data-files/models/data-file-type";
import { SourceExtractorRegionOption } from "../models/source-extractor-file-state";
import { SonifierRegionMode } from "../models/sonifier-file-state";
import * as dataFileActions from "../../data-files/actions/data-file";
import * as sonifierActions from "../actions/sonifier";
import * as transformationActions from "../actions/transformation";
import * as sourceExtractorActions from "../actions/source-extractor";
import * as fromCore from "../reducers";
import * as fromDataFile from "../../data-files/reducers";

import { AfterglowDataFileService } from "../services/afterglow-data-files";
import { view } from "paper";

@Injectable()
export class SonifierEffects {
  @Effect()
  headerLoaded$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadDataFileHdrSuccess>(
      dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS
    )
    .pipe(
      withLatestFrom(
        this.store.select(fromDataFile.getDataFiles),
        this.store.select(fromCore.getImageFileStates)
      ),
      flatMap(([action, dataFiles, imageFileStates]) => {
        let dataFile = dataFiles[action.payload.file.id];
        let actions: Action[] = [];

        if (dataFile.type == DataFileType.IMAGE) {
          let sonifierState = imageFileStates[dataFile.id].sonifier;
          let sourceExtractorState =
            imageFileStates[dataFile.id].sourceExtractor;
          //add effects for image file selection
          let imageFile = dataFile as ImageFile;
          if (sonifierState.regionHistoryInitialized) {
            actions.push(
              new sonifierActions.AddRegionToHistory({
                file: imageFile,
                region: {
                  x: 0,
                  y: 0,
                  width: getWidth(imageFile),
                  height: getHeight(imageFile)
                }
              })
            );
          }

          //actions.push(new workbenchActions.UpdateSourceExtractorRegion({file: imageFile}));
          if (
            sourceExtractorState.regionOption ==
            SourceExtractorRegionOption.ENTIRE_IMAGE
          ) {
          }
        }
        return from(actions);
      })
    );

  @Effect()
  viewportChanged$: Observable<Action> = this.actions$
    .ofType<sonifierActions.SetRegionMode>(sonifierActions.SET_REGION_MODE)
    .pipe(
      map(
        action =>
          new sonifierActions.UpdateRegion({ file: action.payload.file })
      )
    );

  @Effect()
  regionModeChanged$: Observable<Action> = this.actions$
    .ofType<sonifierActions.SetRegionMode>(sonifierActions.SET_REGION_MODE)
    .pipe(
      map(
        action =>
          new sonifierActions.UpdateRegion({ file: action.payload.file })
      )
    );

  @Effect()
  regionHistoryChanged$: Observable<Action> = this.actions$
    .ofType<
      | sonifierActions.AddRegionToHistory
      | sonifierActions.UndoRegionSelection
      | sonifierActions.RedoRegionSelection
    >(
      sonifierActions.ADD_REGION_TO_HISTORY,
      sonifierActions.UNDO_REGION_SELECTION,
      sonifierActions.REDO_REGION_SELECTION
    )
    .pipe(
      withLatestFrom(this.store.select(fromCore.getImageFileStates)),
      flatMap(([action, imageFileStates]) => {
        let sonifierFileState =
          imageFileStates[action.payload.file.id].sonifier;
        let actions: Action[] = [];
        if (sonifierFileState.regionMode == SonifierRegionMode.CUSTOM) {
          actions.push(
            new sonifierActions.UpdateRegion({ file: action.payload.file })
          );
        }
        return from(actions);
      })
    );

  @Effect()
  regionUpdated$: Observable<Action> = this.actions$
    .ofType<sonifierActions.UpdateRegion>(sonifierActions.UPDATE_REGION)
    .pipe(
      withLatestFrom(this.store.select(fromCore.getImageFileStates)),
      flatMap(([action, imageFileStates]) => {
        let actions: Action[] = [];
        let imageFile = action.payload.file;
        let sonifier = imageFileStates[imageFile.id].sonifier;
        let transformation = imageFileStates[imageFile.id].transformation;
        let sourceExtractor = imageFileStates[imageFile.id].sourceExtractor;

        if (
          sonifier.regionMode == SonifierRegionMode.CUSTOM &&
          sonifier.viewportSync &&
          sonifier.region
        ) {
          actions.push(
            new transformationActions.CenterRegionInViewport({
              file: imageFile,
              region: sonifier.region,
              viewportSize: transformation.viewportSize
            })
          );
        }

        if (
          sourceExtractor.regionOption ==
          SourceExtractorRegionOption.SONIFIER_REGION
        )
          actions.push(
            new sourceExtractorActions.UpdateRegion({ file: imageFile })
          );

        return from(actions);
      })
    );

  @Effect()
  updateSonifierUri$: Observable<Action> = this.actions$
    .ofType<sonifierActions.UpdateRegion | sonifierActions.UpdateFileState>(
      sonifierActions.UPDATE_REGION,
      sonifierActions.UPDATE_FILE_STATE
    )
    .pipe(
      withLatestFrom(this.store.select(fromCore.getImageFileStates)),
      flatMap(([action, imageFileStates]) => {
        let actions: Action[] = [];
        let sonifier = imageFileStates[action.payload.file.id].sonifier;
        if (sonifier.region) {
          let sonificationUri = this.afterglowDataFileService.getSonificationUri(
            action.payload.file.id,
            sonifier.region,
            sonifier.duration,
            sonifier.toneCount
          );
          actions.push(
            new sonifierActions.UpdateSonificationUri({
              file: action.payload.file,
              uri: sonificationUri
            })
          );
        }
        return from(actions);
      })
    );

  constructor(
    private actions$: Actions,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromCore.State> // @Optional() // @Inject(SEARCH_DEBOUNCE)
  ) // private debounce: number,
  // /**
  //    * You inject an optional Scheduler that will be undefined
  //    * in normal application usage, but its injected here so that you can mock out
  //    * during testing using the RxJS TestScheduler for simulating passages of time.
  //    */
  // @Optional()
  // @Inject(SEARCH_SCHEDULER)
  // private scheduler: Scheduler
  {}
}
