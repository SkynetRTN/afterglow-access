import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { BehaviorSubject, combineLatest, Observable, Subject, merge, of } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, switchMap, catchError, takeUntil, withLatestFrom, take, startWith } from 'rxjs/operators';
import { DataFilesState } from '../../../../data-files/data-files.state';
import {
  getDecDegs,
  getDegsPerPixel,
  getHeight,
  getRaHours,
  getSourceCoordinates,
  getWidth,
  Header,
  ILayer,
  ImageLayer,
} from '../../../../data-files/models/data-file';
import { JobsState } from '../../../../jobs/jobs.state';
import { WcsCalibrationJob, WcsCalibrationJobResult } from '../../../../jobs/models/wcs_calibration';
import { isNumberOrSexagesimalValidator, greaterThan, isNumber } from '../../../../utils/validators';
import { SourceExtractionSettings } from '../../../models/source-extraction-settings';
import { WorkbenchState } from '../../../workbench.state';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { LoadJob, LoadJobResult } from 'src/app/jobs/jobs.actions';
import { ImageViewerMarkerService } from '../../../services/image-viewer-marker.service';
import { MarkerType, SourceMarker } from '../../../models/marker';
import { isSourceExtractionJob } from 'src/app/jobs/models/source-extraction';
import { InvalidateHeader, LoadLayerHeader } from 'src/app/data-files/data-files.actions';
import { AfterglowDataFileService } from '../../../services/afterglow-data-files';
import { WcsCalibrationPanelConfig } from '../models/wcs-calibration-panel-config';
import { WcsCalibrationState, WcsCalibrationViewerStateModel } from '../wcs-calibration.state';
import { CreateWcsCalibrationJob, UpdateConfig, UpdateWcsCalibrationExtractionOverlay } from '../wcs-calibration.actions';

