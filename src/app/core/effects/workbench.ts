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
import { Point, Matrix } from 'paper';

import * as fromDataFile from '../../data-files/reducers';
import { DataFile, ImageFile, Header, getWidth, getHeight, getHasWcs, getWcs, hasOverlap } from '../../data-files/models/data-file';
import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageHist, calcPercentiles, calcLevels } from '../../data-files/models/image-hist';
import { SourceExtractorRegionOption } from '../models/source-extractor-file-state';

import * as fromCore from '../reducers'
import * as workbenchActions from '../actions/workbench';
import * as sonifierActions from '../actions/sonifier';
import * as plotterActions from '../actions/plotter';
import * as normalizationActions from '../actions/normalization';
import * as transformationActions from '../actions/transformation';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as imageFileActions from '../../data-files/actions/image-file';
import { AfterglowDataFileService } from '../services/afterglow-data-files';
import { normalize } from '../models/pixel-normalizer';

import { Source } from '../models/source';
import { ViewMode } from '../models/view-mode';
import { Region } from '../models/region';
import { getScale } from '../models/transformation';
import { environment } from '../../../environments/environment.prod';

// export const SEARCH_DEBOUNCE = new InjectionToken<number>('Search Debounce');
// export const SEARCH_SCHEDULER = new InjectionToken<Scheduler>(
//   'Search Scheduler'
// );


@Injectable()
export class WorkbenchEffects {

  @Effect()
  loadLibrarySuccess$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadLibrarySuccess>(dataFileActions.LOAD_LIBRARY_SUCCESS)
    .withLatestFrom(this.store.select(fromDataFile.getAllDataFiles), this.store.select(fromCore.workbench.getViewers), this.store.select(fromCore.workbench.getActiveViewer))
    .switchMap(([action, dataFiles, viewers, activeViewer]) => {
      let actions: Action[] = [];
      if (!activeViewer || !activeViewer.fileId || dataFiles.map(f => f.id).indexOf(activeViewer.fileId) == -1 && dataFiles.length != 0) {
        actions.push(new workbenchActions.SelectDataFile({file: dataFiles[0]}))
      }

      return Observable.from(actions);
    });

  @Effect()
  dataFileRemoved$: Observable<Action> = this.actions$
    .ofType<dataFileActions.RemoveDataFileSuccess>(dataFileActions.REMOVE_DATA_FILE_SUCCESS)
    .withLatestFrom(this.store.select(fromDataFile.getAllDataFiles), this.store.select(fromCore.workbench.getActiveViewer))
    .switchMap(([action, dataFiles, activeViewer]) => {
      let actions: Action[] = [];
      if (activeViewer && activeViewer.fileId == action.payload.file.id) {
        actions.push(new workbenchActions.SelectDataFile({file: null}));
      }

      return Observable.from(actions);
    });

  @Effect()
  dataFileSelected$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SelectDataFile>(workbenchActions.SELECT_DATA_FILE)
    .withLatestFrom(this.store.select(fromDataFile.getDataFiles), this.store.select(fromCore.workbench.getViewers), this.store.select(fromCore.workbench.getActiveViewer), this.store.select(fromCore.workbench.getViewMode))
    .switchMap(([action, dataFiles, viewers, activeViewer, viewMode]) => {
      let actions: Action[] = [];

      if (action.payload != null && action.payload.file != null) {
        let dataFile = dataFiles[action.payload.file.id];
        if (viewers.length != 0) {

          if (!activeViewer) {
            activeViewer = viewers[0];
            actions.push(new workbenchActions.SetActiveViewer({ viewerIndex: viewers.indexOf(activeViewer) }));
          }
          if (activeViewer.fileId != dataFile.id) actions.push(new workbenchActions.SetViewerFile({ viewerIndex: viewers.indexOf(activeViewer), file: dataFile as ImageFile }))
        }

      }
      return Observable.from(actions);
    });

