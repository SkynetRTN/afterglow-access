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
import { Select, Store, Actions, ofActionSuccessful, ofAction } from '@ngxs/store';
import { Observable, Subscription, combineLatest } from "rxjs";
import {
  map,
  flatMap,
  tap,
  filter,
  catchError,
  mergeMap,
  distinctUntilChanged,
  withLatestFrom,
  switchMap
} from "rxjs/operators";

import * as jStat from "jstat";
import { saveAs } from "file-saver/dist/FileSaver";

import {
  ImageFile,
  getCenterTime,
  getSourceCoordinates
} from "../../../../data-files/models/data-file";
import { DmsPipe } from "../../../../pipes/dms.pipe";
import {
  PhotometryFileState,
} from "../../../models/photometry-file-state";
import { PhotSettingsDialogComponent } from "../../../components/phot-settings-dialog/phot-settings-dialog.component";
import { SourceExtractionDialogComponent } from "../../../components/source-extraction-dialog/source-extraction-dialog.component";
import { Source, PosType } from "../../../models/source";
import { ImageFileState } from "../../../models/image-file-state";
import {
  ViewerGridCanvasMouseEvent,
  ViewerGridMarkerMouseEvent
} from "../workbench-viewer-grid/workbench-viewer-grid.component";
import { WorkbenchTool, WorkbenchStateModel, PhotometryPageSettings, BatchPhotometryFormData } from "../../../models/workbench-state";
import { DataSource } from "@angular/cdk/table";
import { CollectionViewer, SelectionModel } from "@angular/cdk/collections";
import { centroidPsf } from "../../../models/centroider";
import { CentroidSettings } from "../../../models/centroid-settings";
import {
  PhotometryJob,
  PhotometryJobResult,
  PhotometryJobSettings
} from "../../../../jobs/models/photometry";
import { Router } from "@angular/router";
import { MatButtonToggleChange } from '@angular/material';
import { SourcesState } from '../../../sources.state';
import { WorkbenchState } from '../../../workbench.state';
import { SetActiveTool, SetLastRouterPath, UpdateSourceExtractionSettings, UpdatePhotometrySettings, UpdatePhotometryPageSettings, ExtractSources, PhotometerSources, SetViewerFile, SetViewerMarkers, ClearViewerMarkers } from '../../../workbench.actions';
import { AddSources, RemoveSources, UpdateSource } from '../../../sources.actions';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { RemoveAllPhotDatas, RemovePhotDatas } from '../../../phot-data.actions';
import { PhotDataState } from '../../../phot-data.state.';
import { PhotData } from '../../../models/source-phot-data';
import { PhotometrySettings } from '../../../models/photometry-settings';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Papa } from 'ngx-papaparse';
import { WorkbenchPageBaseComponent } from '../workbench-page-base/workbench-page-base.component';
import { Viewer } from '../../../models/viewer';
import { Marker, CircleMarker, TeardropMarker, MarkerType } from '../../../models/marker';
import { LoadDataFileHdr } from '../../../../data-files/data-files.actions';
import { JobEntity, JobsState } from '../../../../jobs/jobs.state';
import { datetimeToJd, jdToMjd } from '../../../../../app/utils/skynet-astro';
import { DatePipe } from '@angular/common';

export class SourcesDataSource implements DataSource<{ source: Source, photData: PhotData }> {
  rows$: Observable<{ source: Source, photData: PhotData }[]>;
  rows: { source: Source, photData: PhotData }[] = [];
  sources: Source[] = [];
  sub: Subscription;

  count = 0;

  public visibleSources$: Observable<Source[]>;


