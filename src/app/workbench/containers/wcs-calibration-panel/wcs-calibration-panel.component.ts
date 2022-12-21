import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { BehaviorSubject, combineLatest, Observable, Subject, merge, of } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, switchMap, takeUntil, withLatestFrom, take } from 'rxjs/operators';
import { DataFilesState } from '../../../data-files/data-files.state';
import {
  getDecDegs,
  getDegsPerPixel,
  getHeight,
  getRaHours,
  getSourceCoordinates,
  getWidth,
  Header,
  IHdu,
} from '../../../data-files/models/data-file';
import { JobsState } from '../../../jobs/jobs.state';
import { WcsCalibrationJob, WcsCalibrationJobResult } from '../../../jobs/models/wcs_calibration';
import { formatDms, parseDms } from '../../../utils/skynet-astro';
import { isNumberOrSexagesimalValidator, greaterThan, isNumber } from '../../../utils/validators';
import { SourceExtractionSettings } from '../../models/source-extraction-settings';
import { WorkbenchImageHduState } from '../../models/workbench-file-state';
import { WcsCalibrationPanelConfig } from '../../models/workbench-state';
import { ImageViewerEventService } from '../../services/image-viewer-event.service';
import {
  CreateWcsCalibrationJob,
  UpdateSourceExtractionSettings,
  UpdateWcsCalibrationExtractionOverlay,
  UpdateWcsCalibrationPanelState,
  UpdateWcsCalibrationPanelConfig,
} from '../../workbench.actions';
import { WorkbenchState } from '../../workbench.state';
import { SourceExtractionRegionDialogComponent } from '../../components/source-extraction-dialog/source-extraction-dialog.component';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { LoadJob, LoadJobResult } from 'src/app/jobs/jobs.actions';
import { WcsCalibrationPanelState } from '../../models/wcs-calibration-panel-state';
import { ImageViewerMarkerService } from '../../services/image-viewer-marker.service';
import { MarkerType, SourceMarker } from '../../models/marker';
import { isSourceExtractionJob } from 'src/app/jobs/models/source-extraction';

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
  state$: Observable<WcsCalibrationPanelState>;
  selectedHduIds$: Observable<string[]>;
  activeJob$: Observable<WcsCalibrationJob>;
  activeJobResult$: Observable<WcsCalibrationJobResult>;
  wcsCalibrationSettings$: Observable<WcsCalibrationPanelConfig>;
  sourceExtractionSettings$: Observable<SourceExtractionSettings>;

  isNumber = [Validators.required, isNumber];
  greaterThanZero = [Validators.required, isNumber, greaterThan(0)];
  minZero = [Validators.required, isNumber, Validators.min(0)];
  wcsCalibrationForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    ra: new FormControl('', { updateOn: 'blur', validators: [isNumberOrSexagesimalValidator] }),
    dec: new FormControl('', { updateOn: 'blur', validators: [isNumberOrSexagesimalValidator] }),
    radius: new FormControl('', this.minZero),
    minScale: new FormControl('', this.minZero),
    maxScale: new FormControl('', this.minZero),
    maxSources: new FormControl('', this.minZero),
    showOverlay: new FormControl('')
  });

  constructor(private store: Store, private dialog: MatDialog, private markerService: ImageViewerMarkerService) {
    this.header$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHduHeaderByViewerId(viewerId)))
    );

    this.config$ = this.store.select(WorkbenchState.getWcsCalibrationPanelConfig);
    this.selectedHduIds$ = this.config$.pipe(map((state) => state.selectedHduIds));

    this.wcsCalibrationSettings$ = this.store.select(WorkbenchState.getWcsCalibrationPanelConfig);
    this.sourceExtractionSettings$ = this.store.select(WorkbenchState.getSourceExtractionSettings);

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

    combineLatest([this.selectedHduIds$, this.wcsCalibrationSettings$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([selectedHduIds, settings]) => {
        if (selectedHduIds) {
          this.wcsCalibrationForm.patchValue(
            {
              selectedHduIds: selectedHduIds,
            },
            { emitEvent: false }
          );
        }

        if (settings) {
          this.wcsCalibrationForm.patchValue(
            {
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
      });

    this.wcsCalibrationForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {

      this.store.dispatch(
        new UpdateWcsCalibrationPanelConfig({
          showOverlay: value.showOverlay
        })
      );

      if (this.wcsCalibrationForm.valid) {
        this.store.dispatch(new UpdateWcsCalibrationPanelState({ selectedHduIds: value.selectedHduIds }));
        this.store.dispatch(
          new UpdateWcsCalibrationPanelConfig({
            ra: value.ra,
            dec: value.dec,
            radius: value.radius,
            maxScale: value.maxScale,
            minScale: value.minScale,
            maxSources: value.maxSources
          })
        );
      }
    });


    // determine whether existing jobs have been loaded
    this.viewerId$.subscribe(viewerId => {
      let state = this.store.selectSnapshot(WorkbenchState.getWcsCalibrationPanelStateByViewerId(viewerId));

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
      switchMap((viewerId) => this.store.select(WorkbenchState.getWcsCalibrationPanelStateByViewerId(viewerId))),
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
    let config$ = this.store.select(WorkbenchState.getWcsCalibrationPanelConfig)
    let state$ = this.store.select(WorkbenchState.getWcsCalibrationPanelStateByViewerId(viewerId)).pipe(distinctUntilChanged());
    let layerId$ = this.store.select(WorkbenchState.getImageHduByViewerId(viewerId)).pipe(map(layer => layer?.id), distinctUntilChanged())
    // let layerId$ = this.imageHdu$.pipe(
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
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  getHduOptionLabel(layerId: string) {
    return this.store.select(DataFilesState.getHduById(layerId)).pipe(
      map((layer) => layer?.name),
      distinctUntilChanged()
    );
  }

  setSelectedHduIds(layerIds: string[]) {
    this.wcsCalibrationForm.controls.selectedHduIds.setValue(layerIds);
  }

  onSelectAllBtnClick() {
    this.setSelectedHduIds(this.layerIds);
  }

  onClearSelectionBtnClick() {
    this.setSelectedHduIds([]);
  }

  onShowOverlayChange($event: MatCheckboxChange) {
    this.store.dispatch(new UpdateWcsCalibrationPanelConfig({ showOverlay: $event.checked }))
  }

  onSubmitClick() {
    this.store.dispatch(new CreateWcsCalibrationJob(this.wcsCalibrationForm.controls.selectedHduIds.value));
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

    let wcsCalibrationSettings = this.store.selectSnapshot(WorkbenchState.getWcsCalibrationPanelConfig);
    this.store.dispatch(
      new UpdateWcsCalibrationPanelConfig({
        ...wcsCalibrationSettings,
        ...changes,
      })
    );
  }
}