  @Effect()
  onSetViewerFile$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SetViewerFile | dataFileActions.LoadDataFileHdrSuccess | imageFileActions.LoadImageHistSuccess>(workbenchActions.SET_VIEWER_FILE, dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS, imageFileActions.LOAD_IMAGE_HIST_SUCCESS)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      //initialize file for workbench
      let actions = [];
      let dataFile = dataFiles[action.payload.file.id] as ImageFile;
      //when setting file, use other viewer as src for viewer sync.  this will transform the new file to match the old image it was replacing
      let pendingViewer = workbenchState.viewers.find(viewer => viewer.pendingFileId == action.payload.file.id);
      let pendingFile = dataFiles[pendingViewer.pendingFileId] as ImageFile;
      let pendingViewerIndex = workbenchState.viewers.indexOf(pendingViewer);
      if (pendingViewer) {
        if (!dataFile.headerLoaded) {
          if (!dataFile.headerLoading) actions.push(new dataFileActions.LoadDataFileHdr({ file: dataFile }));
        }
        else if (!dataFile.histLoaded) {
          if (!dataFile.histLoading) actions.push(new imageFileActions.LoadImageHist({ file: dataFile }));
        }
        else {


          //find reference file in the event syncing is requested
          let referenceFileId = pendingViewer.fileId;
          if (referenceFileId == null) {
            let referenceViewer = workbenchState.viewers.find((viewer, index) => index != pendingViewerIndex && viewer.fileId != null);
            if (referenceViewer) referenceFileId = referenceViewer.fileId;
          }

          //normalization
          let normalizationState = imageFileStates[dataFile.id].normalization;
          if (workbenchState.normalizationSyncEnabled && referenceFileId) {
            actions.push(new workbenchActions.SyncFileNormalizations({ reference: dataFiles[referenceFileId] as ImageFile, files: [pendingFile] }));
          }
          else if (!normalizationState.autoLevelsInitialized) {
            //calculate good defaults based on histogram
            let levels = calcLevels(dataFile.hist, environment.lowerPercentileDefault, environment.upperPercentileDefault);
            actions.push(new normalizationActions.UpdateNormalizer({ file: pendingFile, changes: { peakLevel: levels.peakLevel, backgroundLevel: levels.backgroundLevel } }));
          }

          let sonifierState = imageFileStates[dataFile.id].sonifier;
          if (!sonifierState.regionHistoryInitialized) {
            actions.push(new sonifierActions.AddRegionToHistory({ file: dataFile, region: { x: 0.5, y: 0.5, width: getWidth(dataFile), height: getHeight(dataFile) } }));
          }

          if (referenceFileId) {
            //sync pending file transformation to current file
            if (workbenchState.viewerSyncEnabled) actions.push(new workbenchActions.SyncFileTransformations({ reference: dataFiles[referenceFileId] as ImageFile, files: [dataFiles[pendingViewer.pendingFileId] as ImageFile] }));
            if (workbenchState.plotterSyncEnabled) actions.push(new workbenchActions.SyncFilePlotters({ reference: dataFiles[referenceFileId] as ImageFile, files: [dataFiles[pendingViewer.pendingFileId] as ImageFile] }));
          }

          actions.push(new workbenchActions.SetViewerFileSuccess({ viewerIndex: pendingViewerIndex }));
        }
      }
      return Observable.from(actions);
    });

  @Effect()
  onViewerSyncEnabledChange$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SetViewerSyncEnabled
    >(
      workbenchActions.SET_VIEWER_SYNC_ENABLED
    )
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let referenceFile = dataFiles[workbenchState.viewers[workbenchState.activeViewerIndex].fileId] as ImageFile;
      let files = workbenchState.viewers.filter((viewer, index) => index != workbenchState.activeViewerIndex && viewer.fileId !== null).map(viewer => dataFiles[viewer.fileId] as ImageFile);
      if (referenceFile && files.length != 0) {
        if (workbenchState.viewerSyncEnabled) actions.push(new workbenchActions.SyncFileTransformations({ reference: referenceFile, files: files }));
      }

      return Observable.from(actions);
    });

  @Effect()
  onTransformChange$: Observable<Action> = this.actions$
    .ofType<transformationActions.MoveBy
    | transformationActions.ZoomBy
    | transformationActions.RotateBy
    | transformationActions.Flip
    | transformationActions.ResetImageTransform
    | transformationActions.SetViewportTransform
    | transformationActions.SetImageTransform
    >(
      transformationActions.MOVE_BY,
      transformationActions.ZOOM_BY,
      transformationActions.ROTATE_BY,
      transformationActions.FLIP,
      transformationActions.RESET_IMAGE_TRANSFORM,
      transformationActions.SET_VIEWPORT_TRANSFORM,
      transformationActions.SET_IMAGE_TRANSFORM
    )
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];

      let activeViewer = workbenchState.viewers[workbenchState.activeViewerIndex];
      if (!workbenchState.viewerSyncEnabled || !activeViewer || activeViewer.fileId != action.payload.file.id) return Observable.from(actions);

      let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
      let files = workbenchState.viewers.filter((viewer, index) => index != workbenchState.activeViewerIndex && viewer.fileId !== null).map(viewer => dataFiles[viewer.fileId] as ImageFile);
      actions.push(new workbenchActions.SyncFileTransformations({ reference: referenceFile, files: files }));


      return Observable.from(actions);
    });



  @Effect()
  onNormalizationChange$: Observable<Action> = this.actions$
    .ofType<normalizationActions.UpdateNormalizer>(normalizationActions.UPDATE_NORMALIZER)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];

      let activeViewer = workbenchState.viewers[workbenchState.activeViewerIndex];
      if (!workbenchState.normalizationSyncEnabled || !activeViewer || activeViewer.fileId != action.payload.file.id) return Observable.from(actions);

      let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
      let files = workbenchState.viewers.filter((viewer, index) => index != workbenchState.activeViewerIndex && viewer.fileId !== null).map(viewer => dataFiles[viewer.fileId] as ImageFile);
      actions.push(new workbenchActions.SyncFileNormalizations({ reference: referenceFile, files: files }));


      return Observable.from(actions);
    });


    @Effect()
    onPlotterChange$: Observable<Action> = this.actions$
      .ofType<plotterActions.StartLine | plotterActions.UpdateLine | plotterActions.UpdatePlotterFileState>(plotterActions.START_LINE, plotterActions.UPDATE_LINE, plotterActions.UPDATE_PLOTTER_FILE_STATE)
      .withLatestFrom(
        this.store.select(fromDataFile.getDataFiles),
        this.store.select(fromCore.getWorkbenchState),
        this.store.select(fromCore.getImageFileStates),
    )
      .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
        let actions = [];
  
        let activeViewer = workbenchState.viewers[workbenchState.activeViewerIndex];
        if (!workbenchState.plotterSyncEnabled || !activeViewer || activeViewer.fileId != action.payload.file.id) return Observable.from(actions);
  
        let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
        let files = workbenchState.viewers.filter((viewer, index) => index != workbenchState.activeViewerIndex && viewer.fileId !== null).map(viewer => dataFiles[viewer.fileId] as ImageFile);
        actions.push(new workbenchActions.SyncFilePlotters({ reference: referenceFile, files: files }));
  
  
        return Observable.from(actions);
      });



  // plotterSyncSkip = 0
  // @Effect()
  // plotterSyncStartLine$: Observable<Action> = this.actions$
  //   .ofType<plotterActions.StartLine
  //   | plotterActions.UpdateLine
  //   >(
  //     plotterActions.START_LINE,
  //     plotterActions.UPDATE_LINE
  //   )
  //   .withLatestFrom(
  //     this.store.select(fromDataFile.getDataFiles),
  //     this.store.select(fromCore.getWorkbenchGlobalState),
  //     this.store.select(fromCore.getImageFileStates),
  // )
  //   .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
  //     let actions = [];
  //     if (this.plotterSyncSkip != 0) {
  //       this.plotterSyncSkip--;
  //       return Observable.from(actions);
  //     }

  //     if (!workbenchState.viewerSyncEnabled) return Observable.from(actions);
  //     let srcFile: ImageFile = action.payload.file;

  //     let targetViewers = workbenchState.viewers.filter(viewer => {
  //       return viewer.fileId != null && dataFiles[viewer.fileId] && dataFiles[viewer.fileId].headerLoaded && (workbenchState.viewerSyncMode == ViewerSyncMode.PIXEL || hasOverlap(srcFile, dataFiles[viewer.fileId] as ImageFile));
  //     })
  //     if (targetViewers.length <= 1) return Observable.from(actions);

  //     let srcViewer = targetViewers.find(viewer => viewer.fileId == action.payload.file.id);
  //     if (srcViewer) {
  //       if (workbenchState.viewerSyncMode == ViewerSyncMode.SKY) {
  //         let srcWcs = getWcs(srcFile);
  //         let srcWorld = srcWcs.pixToWorld([action.payload.point.x, action.payload.point.y]);
  //         targetViewers.forEach(viewer => {
  //           if (viewer.fileId == srcViewer.fileId) return;

  //           let targetFile: ImageFile = dataFiles[viewer.fileId] as ImageFile;
  //           let targetWcs = getWcs(targetFile);

  //           if (hasOverlap(srcFile, targetFile)) {
  //             let targetPix = targetWcs.worldToPix(srcWorld);
  //             // do not allow centroiding.  Forces exact pixel location to be synced
  //             if (action.type == plotterActions.START_LINE) {
  //               actions.push(new plotterActions.StartLine({ file: targetFile, point: { x: targetPix[0], y: targetPix[1] } }));
  //             }
  //             else {
  //               actions.push(new plotterActions.UpdateLine({ file: targetFile, point: { x: targetPix[0], y: targetPix[1] } }))
  //             }

  //             this.plotterSyncSkip++;
  //           }
  //         })
  //       }
  //       else {
  //         targetViewers.forEach(viewer => {
  //           if (viewer.fileId == srcViewer.fileId) return;

  //           let targetFile: ImageFile = dataFiles[viewer.fileId] as ImageFile;
  //           if (action.type == plotterActions.START_LINE) {
  //             actions.push(new plotterActions.StartLine({ file: targetFile, point: { x: action.payload.point.x, y: action.payload.point.y } }));
  //           }
  //           else {
  //             actions.push(new plotterActions.UpdateLine({ file: targetFile, point: { x: action.payload.point.x, y: action.payload.point.y } }))
  //           }
  //           this.plotterSyncSkip++;
  //         })
  //       }

  //     }
  //     return Observable.from(actions);
  //   });

  @Effect()
  syncFileNormalizations$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SyncFileNormalizations>(workbenchActions.SYNC_FILE_NORMALIZATIONS)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let srcFile: ImageFile = action.payload.reference;
      let targetFiles: ImageFile[] = action.payload.files;
      let srcNormalizer = imageFileStates[srcFile.id].normalization.normalizer;
      let percentiles = calcPercentiles(srcFile.hist, srcNormalizer.backgroundLevel, srcNormalizer.peakLevel);

      targetFiles.forEach(targetFile => {
        if (targetFile.id == srcFile.id) return;
        let levels = calcLevels(targetFile.hist, percentiles.lowerPercentile, percentiles.upperPercentile);
        actions.push(new normalizationActions.UpdateNormalizer({ file: targetFile, changes: { ...srcNormalizer, peakLevel: levels.peakLevel, backgroundLevel: levels.backgroundLevel } }));
      });
      return Observable.from(actions);
    });


  @Effect()
  syncFilePlotters$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SyncFilePlotters>(workbenchActions.SYNC_FILE_PLOTTERS)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let srcFile: ImageFile = action.payload.reference;
      let targetFiles: ImageFile[] = action.payload.files;
      let srcPlotter = imageFileStates[srcFile.id].plotter

      targetFiles.forEach(targetFile => {
        if (targetFile.id == srcFile.id) return;
        actions.push(new plotterActions.UpdatePlotterFileState({ file: targetFile, changes: { ...srcPlotter } }));
      });
      return Observable.from(actions);
    });



  @Effect()
  syncFileTransformations$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SyncFileTransformations
    >(
      workbenchActions.SYNC_FILE_TRANSFORMATIONS
    )
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let srcFile: ImageFile = action.payload.reference;
      let targetFiles: ImageFile[] = action.payload.files;

      let srcHasWcs = getHasWcs(srcFile);
      let srcImageTransform = imageFileStates[srcFile.id].transformation.imageTransform;
      let srcViewportTransform = imageFileStates[srcFile.id].transformation.viewportTransform;

      targetFiles.forEach(targetFile => {
        if (targetFile.id == srcFile.id) return;

        let targetHasWcs = getHasWcs(targetFile);

        if (srcHasWcs && targetHasWcs) {
          let srcWcs = getWcs(srcFile);
          let srcWcsTransform = new Matrix(srcWcs.cd11, srcWcs.cd21, srcWcs.cd12, srcWcs.cd22, 0, 0);
          let originWorld = srcWcs.pixToWorld([0, 0]);
          let targetWcs = getWcs(targetFile);
          let originPixels = targetWcs.worldToPix(originWorld);
          let targetWcsTransform = new Matrix(targetWcs.cd11, targetWcs.cd21, targetWcs.cd12, targetWcs.cd22, 0, 0);
          let targetImageFileState = imageFileStates[targetFile.id];

          if (hasOverlap(srcFile, targetFile)) {
            let srcToTargetTransform = srcWcsTransform.inverted().appended(targetWcsTransform).translate(-originPixels[0], -originPixels[1]);
            let targetImageTransform = imageFileStates[srcFile.id].transformation.imageTransform.appended(srcToTargetTransform);
            actions.push(new transformationActions.SetImageTransform({ file: targetFile, transform: targetImageTransform }));
            actions.push(new transformationActions.SetViewportTransform({ file: targetFile, transform: imageFileStates[srcFile.id].transformation.viewportTransform }))
          }

        }
        else {

          let targetImageFileState = imageFileStates[targetFile.id];
          actions.push(new transformationActions.SetImageTransform({ file: targetFile, transform: srcImageTransform }));
          actions.push(new transformationActions.SetViewportTransform({ file: targetFile, transform: srcViewportTransform }))
        }

      })
      return Observable.from(actions);
    });



  // @Effect()
  // sourceExtractorFileStateUpdated$: Observable<Action> = this.actions$
  //   .ofType<workbenchActions.UpdateSourceExtractorFileState>(workbenchActions.UPDATE_SOURCE_EXTRACTOR_FILE_STATE)
  //   .withLatestFrom(this.store.select(fromDataFile.getDataFiles))
  //   .switchMap(([action, dataFiles]) => {
  //     let imageFile = dataFiles[action.payload.file.id] as ImageFile;
  //     return Observable.from([new workbenchActions.UpdateSourceExtractorRegion({file: imageFile})]);
  // });



  // @Effect()
  // sourceFilterChanged$: Observable<Action> = this.actions$
  //   .ofType<workbenchActions.ExtractSourcesSuccess |
  //     workbenchActions.UpdateSourceExtractorRegion>(
  //     workbenchActions.EXTRACT_SOURCES_SUCCESS,
  //     workbenchActions.UPDATE_SOURCE_EXTRACTOR_REGION
  //   )
  //   .debounceTime(100)
  //   .withLatestFrom(
  //     this.store.select(fromDataFile.getDataFiles)
  //   )
  //   //.debounceTime(this.debounce || 300, this.scheduler || async)
  //   .switchMap(([action, dataFiles]) => {
  //     let imageFile = dataFiles[action.payload.file.id] as ImageFile;
  //     return Observable.from([new workbenchActions.UpdateFilteredSources({file: action.payload.file})]);
  // });




  constructor(
    private actions$: Actions,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromCore.State>
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
  ) { }
}