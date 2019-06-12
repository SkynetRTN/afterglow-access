import { Injectable, InjectionToken, Optional, Inject } from "@angular/core";
import { Effect, Actions, ofType } from "@ngrx/effects";
import { Action } from "@ngrx/store";
import { Store } from "@ngrx/store";
import { Observable, from, of, merge } from "rxjs";
import {
  withLatestFrom,
  flatMap,
  map,
  filter,
  takeUntil,
  skip,
  take
} from "rxjs/operators";

import {
  ImageFile,
  getWidth,
  getHeight,
  getCenterTime,
  getHasWcs,
  getWcs
} from "../../data-files/models/data-file";
import { Source, PosType } from "../models/source";
import * as dataFileActions from "../../data-files/actions/data-file";
import * as sourceExtractorActions from "../actions/source-extractor";
import * as sourceActions from "../actions/source";
import * as imageFileActions from "../../data-files/actions/image-file";
import * as fromCore from "../reducers";
import * as fromDataFile from "../../data-files/reducers";
import * as jobActions from "../../jobs/actions/job";

import { AfterglowDataFileService } from "../services/afterglow-data-files";
import { SourceExtractorRegionOption } from "../models/source-extractor-file-state";
import { getViewportRegion } from "../models/transformation";
import { JobType } from "../../jobs/models/job-types";
import { SourceExtractionJob } from "../../jobs/models/source-extraction";
import { PhotometryJobResult } from "../../jobs/models/photometry";

@Injectable()
export class SourceExtractorEffects {
  @Effect()
  extractSources$: Observable<Action> = this.actions$.pipe(
    ofType<sourceExtractorActions.ExtractSources>(
      sourceExtractorActions.EXTRACT_SOURCES
    ),
    withLatestFrom(this.store.select(fromCore.getWorkbenchState)),
    flatMap(([action, workbenchState]) => {
      let targetFileId = action.payload.file.id;
      let job: SourceExtractionJob = {
        id: null,
        type: JobType.SourceExtraction,
        file_ids: [parseInt(action.payload.file.id)],
        source_extraction_settings: workbenchState.sourceExtractionSettings,
        merge_sources: false,
        source_merge_settings: null
      };

      return merge(
        of(new jobActions.CreateJob({ job: job })),
        this.actions$.pipe(
          ofType<jobActions.CreateJobSuccess | jobActions.CreateJobFail>(
            jobActions.CREATE_JOB_SUCCESS,
            jobActions.CREATE_JOB_FAIL
          ),
          filter(
            action =>
              action.payload.job.type == JobType.SourceExtraction &&
              job.file_ids[0] == parseInt(targetFileId)
          ),
          takeUntil(
            this.actions$.pipe(
              ofType<sourceExtractorActions.ExtractSources>(
                sourceExtractorActions.EXTRACT_SOURCES
              ),
              filter(action => action.payload.file.id == targetFileId),
              skip(1)
            )
          ),
          take(1),
          flatMap(action => {
            switch (action.type) {
              case jobActions.CREATE_JOB_SUCCESS: {
                return of(
                  new sourceExtractorActions.SetSourceExtractionJob({
                    job: action.payload.job as SourceExtractionJob
                  })
                );
              }
              case jobActions.CREATE_JOB_FAIL: {
                return of(
                  new sourceExtractorActions.ExtractSourcesFail({
                    error: "Failed to create job"
                  })
                );
              }
              default: {
                return from([]);
              }
            }
          })
        )
      );
    })
  );

  @Effect()
  addSourcesFromJob$: Observable<Action> = this.actions$.pipe(
    ofType<jobActions.UpdateJobResultSuccess>(
      jobActions.UPDATE_JOB_RESULT_SUCCESS
    ),
    withLatestFrom(this.store.select(fromCore.getImageFileStates)),
    filter(([action, imageFileStates]) => {
      let job = action.payload.job;

      if (job.type != JobType.SourceExtraction || job.file_ids.length != 1)
        return false;
      let fileId = job.file_ids[0];

      return (
        imageFileStates[fileId].sourceExtractor.sourceExtractionJobId == job.id
      );
    }),
    map(([action, imageFileStates]) => {
      let photJobResult = action.payload.result as PhotometryJobResult;
      let sources = photJobResult.data.map(d => {
        let posType = PosType.PIXEL;
        let primaryCoord = d.x;
        let secondaryCoord = d.y;

        if (
          "ra_hours" in d &&
          d.ra_hours !== null &&
          "dec_degs" in d &&
          d.dec_degs !== null
        ) {
          posType = PosType.SKY;
          primaryCoord = d.ra_hours;
          secondaryCoord = d.dec_degs;
        }
        return {
          id: d.id,
          label: d.id,
          objectId: null,
          fileId: d.file_id,
          posType: posType,
          primaryCoord: primaryCoord,
          secondaryCoord: secondaryCoord,
          pm: null,
          pmPosAngle: null,
          pmEpoch: d.time ? new Date(d.time) : null
        } as Source;
      });

      return new sourceActions.AddSources({ sources: sources });
    })
  );