@Component({
  selector: 'app-wcs-calibration-panel',
  templateUrl: './wcs-calibration-panel.component.html',
  styleUrls: ['./wcs-calibration-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WcsCalibrationPanelComponent implements OnInit, OnDestroy {
  @Input('viewerId')
  set viewerId(viewer: string) {
    this.viewerId$.next(viewer);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  protected viewerId$ = new BehaviorSubject<string>(null);

  @Input('layerIds')
  set layerIds(layerIds: string[]) {
    this.layerIds$.next(layerIds);
  }
  get layerIds() {
    return this.layerIds$.getValue();
  }
  private layerIds$ = new BehaviorSubject<string[]>(null);

  destroy$ = new Subject<boolean>();
  header$: Observable<Header>;
  config$: Observable<WcsCalibrationPanelConfig>;
  state$: Observable<WcsCalibrationViewerStateModel>;
  selectedLayerIds$: Observable<string[]>;
  refLayerId$: Observable<string>;
  refLayer$: Observable<ImageLayer>;
  refHeader$: Observable<Header>;
  refLayerHasWcs$: Observable<boolean>;
  activeJob$: Observable<WcsCalibrationJob>;
  activeJobResult$: Observable<WcsCalibrationJobResult>;
  wcsCalibrationSettings$: Observable<WcsCalibrationPanelConfig>;
  sourceExtractionSettings$: Observable<SourceExtractionSettings>;

  copyStatus: { level: 'warning' | 'info' | 'danger' | 'success', message: string } = null;
  isNumber = [Validators.required, isNumber];
  greaterThanZero = [Validators.required, isNumber, greaterThan(0)];
  minZero = [Validators.required, isNumber, Validators.min(0)];
  wcsCalibrationForm = new FormGroup({
    selectedLayerIds: new FormControl([], Validators.required),
    mode: new FormControl(''),
    refLayerId: new FormControl(''),
    ra: new FormControl('', { updateOn: 'blur', validators: [isNumberOrSexagesimalValidator] }),
    dec: new FormControl('', { updateOn: 'blur', validators: [isNumberOrSexagesimalValidator] }),
    radius: new FormControl('', this.minZero),
    minScale: new FormControl('', this.minZero),
    maxScale: new FormControl('', this.minZero),
    maxSources: new FormControl('', this.minZero),
    showOverlay: new FormControl('')
  });

  submitDisabled$: Observable<boolean>;

  constructor(private store: Store, private dialog: MatDialog, private markerService: ImageViewerMarkerService, private dataFileService: AfterglowDataFileService, private cdRef: ChangeDetectorRef) {
    this.header$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getLayerHeaderByViewerId(viewerId)))
    );

    this.config$ = this.store.select(WcsCalibrationState.getConfig);
    this.selectedLayerIds$ = this.config$.pipe(map((state) => state.selectedLayerIds));

    this.wcsCalibrationSettings$ = this.store.select(WcsCalibrationState.getConfig);
    this.sourceExtractionSettings$ = this.store.select(WorkbenchState.getSourceExtractionSettings);

    this.refLayerId$ = this.config$.pipe(
      map((data) => (data && data.refLayerId && data.selectedLayerIds.includes(data.refLayerId)) ? data.refLayerId : null),
      distinctUntilChanged()
    );

    this.refLayer$ = this.refLayerId$.pipe(
      switchMap((layerId) => {
        return this.store.select(DataFilesState.getLayerById(layerId)).pipe(
          map((layer) => layer as ImageLayer),
          distinctUntilChanged()
        );
      })
    );

    this.refHeader$ = this.refLayer$.pipe(
      map((layer) => layer && layer.headerId),
      distinctUntilChanged(),
      switchMap((headerId) => {
        return this.store.select(DataFilesState.getHeaderById(headerId));
      })
    );

    let refHeaderLoaded$ = this.refHeader$.pipe(
      map((header) => header && header.loaded),
      distinctUntilChanged()
    );

    let refHeaderLoading$ = this.refHeader$.pipe(
      map((header) => header && header.loading),
      distinctUntilChanged()
    );

    combineLatest(this.refLayerId$, refHeaderLoaded$, refHeaderLoading$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(([refLayerId, headerLoaded, headerLoading]) => {
        if (refLayerId && headerLoaded != null && !headerLoaded && headerLoading != null && !headerLoading) {
          setTimeout(() => {
            this.store.dispatch(new LoadLayerHeader(refLayerId));
          });
        }
      });

    this.refLayerHasWcs$ = this.refHeader$.pipe(
      map((header) => header && header.wcs && header.wcs.isValid()),
      distinctUntilChanged()
    );

    this.activeJob$ = combineLatest([
      this.store.select(JobsState.getJobEntities),
      this.config$.pipe(
        map((state) => (state ? state.activeJobId : null)),
        distinctUntilChanged()
      ),
    ]).pipe(
      map(([jobEntities, activeJobId]) => {
        if (!activeJobId) return null;
        return jobEntities[activeJobId] as WcsCalibrationJob;
      })
    );

    this.activeJobResult$ = this.activeJob$.pipe(map((job) => job.result));

    combineLatest([this.selectedLayerIds$, this.wcsCalibrationSettings$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([selectedLayerIds, settings]) => {
        if (selectedLayerIds) {
          this.wcsCalibrationForm.patchValue(
            {
              selectedLayerIds: selectedLayerIds,
            },
            { emitEvent: false }
          );
        }

        if (settings) {
          this.wcsCalibrationForm.patchValue(
            {
              mode: settings.mode,
              refLayerId: settings.refLayerId,
              ra: settings.ra,
              dec: settings.dec,
              radius: settings.radius,
              minScale: settings.minScale,
              maxScale: settings.maxScale,
              maxSources: settings.maxSources,
              showOverlay: settings.showOverlay
            },
            { emitEvent: false }
          );
        }

        this.copyStatus = null;


      });

    this.wcsCalibrationForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {

      this.store.dispatch(
        new UpdateConfig({
          showOverlay: value.showOverlay,
          selectedLayerIds: value.selectedLayerIds,
          mode: value.mode,
          refLayerId: value.refLayerId,
          activeJobId: null
        })
      );

      if (this.wcsCalibrationForm.valid) {
        this.store.dispatch(
          new UpdateConfig({
            ra: value.ra,
            dec: value.dec,
            radius: value.radius,
            maxScale: value.maxScale,
            minScale: value.minScale,
            maxSources: value.maxSources
          })
        );
      }

      this.copyStatus = null;
    });


    // determine whether existing jobs have been loaded
    this.viewerId$.subscribe(viewerId => {
      let state = this.store.selectSnapshot(WcsCalibrationState.getWcsCalibrationViewerStateByViewerId(viewerId));

      if (!state) return;

      let loadJob = (id) => {
        if (id) {
          let job = this.store.selectSnapshot(JobsState.getJobById(id))
          if (!job) this.store.dispatch(new LoadJob(id))
          if (!job || !job.result) this.store.dispatch(new LoadJobResult(id))
        }
      }

      if (state.sourceExtractionOverlayIsValid) loadJob(state.sourceExtractionJobId);
    })



    this.state$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WcsCalibrationState.getWcsCalibrationViewerStateByViewerId(viewerId))),
      filter(state => !!state)
    );

    let sourceExtractionOverlayIsValid$ = combineLatest([this.state$, this.config$]).pipe(
      map(([s, config]) => !config.showOverlay || s.sourceExtractionOverlayIsValid),
      distinctUntilChanged()
    );

    let sourceExtractionJobId$ = this.state$.pipe(
      map((s) => s.sourceExtractionJobId),
      distinctUntilChanged()
    )

    sourceExtractionOverlayIsValid$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.header$),
      switchMap(([isValid, header]) => {
        if (header?.loaded) return of(isValid);

        //wait for header to be loaded
        return this.store.select(DataFilesState.getHeaderById(header.id)).pipe(
          filter(header => header.loaded),
          take(1),
          map(header => {
            return isValid
          })
        )
      }),
      withLatestFrom(sourceExtractionJobId$)
    ).subscribe(([isValid, jobId]) => {
      if (!this.viewerId) return;
      //handle case where job ID is present and valid, but job is not in store
      if (!isValid || (jobId && !this.store.selectSnapshot(JobsState.getJobById(jobId)))) this.store.dispatch(new UpdateWcsCalibrationExtractionOverlay(this.viewerId))
    })

    this.submitDisabled$ = this.activeJob$.pipe(startWith(null)).pipe(
      map(job => (job?.state?.status !== undefined && ['pending', 'in_progress'].includes(job.state.status)))
    )
  }

  ngOnInit() {
    /** markers */
    let visibleViewerIds$: Observable<string[]> = this.store.select(WorkbenchState.getVisibleViewerIds).pipe(
      distinctUntilChanged((x, y) => {
        return x.length == y.length && x.every((value, index) => value == y[index]);
      })
    );

    visibleViewerIds$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((viewerIds) => {
          return merge(...viewerIds.map((viewerId) => this.getViewerMarkers(viewerId))).pipe(
            takeUntil(this.destroy$),
          );
        })
      )
      .subscribe((v) => {
        this.markerService.updateMarkers(v.viewerId, v.markers);
      });
  }

  private getViewerMarkers(viewerId: string) {
    let config$ = this.store.select(WcsCalibrationState.getConfig)
    let state$ = this.store.select(WcsCalibrationState.getWcsCalibrationViewerStateByViewerId(viewerId)).pipe(distinctUntilChanged());
    let layerId$ = this.store.select(WorkbenchState.getImageLayerByViewerId(viewerId)).pipe(map(layer => layer?.id), distinctUntilChanged())
    // let layerId$ = this.imageLayer$.pipe(
    //   map((layer) => layer?.id),
    //   distinctUntilChanged()
    // );
    let header$ = this.store.select(WorkbenchState.getHeaderByViewerId(viewerId))
    let overlayJob$ = this.state$.pipe(
      switchMap(state => this.store.select(JobsState.getJobById(state.sourceExtractionJobId)))
    )

    let sourceMarkers$ = combineLatest([config$, header$, layerId$, overlayJob$]).pipe(
      map(([config, header, layerId, overlayJob]) => {
        if (!config?.showOverlay || !header || !header.loaded) return [];
        if (!overlayJob || !isSourceExtractionJob(overlayJob)) return [];

        let markers: Array<SourceMarker> = [];

        overlayJob.result?.data.forEach((source, index) => {

          let marker: SourceMarker = {
            id: `WCS_CAL_OVERLAY_${layerId}_${index}`,
            type: MarkerType.SOURCE,
            x: source.x,
            y: source.y,
            theta: 0,
            raHours: source.raHours,
            decDegs: source.decDegs,
            source: null,
            selected: false,
            data: { source: source },
            tooltip: {
              class: 'source-data-tooltip',
              message: '',
              showDelay: 500,
              hideDelay: null,
            },
            label: '',
            labelRadius: 10,
          }

          markers.push(marker);
        });

        return markers;
      })
    );

    return sourceMarkers$.pipe(
      map((sourceMarkers) => {
        return {
          viewerId: viewerId,
          markers: sourceMarkers,
        };
      })
    );
  }


  ngOnDestroy() {
    this.markerService.clearMarkers();
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  getLayerOptionLabel(layerId: string) {
    return this.store.select(DataFilesState.getLayerById(layerId)).pipe(
      map((layer) => layer?.name),
      distinctUntilChanged()
    );
  }

  setSelectedLayerIds(layerIds: string[]) {
    this.wcsCalibrationForm.controls.selectedLayerIds.setValue(layerIds);
  }

  onSelectAllBtnClick() {
    this.setSelectedLayerIds(this.layerIds);
  }

  onClearSelectionBtnClick() {
    this.setSelectedLayerIds([]);
  }

  onShowOverlayChange($event: MatCheckboxChange) {
    this.store.dispatch(new UpdateConfig({ showOverlay: $event.checked }))
  }

  onSubmitClick() {
    let config = this.store.selectSnapshot(WcsCalibrationState.getConfig);
    if (config.mode == 'platesolve') {
      this.store.dispatch(new CreateWcsCalibrationJob(this.wcsCalibrationForm.controls.selectedLayerIds.value));
    }
    else {
      // copy wcs from 
      this.copyStatus = { level: 'info', message: 'Downloading WCS from reference...' }
      this.dataFileService.getWcs(config.refLayerId).pipe(takeUntil(this.destroy$)).subscribe(
        (resp) => {
          this.copyStatus = { level: 'info', message: 'Copying WCS to selected image layers...' }
          let errors: string[] = [];
          let wcsObj = {};
          resp.data.forEach(row => wcsObj[row.key] = row.value)
          let reqs$ = config.selectedLayerIds.filter(id => id != config.refLayerId).map(id => this.dataFileService.setWcs(id, wcsObj).pipe(
            catchError(e => {
              let layer = this.store.selectSnapshot(DataFilesState.getLayerById(id));
              errors.push(`${layer.name}: Failed to write WCS to header`)
              throw e;
            })
          ))
          combineLatest(reqs$).subscribe(
            (resps) => {
              if (errors.length == 0) {
                this.copyStatus = { level: 'success', message: `The reference WCS header was successfully copied to all selected layers` }
              }
              else {
                this.copyStatus = { level: 'danger', message: `Task completed but with errors:  ${errors.join(', ')}` }
              }
              this.store.dispatch(config.selectedLayerIds.map(layerId => new InvalidateHeader(layerId)));
              this.cdRef.markForCheck();
            },
            (err) => {
              this.copyStatus = { level: 'danger', message: `An unexpected error occurred:  ${errors.join(', ')}` }
              this.cdRef.markForCheck();
            }
          )
        },
        (error) => {
          this.copyStatus = { level: 'danger', message: 'An unexpected error occurred when downloading the reference WCS' }
          this.cdRef.markForCheck();
        }
      )
    }

  }

  onAutofillFromFocusedViewerClick(header: Header) {
    if (!header) return;

    let ra: number = null;
    let dec: number = null;
    let width = getWidth(header);
    let height = getHeight(header);
    let wcs = header.wcs;
    if (width && height && wcs && wcs.isValid()) {
      let raDec: [number, number] = wcs.pixToWorld([width / 2, height / 2]) as [number, number];
      ra = raDec[0];
      dec = raDec[1];
    } else {
      ra = getRaHours(header);
      dec = getDecDegs(header);
    }

    let degsPerPixel = getDegsPerPixel(header);

    let changes: Partial<WcsCalibrationPanelConfig> = {
      ra: null,
      dec: null,
      minScale: null,
      maxScale: null,
    };

    if (ra || ra == 0) {
      changes.ra = ra;
    }
    if (dec || dec == 0) {
      changes.dec = dec;
    }

    if (degsPerPixel) {
      changes.minScale = Math.round(degsPerPixel * 0.9 * 3600 * 100000) / 100000;
      changes.maxScale = Math.round(degsPerPixel * 1.1 * 3600 * 100000) / 100000;
    }

    let wcsCalibrationSettings = this.store.selectSnapshot(WcsCalibrationState.getConfig);
    this.store.dispatch(
      new UpdateConfig({
        ...wcsCalibrationSettings,
        ...changes,
      })
    );
  }
}
