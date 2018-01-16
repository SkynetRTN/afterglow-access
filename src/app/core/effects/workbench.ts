import 'rxjs/add/operator/map';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/skip';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/withLatestFrom';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/forkJoin';
import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { Effect, Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { Scheduler } from 'rxjs/Scheduler';
import { async } from 'rxjs/scheduler/async';
import { empty } from 'rxjs/observable/empty';
import { of } from 'rxjs/observable/of';
import { Store } from '@ngrx/store';
import { Point } from 'paper';

import * as fromDataFile from '../../data-files/reducers';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as imageFileActions from '../../data-files/actions/image-file';
import { DataFile, ImageFile, Header, getWidth, getHeight } from '../../data-files/models/data-file';
import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageHist } from '../../data-files/models/image-hist';

import * as fromCore from '../reducers'
import * as workbenchActions from '../actions/workbench';
import { AfterglowDataFileService } from '../services/afterglow-data-files';
import { getScale, ViewerFileState } from '../models/viewer-file-state';
import { normalize } from '../models/pixel-normalizer';
import { SonifierRegionOption } from '../models/sonifier-file-state';
import { SourceExtractorRegionOption } from '../models/source-extractor-file-state';
import { Source } from '../models/source';

// export const SEARCH_DEBOUNCE = new InjectionToken<number>('Search Debounce');
// export const SEARCH_SCHEDULER = new InjectionToken<Scheduler>(
//   'Search Scheduler'
// );


@Injectable()
export class WorkbenchEffects {
  
