import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  OnInit,
  HostBinding,
  Input,
  EventEmitter,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';

import * as moment from 'moment';

import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { Select, Store, Actions, ofActionSuccessful, ofAction } from '@ngxs/store';
import { Observable, Subscription, combineLatest, BehaviorSubject, of } from 'rxjs';
import {
  map,
  flatMap,
  tap,
  filter,
  catchError,
  mergeMap,
  distinctUntilChanged,
  withLatestFrom,
  switchMap,
  debounceTime,
  auditTime,
  distinct,
  takeUntil,
} from 'rxjs/operators';

import * as jStat from 'jstat';
import { saveAs } from 'file-saver/dist/FileSaver';

import { getCenterTime, getSourceCoordinates, DataFile, ImageHdu, Header } from '../../../data-files/models/data-file';
import { DmsPipe } from '../../../pipes/dms.pipe';
import { PhotometryPanelState } from '../../models/photometry-file-state';
import { PhotSettingsDialogComponent } from '../phot-settings-dialog/phot-settings-dialog.component';
import { SourceExtractionDialogComponent } from '../source-extraction-dialog/source-extraction-dialog.component';
import { Source, PosType } from '../../models/source';
import { PhotometryPanelConfig, BatchPhotometryFormData } from '../../models/workbench-state';
import { SelectionModel } from '@angular/cdk/collections';
import { CentroidSettings } from '../../models/centroid-settings';
import { PhotometryJob, PhotometryJobResult, PhotometryData } from '../../../jobs/models/photometry';
import { Router } from '@angular/router';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { WorkbenchState } from '../../workbench.state';
import {
  UpdatePhotometryPanelConfig,
  ExtractSources,
  PhotometerSources,
  RemovePhotDatas,
  RemoveAllPhotDatas,
  StartPhotometrySourceSelectionRegion,
  UpdatePhotometrySourceSelectionRegion,
  EndPhotometrySourceSelectionRegion,
  UpdatePhotometrySettings,
  UpdateSourceExtractionSettings,
} from '../../workbench.actions';
import { AddSources, RemoveSources, UpdateSource } from '../../sources.actions';
import { PhotData } from '../../models/source-phot-data';
import { PhotometrySettings } from '../../models/photometry-settings';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Papa } from 'ngx-papaparse';
import { datetimeToJd, jdToMjd } from '../../../utils/skynet-astro';
import { DatePipe } from '@angular/common';
import { SourceExtractionSettings } from '../../models/source-extraction-settings';
import { JobsState } from '../../../jobs/jobs.state';
import { DataFilesState } from '../../../data-files/data-files.state';
import * as snakeCaseKeys from 'snakecase-keys';
import { Viewer } from '../../models/viewer';
import { ToolPanelBaseComponent } from '../tool-panel-base/tool-panel-base.component';
import { HduType } from '../../../data-files/models/data-file-type';
import { WorkbenchImageHduState } from '../../models/workbench-file-state';
import { SourcesState } from '../../sources.state';
import { centroidPsf } from '../../models/centroider';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-photometry-panel',
  templateUrl: './photometry-panel.component.html',
  styleUrls: ['./photometry-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotometryPageComponent
  extends ToolPanelBaseComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @Input('hduIds')
  set hduIds(hduIds: string[]) {
    this.hduIds$.next(hduIds);
  }
  get hduIds() {
    return this.hduIds$.getValue();
  }
  private hduIds$ = new BehaviorSubject<string[]>(null);

  sources$: Observable<Source[]>;
  state$: Observable<PhotometryPanelState>;
  config$: Observable<PhotometryPanelConfig>;
  photometrySettings$: Observable<PhotometrySettings>;
  centroidSettings$: Observable<CentroidSettings>;
  sourceExtractionSettings$: Observable<SourceExtractionSettings>;

  NUMBER_FORMAT: (v: any) => any = (v: number) => (v ? v : 'N/A');
  DECIMAL_FORMAT: (v: any) => any = (v: number) => (v ? v.toFixed(2) : 'N/A');
  SEXAGESIMAL_FORMAT: (v: any) => any = (v: number) => (v ? this.dmsPipe.transform(v) : 'N/A');
  SourcePosType = PosType;
  tableData$: Observable<{ source: Source; data: PhotometryData }[]>;
  batchPhotJob$: Observable<PhotometryJob>;
  batchFormDataSub: Subscription;
  photometryUpdater: Subscription;
  mergeError: string;
  sourceSelectionUpdater: Subscription;
  selectionModel = new SelectionModel<string>(true, []);

  batchPhotForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
  });
  batchPhotFormData$: Observable<BatchPhotometryFormData>;

  constructor(
    private dialog: MatDialog,
    private dmsPipe: DmsPipe,
    private datePipe: DatePipe,
    private papa: Papa,
    store: Store
  ) {
    super(store);

    this.config$ = this.store.select(WorkbenchState.getPhotometryPanelConfig);
    this.state$ = this.hduState$.pipe(
      map((hduState) => {
        if (hduState && hduState.hduType != HduType.IMAGE) {
          // only image HDUs support sonification
          return null;
        }
        return (hduState as WorkbenchImageHduState)?.photometryPanelStateId;
      }),
      distinctUntilChanged(),
      switchMap((id) => this.store.select(WorkbenchState.getPhotometryPanelStateById).pipe(map((fn) => fn(id))))
    );

    this.sources$ = combineLatest(
      this.store.select(SourcesState.getSources),
      this.config$.pipe(
        map((config) => config.coordMode),
        distinctUntilChanged()
      ),
      this.config$.pipe(
        map((config) => config.showSourcesFromAllFiles),
        distinctUntilChanged()
      ),
      this.hduId$,
      this.header$
    ).pipe(
      filter(([sources, coordMode, showSourcesFromAllFiles, hduId, header]) => header != null),
      map(([sources, coordMode, showSourcesFromAllFiles, hduId, header]) => {
        if (!header) return [];
        if (!header.wcs || !header.wcs.isValid()) coordMode = 'pixel';
        return sources.filter((source) => {
          if (coordMode != source.posType) return false;
          if (source.hduId == hduId) return true;
          if (!showSourcesFromAllFiles) return false;
          let coord = getSourceCoordinates(header, source);
          if (coord == null) return false;
          return true;
        });
      })
    );

    this.photometrySettings$ = this.store.select(WorkbenchState.getPhotometrySettings);
    this.centroidSettings$ = this.store.select(WorkbenchState.getCentroidSettings);
    this.sourceExtractionSettings$ = this.store.select(WorkbenchState.getSourceExtractionSettings);

    this.tableData$ = combineLatest(
      this.sources$,
      this.state$.pipe(
        map((state) => (state ? state.sourcePhotometryData : null)),
        distinctUntilChanged()
      )
    ).pipe(
      filter(([sources, sourcePhotometryData]) => {
        if (sources && sourcePhotometryData) return true;
        return false;
      }),
      map(([sources, sourcePhotometryData]) => {
        return sources.map((source) => {
          return {
            source: source,
            data: source.id in sourcePhotometryData ? sourcePhotometryData[source.id] : null,
          };
        });
      })
    );
    this.batchPhotJob$ = combineLatest([
      this.store.select(JobsState.getJobEntities),
      this.config$.pipe(
        map((s) => s.batchPhotJobId),
        distinctUntilChanged()
      ),
    ]).pipe(
      map(([jobEntities, jobId]) => jobEntities[jobId] as PhotometryJob),
      filter((job) => job != null && job != undefined)
    );

    this.batchPhotFormData$ = this.config$.pipe(
      filter((config) => config !== null),
      map((config) => config.batchPhotFormData),
      distinctUntilChanged(),
      tap((data) => {
        this.batchPhotForm.patchValue(data, { emitEvent: false });
      })
    );

    this.batchFormDataSub = this.batchPhotFormData$.subscribe();
    this.batchPhotForm.valueChanges.subscribe((value) => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(
        new UpdatePhotometryPanelConfig({
          batchPhotFormData: this.batchPhotForm.value,
        })
      );
      // }
    });

    this.sourceSelectionUpdater = combineLatest(this.sources$, this.config$)
      .pipe(
        filter(([sources, config]) => sources !== null && config !== null),
        map(([sources, config]) => sources.filter((s) => config.selectedSourceIds.includes(s.id)).map((s) => s.id))
      )
      .subscribe((selectedSourceIds) => {
        this.selectionModel.clear();
        this.selectionModel.select(...selectedSourceIds);
      });

    this.photometryUpdater = this.tableData$
      .pipe(
        map((rows) => rows.filter((row) => row.data == null)),
        withLatestFrom(this.imageHdu$, this.config$, this.photometrySettings$),
        filter(([rows, imageHdu, config]) => rows.length != 0 && imageHdu && config && config.autoPhot),
        auditTime(2000)
      )
      .subscribe(([rows, imageHdu, config, photometrySettings]) => {
        this.store.dispatch(
          new PhotometerSources(
            rows.map((row) => row.source.id),
            [imageHdu.id],
            photometrySettings,
            false
          )
        );
      });

    this.imageClickEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$, this.config$, this.header$, this.rawImageData$))
      .subscribe(([$event, state, config, header, imageData]) => {
        if (!$event || !imageData) {
          return;
        }

        let selectedSourceIds = config.selectedSourceIds;
        let centroidClicks = config.centroidClicks;
        let centroidSettings = this.store.selectSnapshot(WorkbenchState.getCentroidSettings);

        if ($event.hitImage) {
          if (selectedSourceIds.length == 0 || $event.mouseEvent.altKey) {
            let primaryCoord = $event.imageX;
            let secondaryCoord = $event.imageY;
            let posType = PosType.PIXEL;
            if (centroidClicks) {
              let result = centroidPsf(imageData, primaryCoord, secondaryCoord, centroidSettings.psfCentroiderSettings);
              primaryCoord = result.x;
              secondaryCoord = result.y;
            }
            if (config.coordMode == 'sky' && header?.wcs?.isValid()) {
              let wcs = header.wcs;
              let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
              primaryCoord = raDec[0];
              secondaryCoord = raDec[1];
              posType = PosType.SKY;
            }

            let centerEpoch = getCenterTime(header);

            let source: Source = {
              id: null,
              label: null,
              objectId: null,
              hduId: this.viewer.hduId,
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
              pm: null,
              pmPosAngle: null,
              pmEpoch: centerEpoch ? centerEpoch.toISOString() : null,
            };
            this.store.dispatch(new AddSources([source]));
          } else if (!$event.mouseEvent.ctrlKey) {
            this.store.dispatch(
              new UpdatePhotometryPanelConfig({
                selectedSourceIds: [],
              })
            );
          }
        }
      });

    this.imageMouseDragStartEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$, this.config$, this.header$, this.rawImageData$))
      .subscribe(([$event, state, config, header, imageData]) => {
        if (!$event) {
          return;
        }
        if (!$event.$mouseDownEvent.ctrlKey && !$event.$mouseDownEvent.metaKey && !$event.$mouseDownEvent.shiftKey)
          return;
        if (this.viewer.hduId == null) return;

        this.store.dispatch(new StartPhotometrySourceSelectionRegion(this.viewer.hduId, $event.imageStart));
      });

    this.imageMouseDragEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$, this.config$, this.header$, this.rawImageData$))
      .subscribe(([$event, state, config, header, imageData]) => {
        if (!$event) {
          return;
        }
        if (!$event.$mouseDownEvent.ctrlKey && !$event.$mouseDownEvent.metaKey && !$event.$mouseDownEvent.shiftKey)
          return;
        if (this.viewer.hduId == null) return;

        this.store.dispatch(new UpdatePhotometrySourceSelectionRegion(this.viewer.hduId, $event.imageEnd));
      });

    this.imageMouseDragEndEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$, this.config$, this.header$, this.rawImageData$))
      .subscribe(([$event, state, config, header, imageData]) => {
        if (!$event) {
          return;
        }
        if (!$event.$mouseDownEvent.ctrlKey && !$event.$mouseDownEvent.metaKey && !$event.$mouseDownEvent.shiftKey)
          return;
        if (this.viewer.hduId == null) return;

        this.store.dispatch(
          new EndPhotometrySourceSelectionRegion(this.viewer.hduId, $event.$mouseUpEvent.shiftKey ? 'remove' : 'append')
        );
      });

    this.markerClickEvent$.pipe(takeUntil(this.destroy$)).subscribe(($event) => {
      if (!$event) {
        return;
      }
      if ($event.mouseEvent.altKey) return;
      let sources = this.store.selectSnapshot(SourcesState.getSources);
      let source = sources.find(
        (source) => $event.marker.data && $event.marker.data.source && source.id == $event.marker.data.source.id
      );
      if (!source) return;

      let photometryPanelConfig = this.store.selectSnapshot(WorkbenchState.getPhotometryPanelConfig);
      let sourceSelected = photometryPanelConfig.selectedSourceIds.includes(source.id);
      if ($event.mouseEvent.ctrlKey) {
        if (!sourceSelected) {
          // select the source
          this.store.dispatch(
            new UpdatePhotometryPanelConfig({
              selectedSourceIds: [...photometryPanelConfig.selectedSourceIds, source.id],
            })
          );
        } else {
          // deselect the source
          let selectedSourceIds = photometryPanelConfig.selectedSourceIds.filter((id) => id != source.id);
          this.store.dispatch(
            new UpdatePhotometryPanelConfig({
              selectedSourceIds: selectedSourceIds,
            })
          );
        }
      } else {
        this.store.dispatch(
          new UpdatePhotometryPanelConfig({
            selectedSourceIds: [source.id],
          })
        );
      }
      $event.mouseEvent.stopImmediatePropagation();
      $event.mouseEvent.preventDefault();
    });
  }

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.batchFormDataSub.unsubscribe();
    this.sourceSelectionUpdater.unsubscribe();
    this.photometryUpdater.unsubscribe();
  }

  ngOnChanges() {}

  getHduOptionLabel(hduId: string) {
    return this.store.select(DataFilesState.getHduById).pipe(
      map((fn) => fn(hduId)?.name),
      distinctUntilChanged()
    );
  }

  selectSources(sources: Source[]) {
    let selectedSourceIds = this.store.selectSnapshot(WorkbenchState.getPhotometryPanelConfig).selectedSourceIds;

    this.store.dispatch(
      new UpdatePhotometryPanelConfig({
        selectedSourceIds: [
          ...selectedSourceIds,
          ...sources.filter((s) => !selectedSourceIds.includes(s.id)).map((s) => s.id),
        ],
      })
    );
  }

  deselectSources(sources: Source[]) {
    let idsToRemove = sources.map((s) => s.id);
    let selectedSourceIds = this.store
      .selectSnapshot(WorkbenchState.getPhotometryPanelConfig)
      .selectedSourceIds.filter((id) => !idsToRemove.includes(id));

    this.store.dispatch(
      new UpdatePhotometryPanelConfig({
        selectedSourceIds: selectedSourceIds,
      })
    );
  }

  toggleSource(source: Source) {
    if (this.selectionModel.isSelected(source.id)) {
      this.deselectSources([source]);
    } else {
      this.selectSources([source]);
    }
  }

  removeSelectedSources(sources: Source[], config: PhotometryPanelConfig) {
    let selectedSourceIds = config.selectedSourceIds;
    this.store.dispatch(new RemoveSources(selectedSourceIds));
  }

  removeSources(sources: Source[]) {
    this.store.dispatch(new RemoveSources(sources.map((s) => s.id)));
  }

  mergeSelectedSources(sources: Source[], config: PhotometryPanelConfig) {
    let selectedSourceIds = config.selectedSourceIds;
    let selectedSources = sources.filter((s) => selectedSourceIds.includes(s.id));
    this.mergeError = null;
    if (!selectedSources.every((source) => source.posType == selectedSources[0].posType)) {
      this.mergeError = 'You cannot merge sources with different position types';
      return;
    }
    if (selectedSources.some((source) => source.pmEpoch == null)) {
      this.mergeError = 'You can only merge sources which have epochs defined';
      return;
    }
    //verify unique epochs
    let sortedEpochs = selectedSources.map((source) => new Date(source.pmEpoch)).sort();
    for (let i = 0; i < sortedEpochs.length - 1; i++) {
      if (sortedEpochs[i + 1] == sortedEpochs[i]) {
        this.mergeError = 'All source epochs must be unique when merging';
        return;
      }
    }
    let t0 = new Date(selectedSources[0].pmEpoch).getTime();
    let primaryCoord0 = selectedSources[0].primaryCoord;
    let secondaryCoord0 = selectedSources[0].secondaryCoord;
    let data = selectedSources.map((source) => {
      let centerSecondaryCoord = (source.secondaryCoord + secondaryCoord0) / 2.0;
      return [
        (new Date(source.pmEpoch).getTime() - t0) / 1000.0,
        (source.primaryCoord - primaryCoord0) *
          (source.posType == PosType.PIXEL ? 1 : 15 * 3600 * Math.cos((centerSecondaryCoord * Math.PI) / 180.0)),
        (source.secondaryCoord - secondaryCoord0) * (source.posType == PosType.PIXEL ? 1 : 3600),
      ];
    });
    let x = data.map((d) => [1, d[0]]);
    let primaryY = data.map((d) => d[1]);
    let secondaryY = data.map((d) => d[2]);
    let primaryModel = jStat.models.ols(primaryY, x);
    let secondaryModel = jStat.models.ols(secondaryY, x);
    let primaryRate = primaryModel.coef[1];
    let secondaryRate = secondaryModel.coef[1];
    let positionAngle = (Math.atan2(primaryRate, secondaryRate) * 180.0) / Math.PI;
    positionAngle = positionAngle % 360;
    if (positionAngle < 0) positionAngle += 360;
    let rate = Math.sqrt(Math.pow(primaryRate, 2) + Math.pow(secondaryRate, 2));
    this.store.dispatch([
      new UpdateSource(selectedSources[0].id, {
        pm: rate,
        pmPosAngle: positionAngle,
      }),
      new RemoveSources(selectedSources.slice(1).map((s) => s.id)),
      new RemovePhotDatas(selectedSources[0].id),
    ]);
  }

  photometerSources(imageFile: ImageHdu, sources: Source[]) {
    let photometrySettings = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);

    this.store.dispatch(new RemoveAllPhotDatas());
    this.store.dispatch(
      new PhotometerSources(
        sources.map((s) => s.id),
        [imageFile.id],
        photometrySettings,
        false
      )
    );
  }

  showSelectAll(sources: Source[]) {
    return sources && sources.length != 0;
  }

  isAllSelected(sources: Source[]) {
    const numSelected = this.selectionModel.selected.length;
    const numRows = sources.length;
    return numSelected === numRows;
  }

  exportSourceData(rows: Array<{ source: Source; data: PhotometryData }>) {
    let data = this.papa.unparse(
      rows.map((row) => {
        let time = row.data.time ? moment.utc(row.data.time, 'YYYY-MM-DD HH:mm:ss.SSS').toDate() : null;
        let pmEpoch = row.source.pmEpoch ? moment.utc(row.source.pmEpoch, 'YYYY-MM-DD HH:mm:ss.SSS').toDate() : null;
        // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
        let jd = time ? datetimeToJd(time) : null;
        return {
          ...row.source,
          ...row.data,
          time: time ? this.datePipe.transform(time, 'yyyy-MM-dd HH:mm:ss.SSS') : null,
          pm_epoch: pmEpoch ? this.datePipe.transform(pmEpoch, 'yyyy-MM-dd HH:mm:ss.SSS') : null,
          jd: jd,
          mjd: jd ? jdToMjd(jd) : null,
        };
      })
      // .sort((a, b) => (a.jd > b.jd ? 1 : -1))
    );
    var blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `afterglow_sources.csv`);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(sources: Source[]) {
    if (this.isAllSelected(sources)) {
      this.store.dispatch(
        new UpdatePhotometryPanelConfig({
          selectedSourceIds: [],
        })
      );
    } else {
      this.store.dispatch(
        new UpdatePhotometryPanelConfig({
          selectedSourceIds: sources.map((s) => s.id),
        })
      );
    }
  }

  trackByFn(index: number, value: Source) {
    return value.id;
  }

  onAutoPhotChange($event) {
    this.store.dispatch(
      new UpdatePhotometryPanelConfig({
        autoPhot: $event.checked,
      })
    );
  }

  clearPhotDataFromAllFiles() {
    this.store.dispatch(new RemoveAllPhotDatas());
  }

  selectHdus(hduIds: string[]) {
    this.store.dispatch(
      new UpdatePhotometryPanelConfig({
        batchPhotFormData: {
          ...this.batchPhotForm.value,
          selectedHduIds: hduIds,
        },
      })
    );
  }

  batchPhotometer(sources: Source[], config: PhotometryPanelConfig) {
    let photometrySettings = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);
    this.store.dispatch(
      new PhotometerSources(
        sources.map((s) => s.id),
        config.batchPhotFormData.selectedHduIds,
        photometrySettings,
        true
      )
    );
  }

  downloadBatchPhotData(result: PhotometryJobResult) {
    let data = this.papa.unparse(
      snakeCaseKeys(
        result.data.map((d) => {
          let time = d.time ? moment.utc(d.time, 'YYYY-MM-DD HH:mm:ss.SSS').toDate() : null;
          let pmEpoch = d.pmEpoch ? moment.utc(d.pmEpoch, 'YYYY-MM-DD HH:mm:ss.SSS').toDate() : null;
          // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
          let jd = time ? datetimeToJd(time) : null;
          return {
            ...d,
            time: time ? this.datePipe.transform(time, 'yyyy-MM-dd HH:mm:ss.SSS') : null,
            pmEpoch: pmEpoch ? this.datePipe.transform(pmEpoch, 'yyyy-MM-dd HH:mm:ss.SSS') : null,
            jd: jd,
            mjd: jd ? jdToMjd(jd) : null,
          };
        })
      ),
      {
        columns: [
          'file_id',
          'id',
          'time',
          'jd',
          'mjd',
          'ra_hours',
          'dec_degs',
          'x',
          'y',
          'telescope',
          'filter',
          'exp_length',
          'mag',
          'mag_error',
          'flux',
          'flux_error',
          'pm_sky',
          'pm_epoch',
          'pm_pos_angle_sky',
        ],
      }
      // .sort((a, b) => (a.jd > b.jd ? 1 : -1))
    );
    var blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `afterglow_photometry.csv`);

    // let sources = this.store.selectSnapshot(SourcesState.getEntities);
    // let data = this.store.selectSnapshot(PhotDataState.getSourcesPhotData).map(d => {
    //   return {
    //     ...sources[d.sourceId],
    //     ...d
    //   }
    // });
    // let blob = new Blob([this.papa.unparse(data)], { type: "text/plain;charset=utf-8" });
    // saveAs(blob, `afterglow_photometry.csv`);
  }

  openSourceExtractionDialog() {
    let sourceExtractionSettings = this.store.selectSnapshot(WorkbenchState.getSourceExtractionSettings);
    let dialogRef = this.dialog.open(SourceExtractionDialogComponent, {
      width: '500px',
      data: { ...sourceExtractionSettings },
    });

    dialogRef
      .afterClosed()
      .pipe(withLatestFrom(this.imageHdu$, this.viewportSize$))
      .subscribe(([result, imageHdu, viewportSize]) => {
        if (result) {
          this.store.dispatch([
            new UpdateSourceExtractionSettings(result),
            new ExtractSources(imageHdu.id, viewportSize, result),
          ]);
        }
      });
  }

  openPhotometrySettingsDialog() {
    let photometrySettings = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: '700px',
      data: { ...photometrySettings },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.store.dispatch(new UpdatePhotometrySettings(result));
        this.store.dispatch(new RemoveAllPhotDatas());
      }
    });
  }

  // onSelectedRowChanges($event: ITdDataTableSelectEvent) {
  //   if ($event.selected) {
  //     this.selectSources([$event.row]);
  //   } else {
  //     this.deselectSources([$event.row]);
  //   }
  // }

  onCoordModeChange($event: MatButtonToggleChange) {
    this.store.dispatch(new UpdatePhotometryPanelConfig({ coordMode: $event.value }));
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(new UpdatePhotometryPanelConfig({ centroidClicks: $event.checked }));
  }

  onShowSourcesFromAllFilesChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdatePhotometryPanelConfig({ showSourcesFromAllFiles: $event.checked }));
  }

  onShowSourceLabelsChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdatePhotometryPanelConfig({ showSourceLabels: $event.checked }));
  }
}
