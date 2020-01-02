import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  OnInit,
  HostBinding,
  Input
} from "@angular/core";

import * as moment_ from "moment";
const moment = moment_;

import { MatCheckboxChange } from "@angular/material/checkbox";
import { MatDialog } from "@angular/material/dialog";
import { Select, Store as StoreNxgs, Store } from '@ngxs/store';
import { Observable, Subscription, combineLatest } from "rxjs";
import {
  map,
  filter,
  catchError,
  mergeMap,
  distinctUntilChanged
} from "rxjs/operators";

import * as jStat from "jstat";
import { saveAs } from "file-saver/dist/FileSaver";

import {
  ImageFile,
  getCenterTime
} from "../../../../data-files/models/data-file";
import { DmsPipe } from "../../../../pipes/dms.pipe";
import {
  SourceExtractorFileState,
  SourceExtractorRegionOption
} from "../../../models/source-extractor-file-state";
import { SourceExtractorModeOption } from "../../../models/source-extractor-mode-option";
import { PhotSettingsDialogComponent } from "../../../components/phot-settings-dialog/phot-settings-dialog.component";
import { SourceExtractionSettingsDialogComponent } from "../../../components/source-extraction-settings-dialog/source-extraction-settings-dialog.component";
import { Source, PosType } from "../../../models/source";
import { Region } from "../../../models/region";
import { ImageFileState } from "../../../models/image-file-state";
import {
  ViewerGridCanvasMouseEvent,
  ViewerGridMarkerMouseEvent
} from "../workbench-viewer-grid/workbench-viewer-grid.component";
import { WorkbenchTool, WorkbenchStateModel } from "../../../models/workbench-state";
import { DataSource } from "@angular/cdk/table";
import { CollectionViewer, SelectionModel } from "@angular/cdk/collections";
import { centroidPsf } from "../../../models/centroider";
import { CentroidSettings } from "../../../models/centroid-settings";
import { DataFileType } from "../../../../data-files/models/data-file-type";
import {
  PhotometryJob,
  PhotometryJobResult
} from "../../../../jobs/models/photometry";
import { JobType } from "../../../../jobs/models/job-types";
import { Astrometry } from "../../../../jobs/models/astrometry";
import { SourceId } from "../../../../jobs/models/source-id";
import { Papa } from "ngx-papaparse";
import { datetimeToJd, jdToMjd } from "../../../../utils/skynet-astro";
import { DecimalPipe, DatePipe } from "@angular/common";
import { Router } from "@angular/router";
import { MatButtonToggleChange } from '@angular/material';
import { CreateJob } from '../../../../jobs/jobs.actions';
import { SourcesState } from '../../../sources.state';
import { WorkbenchState } from '../../../workbench.state';
import { JobsState } from '../../../../jobs/jobs.state';
import { SetActiveTool, SetLastRouterPath, EnableMultiFileSelection, SetSourceExtractionMode, UpdatePhotSettings, UpdateCentroidSettings, UpdateSourceExtractionSettings, SetShowAllSources } from '../../../workbench.actions';
import { UpdateSourceExtractorFileState, ExtractSources, SetSourceLabel } from '../../../image-files.actions';
import { SelectSources, DeselectSources, SetSourceSelection, AddSources, RemoveSources, UpdateSource } from '../../../sources.actions';

export class SourcesDataSource implements DataSource<Source> {
  sources$: Observable<Source[]>;
  sources: Source[] = [];
  sub: Subscription;

  constructor(private store: Store) {
    this.sources$ = combineLatest(
      store.select(SourcesState.getSources),
      store.select(WorkbenchState.getActiveImageFile),
      store.select(WorkbenchState.getShowAllSources)
    ).pipe(
      map(([sources, activeFile, showAllSources]) => {
        if (!activeFile) return [];
        return sources.filter(source => {
          return source.fileId == activeFile.id || showAllSources;
        });
      })
    );
  }

  connect(collectionViewer: CollectionViewer): Observable<Source[]> {
    this.sub = this.sources$.subscribe(sources => {
      this.sources = sources;
    });

    return this.sources$;
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.sub.unsubscribe();
  }
}