  constructor(private store: Store) {
    let activeImageFileId$ = store.select(WorkbenchState.getActiveImageFile).pipe(
      filter(f => f != null && f.headerLoaded),
      map(f => f.id),
      distinctUntilChanged()
    );
    let showSourcesFromAllFiles$ = store.select(WorkbenchState.getPhotometryPageSettings).pipe(
      map(s => s.showSourcesFromAllFiles),
      distinctUntilChanged()
    );

    let coordMode$ = store.select(WorkbenchState.getPhotometryPageSettings).pipe(
      map(s => s.coordMode),
      distinctUntilChanged()
    );
    this.visibleSources$ = combineLatest(activeImageFileId$, showSourcesFromAllFiles$, coordMode$, this.store.select(SourcesState.getSources)).pipe(
      withLatestFrom(store.select(DataFilesState.getEntities)),
      map(([[fileId, showSourcesFromAllFiles, coordMode, sources], dataFiles]) => {
        if (!dataFiles[fileId].wcs.isValid()) coordMode = 'pixel';
        return sources.filter(source => {
          if (coordMode != source.posType) return false;
          if (source.fileId == fileId) return true;
          if (!showSourcesFromAllFiles) return false;
          let coord = getSourceCoordinates(dataFiles[fileId], source);
          if (coord == null) return false;
          return true;
        })
      }),
    );
    this.rows$ = combineLatest(
      this.visibleSources$,
      this.store.select(PhotDataState.getSourcesPhotData),
      activeImageFileId$
    ).pipe(
      map(([sources, photDatas, fileId]) => {
        return sources.map(source => {
          return {
            source: source,
            photData: photDatas.find(d => d.sourceId == source.id && d.fileId == fileId)
          }
        })
      }),
    );
  }

  connect(collectionViewer: CollectionViewer) {
    this.sub = this.rows$.subscribe(rows => {
      this.rows = rows;
      this.sources = rows.map(row => row.source);
    });

    return this.rows$;
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.sub.unsubscribe();
  }
}

