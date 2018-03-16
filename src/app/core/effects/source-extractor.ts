import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

import { ImageFile, getWidth, getHeight } from '../../data-files/models/data-file';
import { Source } from '../models/source';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as sourceExtractorActions from '../actions/source-extractor';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as fromCore from '../reducers';
import * as fromDataFile from '../../data-files/reducers';

import { AfterglowDataFileService } from '../services/afterglow-data-files';
import { SourceExtractorRegionOption } from '../models/source-extractor-file-state';
import { getViewportRegion } from '../models/transformation';


@Injectable()
export class SourceExtractorEffects {


  @Effect()
  extractSources$: Observable<Action> = this.actions$
    .ofType<sourceExtractorActions.ExtractSources>(sourceExtractorActions.EXTRACT_SOURCES)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getImageFileGlobalState),
    this.store.select(fromCore.getImageFileStates),

    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .switchMap(([action, dataFiles, imageFileGlobalState, imageFileStates]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let sourceExtractor = imageFileStates[imageFile.id].sourceExtractor;

      return this.afterglowDataFileService
        .extractSources(action.payload.file.id, imageFileGlobalState.sourceExtractionSettings, sourceExtractor.region)
        .flatMap(allExtractedSources => {
          let maxPerRequest = 25;
          let extractedSourcesArrays: Array<Array<Source>> = [];

          while (allExtractedSources.length > 0) {
            extractedSourcesArrays.push(allExtractedSources.splice(0, maxPerRequest));
          }

          let observables: Array<Observable<Source[]>> = [];

          extractedSourcesArrays.forEach(extractedSources => {
            let o = this.afterglowDataFileService.photometerXY(action.payload.file.id, extractedSources, imageFileGlobalState.photSettings)
              .map(photSources => {
                for (let i = 0; i < extractedSources.length; i++) {
                  extractedSources[i].x = photSources[i].x;
                  extractedSources[i].y = photSources[i].y;
                  extractedSources[i].mag = photSources[i].mag;
                  extractedSources[i].magError = photSources[i].magError;
                  extractedSources[i].fwhm = photSources[i].fwhm;
                }
                return extractedSources;
              })


            observables.push(o);
          })

          return Observable.forkJoin(observables).map(sourcesArrays => [].concat.apply([], sourcesArrays))

        })
        .map((sources: Source[]) => new sourceExtractorActions.ExtractSourcesSuccess({ file: action.payload.file, sources: sources }))
        .catch(err => of(new sourceExtractorActions.ExtractSourcesFail({ file: action.payload.file, error: err })));
    });

  @Effect()
  photometerXYSources$: Observable<Action> = this.actions$
    .ofType<sourceExtractorActions.PhotometerXYSources>(sourceExtractorActions.PHOTOMETER_XY_SOURCES)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getImageFileGlobalState)
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .flatMap(([action, dataFiles, imageFileGlobalState]) => {
      return this.afterglowDataFileService
        .photometerXY(action.payload.file.id, action.payload.coords, imageFileGlobalState.photSettings)
        .map((sources: Source[]) => new sourceExtractorActions.PhotometerSourcesSuccess({ file: action.payload.file, sources: sources }))
        .catch(err => of(new sourceExtractorActions.PhotometerSourcesFail({ file: action.payload.file, error: err })));
    });

  @Effect()
  photometerRaDecSources$: Observable<Action> = this.actions$
    .ofType<sourceExtractorActions.PhotometerRaDecSources>(sourceExtractorActions.PHOTOMETER_RADEC_SOURCES)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getImageFileGlobalState)
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .flatMap(([action, dataFiles, imageFileGlobalState]) => {
      return this.afterglowDataFileService
        .photometerRaDec(action.payload.file.id, action.payload.coords, imageFileGlobalState.photSettings)
        .map((sources: Source[]) => new sourceExtractorActions.PhotometerSourcesSuccess({ file: action.payload.file, sources: sources }))
        .catch(err => of(new sourceExtractorActions.PhotometerSourcesFail({ file: action.payload.file, error: err })));
    });


  @Effect()
  sourceExtractorFileStateUpdated$: Observable<Action> = this.actions$
    .ofType<sourceExtractorActions.UpdateFileState>(sourceExtractorActions.UPDATE_FILE_STATE)
    .map(action => new sourceExtractorActions.UpdateRegion({ file: action.payload.file }));


  @Effect()
  updateRegion$: Observable<Action> = this.actions$
    .ofType<sourceExtractorActions.UpdateRegion>(sourceExtractorActions.UPDATE_REGION)
    .withLatestFrom(
    this.store.select(fromDataFile.getDataFiles),
    this.store.select(fromCore.getImageFileGlobalState),
    this.store.select(fromCore.getImageFileStates)
  )
    .flatMap(([action, dataFiles, imageFileGlobalState, imageFileStates]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let sourceExtractorFileState = imageFileStates[imageFile.id].sourceExtractor;
      let sonifierFileState = imageFileStates[imageFile.id].sonifier;
      let actions: Action[] = [];

      let region = null;
      if (sourceExtractorFileState.regionOption == SourceExtractorRegionOption.VIEWPORT) {
        region = getViewportRegion(imageFileStates[imageFile.id].transformation, imageFile);
        // region = {
        //   x: imageFileGlobalState.viewport.imageX,
        //   y: imageFileGlobalState.viewport.imageY,
        //   width: imageFileGlobalState.viewport.imageWidth,
        //   height: imageFileGlobalState.viewport.imageHeight
        // }
      }
      else if (sourceExtractorFileState.regionOption == SourceExtractorRegionOption.SONIFIER_REGION) {
        region = sonifierFileState.region;
      }
      else {
        region = { x: 0, y: 0, width: getWidth(imageFile), height: getHeight(imageFile) };
      }

      actions.push(new sourceExtractorActions.SetRegion({
        file: imageFile,
        region: region
      }))


      return Observable.from(actions);
    });




  constructor(
    private actions$: Actions,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromCore.State>
  ) { }
}