@Component({
  selector: "app-source-extractor-page",
  templateUrl: "./source-extractor-page.component.html",
  styleUrls: ["./source-extractor-page.component.css"]
})
export class SourceExtractorPageComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @HostBinding("class") @Input("class") classList: string =
    "fx-workbench-outlet";
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<"file" | "viewer" | "tool">;
  selectedSourceActionError: string = null;
  selectedSources$: Observable<Source[]>;
  selectedSources: Array<Source> = [];
  activeImageFile$: Observable<ImageFile>;
  selectedImageFiles$: Observable<Array<ImageFile>>;
  activeImageFileState$: Observable<ImageFileState>;
  showAllSources$: Observable<boolean>;
  extractionJobRows$: Observable<
    Array<{ job: PhotometryJob; result: PhotometryJobResult }>
  >;

  showConfig$: Observable<boolean>;
  activeSourceExtractorFileState$: Observable<SourceExtractorFileState>;
  workbenchState$: Observable<WorkbenchStateModel>;
  centroidSettings$: Observable<CentroidSettings>;
  region$: Observable<Region> = null;
  filteredSources$: Observable<Source[]>;

  activeImageFile: ImageFile;
  selectedImageFiles: Array<ImageFile>;
  activeSourceExtractorFileState: SourceExtractorFileState;
  workbenchState: WorkbenchStateModel;
  SourceExtractorModeOption = SourceExtractorModeOption;
  SourceExtractorRegionOption = SourceExtractorRegionOption;
  subs: Subscription[] = [];
  pixelCoordView: string = "pixel";
  NUMBER_FORMAT: (v: any) => any = (v: number) => (v ? v : "N/A");
  DECIMAL_FORMAT: (v: any) => any = (v: number) => (v ? v.toFixed(2) : "N/A");
  SEXAGESIMAL_FORMAT: (v: any) => any = (v: number) =>
    v ? this.dmsPipe.transform(v) : "N/A";
  SourcePosType = PosType;

  dataSource: SourcesDataSource;
  selectionModel = new SelectionModel<string>(true, []);

  private regionOptions = [
    { label: "Entire Image", value: SourceExtractorRegionOption.ENTIRE_IMAGE },
    { label: "Current View", value: SourceExtractorRegionOption.VIEWPORT },
    {
      label: "Sonification Region",
      value: SourceExtractorRegionOption.SONIFIER_REGION
    }
  ];

  constructor(
    private store: Store,
    private storeNxgs: StoreNxgs,
    public dialog: MatDialog,
    private dmsPipe: DmsPipe,
    private papa: Papa,
    private decimalPipe: DecimalPipe,
    private datePipe: DatePipe,
    router: Router
  ) {
    this.fullScreenPanel$ = this.store.select(
      WorkbenchState.getFullScreenPanel
    );
    this.inFullScreenMode$ = this.store.select(
      WorkbenchState.getInFullScreenMode
    );
    this.dataSource = new SourcesDataSource(store);

    this.selectedSources$ = store.select(SourcesState.getSelectedSources);
    this.subs.push(
      this.selectedSources$.subscribe(
        sources => (this.selectedSources = sources)
      )
    );
    this.showAllSources$ = store.select(WorkbenchState.getShowAllSources);

    this.activeImageFile$ = store.select(WorkbenchState.getActiveImageFile);
    this.selectedImageFiles$ = store
      .select(WorkbenchState.getSelectedFiles)
      .pipe(
        map(
          files =>
            files.filter(file => file.type == DataFileType.IMAGE) as Array<
              ImageFile
            >
        )
      );

    this.activeImageFileState$ = store.select(
      WorkbenchState.getActiveImageFileState
    );
    this.workbenchState$ = store
      .select(WorkbenchState.getState)
      .pipe(filter(state => state != null));
    this.activeSourceExtractorFileState$ = this.activeImageFileState$.pipe(
      filter(state => state != null),
      map(state => state.sourceExtractor),
      filter(v => v != null)
    );
    this.showConfig$ = store.select(WorkbenchState.getShowConfig);
    this.centroidSettings$ = this.workbenchState$.pipe(
      map(state => state && state.centroidSettings)
    );

    this.extractionJobRows$ = combineLatest(
      store.select(JobsState.getJobs).pipe(
        map(
          rows =>
            rows.filter(row => row.job.type == JobType.Photometry) as Array<{
              job: PhotometryJob;
              result: PhotometryJobResult;
            }>
        )
      ),
      this.activeImageFile$
    ).pipe(
      map(([rows, activeImageFile]) =>
        activeImageFile
          ? rows
              .filter(row =>
                row.job.file_ids.includes(parseInt(activeImageFile.id))
              )
              .sort((a, b) => {
                if (a.job.id == b.job.id) return 0;
                return a.job.id > b.job.id ? -1 : 1;
              })
          : []
      )
    );

    this.region$ = this.activeSourceExtractorFileState$.pipe(
      distinctUntilChanged((a, b) => {
        return a && b && a.region == b.region;
      }),
      map(state => {
        if (!state) return null;
        return state.region;
      })
    );

    this.subs.push(
      this.activeImageFile$.subscribe(imageFile => {
        this.activeImageFile = imageFile;
      })
    );
    this.subs.push(
      this.selectedImageFiles$.subscribe(imageFiles => {
        this.selectedImageFiles = imageFiles;
      })
    );
    this.subs.push(
      this.activeSourceExtractorFileState$.subscribe(
        state => (this.activeSourceExtractorFileState = state)
      )
    );
    this.subs.push(
      this.workbenchState$.subscribe(state => (this.workbenchState = state))
    );

    this.subs.push(
      this.selectedSources$.subscribe(selectedSources => {
        this.selectionModel.clear();
        this.selectionModel.select(...selectedSources.map(source => source.id));
      })
    );

    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.SOURCE_EXTRACTOR)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    );
  }

  ngOnInit() {
    this.store.dispatch(new EnableMultiFileSelection());
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges() {}

  setModeOption($event: MatButtonToggleChange) {
    this.store.dispatch(
      new SetSourceExtractionMode($event.value)
    );
  }

  setRegionOption(value) {
    this.store.dispatch(
      new UpdateSourceExtractorFileState(this.activeImageFile.id, { regionOption: value })
    );
  }

  openPhotSettings() {
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: "600px",
      data: { ...this.workbenchState.photSettings }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(
          new UpdatePhotSettings(result.phot)
        );
        this.store.dispatch(
          new UpdateCentroidSettings(result.centroid)
        );
      }
    });
  }

  openSourceExtractionSettings() {
    let dialogRef = this.dialog.open(SourceExtractionSettingsDialogComponent, {
      width: "500px",
      data: { ...this.workbenchState.sourceExtractionSettings }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(
          new UpdateSourceExtractionSettings(result)
        );
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

  onShowAllSourcesChange($event: MatCheckboxChange) {
    this.store.dispatch(
      new SetShowAllSources($event.checked)
    );
  }

  // onSelectAllRows($event: ITdDataTableSelectAllEvent) {
  //   if ($event.selected) {
  //     this.selectSources($event.rows);
  //   } else {
  //     this.deselectSources($event.rows);
  //   }
  // }

  selectSources(sources: Source[]) {
    this.store.dispatch(new SelectSources(sources));
  }

  deselectSources(sources: Source[]) {
    this.store.dispatch(
      new DeselectSources(sources)
    );
  }

  toggleSource(source: Source) {
    if (this.selectionModel.isSelected(source.id)) {
      this.deselectSources([source]);
    } else {
      this.selectSources([source]);
    }
  }

  findSources() {
    this.store.dispatch(
      new ExtractSources(this.activeImageFile.id, this.workbenchState.sourceExtractionSettings)
    );
  }

  onMarkerClick($event: ViewerGridMarkerMouseEvent) {
    if ($event.mouseEvent.altKey) return;

    let source = this.dataSource.sources.find(
      source => $event.marker.data && source.id == $event.marker.data["id"]
    );
    if (!source) return;

    let sourceSelected = this.selectedSources.includes(source);
    // if(!sourceSelected) {
    //   // select the source
    //   this.selectSources($event.targetFile, [source]);
    // }
    // else {
    //   // deselect the source
    //   this.deselectSources($event.targetFile, [source]);
    // }
    if ($event.mouseEvent.ctrlKey) {
      if (!sourceSelected) {
        // select the source
        this.selectSources([source]);
      } else {
        // deselect the source
        this.deselectSources([source]);
      }
    } else {
      this.store.dispatch(
        new SetSourceSelection([source])
      );
    }
    $event.mouseEvent.stopImmediatePropagation();
    $event.mouseEvent.preventDefault();
  }

  onImageClick($event: ViewerGridCanvasMouseEvent) {
    if ($event.hitImage) {
      if (
        this.workbenchState.sourceExtractorModeOption ==
          SourceExtractorModeOption.MOUSE &&
        (this.selectedSources.length == 0 || $event.mouseEvent.altKey)
      ) {
        let primaryCoord = $event.imageX;
        let secondaryCoord = $event.imageY;
        let posType = PosType.PIXEL;

        let centroidClicks = true;
        if (centroidClicks) {
          let result = centroidPsf(
            this.activeImageFile,
            primaryCoord,
            secondaryCoord,
            this.workbenchState.centroidSettings.psfCentroiderSettings
          );
          primaryCoord = result.x;
          secondaryCoord = result.y;
        }
        if (this.activeImageFile.wcs.isValid()) {
          let wcs = this.activeImageFile.wcs;
          let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
          primaryCoord = raDec[0];
          secondaryCoord = raDec[1];
          posType = PosType.SKY;
        }

        let source: Source = {
          id: null,
          label: "",
          objectId: null,
          fileId: this.activeImageFile.id,
          primaryCoord: primaryCoord,
          secondaryCoord: secondaryCoord,
          posType: posType,
          pm: null,
          pmPosAngle: null,
          pmEpoch: getCenterTime(this.activeImageFile)
        };
        this.store.dispatch(
          new AddSources([source])
        );
      } else {
        this.store.dispatch(
          new SetSourceSelection([])
        );
      }
    }
  }

  removeSelectedSources() {
    this.store.dispatch(
      new RemoveSources(this.selectedSources)
    );
  }

  mergeSelectedSources() {
    this.selectedSourceActionError = null;
    if (
      !this.selectedSources.every(
        source => source.posType == this.selectedSources[0].posType
      )
    ) {
      this.selectedSourceActionError =
        "You cannot merge sources with different position types";
      return;
    }

    if (this.selectedSources.some(source => source.pmEpoch == null)) {
      this.selectedSourceActionError =
        "You can only merge sources which have epochs defined";
      return;
    }

    //verify unique epochs
    let sortedEpochs = this.selectedSources
      .map(source => source.pmEpoch)
      .sort();
    for (let i = 0; i < sortedEpochs.length - 1; i++) {
      if (sortedEpochs[i + 1] == sortedEpochs[i]) {
        this.selectedSourceActionError =
          "All source epochs must be unique when merging";
        return;
      }
    }

    let t0 = this.selectedSources[0].pmEpoch.getTime();
    let primaryCoord0 = this.selectedSources[0].primaryCoord;
    let secondaryCoord0 = this.selectedSources[0].secondaryCoord;
    let data = this.selectedSources.map(source => {
      let centerSecondaryCoord =
        (source.secondaryCoord + secondaryCoord0) / 2.0;
      return [
        (source.pmEpoch.getTime() - t0) / 1000.0,
        (source.primaryCoord - primaryCoord0) *
          (source.posType == PosType.PIXEL
            ? 1
            : 15 * 3600 * Math.cos((centerSecondaryCoord * Math.PI) / 180.0)),
        (source.secondaryCoord - secondaryCoord0) *
          (source.posType == PosType.PIXEL ? 1 : 3600)
      ];
    });

    let x = data.map(d => [1, d[0]]);
    let primaryY = data.map(d => d[1]);
    let secondaryY = data.map(d => d[2]);

    let primaryModel = jStat.models.ols(primaryY, x);
    let secondaryModel = jStat.models.ols(secondaryY, x);

    let primaryRate = primaryModel.coef[1];
    let secondaryRate = secondaryModel.coef[1];
    let positionAngle =
      (Math.atan2(primaryRate, secondaryRate) * 180.0) / Math.PI;
    positionAngle = positionAngle % 360;
    if (positionAngle < 0) positionAngle += 360;
    let rate = Math.sqrt(Math.pow(primaryRate, 2) + Math.pow(secondaryRate, 2));

    this.store.dispatch(
      new UpdateSource(this.selectedSources[0].id,{ pm: rate, pmPosAngle: positionAngle })
    );
    this.store.dispatch(
      new RemoveSources(this.selectedSources.slice(1))
    );

    // let primaryResult = regression.linear(primaryCoordData, { precision: 6 });
    // let secondaryResult = regression.linear(secondaryCoordData, { precision: 6 });

    // console.log(primaryResult, secondaryResult);

    // let file = this.referenceFiles[this.source.fileId] as ImageFile;
    //   let centerTime = getCenterTime(file);
    //   let referenceFile = this.referenceFiles[this.referenceSource.fileId] as ImageFile;
    //   let referenceCenterTime = getCenterTime(referenceFile);
    //   let deltaSecs = (referenceCenterTime.getTime() - centerTime.getTime())/1000.0;
    //   if (this.pixelCoordView == 'sky') {

    //     let centerDecDegs = (this.referenceSource.decDegs + this.source.decDegs) / 2;
    //     let deltaRaArcsecs = (this.referenceSource.raHours - this.source.raHours) * 15 * 3600 * Math.cos(centerDecDegs * Math.PI / 180.0);
    //     let deltaDecArcsecs = (this.referenceSource.decDegs - this.source.decDegs) * 3600;
    //     let positionAngleDegs = Math.atan2(deltaDecArcsecs, -deltaRaArcsecs) * 180.0 / Math.PI - 90;
    //     positionAngleDegs = positionAngleDegs % 360;
    //     if (positionAngleDegs < 0) positionAngleDegs += 360;

    //     let wcs = getWcs(file);
    //     let pixelPmPosAngle = positionAngleDegs+wcs.positionAngle()
    //     pixelPmPosAngle = pixelPmPosAngle % 360;
    //     if (pixelPmPosAngle < 0) pixelPmPosAngle += 360;

    //     console.log(wcs.positionAngle(), positionAngleDegs, pixelPmPosAngle);

    //     this.source = {
    //       ...this.source,
    //       skyPm: Math.sqrt(Math.pow(deltaRaArcsecs, 2) + Math.pow(deltaDecArcsecs, 2))/deltaSecs,
    //       skyPmPosAngle: positionAngleDegs,
    //       pixelPm: null,
    //       pixelPmPosAngle: pixelPmPosAngle
    //     }
    //   }
    //   else {
    //     let deltaX = (this.referenceSource.x - this.source.x);
    //     let deltaY = (this.referenceSource.y - this.source.y);
    //     let positionAngleDegs = Math.atan2(deltaY, -deltaX) * 180.0 / Math.PI - 90;
    //     console.log(deltaX, deltaY, positionAngleDegs);
    //     positionAngleDegs = positionAngleDegs % 360;
    //     if (positionAngleDegs < 0) positionAngleDegs += 360;
    //     console.log(positionAngleDegs);
    //     this.source = {
    //       ...this.source,
    //       pixelPm: Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2))/deltaSecs,
    //       pixelPmPosAngle: positionAngleDegs,
    //       skyPm: null,
    //       skyPmPosAngle: null
    //     }
    //   }
  }

  photometerSelectedSources() {
    let job: PhotometryJob = {
      type: JobType.Photometry,
      id: null,
      file_ids: this.selectedImageFiles.map(file => parseInt(file.id)),
      sources: this.selectedSources.map((source, index) => {
        let x = null;
        let y = null;
        let pmPixel = null;
        let pmPosAnglePixel = null;
        let raHours = null;
        let decDegs = null;
        let pmSky = null;
        let pmPosAngleSky = null;

        if (source.posType == PosType.PIXEL) {
          x = source.primaryCoord;
          y = source.secondaryCoord;
          pmPixel = source.pm;
          pmPosAnglePixel = source.pmPosAngle;
        } else {
          raHours = source.primaryCoord;
          decDegs = source.secondaryCoord;
          pmSky = source.pm;
          if (pmSky) pmSky /= 3600.0;
          pmPosAngleSky = source.pmPosAngle;
        }
        return {
          id: source.id,
          pm_epoch: source.pmEpoch ? source.pmEpoch.toISOString() : null,
          x: x,
          y: y,
          pm_pixel: pmPixel,
          pm_pos_angle_pixel: pmPosAnglePixel,
          ra_hours: raHours,
          dec_degs: decDegs,
          pm_sky: pmSky,
          pm_pos_angle_sky: pmPosAngleSky
        } as Astrometry & SourceId;
      }),
      settings: this.workbenchState.photSettings
    };

    this.storeNxgs.dispatch(new CreateJob(job, 1));
  }

  downloadPhotometry(row: { job: PhotometryJob; result: PhotometryJobResult }) {
    let data = this.papa.unparse(
      row.result.data
        .map(d => {
          let time = d.time
            ? moment.utc(d.time, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
            : null;
          let pmEpoch = d.pm_epoch
            ? moment.utc(d.pm_epoch, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
            : null;
          // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
          let jd = time
            ? datetimeToJd(
                time.getUTCFullYear(),
                time.getUTCMonth() + 1,
                time.getUTCDate(),
                time.getUTCHours(),
                time.getUTCMinutes(),
                time.getUTCSeconds()
              )
            : null;
          return {
            ...d,
            time: time
              ? this.datePipe.transform(time, "yyyy-MM-dd HH:mm:ss.SSS")
              : null,
            pm_epoch: pmEpoch
              ? this.datePipe.transform(pmEpoch, "yyyy-MM-dd HH:mm:ss.SSS")
              : null,
            jd: jd,
            mjd: jd ? jdToMjd(jd) : null
          };
        })
        // .sort((a, b) => (a.jd > b.jd ? 1 : -1))
    );
    var blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `afterglow_photometry_${row.job.id}.csv`);
  }

  setSourceProperMotion(source: Source) {
    // let dialogRef = this.dialog.open(ProperMotionDialogComponent, {
    //   width: '600px',
    //   data: { source: { ...source } }
    // });
    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     // this.store.dispatch(new sourceExtractorActions.UpdateSource({
    //     //   file: this.activeImageFile, sourceId: source.id, changes: {
    //     //     skyPm: result.skyPm,
    //     //     skyPmPosAngle: result.skyPmPosAngle,
    //     //     pixelPm: result.pixelPm,
    //     //     pixelPmPosAngle: result.pixelPmPosAngle
    //     //   }
    //     // }));
    //   }
    // });
  }

  showSelectAll() {
    return this.dataSource.sources && this.dataSource.sources.length != 0;
  }

  isAllSelected() {
    const numSelected = this.selectionModel.selected.length;
    const numRows = this.dataSource.sources.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.store.dispatch(
        new SetSourceSelection([])
      );
    } else {
      this.store.dispatch(
        new SetSourceSelection(this.dataSource.sources)
      );
    }
  }

  trackByFn(index: number, value: Source) {
    return value.id;
  }

  onSourceLabelChange($event, source: Source) {
    this.store.dispatch(
      new SetSourceLabel(this.activeImageFile.id, source, $event)
    );
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(
      new UpdateCentroidSettings({centroidClicks: $event.checked })
    );
  }
}