  @Effect()
  dataFileSelected$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SelectDataFile>(workbenchActions.SELECT_DATA_FILE)
    .withLatestFrom(this.store.select(fromDataFile.getDataFileEntities))
    .switchMap(([action, dataFiles]) => {
      let dataFile = dataFiles[action.payload];
      let actions : Action[] = [];
      if(!dataFile.headerLoaded && !dataFile.headerLoading) actions.push(new dataFileActions.LoadDataFileHdr(dataFile));

      if(dataFile.type == DataFileType.IMAGE) {
        //add effects for image file selection
        let imageFile = dataFile as ImageFile;
        if(!imageFile.histLoaded && !imageFile.histLoading) actions.push(new imageFileActions.LoadImageHist({file: imageFile}));
      }

      return Observable.from(actions);
  });

  
  @Effect()
  headerLoaded$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadDataFileHdrSuccess>(dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    .flatMap(([action, dataFiles, workbenchState]) => {
      let dataFile = dataFiles[action.payload.fileId];
      let actions : Action[] = [];

      if(dataFile.type == DataFileType.IMAGE) {
        //add effects for image file selection
        let imageFile = dataFile as ImageFile;
        let fileState = workbenchState.entities[imageFile.id];
        if(!fileState.sonifier.regionHistoryInitialized) {
          actions.push(new workbenchActions.SetSonifierRegion({file: imageFile, region: {x: 0, y: 0, width: getWidth(imageFile), height: getHeight(imageFile)}, storeInHistory: true}));
        }

        actions.push(new workbenchActions.UpdateSourceExtractorRegion({file: imageFile}));
        if(fileState.sourceExtractor.regionOption == SourceExtractorRegionOption.ENTIRE_IMAGE) {
          
        }
        
      }
      return Observable.from(actions);
  });

  
  @Effect()
  histLoaded$: Observable<Action> = this.actions$
    .ofType<imageFileActions.LoadImageHistSuccess>(imageFileActions.LOAD_IMAGE_HIST_SUCCESS)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    .flatMap(([action, dataFiles, workbenchState]) => {
      let dataFile = dataFiles[action.payload.fileId];
      let fileState = workbenchState.entities[dataFile.id];
      let actions : Action[] = [];

      if(dataFile.type == DataFileType.IMAGE) {
        let imageFile = dataFile as ImageFile;
        if(!fileState.viewer.autoLevelsInitialized) actions.push(new workbenchActions.InitAutoLevels({file: imageFile}));
      }
      return Observable.from(actions);
  });

  @Effect()
  autoLevelsInitialized$: Observable<Action> = this.actions$
    .ofType<workbenchActions.InitAutoLevels>(workbenchActions.INIT_AUTO_LEVELS)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    .flatMap(([action, dataFiles, workbenchState]) => {
      let dataFile = dataFiles[action.payload.file.id];
      let actions : Action[] = [];

      if(dataFile.type == DataFileType.IMAGE) {
        let imageFile = dataFile as ImageFile;
        let fileState = workbenchState.entities[imageFile.id];
        actions.push(new workbenchActions.UpdateNormalizer({file: imageFile, changes: {
          backgroundLevel: fileState.viewer.autoBkgLevel,
          peakLevel: fileState.viewer.autoPeakLevel
        }}));
      }
      return Observable.from(actions);
  });

  @Effect()
  imageTileNormalized$: Observable<Action> = this.actions$
    .ofType<workbenchActions.NormalizeImageTile>(workbenchActions.NORMALIZE_IMAGE_TILE)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    .flatMap(([action, dataFiles, workbenchState]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let tile = imageFile.tiles[action.payload.tile.index];
      let fileState = workbenchState.entities[imageFile.id];
      let normPixels = normalize(tile.pixels, fileState.viewer.normalizer);
      return Observable.from([new workbenchActions.NormalizeImageTileSuccess({
        fileId: imageFile.id,
        tileIndex: tile.index,
        pixels: normPixels
      })])
  });

  @Effect()
  normalizerUpdated$: Observable<Action> = this.actions$
    .ofType<workbenchActions.UpdateNormalizer>(workbenchActions.UPDATE_NORMALIZER)
    .withLatestFrom(this.store.select(fromDataFile.getDataFileEntities))
    .switchMap(([action, dataFiles]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      return Observable.from([new workbenchActions.RenormalizeImageFile({file: imageFile})]);
  });

  
  @Effect()
  sonifierRegionChanged$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SetSonifierRegion
      | workbenchActions.UndoSonifierRegionSelection
      | workbenchActions.RedoSonifierRegionSelection>(
        workbenchActions.SET_SONIFIER_REGION,
        workbenchActions.UNDO_SONIFIER_REGION_SELECTION,
        workbenchActions.REDO_SONIFIER_REGION_SELECTION)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    .switchMap(([action, dataFiles, workbenchState]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let actions : Action[] = [];
      let fileState = workbenchState.entities[imageFile.id];
      let sonifier = fileState.sonifier;
      let sourceExtractor = fileState.sourceExtractor;
      let viewportSize = workbenchState.imageViewerViewportSize;
     
      // handle automatic syncing of viewport to region
      if(sonifier.regionOption == SonifierRegionOption.CUSTOM && sonifier.viewportSync && sonifier.region) {
        let region = sonifier.region;
        let scale = Math.min((viewportSize.width*.9)/region.width, (viewportSize.height*.9)/region.height);
        
        actions.push(new workbenchActions.ZoomTo({
          file: imageFile,
          scale: scale,
          anchorPoint: {
            x: viewportSize.width/2,
            y: viewportSize.height/2
          }
        }));
        actions.push(new workbenchActions.MoveTo({
          file: imageFile,
          imagePoint: {
            x: region.x + region.width/2,
            y: region.y + region.height/2
          },
          viewportPoint: {
            x: viewportSize.width/2,
            y: viewportSize.height/2
          }
        }));

      }

      //force update of source extractor region
      if(sourceExtractor.regionOption == SourceExtractorRegionOption.SONIFIER_REGION) {
        actions.push(new workbenchActions.UpdateSourceExtractorRegion({file: imageFile}));
      }
      
        
      return Observable.from(actions);
  });

  @Effect()
  viewportChanged$: Observable<Action> = this.actions$
    .ofType<workbenchActions.MoveTo
      | workbenchActions.MoveBy
      | workbenchActions.ZoomTo
      | workbenchActions.ZoomBy>(
        workbenchActions.MOVE_TO,
        workbenchActions.MOVE_BY,
        workbenchActions.ZOOM_TO,
        workbenchActions.ZOOM_BY)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    .switchMap(([action, dataFiles, workbenchState]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let fileState = workbenchState.entities[imageFile.id];
      let sourceExtractor = fileState.sourceExtractor;
      //force update of source extractor region
      let actions : Action[] = [];
      if(sourceExtractor.regionOption == SourceExtractorRegionOption.VIEWPORT) {
        actions.push(new workbenchActions.UpdateSourceExtractorRegion({file: imageFile}));
      }
      return Observable.from(actions);
  });

  @Effect()
  sourceExtractorFileStateUpdated$: Observable<Action> = this.actions$
    .ofType<workbenchActions.UpdateSourceExtractorFileState>(workbenchActions.UPDATE_SOURCE_EXTRACTOR_FILE_STATE)
    .withLatestFrom(this.store.select(fromDataFile.getDataFileEntities))
    .switchMap(([action, dataFiles]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      return Observable.from([new workbenchActions.UpdateSourceExtractorRegion({file: imageFile})]);
  });

  @Effect()
  extractSources$: Observable<Action> = this.actions$
    .ofType<workbenchActions.ExtractSources>(workbenchActions.EXTRACT_SOURCES)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .switchMap(([action, dataFiles, workbenchState]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let fileState = workbenchState.entities[imageFile.id];
      let sourceExtractor = fileState.sourceExtractor;

      return this.afterglowDataFileService
        .extractSources(action.payload.file.id, workbenchState.sourceExtractionSettings, sourceExtractor.region)
        .flatMap(allExtractedSources => {
          let maxPerRequest = 25;
          let extractedSourcesArrays : Array<Array<Source>> = [];
          
          while (allExtractedSources.length > 0) {
            extractedSourcesArrays.push(allExtractedSources.splice(0, maxPerRequest));
          }
  
          let observables : Array<Observable<Source[]>> = [];
          
          extractedSourcesArrays.forEach(extractedSources => {
            let o = this.afterglowDataFileService.photometerXY(action.payload.file.id, extractedSources, workbenchState.photSettings)
              .map(photSources => {
                for(let i=0; i<extractedSources.length; i++) {
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
        .map((sources: Source[]) => new workbenchActions.ExtractSourcesSuccess({file: action.payload.file, sources: sources}))
        .catch(err => of(new workbenchActions.ExtractSourcesFail({file: action.payload.file, error: err})));
  });

  @Effect()
  photometerXYSources$: Observable<Action> = this.actions$
    .ofType<workbenchActions.PhotometerXYSources>(workbenchActions.PHOTOMETER_XY_SOURCES)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .flatMap(([action, dataFiles, workbenchState]) => {
      return this.afterglowDataFileService
        .photometerXY(action.payload.file.id, action.payload.coords, workbenchState.photSettings)
        .map((sources: Source[]) => new workbenchActions.PhotometerSourcesSuccess({file: action.payload.file, sources: sources}))
        .catch(err => of(new workbenchActions.PhotometerSourcesFail({file: action.payload.file, error: err})));
  });

  @Effect()
  photometerRaDecSources$: Observable<Action> = this.actions$
    .ofType<workbenchActions.PhotometerRaDecSources>(workbenchActions.PHOTOMETER_RADEC_SOURCES)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFileEntities),
      this.store.select(fromCore.getWorkbenchState)
    )
    //.debounceTime(this.debounce || 300, this.scheduler || async)
    .flatMap(([action, dataFiles, workbenchState]) => {
      return this.afterglowDataFileService
        .photometerRaDec(action.payload.file.id, action.payload.coords, workbenchState.photSettings)
        .map((sources: Source[]) => new workbenchActions.PhotometerSourcesSuccess({file: action.payload.file, sources: sources}))
        .catch(err => of(new workbenchActions.PhotometerSourcesFail({file: action.payload.file, error: err})));
  });

  // @Effect()
  // sourceFilterChanged$: Observable<Action> = this.actions$
  //   .ofType<workbenchActions.ExtractSourcesSuccess |
  //     workbenchActions.UpdateSourceExtractorRegion>(
  //     workbenchActions.EXTRACT_SOURCES_SUCCESS,
  //     workbenchActions.UPDATE_SOURCE_EXTRACTOR_REGION
  //   )
  //   .debounceTime(100)
  //   .withLatestFrom(
  //     this.store.select(fromDataFile.getDataFileEntities)
  //   )
  //   //.debounceTime(this.debounce || 300, this.scheduler || async)
  //   .switchMap(([action, dataFiles]) => {
  //     let imageFile = dataFiles[action.payload.file.id] as ImageFile;
  //     return Observable.from([new workbenchActions.UpdateFilteredSources({file: action.payload.file})]);
  // });

 


  constructor(
    private actions$: Actions,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromDataFile.State>
    // @Optional()
    // @Inject(SEARCH_DEBOUNCE)
    // private debounce: number,
    // /**
    //    * You inject an optional Scheduler that will be undefined
    //    * in normal application usage, but its injected here so that you can mock out
    //    * during testing using the RxJS TestScheduler for simulating passages of time.
    //    */
    // @Optional()
    // @Inject(SEARCH_SCHEDULER)
    // private scheduler: Scheduler
  ) {}
}