  // return [
  //   new jobActions.CreateJob({ job: job }),

  // ]

  // return [new jobActions.CreateJob({ job: job }),
  //   Observable.merge(
  //     this.actions$.ofType<jobActions.CreateJobSuccess>(jobActions.CREATE_JOB_SUCCESS).filter(action => action.payload.job.type == JobType.SourceExtraction),
  //     this.actions$.ofType<jobActions.CreateJobFail>(jobActions.CREATE_JOB_FAIL).filter(action => action.payload.job.type == JobType.SourceExtraction),
  //   )
  //   .takeUntil(this.actions$.ofType<sourceExtractorActions.ExtractSources>(sourceExtractorActions.EXTRACT_SOURCES))
  //   .take(1)
  //   .map(action => {
  //     switch (action.type) {
  //       case jobActions.CREATE_JOB_SUCCESS: {
  //         return new sourceExtractorActions.SetSourceExtractionJobId({jobId: action.payload.job.id})
  //       }
  //       case jobActions.CREATE_JOB_FAIL: {
  //         return new sourceExtractorActions.ExtractSourcesFail({error: "Failed to create job"})
  //       }
  //     }
  //   })
  // ];

  // return this.jobService
  //   .createJob(job)
  //   .map(job => {
  //     return null;
  //   })
  // .flatMap(job => {
  //   let update$ =
  // })
  // .flatMap(allExtractedSources => {
  //   allExtractedSources.forEach(source => {
  //     source.fileId = action.payload.file.id;
  //     if(action.payload.file.headerLoaded) {
  //       source.epoch = getCenterTime(action.payload.file);
  //     }
  //   })
  //   let maxPerRequest = 25;
  //   let extractedSourcesArrays: Array<Array<Source>> = [];

  //   while (allExtractedSources.length > 0) {
  //     extractedSourcesArrays.push(allExtractedSources.splice(0, maxPerRequest));
  //   }

  //   let observables: Array<Observable<Source[]>> = [];

  //   // extractedSourcesArrays.forEach(extractedSources => {
  //   //   let o = this.afterglowDataFileService.photometerXY(action.payload.file.id, extractedSources, imageFileGlobalState.photSettings)
  //   //     .map(photSources => {
  //   //       for (let i = 0; i < extractedSources.length; i++) {
  //   //         extractedSources[i].x = photSources[i].x;
  //   //         extractedSources[i].y = photSources[i].y;
  //   //         extractedSources[i].mag = photSources[i].mag;
  //   //         extractedSources[i].magError = photSources[i].magError;
  //   //         extractedSources[i].fwhm = photSources[i].fwhm;
  //   //       }
  //   //       return extractedSources;
  //   //     })

  //   //   observables.push(o);
  //   // })

  //   return Observable.forkJoin(observables).map(sourcesArrays => [].concat.apply([], sourcesArrays))

  // })
  // .map((sources: Source[]) => new sourceActions.AddSources({ sources: sources }))
  // .catch(err => of(new sourceExtractorActions.ExtractSourcesFail({ file: action.payload.file, error: err })));

  // @Effect()
  // photometerXYSources$: Observable<Action> = this.actions$
  //   .ofType<sourceExtractorActions.PhotometerXYSources>(sourceExtractorActions.PHOTOMETER_XY_SOURCES)
  //   .withLatestFrom(
  //   this.store.select(fromDataFile.getDataFiles),
  //   this.store.select(fromCore.getWorkbenchState)
  //   )
  //   //.debounceTime(this.debounce || 300, this.scheduler || async)
  //   .flatMap(([action, dataFiles, workbenchState]) => {
  //     return this.afterglowDataFileService
  //       .photometerXY(action.payload.file.id, action.payload.coords, workbenchState.photSettings, workbenchState.centroidSettings)
  //       .map((sources: Source[]) => {
  //         sources.forEach(source => {
  //           source.fileId = action.payload.file.id;
  //           if(action.payload.file.headerLoaded) {
  //             source.epoch = getCenterTime(action.payload.file);

