import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Store } from "@ngrx/store";
import { Observable, from } from "rxjs";
import { withLatestFrom, flatMap } from "rxjs/operators";

import { Matrix, Point } from "paper";

import * as transformationActions from "../actions/transformation";
import * as fromCore from "../reducers";
import * as fromDataFile from "../../data-files/reducers";
import * as sonifierActions from "../actions/sonifier";
import * as workbenchActions from "../actions/workbench";
import * as sourceExtractorActions from "../actions/source-extractor";
import { SonifierRegionMode } from "../models/sonifier-file-state";
import { SourceExtractorRegionOption } from "../models/source-extractor-file-state";
import { getHeight } from "../../data-files/models/data-file";

@Injectable()
export class TransformationEffects {
  @Effect()
  centerRegionInViewport$: Observable<Action> = this.actions$
    .ofType<transformationActions.CenterRegionInViewport>(
      transformationActions.CENTER_REGION_IN_VIEWPORT
    )
    .pipe(
      withLatestFrom(this.store.select(fromCore.getImageFileStates)),
      flatMap(([action, imageFileStates]) => {
        let actions = [];
        let imageFile = action.payload.file;
        let transformationState = imageFileStates[imageFile.id].transformation;
        let viewportSize = transformationState.viewportSize;

        if (!viewportSize)
          viewportSize =
            imageFileStates[imageFile.id].transformation.viewportSize;

        let region = action.payload.region;

        let viewportAnchor = new Point(
          viewportSize.width / 2,
          viewportSize.height / 2
        );
        let scale = Math.min(
          (viewportSize.width - 20) / region.width,
          (viewportSize.height - 20) / region.height
        );

        let xShift = viewportAnchor.x - scale * (region.x + region.width / 2);
        let yShift =
          viewportAnchor.y -
          scale * (getHeight(imageFile) - (region.y + region.height / 2));
        let viewportTransform = new Matrix(scale, 0, 0, scale, xShift, yShift);

        actions.push(
          new transformationActions.ResetImageTransform({ file: imageFile })
        );
        actions.push(
          new transformationActions.SetViewportTransform({
            file: imageFile,
            transform: viewportTransform
          })
        );

        return from(actions);
      })
    );

  @Effect()
  viewportChanged$: Observable<Action> = this.actions$
    .ofType<
      | transformationActions.MoveBy
      | transformationActions.ZoomBy
      | transformationActions.UpdateCurrentViewportSize
      | transformationActions.ResetImageTransform
      | transformationActions.SetViewportTransform
      | transformationActions.SetImageTransform
    >(
      transformationActions.MOVE_BY,
      transformationActions.MOVE_TO,
      transformationActions.ZOOM_BY,
      transformationActions.ZOOM_TO,
      transformationActions.UPDATE_CURRENT_VIEWPORT_SIZE,
      transformationActions.RESET_IMAGE_TRANSFORM,
      transformationActions.SET_IMAGE_TRANSFORM,
      transformationActions.SET_VIEWPORT_TRANSFORM
    )
    .pipe(
      withLatestFrom(
        this.store.select(fromCore.getImageFileStates),
        this.store.select(fromCore.getWorkbenchState)
      ),
      flatMap(([action, imageFileStates, workbenchState]) => {
        let actions = [];
        let imageFile = action.payload.file;
        let imageFileState = imageFileStates[action.payload.file.id];
        if (
          imageFile.headerLoaded &&
          imageFileState &&
          imageFileState.transformation.viewportSize
        ) {
          let sonifier = imageFileStates[action.payload.file.id].sonifier;
          let sourceExtractor =
            imageFileStates[action.payload.file.id].sourceExtractor;
          if (sonifier.regionMode == SonifierRegionMode.VIEWPORT)
            actions.push(
              new sonifierActions.UpdateRegion({ file: action.payload.file })
            );
          if (
            sourceExtractor.regionOption == SourceExtractorRegionOption.VIEWPORT
          )
            actions.push(
              new sourceExtractorActions.UpdateRegion({
                file: action.payload.file
              })
            );
        }
        return from(actions);
      })
    );

  constructor(
    private actions$: Actions,
    private store: Store<fromCore.State>
  ) {}
}
