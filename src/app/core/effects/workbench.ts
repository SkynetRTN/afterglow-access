import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions, ofType } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Observable, from, of } from "rxjs";
import {
  withLatestFrom,
  switchMap,
  map,
  flatMap,
  filter,
  skip,
  takeUntil,
  catchError
} from "rxjs/operators";
import { Store } from "@ngrx/store";
import { Point, Matrix } from "paper";

import * as fromDataFile from "../../data-files/reducers";
import {
  ImageFile,
  getWidth,
  getHeight,
  hasOverlap
} from "../../data-files/models/data-file";
import {
  calcPercentiles,
  calcLevels
} from "../../data-files/models/image-hist";

import * as fromCore from "../reducers";
import * as fromDataFiles from "../../data-files/reducers";
import * as workbenchActions from "../actions/workbench";
import * as surveyActions from '../actions/survey';
import * as sonifierActions from "../actions/sonifier";
import * as plotterActions from "../actions/plotter";
import * as dataProviderActions from "../../data-providers/actions/data-provider"
import * as jobActions from '../../jobs/actions/job';
import * as normalizationActions from "../actions/normalization";
import * as transformationActions from "../actions/transformation";
import * as dataFileActions from "../../data-files/actions/data-file";
import * as imageFileActions from "../../data-files/actions/image-file";
import { AfterglowDataFileService } from "../services/afterglow-data-files";
import { environment } from "../../../environments/environment.prod";
import { AfterglowCatalogService } from "../services/afterglow-catalogs";
import { Catalog } from "../models/catalog";
import { AfterglowFieldCalService } from '../services/afterglow-field-cals';
import { FieldCal } from '../models/field-cal';
import { WorkbenchState } from '../models/workbench-state';
import { CatalogQueryJobResult } from '../../jobs/models/catalog-query';
import { DataFileType } from '../../data-files/models/data-file-type';
import { PixelOpsJob } from '../../jobs/models/pixel-ops';
import { JobType } from '../../jobs/models/job-types';
import { AlignmentJob, AlignmentJobResult } from '../../jobs/models/alignment';
import { StackingJob, StackingJobResult } from '../../jobs/models/stacking';
import { ViewMode } from '../models/view-mode';
import { BatchImportJobResult } from '../../jobs/models/batch-import';

// export const SEARCH_DEBOUNCE = new InjectionToken<number>('Search Debounce');
// export const SEARCH_SCHEDULER = new InjectionToken<Scheduler>(
//   'Search Scheduler'
// );

