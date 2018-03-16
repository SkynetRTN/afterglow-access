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
import { ImageHist } from '../../data-files/models/image-hist';
import { SourceExtractorRegionOption } from '../models/source-extractor-file-state';

import * as fromCore from '../reducers'
import * as workbenchActions from '../actions/workbench';
import * as sonifierActions from '../actions/sonifier';
import * as transformationActions from '../actions/transformation';
import * as dataFileActions from '../../data-files/actions/data-file';
import * as imageFileActions from '../../data-files/actions/image-file';
import { AfterglowDataFileService } from '../services/afterglow-data-files';
import { normalize } from '../models/pixel-normalizer';

import { Source } from '../models/source';
import { ViewMode } from '../models/view-mode';
import { Region } from '../models/region';
import { getScale } from '../models/transformation';

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
        actions.push(new workbenchActions.SelectDataFile(dataFiles[0].id))
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
        actions.push(new workbenchActions.SelectDataFile(null));
      }

      // if (workbenchGlobalState.selectedDataFileId != null) {
      //   let newSelectedDataFileId = null;
      //   if (dataFiles.length != 1) {
      //     let selectedDataFile = dataFiles.find(dataFile => dataFile.id == workbenchGlobalState.selectedDataFileId)
      //     let currentIndex = dataFiles.indexOf(selectedDataFile);
      //     newSelectedDataFileId = dataFiles[Math.min(dataFiles.length - 1, currentIndex + 1)].id;
      //   }
      //   actions.push(new workbenchActions.SelectDataFile(newSelectedDataFileId));
      // }


      return Observable.from(actions);
    });

  @Effect()
  dataFileSelected$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SelectDataFile>(workbenchActions.SELECT_DATA_FILE)
    .withLatestFrom(this.store.select(fromDataFile.getDataFiles), this.store.select(fromCore.workbench.getViewers), this.store.select(fromCore.workbench.getActiveViewer), this.store.select(fromCore.workbench.getViewMode))
    .switchMap(([action, dataFiles, viewers, activeViewer, viewMode]) => {
      let actions: Action[] = [];

      if (action.payload != null) {
        let dataFile = dataFiles[action.payload];
        if (viewers.length != 0) {

          // let matchedViewer = viewers.find((viewer, index) => viewer.fileId == dataFile.id);
          // if (matchedViewer) {
          //   let matchedViewerIndex = viewers.indexOf(matchedViewer);
          //   let activeViewerIndex = viewers.indexOf(activeViewer);

          //   if(viewMode == ViewMode.SINGLE) {
          //     if(matchedViewerIndex != 0) actions.push(new workbenchActions.SetViewerFile({ viewerIndex: matchedViewerIndex, file: null }))
          //   }
          //   else if(activeViewer && activeViewerIndex != matchedViewerIndex) {
          //     //change active viewer to one containing selected file
          //     actions.push(new workbenchActions.SetActiveViewer({ viewerIndex: matchedViewerIndex }));
          //     return Observable.from(actions);
          //   }
          // }

          if (!activeViewer) {
            activeViewer = viewers[0];
            actions.push(new workbenchActions.SetActiveViewer({ viewerIndex: viewers.indexOf(activeViewer) }));
          }
          if (activeViewer.fileId != dataFile.id) actions.push(new workbenchActions.SetViewerFile({ viewerIndex: viewers.indexOf(activeViewer), file: dataFile as ImageFile }))
        }

        if (!dataFile.headerLoaded && !dataFile.headerLoading) actions.push(new dataFileActions.LoadDataFileHdr({ file: dataFile }));
      }
      return Observable.from(actions);
    });

  @Effect()
  updateViewerSyncEnabled$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SetViewerFile
    | workbenchActions.SetViewMode
    | dataFileActions.LoadDataFileHdrSuccess>(
      workbenchActions.SET_VIEWER_FILE,
      workbenchActions.SET_VIEW_MODE,
      dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS
    )
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchGlobalState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];

      let viewerSyncAvailable = false;
      if (workbenchState.viewMode != ViewMode.SINGLE) {
        let targetViewers = workbenchState.viewers.filter(viewer => {
          return viewer.fileId != null && dataFiles[viewer.fileId] && dataFiles[viewer.fileId].headerLoaded && getHasWcs(dataFiles[viewer.fileId] as ImageFile)
        })
        if (targetViewers.length > 1) {
          for (let srcViewerIndex = 0; srcViewerIndex < targetViewers.length; srcViewerIndex++) {
            let srcViewer = targetViewers[srcViewerIndex];
            let srcFile: ImageFile = dataFiles[srcViewer.fileId] as ImageFile;

            for (let targetViewerIndex = srcViewerIndex + 1; targetViewerIndex < targetViewers.length; targetViewerIndex++) {
              let targetViewer = targetViewers[targetViewerIndex];
              let targetFile: ImageFile = dataFiles[targetViewer.fileId] as ImageFile;
              let overlap = hasOverlap(srcFile, targetFile);

              if (overlap) {
                viewerSyncAvailable = true;
                break;
              }

            }

            if (viewerSyncAvailable) break;
          }

        }
      }


      if (viewerSyncAvailable != workbenchState.viewerSyncAvailable) actions.push(new workbenchActions.SetViewerSyncAvailable({ available: viewerSyncAvailable }))

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
      this.store.select(fromCore.getWorkbenchGlobalState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let activeViewer = workbenchState.viewers[workbenchState.activeViewerIndex];
      if (workbenchState.viewerSyncAvailable && workbenchState.viewerSyncEnabled && dataFiles[activeViewer.fileId]) {
        actions.push(new workbenchActions.UpdateViewerSync({ srcFile: dataFiles[activeViewer.fileId] as ImageFile }))
      }
      return Observable.from(actions);
    });


  onTransformChangeSkipCount = 0;
  @Effect()
  onTransformChange$: Observable<Action> = this.actions$
    .ofType<workbenchActions.SetViewerFile
    | transformationActions.MoveBy
    | transformationActions.ZoomBy
    | transformationActions.RotateBy
    | transformationActions.Flip
    | transformationActions.ResetImageTransform
    | transformationActions.SetViewportTransform
    | transformationActions.SetImageTransform
    >(
      workbenchActions.SET_VIEWER_FILE,
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
      this.store.select(fromCore.getWorkbenchGlobalState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      if (this.onTransformChangeSkipCount != 0) {
        this.onTransformChangeSkipCount--;
        return Observable.from(actions);
      }
      actions.push(new workbenchActions.UpdateViewerSync({ srcFile: action.payload.file }));

      return Observable.from(actions);
    });


  @Effect()
  updateViewerSync$: Observable<Action> = this.actions$
    .ofType<workbenchActions.UpdateViewerSync
    >(
      workbenchActions.UPDATE_VIEWER_SYNC
    )
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchGlobalState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];



      if (!workbenchState.viewerSyncAvailable || !workbenchState.viewerSyncEnabled) return Observable.from(actions);
      let srcFile: ImageFile = action.payload.srcFile;

      let targetViewers = workbenchState.viewers.filter(viewer => {
        return viewer.fileId != null && dataFiles[viewer.fileId] && hasOverlap(srcFile, dataFiles[viewer.fileId] as ImageFile)
      })
      let srcViewer = targetViewers.find(viewer => viewer.fileId == action.payload.srcFile.id);
      if (srcViewer) {
        let srcWcs = getWcs(srcFile);
        let srcWcsTransform = new Matrix(srcWcs.cd11, srcWcs.cd21, srcWcs.cd12, srcWcs.cd22, 0, 0);
        let originWorld = srcWcs.pixToWorld([0, 0]);

        targetViewers.forEach(viewer => {
          if (viewer.fileId == srcViewer.fileId) return;

          let targetFile: ImageFile = dataFiles[viewer.fileId] as ImageFile;
          let targetWcs = getWcs(targetFile);
          let originPixels = targetWcs.worldToPix(originWorld);
          let targetWcsTransform = new Matrix(targetWcs.cd11, targetWcs.cd21, targetWcs.cd12, targetWcs.cd22, 0, 0);
          let targetImageFileState = imageFileStates[targetFile.id];
          let targetImageTransformation = targetImageFileState.transformation;

          if (hasOverlap(srcFile, targetFile)) {
            let srcToTargetTransform = srcWcsTransform.inverted().appended(targetWcsTransform).translate(-originPixels[0], -originPixels[1]);
            let targetImageTransform = imageFileStates[srcFile.id].transformation.imageTransform.appended(srcToTargetTransform);
            actions.push(new transformationActions.SetImageTransform({ file: targetFile, transform: targetImageTransform }));
            this.onTransformChangeSkipCount++;
            actions.push(new transformationActions.SetViewportTransform({ file: targetFile, transform: imageFileStates[srcFile.id].transformation.viewportTransform }))
            this.onTransformChangeSkipCount++;
          }
        })
      }
      return Observable.from(actions);
    });


  @Effect()
  headerLoaded$: Observable<Action> = this.actions$
    .ofType<dataFileActions.LoadDataFileHdrSuccess>(dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS)
    .withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getImageFileGlobalState),
      this.store.select(fromCore.getImageFileStates),
  )
    .flatMap(([action, dataFiles, imageFileGlobalState, imageFileStates]) => {
      let dataFile = dataFiles[action.payload.file.id];
      let actions: Action[] = [];

      if (dataFile.type == DataFileType.IMAGE) {
        //add effects for image file selection
        let imageFile = dataFile as ImageFile;

        //if histogram not loaded,  load now
        if (!imageFile.histLoaded && !imageFile.histLoading) actions.push(new imageFileActions.LoadImageHist({ file: imageFile }));

        let sonifierState = imageFileStates[imageFile.id].sonifier;

        if (!sonifierState.regionHistoryInitialized) {
          actions.push(new sonifierActions.AddRegionToHistory({ file: imageFile, region: { x: 0.5, y: 0.5, width: getWidth(imageFile), height: getHeight(imageFile) } }));
        }

        let sourceExtractorState = imageFileStates[imageFile.id].sourceExtractor;
        //actions.push(new workbenchActions.UpdateSourceExtractorRegion({file: imageFile}));
        if (sourceExtractorState.regionOption == SourceExtractorRegionOption.ENTIRE_IMAGE) {

        }

      }
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