@Component({
  selector: "app-photometry-page",
  templateUrl: "./photometry-page.component.html",
  styleUrls: ["./photometry-page.component.css"]
})
export class PhotometryPageComponent extends WorkbenchPageBaseComponent
  implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @HostBinding("class") @Input("class") classList: string =
    "fx-workbench-outlet";

  NUMBER_FORMAT: (v: any) => any = (v: number) => (v ? v : "N/A");
  DECIMAL_FORMAT: (v: any) => any = (v: number) => (v ? v.toFixed(2) : "N/A");
  SEXAGESIMAL_FORMAT: (v: any) => any = (v: number) =>
    v ? this.dmsPipe.transform(v) : "N/A";
  SourcePosType = PosType;
  markerUpdater: Subscription;
  photometryPageSettings$: Observable<PhotometryPageSettings>;
  batchPhotJobEntity$: Observable<JobEntity>;
  batchPhotJob$: Observable<PhotometryJob>;
  batchPhotJobResult$: Observable<PhotometryJobResult>;
  photometrySettings$: Observable<PhotometrySettings>;
  selectedSourceIds$: Observable<string[]>;
  showAllSources$: Observable<boolean>;
  showSourceLabels$: Observable<boolean>;
  mergeError: string;

  photometryFileState$: Observable<PhotometryFileState>;
  centroidSettings$: Observable<CentroidSettings>;

  dataSource: SourcesDataSource;
  selectionModel = new SelectionModel<string>(true, []);

  photUpdater: Subscription;

  batchPhotForm = new FormGroup({
    selectedImageFileIds: new FormControl([], Validators.required),
  });
  batchPhotFormData$: Observable<BatchPhotometryFormData>;
  selectedImageFiles$: Observable<ImageFile[]>;

  constructor(
    private dialog: MatDialog,
    private dmsPipe: DmsPipe,
    private datePipe: DatePipe,
    private papa: Papa,
    private actions$: Actions,
    store: Store,
    router: Router,

  ) {
    super(store, router);

    this.photometryPageSettings$ = store.select(WorkbenchState.getPhotometryPageSettings);
    this.batchPhotJobEntity$ = this.photometryPageSettings$.pipe(
      map(s => s.batchPhotJobId),
      withLatestFrom(this.store.select(JobsState.getEntities)),
      map(([jobId, jobEntities]) => jobEntities[jobId]),
      filter(job => job != null && job != undefined),
      tap((job) => console.log('batch phot job', job))
    );

    this.batchPhotJob$ = this.batchPhotJobEntity$.pipe(
      map( entity => entity.job as PhotometryJob)
    )

    this.batchPhotJobResult$ = this.batchPhotJobEntity$.pipe(
      map( entity => entity.result as PhotometryJobResult)
    )

    //TODO:  Move page settings to different states and add selectors
    //photometry page settings changes when progress is updated
    this.markerUpdater = combineLatest(
      this.viewerFileIds$,
      this.viewerImageFileHeaders$,
      this.store.select(SourcesState.getSources),
      this.store.select(WorkbenchState.getPhotometryPageSettings)
    ).pipe(
      withLatestFrom(
        this.store.select(WorkbenchState.getViewers),
        this.store.select(DataFilesState.getEntities)
      )
    ).subscribe(([[viewerFileIds, viewerImageFileHeaders, sources, photPageSettings], viewers, dataFiles]) => {
      let selectedSourceIds = photPageSettings.selectedSourceIds;
      let coordMode = photPageSettings.coordMode;
      let showSourcesFromAllFiles = photPageSettings.showSourcesFromAllFiles;
      let showSourceLabels = photPageSettings.showSourceLabels;

      viewers.forEach((viewer) => {
        let fileId = viewer.fileId;
        if (fileId == null || !dataFiles[fileId]) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }
        let file = dataFiles[fileId] as ImageFile;
        if (!file.headerLoaded) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }

        let markers: Array<CircleMarker | TeardropMarker> = [];
        let mode = coordMode;
        if (!file.wcs.isValid()) mode = 'pixel';

        sources.forEach(source => {
          if (source.fileId != fileId && !showSourcesFromAllFiles) return;
          if (source.posType != mode) return;
          let selected = selectedSourceIds.includes(source.id);
          let coord = getSourceCoordinates(file, source);

          if (coord == null) {
            return false;
          }

          if (source.pm) {
            markers.push({
              type: MarkerType.TEARDROP,
              x: coord.x,
              y: coord.y,
              radius: 15,
              labelGap: 14,
              labelTheta: 0,
              label: showSourceLabels ? source.label : "",
              theta: coord.theta,
              selected: selected,
              data: { id: source.id }
            } as TeardropMarker);
          } else {
            markers.push({
              type: MarkerType.CIRCLE,
              x: coord.x,
              y: coord.y,
              radius: 15,
              labelGap: 14,
              labelTheta: 0,
              label: showSourceLabels ? source.label : "",
              selected: selected,
              data: { id: source.id }
            } as CircleMarker);
          }
        });
        this.store.dispatch(new SetViewerMarkers(viewer.viewerId, markers));
      })
    })


    this.photometryFileState$ = this.activeImageFileState$.pipe(map(state => state.photometry));
    this.dataSource = new SourcesDataSource(store);
    this.batchPhotFormData$ = store.select(WorkbenchState.getState).pipe(
      map(state => state.photometryPageSettings.batchPhotFormData),
      tap(data => {
        // console.log("patching values: ", data.selectedImageFileIds)
        this.batchPhotForm.patchValue(data, { emitEvent: false });
      })
    );

    this.batchPhotFormData$.subscribe();
    this.batchPhotForm.valueChanges.subscribe(value => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(new UpdatePhotometryPageSettings({ batchPhotFormData: this.batchPhotForm.value }));
      // }
    })


    this.selectedImageFiles$ = combineLatest(this.allImageFiles$, this.batchPhotFormData$).pipe(
      map(([allImageFiles, data]) => data.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)))
    )


    this.centroidSettings$ = store.select(WorkbenchState.getCentroidSettings);

    this.photometrySettings$ = this.store.select(WorkbenchState.getPhotometrySettings);
    this.selectedSourceIds$ = combineLatest(
      this.photometryPageSettings$,
      this.dataSource.visibleSources$).pipe(
        map(([settings, sources]) => sources.filter(s => settings.selectedSourceIds.includes(s.id)).map(s => s.id)),
        tap(selectedSourceIds => {
          this.selectionModel.clear();
          this.selectionModel.select(...selectedSourceIds);
        })
      );

    this.selectedSourceIds$.subscribe();

    this.showAllSources$ = this.photometryPageSettings$.pipe(map(settings => settings.showSourcesFromAllFiles));
    this.showSourceLabels$ = this.photometryPageSettings$.pipe(map(settings => settings.showSourceLabels));

    this.photUpdater = this.dataSource.rows$.pipe(
      map(rows => rows.filter(row => row.photData == null)),
      filter(rows => rows.length != 0 && this.store.selectSnapshot(WorkbenchState.getPhotometryPageSettings).autoPhot),
      withLatestFrom(this.photometrySettings$, this.activeImageFile$),
      switchMap(([rows, photometrySettings, imageFile]) => {
        return this.store.dispatch(new PhotometerSources(rows.map(row => row.source.id), [imageFile.id], photometrySettings, false));
      })
    ).subscribe();


    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.PHOTOMETRY)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    );
  }

  ngOnInit() {
  }

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.store.dispatch(new ClearViewerMarkers());
    this.photUpdater.unsubscribe();
    this.markerUpdater.unsubscribe();
  }

  ngOnChanges() { }

  // setRegionOption(value) {
  //   this.store.dispatch(
  //     new UpdateSourceExtractorFileState(this.activeImageFile.id, { regionOption: value })
  //   );
  // }

  openSourceExtractionSettings(fileId: string) {
    let sourceExtractionSettings = this.store.selectSnapshot(WorkbenchState.getSourceExtractionSettings);

    let dialogRef = this.dialog.open(SourceExtractionDialogComponent, {
      width: "500px",
      data: { ...sourceExtractionSettings }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch([
          new UpdateSourceExtractionSettings(result),
          new ExtractSources(fileId, result)
        ]);
      }
    });
  }

  openPhotSettings() {
    let photometrySettings = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: '600px',
      data: { ...photometrySettings }
    });

    dialogRef.afterClosed().subscribe(result => {
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

  onShowAllSourcesChange($event: MatCheckboxChange) {
    this.store.dispatch(
      new UpdatePhotometryPageSettings({ showSourcesFromAllFiles: $event.checked })
    );
  }

  onShowSourceLabelsChange($event: MatCheckboxChange) {
    this.store.dispatch(
      new UpdatePhotometryPageSettings({ showSourceLabels: $event.checked })
    );
  }

  onCoordModeChange($event: MatButtonToggleChange) {
    this.store.dispatch(
      new UpdatePhotometryPageSettings({ coordMode: $event.value })
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
    let selectedSourceIds = this.store.selectSnapshot(WorkbenchState.getPhotometryPageSettings).selectedSourceIds;

    this.store.dispatch(
      new UpdatePhotometryPageSettings({
        selectedSourceIds: [
          ...selectedSourceIds,
          ...sources.filter(s => !selectedSourceIds.includes(s.id)).map(s => s.id)
        ]
      })
    )

  }

  deselectSources(sources: Source[]) {
    let idsToRemove = sources.map(s => s.id);
    let selectedSourceIds = this.store.selectSnapshot(WorkbenchState.getPhotometryPageSettings)
      .selectedSourceIds.filter(
        id => !idsToRemove.includes(id)
      );

    this.store.dispatch(
      new UpdatePhotometryPageSettings({
        selectedSourceIds: selectedSourceIds
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

  // findSources() {
  //   this.store.dispatch(
  //     new ExtractSources(this.activeImageFile.id, this.workbenchState.sourceExtractionSettings)
  //   );
  // }

  onMarkerClick($event: ViewerGridMarkerMouseEvent) {
    if ($event.mouseEvent.altKey) return;

    let source = this.dataSource.sources.find(
      source => $event.marker.data && source.id == $event.marker.data["id"]
    );
    if (!source) return;

    let sourceSelected = this.selectionModel.selected.includes(source.id);
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
        new UpdatePhotometryPageSettings({
          selectedSourceIds: [source.id]
        })
      );
    }
    $event.mouseEvent.stopImmediatePropagation();
    $event.mouseEvent.preventDefault();
  }

  onImageClick($event: ViewerGridCanvasMouseEvent) {
    let photometryPageSettings = this.store.selectSnapshot(WorkbenchState.getPhotometryPageSettings);
    let centroidClicks = photometryPageSettings.centroidClicks;
    let activeImageFile = this.store.selectSnapshot(WorkbenchState.getActiveImageFile);
    let centroidSettings = this.store.selectSnapshot(WorkbenchState.getCentroidSettings);

    if ($event.hitImage) {
      if (this.selectionModel.selected.length == 0 || $event.mouseEvent.altKey) {
        let primaryCoord = $event.imageX;
        let secondaryCoord = $event.imageY;
        let posType = PosType.PIXEL;


        if (centroidClicks) {
          let result = centroidPsf(
            activeImageFile,
            primaryCoord,
            secondaryCoord,
            centroidSettings.psfCentroiderSettings
          );
          primaryCoord = result.x;
          secondaryCoord = result.y;
        }
        if (photometryPageSettings.coordMode == 'sky' && activeImageFile.wcs.isValid()) {
          let wcs = activeImageFile.wcs;
          let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
          primaryCoord = raDec[0];
          secondaryCoord = raDec[1];
          posType = PosType.SKY;
        }

        let centerEpoch = getCenterTime(activeImageFile);

        let source: Source = {
          id: null,
          label: null,
          objectId: null,
          fileId: activeImageFile.id,
          primaryCoord: primaryCoord,
          secondaryCoord: secondaryCoord,
          posType: posType,
          pm: null,
          pmPosAngle: null,
          pmEpoch: centerEpoch ? centerEpoch.toISOString() : null
        };
        this.store.dispatch(
          new AddSources([source])
        );
      } else {
        this.store.dispatch(
          new UpdatePhotometryPageSettings({
            selectedSourceIds: []
          })
        );
      }
    }
  }

  removeSelectedSources() {
    let selectedSourceIds = this.store.selectSnapshot(WorkbenchState.getPhotometryPageSettings).selectedSourceIds;
    this.store.dispatch(
      new RemoveSources(selectedSourceIds)
    );
  }

  removeAllSources() {
    this.store.dispatch(
      new RemoveSources(this.dataSource.sources.map(s => s.id))
    );
  }

  mergeSelectedSources() {
    let selectedSourceIds = this.store.selectSnapshot(WorkbenchState.getPhotometryPageSettings).selectedSourceIds;
    let selectedSources = this.dataSource.sources.filter(s => selectedSourceIds.includes(s.id));
    this.mergeError = null;
    if (
      !selectedSources.every(
        source => source.posType == selectedSources[0].posType
      )
    ) {
      this.mergeError =
        "You cannot merge sources with different position types";
      return;
    }

    if (selectedSources.some(source => source.pmEpoch == null)) {
      this.mergeError =
        "You can only merge sources which have epochs defined";
      return;
    }


    //verify unique epochs
    let sortedEpochs = selectedSources
      .map(source => new Date(source.pmEpoch))
      .sort();
    for (let i = 0; i < sortedEpochs.length - 1; i++) {
      if (sortedEpochs[i + 1] == sortedEpochs[i]) {
        this.mergeError =
          "All source epochs must be unique when merging";
        return;
      }
    }

    let t0 = new Date(selectedSources[0].pmEpoch).getTime();
    let primaryCoord0 = selectedSources[0].primaryCoord;
    let secondaryCoord0 = selectedSources[0].secondaryCoord;
    let data = selectedSources.map(source => {
      let centerSecondaryCoord =
        (source.secondaryCoord + secondaryCoord0) / 2.0;
        console.log(source.pmEpoch, new Date(source.pmEpoch));
      return [
        ((new Date(source.pmEpoch)).getTime() - t0) / 1000.0,
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

    this.store.dispatch([
      new UpdateSource(selectedSources[0].id, { pm: rate, pmPosAngle: positionAngle }),
      new RemoveSources(selectedSources.slice(1).map(s => s.id)),
      new RemovePhotDatas(this.store.selectSnapshot(PhotDataState.getSourcesPhotData).filter(d => selectedSourceIds.includes(d.sourceId)).map(d => d.id))
    ]);

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

  photometerAllSources(imageFile) {
    let s = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);
    this.store.dispatch(new PhotometerSources(this.dataSource.sources.map(s => s.id), [imageFile.id], s, false));
  }

  showSelectAll() {
    return this.dataSource.sources && this.dataSource.sources.length != 0;
  }

  isAllSelected() {
    const numSelected = this.selectionModel.selected.length;
    const numRows = this.dataSource.sources.length;
    return numSelected === numRows;
  }

  exportSourceData() {
    let data = this.papa.unparse(
      this.dataSource.rows
        .map(d => {
          
          let time = d.photData.time
            ? moment.utc(d.photData.time, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
            : null;
          let pmEpoch = d.source.pmEpoch
            ? moment.utc(d.source.pmEpoch, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
            : null;
          // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
          let jd = time
            ? datetimeToJd(time)
            : null;
          return {
            ...d.source,
            ...d.photData,
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
    saveAs(blob, `afterglow_sources.csv`);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.store.dispatch(
        new UpdatePhotometryPageSettings({
          selectedSourceIds: []
        })
      );
    } else {
      this.store.dispatch(
        new UpdatePhotometryPageSettings({
          selectedSourceIds: this.dataSource.sources.map(s => s.id)
        })
      );
    }
  }

  trackByFn(index: number, value: Source) {
    return value.id;
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(
      new UpdatePhotometryPageSettings({
        centroidClicks: $event.checked
      })
    );
  }

  onAutoPhotChange($event) {
    this.store.dispatch(
      new UpdatePhotometryPageSettings({
        autoPhot: $event.checked
      })
    );
  }

  clearPhotDataFromAllFiles() {
    this.store.dispatch(new RemoveAllPhotDatas());
  }

  selectImageFiles(imageFiles: ImageFile[]) {
    this.store.dispatch(new UpdatePhotometryPageSettings({
      batchPhotFormData: {
        ...this.batchPhotForm.value,
        selectedImageFileIds: imageFiles.map(f => f.id)
      }
    }));
  }

  batchPhotometer() {
    let s = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);
    this.store.dispatch(new PhotometerSources(this.dataSource.sources.map(s => s.id), this.store.selectSnapshot(WorkbenchState.getPhotometryPageSettings).batchPhotFormData.selectedImageFileIds, s, true));
  }

  downloadBatchPhotData(row: JobEntity) {
    let result = row.result as PhotometryJobResult;

    let data = this.papa.unparse(
      result.data
        .map(d => {
          let time = d.time
            ? moment.utc(d.time, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
            : null;
          let pmEpoch = d.pm_epoch
            ? moment.utc(d.pm_epoch, "YYYY-MM-DD HH:mm:ss.SSS").toDate()
            : null;
          // console.log(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), datetimeToJd(time.getUTCFullYear(), time.getUTCMonth()+1, time.getUTCDate(), time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()))
          let jd = time
            ? datetimeToJd(time)
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
}