  //             if(getHasWcs(action.payload.file)) {
  //               let raDec = getWcs(action.payload.file).pixToWorld([source.primaryCoord, source.secondaryCoord]);
  //               source.primaryCoord = raDec[0];
  //               source.secondaryCoord = raDec[1];
  //               source.posType = PosType.SKY;
  //             }
  //           }
  //         })
  //         return new sourceExtractorActions.PhotometerSourcesSuccess({ file: action.payload.file, sources: sources })
  //       })
  //       .catch(err => of(new sourceExtractorActions.PhotometerSourcesFail({ file: action.payload.file, error: err })));
  //   });

  // @Effect()
  // photometerRaDecSources$: Observable<Action> = this.actions$
  //   .ofType<sourceExtractorActions.PhotometerRaDecSources>(sourceExtractorActions.PHOTOMETER_RADEC_SOURCES)
  //   .withLatestFrom(
  //   this.store.select(fromDataFile.getDataFiles),
  //   this.store.select(fromCore.getWorkbenchState)
  //   )
  //   //.debounceTime(this.debounce || 300, this.scheduler || async)
  //   .flatMap(([action, dataFiles, workbenchState]) => {
  //     return this.afterglowDataFileService
  //       .photometerRaDec(action.payload.file.id, action.payload.coords, workbenchState.photSettings, workbenchState.centroidSettings)
  //       .map((sources: Source[]) => {
  //         sources.forEach(source => {
  //           source.fileId = action.payload.file.id;
  //           if(action.payload.file.headerLoaded) {
  //             source.epoch = getCenterTime(action.payload.file);
  //           }
  //         })
  //         return new sourceExtractorActions.PhotometerSourcesSuccess({ file: action.payload.file, sources: sources })
  //       })
  //       .catch(err => of(new sourceExtractorActions.PhotometerSourcesFail({ file: action.payload.file, error: err })));
  //   });

  @Effect()
  sourceExtractorFileStateUpdated$: Observable<Action> = this.actions$.pipe(
    ofType<sourceExtractorActions.UpdateFileState>(
      sourceExtractorActions.UPDATE_FILE_STATE
    ),
    map(
      action =>
        new sourceExtractorActions.UpdateRegion({ file: action.payload.file })
    )
  );

  @Effect()
  updateRegion$: Observable<Action> = this.actions$.pipe(
    ofType<sourceExtractorActions.UpdateRegion>(
      sourceExtractorActions.UPDATE_REGION
    ),
    withLatestFrom(
      this.store.select(fromDataFile.getDataFiles),
      this.store.select(fromCore.getImageFileGlobalState),
      this.store.select(fromCore.getImageFileStates)
    ),
    flatMap(([action, dataFiles, imageFileGlobalState, imageFileStates]) => {
      let imageFile = dataFiles[action.payload.file.id] as ImageFile;
      let sourceExtractorFileState =
        imageFileStates[imageFile.id].sourceExtractor;
      let sonifierFileState = imageFileStates[imageFile.id].sonifier;
      let actions: Action[] = [];

      let region = null;
      if (
        sourceExtractorFileState.regionOption ==
        SourceExtractorRegionOption.VIEWPORT
      ) {
        region = getViewportRegion(
          imageFileStates[imageFile.id].transformation,
          imageFile
        );
        // region = {
        //   x: imageFileGlobalState.viewport.imageX,
        //   y: imageFileGlobalState.viewport.imageY,
        //   width: imageFileGlobalState.viewport.imageWidth,
        //   height: imageFileGlobalState.viewport.imageHeight
        // }
      } else if (
        sourceExtractorFileState.regionOption ==
        SourceExtractorRegionOption.SONIFIER_REGION
      ) {
        region = sonifierFileState.region;
      } else {
        region = {
          x: 0,
          y: 0,
          width: getWidth(imageFile),
          height: getHeight(imageFile)
        };
      }

      actions.push(
        new sourceExtractorActions.SetRegion({
          file: imageFile,
          region: region
        })
      );

      return from(actions);
    })
  );

  constructor(
    private actions$: Actions,
    private afterglowDataFileService: AfterglowDataFileService,
    private store: Store<fromCore.State>
  ) {}
}
