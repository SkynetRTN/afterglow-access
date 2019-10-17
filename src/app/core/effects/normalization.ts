import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions, ofType } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Store } from "@ngrx/store";
import { Observable, from } from "rxjs";
import { withLatestFrom, flatMap, switchMap } from "rxjs/operators";

import { ImageFile } from "../../data-files/models/data-file";
import { DataFileType } from "../../data-files/models/data-file-type";
import { normalize } from "../models/pixel-normalizer";
import * as normalizationActions from "../actions/normalization";
import * as imageFileActions from "../../data-files/actions/image-file";
import * as fromCore from "../reducers";
import * as fromDataFile from "../../data-files/reducers";

@Injectable()
export class NormalizationEffects {

  @Effect()
  imageTileNormalized$: Observable<Action> = this.actions$.pipe(
    ofType<normalizationActions.NormalizeImageTile>(
      normalizationActions.NORMALIZE_IMAGE_TILE
    ),
      withLatestFrom(
        this.store.select(fromDataFile.getDataFiles),
        this.store.select(fromCore.getImageFileStates)
      ),
      flatMap(([action, dataFiles, imageFileStates]) => {
        let imageFile = dataFiles[action.payload.file.id] as ImageFile;
        let tile = imageFile.tiles[action.payload.tile.index];
        let normalization = imageFileStates[imageFile.id].normalization;
        let normPixels = normalize(tile.pixels, imageFile.hist, normalization.normalizer);
        return from([
          new normalizationActions.NormalizeImageTileSuccess({
            fileId: imageFile.id,
            tileIndex: tile.index,
            pixels: normPixels
          })
        ]);
      })
    );

  @Effect()
  normalizerUpdated$: Observable<Action> = this.actions$.pipe(
    ofType<normalizationActions.UpdateNormalizer>(
      normalizationActions.UPDATE_NORMALIZER
    ),
      withLatestFrom(this.store.select(fromDataFile.getDataFiles)),
      switchMap(([action, dataFiles]) => {
        let imageFile = dataFiles[action.payload.file.id] as ImageFile;
        return from([
          new normalizationActions.RenormalizeImageFile({ file: imageFile })
        ]);
      })
    );

  constructor(
    private actions$: Actions,
    private store: Store<fromCore.State>
  ) {}
}
