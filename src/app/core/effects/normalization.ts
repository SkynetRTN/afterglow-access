import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';

import { ImageFile } from '../../data-files/models/data-file';
import { DataFileType } from '../../data-files/models/data-file-type';
import { normalize } from '../models/pixel-normalizer';
import * as normalizationActions from '../actions/normalization';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as fromCore from '../reducers';
import * as fromDataFile from '../../data-files/reducers';

@Injectable()
export class NormalizationEffects {

  @Effect()
  histLoaded$: Observable<Action> = this.actions$
    .ofType<imageFileActions.LoadImageHistSuccess>(imageFileActions.LOAD_IMAGE_HIST_SUCCESS)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getImageFileStates)
    )
    .flatMap(([action, dataFiles, imageFileStates]) => {
      let dataFile = dataFiles[action.payload.file.id];
      let normalization = imageFileStates[dataFile.id].normalization;
      let actions: Action[] = [];

      if (dataFile.type == DataFileType.IMAGE) {
        let imageFile = dataFile as ImageFile;
        if (!normalization.autoLevelsInitialized) actions.push(new normalizationActions.InitAutoLevels({ file: imageFile }));
      }
      return Observable.from(actions);
    });

  @Effect()
  autoLevelsInitialized$: Observable<Action> = this.actions$
    .ofType<normalizationActions.InitAutoLevels>(normalizationActions.INIT_AUTO_LEVELS)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getImageFileStates)
    )
    .flatMap(([action, dataFiles, imageFileStates]) => {
      let dataFile = dataFiles[action.payload.file.id];
      let actions: Action[] = [];

      if (dataFile.type == DataFileType.IMAGE) {
        let imageFile = dataFile as ImageFile;
        let normalization = imageFileStates[imageFile.id].normalization;
        actions.push(new normalizationActions.UpdateNormalizer({
          file: imageFile, changes: {
            backgroundLevel: normalization.autoBkgLevel,
            peakLevel: normalization.autoPeakLevel
          }
        }));
      }
      return Observable.from(actions);
    });

  @Effect()
  imageTileNormalized$: Observable<Action> = this.actions$
    .ofType<normalizationActions.NormalizeImageTile>(normalizationActions.NORMALIZE_IMAGE_TILE)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getImageFileStates)
    )
    .flatMap(([action, dataFiles, imageFileStates]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let tile = imageFile.tiles[action.payload.tile.index];
      let normalization = imageFileStates[imageFile.id].normalization;
      let normPixels = normalize(tile.pixels, normalization.normalizer);
      return Observable.from([new normalizationActions.NormalizeImageTileSuccess({
        fileId: imageFile.id,
        tileIndex: tile.index,
        pixels: normPixels
      })])
    });

  @Effect()
  normalizerUpdated$: Observable<Action> = this.actions$
    .ofType<normalizationActions.UpdateNormalizer>(normalizationActions.UPDATE_NORMALIZER)
    .withLatestFrom(this.store.select(fromDataFile.getDataFiles))
    .switchMap(([action, dataFiles]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      return Observable.from([new normalizationActions.RenormalizeImageFile({ file: imageFile })]);
    });

  constructor(
    private actions$: Actions,
    private store: Store<fromCore.State>
  ) { }
}