@Injectable()
export class WorkbenchEffects {
  @Effect()
  loadLibrarySuccess$: Observable<Action> = this.actions$.pipe(
    ofType<dataFileActions.LoadLibrarySuccess>(
      dataFileActions.LOAD_LIBRARY_SUCCESS
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getAllDataFiles),
      this.store.select(fromCore.workbench.getViewers),
      this.store.select(fromCore.workbench.getActiveViewer)
    ),
    switchMap(([action, dataFiles, viewers, activeViewer]) => {
      let actions: Action[] = [];
      if (
        !activeViewer ||
        !activeViewer.fileId ||
        (dataFiles.map(f => f.id).indexOf(activeViewer.fileId) == -1 &&
          dataFiles.length != 0)
      ) {
        if(dataFiles[0]) {
          actions.push(
            new workbenchActions.SelectDataFile({ fileId: dataFiles[0].id })
          );
        }
       
      }
      return from(actions);
    })
  );

  @Effect()
  dataFileRemoved$: Observable<Action> = this.actions$.pipe(
    ofType<dataFileActions.RemoveDataFileSuccess>(
      dataFileActions.REMOVE_DATA_FILE_SUCCESS
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getAllDataFiles),
      this.store.select(fromCore.workbench.getActiveViewer)
    ),
    switchMap(([action, dataFiles, activeViewer]) => {
      let actions: Action[] = [];
      if (activeViewer && activeViewer.fileId == action.payload.fileId) {
        actions.push(new workbenchActions.SelectDataFile({ fileId: null }));
      }

      return from(actions);
    })
  );

  @Effect()
  dataFileSelected$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.SelectDataFile>(workbenchActions.SELECT_DATA_FILE),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.workbench.getViewers),
      this.store.select(fromCore.workbench.getActiveViewer),
      this.store.select(fromCore.workbench.getViewMode)
    ),
    switchMap(([action, dataFiles, viewers, activeViewer, viewMode]) => {
      let actions: Action[] = [];

      if (action.payload != null && action.payload.fileId != null) {
        let dataFile = dataFiles[action.payload.fileId];
        if (viewers.length != 0) {
          if (!activeViewer) {
            activeViewer = viewers[0];
            actions.push(
              new workbenchActions.SetActiveViewer({
                viewerIndex: viewers.indexOf(activeViewer)
              })
            );
          }
          if (activeViewer.fileId != dataFile.id)
            actions.push(
              new workbenchActions.SetViewerFile({
                viewerIndex: viewers.indexOf(activeViewer),
                fileId: dataFile.id
              })
            );
        }
      }
      return from(actions);
    })
  );

  @Effect()
  onLibraryLoadSuccess$: Observable<Action> = this.actions$.pipe(
    ofType<
      | dataFileActions.LoadLibrarySuccess
    >(
      dataFileActions.LOAD_LIBRARY_SUCCESS
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      
      let actions = [];
      workbenchState.viewers.forEach(
        (viewer, index) => {
          if(viewer.pendingFileId !== null) {
            // viewer has a pending file,  check if it is now in the library
            //if it is, dispatch set file event so it can be loaded
            //if not, clear it
            actions.push(new workbenchActions.SetViewerFile({viewerIndex: index, fileId: (viewer.pendingFileId in dataFiles) ? viewer.pendingFileId : null}));
          }
        }
      )
      return from(actions);
    })
  )

  @Effect()
  onSetViewerFile$: Observable<Action> = this.actions$.pipe(
    ofType<
      | workbenchActions.SetViewerFile
      | dataFileActions.LoadDataFileHdrSuccess
      | imageFileActions.LoadImageHistSuccess
    >(
      workbenchActions.SET_VIEWER_FILE,
      dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS,
      imageFileActions.LOAD_IMAGE_HIST_SUCCESS,
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      //initialize file for workbench
      let actions = [];
      let dataFile = dataFiles[action.payload.fileId] as ImageFile;
      //when setting file, use other viewer as src for viewer sync.  this will transform the new file to match the old image it was replacing
      let pendingViewer = workbenchState.viewers.find(
        viewer => viewer.pendingFileId == action.payload.fileId
      );
      let pendingFile = dataFiles[pendingViewer.pendingFileId] as ImageFile;
      let pendingViewerIndex = workbenchState.viewers.indexOf(pendingViewer);
      if (dataFile && pendingViewer) {
        if (!dataFile.headerLoaded) {
          if (!dataFile.headerLoading)
            actions.push(
              new dataFileActions.LoadDataFileHdr({ fileId: dataFile.id })
            );
        } else if (!dataFile.histLoaded) {
          if (!dataFile.histLoading)
            actions.push(
              new imageFileActions.LoadImageHist({ fileId: dataFile.id })
            );
        } else {
          //find reference file in the event syncing is requested
          let referenceFileId = pendingViewer.fileId;
          if (referenceFileId == null) {
            let referenceViewer = workbenchState.viewers.find(
              (viewer, index) =>
                index != pendingViewerIndex && viewer.fileId != null
            );
            if (referenceViewer) referenceFileId = referenceViewer.fileId;
          }

          //normalization
          let normalizationState = imageFileStates[dataFile.id].normalization;
          if (workbenchState.normalizationSyncEnabled && referenceFileId) {
            actions.push(
              new workbenchActions.SyncFileNormalizations({
                reference: dataFiles[referenceFileId] as ImageFile,
                files: [pendingFile]
              })
            );
          } else if (!normalizationState.initialized) {
            // //calculate good defaults based on histogram
            // let levels = calcLevels(
            //   dataFile.hist,
            //   environment.lowerPercentileDefault,
            //   environment.upperPercentileDefault,
            //   true
            // );
            actions.push(
              new normalizationActions.RenormalizeImageFile({ file: dataFile })
            );
          }

          let sonifierState = imageFileStates[dataFile.id].sonifier;
          if (!sonifierState.regionHistoryInitialized) {
            actions.push(
              new sonifierActions.AddRegionToHistory({
                file: dataFile,
                region: {
                  x: 0.5,
                  y: 0.5,
                  width: getWidth(dataFile),
                  height: getHeight(dataFile)
                }
              })
            );
          }

          if (referenceFileId) {
            //sync pending file transformation to current file
            if (workbenchState.viewerSyncEnabled)
              actions.push(
                new workbenchActions.SyncFileTransformations({
                  reference: dataFiles[referenceFileId] as ImageFile,
                  files: [dataFiles[pendingViewer.pendingFileId] as ImageFile]
                })
              );
            if (workbenchState.plotterSyncEnabled)
              actions.push(
                new workbenchActions.SyncFilePlotters({
                  reference: dataFiles[referenceFileId] as ImageFile,
                  files: [dataFiles[pendingViewer.pendingFileId] as ImageFile]
                })
              );
          }

          actions.push(
            new workbenchActions.SetViewerFileSuccess({
              viewerIndex: pendingViewerIndex
            })
          );
        }
      }
      return from(actions);
    })
  );

  @Effect()
  onViewerSyncEnabledChange$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.SetViewerSyncEnabled>(
      workbenchActions.SET_VIEWER_SYNC_ENABLED
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let referenceFile = dataFiles[
        workbenchState.viewers[workbenchState.activeViewerIndex].fileId
      ] as ImageFile;
      let files = workbenchState.viewers
        .filter(
          (viewer, index) =>
            index != workbenchState.activeViewerIndex && viewer.fileId !== null
        )
        .map(viewer => dataFiles[viewer.fileId] as ImageFile);
      if (referenceFile && files.length != 0) {
        if (workbenchState.viewerSyncEnabled)
          actions.push(
            new workbenchActions.SyncFileTransformations({
              reference: referenceFile,
              files: files
            })
          );
      }

      return from(actions);
    })
  );

  @Effect()
  onTransformChange$: Observable<Action> = this.actions$.pipe(
    ofType<
      | transformationActions.MoveBy
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
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];

      let activeViewer =
        workbenchState.viewers[workbenchState.activeViewerIndex];
      if (
        !workbenchState.viewerSyncEnabled ||
        !activeViewer ||
        activeViewer.fileId != action.payload.file.id
      )
        return from(actions);

      let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
      let files = workbenchState.viewers
        .filter(
          (viewer, index) =>
            index != workbenchState.activeViewerIndex && viewer.fileId !== null
        )
        .map(viewer => dataFiles[viewer.fileId] as ImageFile);
      actions.push(
        new workbenchActions.SyncFileTransformations({
          reference: referenceFile,
          files: files
        })
      );

      return from(actions);
    })
  );

  @Effect()
  onNormalizationChange$: Observable<Action> = this.actions$.pipe(
    ofType<normalizationActions.UpdateNormalizer>(
      normalizationActions.UPDATE_NORMALIZER
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];

      let activeViewer =
        workbenchState.viewers[workbenchState.activeViewerIndex];
      if (
        !workbenchState.normalizationSyncEnabled ||
        !activeViewer ||
        activeViewer.fileId != action.payload.file.id
      )
        return from(actions);

      let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
      let files = workbenchState.viewers
        .filter(
          (viewer, index) =>
            index != workbenchState.activeViewerIndex && viewer.fileId !== null
        )
        .map(viewer => dataFiles[viewer.fileId] as ImageFile);
      actions.push(
        new workbenchActions.SyncFileNormalizations({
          reference: referenceFile,
          files: files
        })
      );

      return from(actions);
    })
  );

  @Effect()
  onPlotterChange$: Observable<Action> = this.actions$.pipe(
    ofType<
      | plotterActions.StartLine
      | plotterActions.UpdateLine
      | plotterActions.UpdatePlotterFileState
    >(
      plotterActions.START_LINE,
      plotterActions.UPDATE_LINE,
      plotterActions.UPDATE_PLOTTER_FILE_STATE
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];

      let activeViewer =
        workbenchState.viewers[workbenchState.activeViewerIndex];
      if (
        !workbenchState.plotterSyncEnabled ||
        !activeViewer ||
        activeViewer.fileId != action.payload.file.id
      )
        return from(actions);

      let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
      let files = workbenchState.viewers
        .filter(
          (viewer, index) =>
            index != workbenchState.activeViewerIndex && viewer.fileId !== null
        )
        .map(viewer => dataFiles[viewer.fileId] as ImageFile);
      actions.push(
        new workbenchActions.SyncFilePlotters({
          reference: referenceFile,
          files: files
        })
      );

      return from(actions);
    })
  );

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
  syncFileNormalizations$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.SyncFileNormalizations>(
      workbenchActions.SYNC_FILE_NORMALIZATIONS
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let srcFile: ImageFile = action.payload.reference;
      if (!srcFile) return from(actions);

      let targetFiles: ImageFile[] = action.payload.files;
      let srcNormalizer = imageFileStates[srcFile.id].normalization.normalizer;
     
      targetFiles.forEach(targetFile => {
        if (!targetFile || targetFile.id == srcFile.id) return;
        actions.push(
          new normalizationActions.UpdateNormalizer({
            file: targetFile,
            changes: {
              ...srcNormalizer,
              peakPercentile: srcNormalizer.peakPercentile,
              backgroundPercentile: srcNormalizer.backgroundPercentile
            }
          })
        );
      });
      return from(actions);
    })
  );

  @Effect()
  syncFilePlotters$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.SyncFilePlotters>(
      workbenchActions.SYNC_FILE_PLOTTERS
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let srcFile: ImageFile = action.payload.reference;
      let targetFiles: ImageFile[] = action.payload.files;
      let srcPlotter = imageFileStates[srcFile.id].plotter;

      targetFiles.forEach(targetFile => {
        if (!targetFile || targetFile.id == srcFile.id) return;
        actions.push(
          new plotterActions.UpdatePlotterFileState({
            file: targetFile,
            changes: { ...srcPlotter }
          })
        );
      });
      return from(actions);
    })
  );

  @Effect()
  syncFileTransformations$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.SyncFileTransformations>(
      workbenchActions.SYNC_FILE_TRANSFORMATIONS
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getWorkbenchState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, workbenchState, imageFileStates]) => {
      let actions = [];
      let srcFile: ImageFile = action.payload.reference;
      let targetFiles: ImageFile[] = action.payload.files;

      if (!srcFile) return from(actions);

      let srcHasWcs = srcFile.wcs.isValid();
      let srcImageTransform =
        imageFileStates[srcFile.id].transformation.imageTransform;
      let srcViewportTransform =
        imageFileStates[srcFile.id].transformation.viewportTransform;

      targetFiles.forEach(targetFile => {
        if (!targetFile || targetFile.id == srcFile.id) return;

        let targetHasWcs = targetFile.wcs.isValid();

        if (srcHasWcs && targetHasWcs) {
          let srcWcs = srcFile.wcs;
          let srcWcsTransform = new Matrix(
            srcWcs.m11,
            srcWcs.m21,
            srcWcs.m12,
            srcWcs.m22,
            0,
            0
          );
          let originWorld = srcWcs.pixToWorld([0, 0]);
          let targetWcs = targetFile.wcs;
          let originPixels = targetWcs.worldToPix(originWorld);
          let targetWcsTransform = new Matrix(
            targetWcs.m11,
            targetWcs.m21,
            targetWcs.m12,
            targetWcs.m22,
            0,
            0
          );
          let targetImageFileState = imageFileStates[targetFile.id];

          if (hasOverlap(srcFile, targetFile)) {
            let srcToTargetTransform = srcWcsTransform
              .inverted()
              .appended(targetWcsTransform)
              .translate(-originPixels[0], -originPixels[1]);
            let targetImageTransform = imageFileStates[
              srcFile.id
            ].transformation.imageTransform.appended(srcToTargetTransform);
            actions.push(
              new transformationActions.SetImageTransform({
                file: targetFile,
                transform: targetImageTransform
              })
            );
            actions.push(
              new transformationActions.SetViewportTransform({
                file: targetFile,
                transform:
                  imageFileStates[srcFile.id].transformation.viewportTransform
              })
            );
          }
        } else {
          let targetImageFileState = imageFileStates[targetFile.id];
          actions.push(
            new transformationActions.SetImageTransform({
              file: targetFile,
              transform: srcImageTransform
            })
          );
          actions.push(
            new transformationActions.SetViewportTransform({
              file: targetFile,
              transform: srcViewportTransform
            })
          );
        }
      });
      return from(actions);
    })
  );

  @Effect()
  loadCatalogs$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.LoadCatalogs>(workbenchActions.LOAD_CATALOGS),
    switchMap(action => {
      const nextReq$ = this.actions$.pipe(
        ofType(workbenchActions.LOAD_CATALOGS),
        skip(1)
      );

      return this.afterglowCatalogService.getCatalogs().pipe(
        takeUntil(nextReq$),
        map(
          (catalogs: Catalog[]) =>
            new workbenchActions.LoadCatalogsSuccess({ catalogs: catalogs })
        ),
        catchError(err => of(new workbenchActions.LoadCatalogsFail(err)))
      );
    })
  );


  @Effect()
  loadFieldCals$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.LoadFieldCals>(workbenchActions.LOAD_FIELD_CALS),
    switchMap(action => {
      const nextReq$ = this.actions$.pipe(
        ofType(workbenchActions.LOAD_FIELD_CALS),
        skip(1)
      );

      return this.afterglowFieldCalService.getFieldCals().pipe(
        takeUntil(nextReq$),
        map(
          (fieldCals: FieldCal[]) =>
            new workbenchActions.LoadFieldCalsSuccess({ fieldCals: fieldCals })
        ),
        catchError(err => of(new workbenchActions.LoadFieldCalsFail(err)))
      );
    })
  );

  @Effect()
  createFieldCal$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.CreateFieldCal>(workbenchActions.CREATE_FIELD_CAL),
    switchMap(action => {
     
      return this.afterglowFieldCalService.createFieldCal(action.payload.fieldCal).pipe(
        map(
          (fieldCal: FieldCal) =>
            new workbenchActions.CreateFieldCalSuccess({ fieldCal: fieldCal })
        ),
        catchError(err => of(new workbenchActions.CreateFieldCalFail(err)))
      );
    })
  );

  @Effect()
  updateFieldCal$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.UpdateFieldCal>(workbenchActions.UPDATE_FIELD_CAL),
    switchMap(action => {
     
      return this.afterglowFieldCalService.updateFieldCal(action.payload.fieldCal).pipe(
        map(
          (fieldCal: FieldCal) =>
            new workbenchActions.UpdateFieldCalSuccess({ fieldCal: fieldCal })
        ),
        catchError(err => of(new workbenchActions.UpdateFieldCalFail(err)))
      );
    })
  );

  @Effect()
  createFieldCalSuccess$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.CreateFieldCalSuccess | workbenchActions.UpdateFieldCalSuccess>(workbenchActions.CREATE_FIELD_CAL_SUCCESS, workbenchActions.UPDATE_FIELD_CAL_SUCCESS),
    flatMap(action => of(new workbenchActions.LoadFieldCals()))
  );

  @Effect()
  addFieldCalSourcesFromCatalog$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.AddFieldCalSourcesFromCatalog>(workbenchActions.ADD_FIELD_CAL_SOURCES_FROM_CATALOG),
    switchMap(action => {
 

      return  of(new jobActions.CreateJob({job: action.payload.catalogQueryJob}));
     

    }))

    @Effect()
  addFieldCalSourcesFromCatalogJobSuccess$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobResultSuccess>(jobActions.UPDATE_JOB_RESULT_SUCCESS),
    withLatestFrom(
      this.store.select(fromCore.getWorkbenchState),
    ),
    filter(([action, workbenchState]: [jobActions.UpdateJobResultSuccess, WorkbenchState]) => workbenchState.addFieldCalSourcesFromCatalogJobId == action.payload.job.id),
    flatMap(([action, workbenchState]: [jobActions.UpdateJobResultSuccess, WorkbenchState]) => {
      
      let fieldCal = workbenchState.fieldCals.find(c => c.id == workbenchState.addFieldCalSourcesFromCatalogFieldCalId);
      let result = action.payload.result as CatalogQueryJobResult;
      // console.log("SOURCES:", result.data);
      fieldCal = {
        ...fieldCal,
        catalogSources: [...fieldCal.catalogSources, ...result.data]
        // catalogSources: []
      };
      return of(new workbenchActions.UpdateFieldCal({fieldCal: fieldCal}))
    })
  );


  @Effect()
  createPixelOpsJob$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.CreatePixelOpsJob>(workbenchActions.CREATE_PIXEL_OPS_JOB),
    withLatestFrom(
      this.store.select(fromDataFiles.getAllDataFiles).pipe(
      map(
        files =>
          files.filter(file => file.type == DataFileType.IMAGE) as Array<
            ImageFile
          >
      )),
      this.store.select(fromCore.getWorkbenchState)
    ),
    flatMap(([action, allImageFiles, workbenchState]: [workbenchActions.CreatePixelOpsJob, ImageFile[], WorkbenchState]) => {
      let data = workbenchState.pixelOpsFormData;
      let imageFiles = data.imageFileIds.map(id => allImageFiles.find(f => f.id == id)).filter(f => f != null);
      let auxFileIds: number[] = [];
      let op;
      if(data.mode == 'scalar') {
        op = `img ${data.operand} ${data.scalarValue}`;
      }
      else {
        op = `img ${data.operand} aux_img`;
        auxFileIds.push(parseInt(data.auxImageFileId));
      }
      let job: PixelOpsJob = {
        type: JobType.PixelOps,
        id: null,
        file_ids: imageFiles.sort( (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
        aux_file_ids: auxFileIds,
        op: op,
        inplace: data.inPlace
      };
      return of(new jobActions.CreateJob({job: job}))
    })
  );

  @Effect()
  createAdvPixelOpsJob$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.CreateAdvPixelOpsJob>(workbenchActions.CREATE_ADV_PIXEL_OPS_JOB),
    withLatestFrom(
      this.store.select(fromDataFiles.getAllDataFiles).pipe(
      map(
        files =>
          files.filter(file => file.type == DataFileType.IMAGE) as Array<
            ImageFile
          >
      )),
      this.store.select(fromCore.getWorkbenchState)
    ),
    flatMap(([action, allImageFiles, workbenchState]: [workbenchActions.CreateAdvPixelOpsJob, ImageFile[], WorkbenchState]) => {
      let data = workbenchState.pixelOpsFormData;
      let imageFiles = data.imageFileIds.map(id => allImageFiles.find(f => f.id == id)).filter(f => f != null);
      let auxImageFiles = data.auxImageFileIds.map(id => allImageFiles.find(f => f.id == id)).filter(f => f != null);
      let job: PixelOpsJob = {
        type: JobType.PixelOps,
        id: null,
        file_ids: imageFiles.sort( (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
        aux_file_ids: auxImageFiles.sort( (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
        op: data.opString,
        inplace: data.inPlace
      };
      return of(new jobActions.CreateJob({job: job}))
    })
  );

  @Effect()
  pixelOpsJobSuccess$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobResultSuccess>(jobActions.UPDATE_JOB_RESULT_SUCCESS),
    withLatestFrom(
      this.store.select(fromCore.getWorkbenchState)
    ),
    filter(([action, workbenchState]: [jobActions.UpdateJobResultSuccess,  WorkbenchState]) => {
      
      return workbenchState.currentPixelOpsJobId != null &&
        action.payload.job.id == workbenchState.currentPixelOpsJobId &&
        action.payload.job.state.status == 'completed' &&
        action.payload.result.errors.length == 0
    }),
    flatMap(([action, workbenchState]) => {
      return of(new dataFileActions.LoadLibrary())
    })
  );

  @Effect()
  createAlignmentJob$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.CreateAlignmentJob>(workbenchActions.CREATE_ALIGNMENT_JOB),
    withLatestFrom(
      this.store.select(fromDataFiles.getAllDataFiles).pipe(
      map(
        files =>
          files.filter(file => file.type == DataFileType.IMAGE) as Array<
            ImageFile
          >
      )),
      this.store.select(fromCore.getWorkbenchState)
    ),
    flatMap(([action, allImageFiles, workbenchState]: [workbenchActions.CreateAlignmentJob, ImageFile[], WorkbenchState]) => {
      let data = workbenchState.alignFormData;
      let imageFiles = data.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)).filter(f => f != null);
      let job: AlignmentJob = {
        type: JobType.Alignment,
        id: null,
        file_ids: imageFiles.sort( (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
        inplace: data.inPlace
      };
      return of(new jobActions.CreateJob({job: job}))
    })
  );


  @Effect()
  alignmentJobComplete$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobResultSuccess>(jobActions.UPDATE_JOB_RESULT_SUCCESS),
    filter(action => action.payload.job.type == JobType.Alignment && action.payload.job.state.status == 'completed' && action.payload.result && (action.payload.result as AlignmentJobResult).file_ids.length != 0 ),
    withLatestFrom(
      this.store.select(fromCore.getWorkbenchState)
    ),
    flatMap(([action, workbenchState]: [jobActions.UpdateJobResultSuccess, WorkbenchState]) => {
      let result = action.payload.result as AlignmentJobResult;
      let fileIds = result.file_ids.map(id => id.toString());
      let actions = [];
      actions.push(new imageFileActions.ClearImageDataCache({fileIds: fileIds}));
      workbenchState.viewers.forEach( (viewer, index) => {
        if(fileIds.includes(viewer.fileId)) {
          actions.push(new workbenchActions.SetViewerFile({viewerIndex: index, fileId: viewer.fileId}))
        }
      })
      
      return from(actions)
    })
  );


    @Effect()
  createStackingJob$: Observable<Action> = this.actions$.pipe(
    ofType<workbenchActions.CreateStackingJob>(workbenchActions.CREATE_STACKING_JOB),
    withLatestFrom(
      this.store.select(fromDataFiles.getAllDataFiles).pipe(
      map(
        files =>
          files.filter(file => file.type == DataFileType.IMAGE) as Array<
            ImageFile
          >
      )),
      this.store.select(fromCore.getWorkbenchState)
    ),
    flatMap(([action, allImageFiles, workbenchState]: [workbenchActions.CreateStackingJob, ImageFile[], WorkbenchState]) => {
      let data = workbenchState.stackFormData;
      let imageFiles = data.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)).filter(f => f != null);
      let job: StackingJob = {
        type: JobType.Stacking,
        id: null,
        file_ids: imageFiles.sort( (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
        stacking_settings: {
          mode: data.mode,
          scaling: data.scaling == 'none' ? null : data.scaling,
          rejection: data.rejection == 'none' ? null : data.rejection,
          percentile: data.percentile,
          lo: data.low,
          hi: data.high
        }
      };
      return of(new jobActions.CreateJob({job: job}))
    })
  );


  @Effect()
  stackingJobComplete$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobResultSuccess>(jobActions.UPDATE_JOB_RESULT_SUCCESS),
    filter(action => action.payload.job.type == JobType.Stacking && action.payload.job.state.status == 'completed' && action.payload.result != null ),
    flatMap(action =>  of(new dataFileActions.LoadLibrary()))
  );



  @Effect()
  importFromSurvey$: Observable<Action> = this.actions$.pipe(
    ofType<surveyActions.ImportFromSurvey>(surveyActions.IMPORT_FROM_SURVEY),
    flatMap(action =>  {
      let importAction = new dataProviderActions.ImportAssets({
        dataProviderId: action.payload.surveyDataProviderId,
        assets: [
          {
            name: "",
            collection: false,
            path: `DSS\\${action.payload.raHours*15},${action.payload.decDegs}\\${action.payload.widthArcmins},${action.payload.heightArcmins}`,
            metadata: {}
          }
        ]
      },
      action.correlationId
    )
      return of(importAction)
    })
  );

  @Effect()
  importFromSurveySuccess$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobResultSuccess | jobActions.UpdateJobResultFail>(jobActions.UPDATE_JOB_RESULT_SUCCESS, jobActions.UPDATE_JOB_RESULT_FAIL),
    withLatestFrom(
      this.store.select(fromCore.getWorkbenchState)
    ),
    filter(([action, workbenchState]: [jobActions.UpdateJobResultSuccess | jobActions.UpdateJobResultFail, WorkbenchState]) => workbenchState.surveyImportCorrId != null && action.correlationId == workbenchState.surveyImportCorrId),
    flatMap(([action, workbenchState]: [jobActions.UpdateJobResultSuccess | jobActions.UpdateJobResultFail, WorkbenchState]) =>  {
      if(action.type == jobActions.UPDATE_JOB_RESULT_SUCCESS) {
        let successAction = action as jobActions.UpdateJobResultSuccess;
        let result = successAction.payload.result as BatchImportJobResult;
        if(successAction.payload.result.errors.length == 0) {
          return from([
            new surveyActions.ImportFromSurveySuccess(),
            new workbenchActions.SetViewMode({viewMode: ViewMode.SPLIT_VERTICAL}),
            new workbenchActions.SetViewerFile({viewerIndex: 1, fileId: result.file_ids[0].toString()})
          ])
        }
        
      }

      return of(new surveyActions.ImportFromSurveyFail())
    })
  );

 


  //.debounceTime(this.debounce || 300, this.scheduler || async)

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
    private afterglowCatalogService: AfterglowCatalogService,
    private afterglowFieldCalService: AfterglowFieldCalService,
    private store: Store<fromCore.State> // @Optional() // @Inject(SEARCH_DEBOUNCE) // private debounce: number, // /** //    * You inject an optional Scheduler that will be undefined //    * in normal application usage, but its injected here so that you can mock out //    * during testing using the RxJS TestScheduler for simulating passages of time.
  ) //    */
  // @Optional()
  // @Inject(SEARCH_SCHEDULER)
  // private scheduler: Scheduler
  {}
}
