import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';

import { ImageFile } from '../../data-files/models/data-file';
import { DataFileType } from '../../data-files/models/data-file-type';
import { normalize } from '../models/pixel-normalizer';
import * as viewerActions from '../actions/viewer';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as fromCore from '../reducers';
import * as fromDataFile from '../../data-files/reducers';

@Injectable()
export class ViewerEffects {

  @Effect()
  histLoaded$: Observable<Action> = this.actions$
    .ofType<imageFileActions.LoadImageHistSuccess>(imageFileActions.LOAD_IMAGE_HIST_SUCCESS)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getViewerFileStates)
    )
    .flatMap(([action, dataFiles, viewerFileStates]) => {
      let dataFile = dataFiles[action.payload.file.id];
      let viewerFileState = viewerFileStates[dataFile.id];
      let actions: Action[] = [];

      if (dataFile.type == DataFileType.IMAGE) {
        let imageFile = dataFile as ImageFile;
        if (!viewerFileState.autoLevelsInitialized) actions.push(new viewerActions.InitAutoLevels({ file: imageFile }));
      }
      return Observable.from(actions);
    });

  @Effect()
  autoLevelsInitialized$: Observable<Action> = this.actions$
    .ofType<viewerActions.InitAutoLevels>(viewerActions.INIT_AUTO_LEVELS)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getViewerFileStates)
    )
    .flatMap(([action, dataFiles, viewerFileStates]) => {
      let dataFile = dataFiles[action.payload.file.id];
      let actions: Action[] = [];

      if (dataFile.type == DataFileType.IMAGE) {
        let imageFile = dataFile as ImageFile;
        let viewerFileState = viewerFileStates[imageFile.id];
        actions.push(new viewerActions.UpdateNormalizer({
          file: imageFile, changes: {
            backgroundLevel: viewerFileState.autoBkgLevel,
            peakLevel: viewerFileState.autoPeakLevel
          }
        }));
      }
      return Observable.from(actions);
    });

  @Effect()
  imageTileNormalized$: Observable<Action> = this.actions$
    .ofType<viewerActions.NormalizeImageTile>(viewerActions.NORMALIZE_IMAGE_TILE)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getViewerFileStates)
    )
    .flatMap(([action, dataFiles, viewerFileStates]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let tile = imageFile.tiles[action.payload.tile.index];
      let viewerState = viewerFileStates[imageFile.id];
      let normPixels = normalize(tile.pixels, viewerState.normalizer);
      return Observable.from([new viewerActions.NormalizeImageTileSuccess({
        fileId: imageFile.id,
        tileIndex: tile.index,
        pixels: normPixels
      })])
    });

  @Effect()
  normalizerUpdated$: Observable<Action> = this.actions$
    .ofType<viewerActions.UpdateNormalizer>(viewerActions.UPDATE_NORMALIZER)
    .withLatestFrom(this.store.select(fromDataFile.getDataFiles))
    .switchMap(([action, dataFiles]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      return Observable.from([new viewerActions.RenormalizeImageFile({ file: imageFile })]);
    });

  // @Effect()
  // imageTilesInitialized$: Observable<Action> = this.actions$
  //   .ofType<imageFileActions.InitImageTiles>(imageFileActions.INIT_IMAGE_TILES)
  //   .withLatestFrom(this.store.select(fromDataFile.getDataFiles))
  //   .switchMap(([action, dataFiles]) => {
  //     return Observable.from([new viewerActions.CenterRegionInViewport({file: imageFile})]);
  // });


  @Effect()
  centerRegionInViewport$: Observable<Action> = this.actions$
    .ofType<viewerActions.CenterRegionInViewport>(viewerActions.CENTER_REGION_IN_VIEWPORT)
    .flatMap(action => {
      let actions = [];
      let imageFile = action.payload.file;
      let viewportSize = action.payload.viewportSize;
      let region = action.payload.region;
      let scale = Math.min((viewportSize.width - 20) / region.width, (viewportSize.height - 20) / region.height);

      actions.push(new viewerActions.ZoomTo({
        file: imageFile,
        scale: scale,
        anchorPoint: {
          x: viewportSize.width / 2,
          y: viewportSize.height / 2
        }
      }));
      actions.push(new viewerActions.MoveTo({
        file: imageFile,
        imagePoint: {
          x: region.x + region.width / 2,
          y: region.y + region.height / 2
        },
        viewportAnchor: {
          x: viewportSize.width / 2,
          y: viewportSize.height / 2
        }
      }));

      return Observable.from(actions);
    });


  // @Effect()
  // viewportChanged$: Observable<Action> = this.actions$
  //   .ofType<viewerStateActions.MoveTo
  //     | viewerStateActions.MoveBy
  //     | viewerStateActions.ZoomTo
  //     | viewerStateActions.ZoomBy>(
  //       viewerStateActions.MOVE_TO,
  //       viewerStateActions.MOVE_BY,
  //       viewerStateActions.ZOOM_TO,
  //       viewerStateActions.ZOOM_BY)
  //   .withLatestFrom(
  //     this.store.select(fromDataFile.getDataFiles),
  //     this.store.select(fromCore.getWorkbenchState)
  //   )
  //   .switchMap(([action, dataFiles, workbenchState]) => {
  //     let imageFile = dataFiles[action.payload.file.id] as ImageFile;
  //     let fileState = workbenchState.entities[imageFile.id];
  //     let sourceExtractor = fileState.sourceExtractor;
  //     //force update of source extractor region
  //     let actions : Action[] = [];
  //     if(sourceExtractor.regionOption == SourceExtractorRegionOption.VIEWPORT) {
  //       //actions.push(new workbenchActions.UpdateSourceExtractorRegion({file: imageFile}));
  //     }
  //     return Observable.from(actions);
  // });

  constructor(
    private actions$: Actions,
    private store: Store<fromDataFile.State>
  ) { }
}
