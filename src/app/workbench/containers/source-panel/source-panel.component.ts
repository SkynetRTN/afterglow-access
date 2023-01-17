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
import { Observable, Subscription, combineLatest, BehaviorSubject, of, Subject, merge } from 'rxjs';
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
  startWith,
  shareReplay,
  skip,
  take,
} from 'rxjs/operators';

import * as jStat from 'jstat';
import { saveAs } from 'file-saver/dist/FileSaver';

import {
  getCenterTime,
  getSourceCoordinates,
  DataFile,
  ImageLayer,
  Header,
  ILayer,
  PixelType,
} from '../../../data-files/models/data-file';
import { DmsPipe } from '../../../pipes/dms.pipe';
import { SourceExtractionRegionDialogComponent } from '../../components/source-extraction-dialog/source-extraction-dialog.component';
import { Source, PosType } from '../../models/source';
import { SourcePanelConfig } from '../../models/workbench-state';
import { SelectionModel } from '@angular/cdk/collections';
import { CentroidSettings } from '../../models/centroid-settings';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { WorkbenchState } from '../../workbench.state';
import {
  UpdateSourcePanelConfig,
  RemovePhotDatasBySourceId,
  RemovePhotDatasByLayerId,
  InvalidateAutoPhotByLayerId,
  UpdateSourceSelectionRegion,
  EndSourceSelectionRegion,
} from '../../workbench.actions';
import { AddSources, RemoveSources, UpdateSource } from '../../sources.actions';
import { Papa } from 'ngx-papaparse';
import { DatePipe } from '@angular/common';
import { SourceExtractionSettings } from '../../models/source-extraction-settings';
import { DataFilesState } from '../../../data-files/data-files.state';
import { SourcesState } from '../../sources.state';
import { centroidDisk, centroidPsf } from '../../models/centroider';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ImageViewerEventService } from '../../services/image-viewer-event.service';
import { ImageViewerMarkerService } from '../../services/image-viewer-marker.service';
import { LayerType } from '../../../data-files/models/data-file-type';
import { IImageData } from '../../../data-files/models/image-data';
import { MarkerType, RectangleMarker, SourceMarker } from '../../models/marker';
import { GlobalSettings } from '../../models/global-settings';
import { SourceExtractionRegion } from '../../models/source-extraction-region';
import { SourcePanelState } from '../../models/source-file-state';
import { MergeSourcesDialogComponent } from '../../components/merge-sources-dialog/merge-sources-dialog.component';

@Component({
  selector: 'app-source-panel',
  templateUrl: './source-panel.component.html',
  styleUrls: ['./source-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourcePanelComponent implements AfterViewInit, OnDestroy, OnInit {
  @Input('viewerId')
  set viewerId(viewer: string) {
    this.viewerIdSubject$.next(viewer);
  }
  get viewerId() {
    return this.viewerIdSubject$.getValue();
  }
  protected viewerIdSubject$ = new BehaviorSubject<string>(null);
  protected viewerId$ = this.viewerIdSubject$.asObservable().pipe(filter(viewerId => viewerId !== null))

  destroy$ = new Subject<boolean>();
  viewportSize$: Observable<{ width: number; height: number }>;
  file$: Observable<DataFile>;
  layer$: Observable<ILayer>;
  imageLayer$: Observable<ImageLayer>;
  header$: Observable<Header>;
  rawImageData$: Observable<IImageData<PixelType>>;
  sources$: Observable<Source[]>;
  state$: Observable<SourcePanelState>;
  config$: Observable<SourcePanelConfig>;
  globalSettings$: Observable<GlobalSettings>;
  centroidSettings$: Observable<CentroidSettings>;
  sourceExtractionSettings$: Observable<SourceExtractionSettings>;

  //events
  onRemoveAllSources$ = new Subject<any>();


  NUMBER_FORMAT: (v: any) => any = (v: number) => (v ? v : 'N/A');
  DECIMAL_FORMAT: (v: any) => any = (v: number) => (v ? v.toFixed(2) : 'N/A');
  SEXAGESIMAL_FORMAT: (v: any) => any = (v: number) => (v ? this.dmsPipe.transform(v) : 'N/A');
  SourcePosType = PosType;
  tableData$: Observable<Source[]>;
  mergeError: string;
  selectionModel = new SelectionModel<string>(true, []);

  constructor(
    private dialog: MatDialog,
    private dmsPipe: DmsPipe,
    private datePipe: DatePipe,
    private papa: Papa,
    private store: Store,
    private eventService: ImageViewerEventService,
    private markerService: ImageViewerMarkerService
  ) {
    this.viewportSize$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getViewportSizeByViewerId(viewerId)))
    );

    this.config$ = this.store.select(WorkbenchState.getSourcePanelConfig);

    this.state$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getSourcePanelStateByViewerId(viewerId))),
      filter(state => !!state)
    );

    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.layer$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getLayerByViewerId(viewerId)))
    );

    this.imageLayer$ = this.layer$.pipe(map((layer) => (layer && layer.type == LayerType.IMAGE ? (layer as ImageLayer) : null)));

    this.header$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getLayerHeaderByViewerId(viewerId)))
    );

    this.rawImageData$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getRawImageDataByViewerId(viewerId)))
    );

    this.sources$ = combineLatest(
      this.store.select(SourcesState.getEntities),
      this.config$.pipe(
        map((config) => config.coordMode),
        distinctUntilChanged()
      ),
      this.config$.pipe(
        map((config) => config.showSourcesFromAllFiles),
        distinctUntilChanged()
      ),
      this.imageLayer$.pipe(map(layer => layer?.id), distinctUntilChanged()),
      this.header$
    ).pipe(
      map(([sourceEntities, coordMode, showSourcesFromAllFiles, imageLayerId, header]) => {
        if (!header) return [];
        if (!header.wcs || !header.wcs.isValid()) coordMode = 'pixel';

        let result: Source[] = [];
        Object.values(sourceEntities).forEach((source) => {
          if (coordMode != source.posType) return;
          if (source.layerId != imageLayerId) {
            if (!showSourcesFromAllFiles) return;
          }

          // if (result.find(s => s.label == source.label)) return;

          result.push(source)
        });

        return result;
      }),
      shareReplay(1)
    );

    this.globalSettings$ = this.store.select(WorkbenchState.getSettings)
    this.centroidSettings$ = this.store.select(WorkbenchState.getCentroidSettings);
    this.sourceExtractionSettings$ = this.store.select(WorkbenchState.getSourceExtractionSettings);

    this.tableData$ = this.sources$;


    combineLatest(this.sources$, this.config$)
      .pipe(
        filter(([sources, config]) => sources !== null && config !== null),
        map(([sources, config]) => sources.filter((s) => config.selectedSourceIds.includes(s.id)).map((s) => s.id)),
        takeUntil(this.destroy$)
      )
      .subscribe((selectedSourceIds) => {
        this.selectionModel.clear();
        this.selectionModel.select(...selectedSourceIds);
      });

    this.eventService.imageClickEvent$
      .pipe(
        takeUntil(this.destroy$),
        withLatestFrom(this.state$, this.config$, this.imageLayer$, this.header$, this.rawImageData$)
      )
      .subscribe(([$event, state, config, imageLayer, header, imageData]) => {
        if (!$event || !imageData) {
          return;
        }

        if (!$event.isActiveViewer) return;

        let selectedSourceIds = this.selectionModel.selected;
        let centroidClicks = config.centroidClicks;
        let planetCentroiding = config.planetCentroiding;
        let centroidSettings = this.store.selectSnapshot(WorkbenchState.getCentroidSettings);

        if ($event.hitImage) {
          if (selectedSourceIds.length == 0 || $event.mouseEvent.altKey) {
            let primaryCoord = $event.imageX;
            let secondaryCoord = $event.imageY;
            let posType = PosType.PIXEL;
            if (centroidClicks) {
              let result: {
                x: number;
                y: number;
                xErr: any;
                yErr: any;
              };

              if (planetCentroiding) {
                result = centroidDisk(imageData, primaryCoord, secondaryCoord, centroidSettings);
              }
              else {
                result = centroidPsf(imageData, primaryCoord, secondaryCoord, centroidSettings);
              }

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
              layerId: imageLayer.id,
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
              pm: null,
              pmPosAngle: null,
              pmEpoch: centerEpoch ? centerEpoch.toISOString() : null,
            };
            this.store.dispatch([new AddSources([source]), new InvalidateAutoPhotByLayerId()]);
          } else if (!$event.mouseEvent.ctrlKey) {
            this.store.dispatch(
              new UpdateSourcePanelConfig({
                selectedSourceIds: [],
              })
            );
          }
        }
      });

    this.eventService.mouseDragEvent$
      .pipe(
        takeUntil(this.destroy$),
        withLatestFrom(this.state$, this.config$, this.imageLayer$, this.header$, this.rawImageData$)
      )
      .subscribe(([$event, state, config, imageLayer, header, imageData]) => {
        if (!$event) {
          return;
        }
        if (!$event.$mouseDownEvent.ctrlKey && !$event.$mouseDownEvent.metaKey && !$event.$mouseDownEvent.shiftKey)
          return;
        if (!imageLayer) return;
        if (!$event.isActiveViewer) return;

        let region = {
          x: $event.imageStart.x,
          y: $event.imageStart.y,
          width: $event.imageEnd.x - $event.imageStart.x,
          height: $event.imageEnd.y - $event.imageStart.y,
        };

        this.store.dispatch(new UpdateSourceSelectionRegion(imageLayer.id, region));
      });

    this.eventService.mouseDropEvent$
      .pipe(
        takeUntil(this.destroy$),
        withLatestFrom(this.state$, this.config$, this.imageLayer$, this.header$, this.rawImageData$)
      )
      .subscribe(([$event, state, config, imageLayer, header, imageData]) => {
        if (!$event) {
          return;
        }
        if (!$event.$mouseDownEvent.ctrlKey && !$event.$mouseDownEvent.metaKey && !$event.$mouseDownEvent.shiftKey)
          return;
        if (!imageLayer) return;
        if (!$event.isActiveViewer) return;

        this.store.dispatch(
          new EndSourceSelectionRegion(imageLayer.id, $event.$mouseUpEvent.shiftKey ? 'remove' : 'append')
        );
      });

    this.eventService.markerClickEvent$.pipe(takeUntil(this.destroy$)).subscribe(($event) => {
      if (!$event) {
        return;
      }
      if ($event.mouseEvent.altKey) return;
      let sources = this.store.selectSnapshot(SourcesState.getSources);
      let source = sources.find(
        (source) => $event.marker.data && $event.marker.data.source && source.id == $event.marker.data.source.id
      );
      if (!source) return;
      if (!$event.isActiveViewer) return;

      let sourcePanelConfig = this.store.selectSnapshot(WorkbenchState.getSourcePanelConfig);
      let sourceSelected = sourcePanelConfig.selectedSourceIds.includes(source.id);
      if ($event.mouseEvent.ctrlKey) {
        if (!sourceSelected) {
          // select the source
          this.store.dispatch(
            new UpdateSourcePanelConfig({
              selectedSourceIds: [...sourcePanelConfig.selectedSourceIds, source.id],
            })
          );
        } else {
          // deselect the source
          let selectedSourceIds = sourcePanelConfig.selectedSourceIds.filter((id) => id != source.id);
          this.store.dispatch(
            new UpdateSourcePanelConfig({
              selectedSourceIds: selectedSourceIds,
            })
          );
        }
      } else {
        this.store.dispatch(
          new UpdateSourcePanelConfig({
            selectedSourceIds: [source.id],
          })
        );
      }
      $event.mouseEvent.stopImmediatePropagation();
      $event.mouseEvent.preventDefault();
    });


    // local events
    this.onRemoveAllSources$.pipe(
      withLatestFrom(this.sources$),
      takeUntil(this.destroy$)
    ).subscribe(
      ([event, sources]) => {
        this.store.dispatch(new RemoveSources(sources.map(s => s.id)));
      }
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

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.markerService.clearMarkers();
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  // onColorPickerChange(value: string) {
  //   this.markerColor$.next(value);
  // }

  private getViewerMarkers(viewerId: string) {
    let config$ = this.store.select(WorkbenchState.getSourcePanelConfig)
    let state$ = this.store.select(WorkbenchState.getSourcePanelStateByViewerId(viewerId)).pipe(distinctUntilChanged());
    let layerId$ = this.store.select(WorkbenchState.getImageLayerByViewerId(viewerId)).pipe(map(layer => layer?.id), distinctUntilChanged())
    // let layerId$ = this.imageLayer$.pipe(
    //   map((layer) => layer?.id),
    //   distinctUntilChanged()
    // );
    let header$ = this.store.select(WorkbenchState.getHeaderByViewerId(viewerId))
    let sources$ = this.sources$;

    let sourceSelectionRegionMarkers$ = combineLatest([layerId$, state$]).pipe(
      map(([layerId, state]) => {
        if (!state || !state.markerSelectionRegion) return [];
        let region = state.markerSelectionRegion;
        let sourceSelectionMarker: RectangleMarker = {
          id: `SOURCE_SELECTION_${layerId}`,
          x: Math.min(region.x, region.x + region.width),
          y: Math.min(region.y, region.y + region.height),
          width: Math.abs(region.width),
          height: Math.abs(region.height),
          type: MarkerType.RECTANGLE,
        };
        return [sourceSelectionMarker];
      })
    );

    let sourceMarkers$ = combineLatest([config$, header$, layerId$, sources$]).pipe(
      map(([config, header, layerId, sources]) => {
        if (!config?.showSourceMarkers || !header || !header.loaded) return [];
        let selectedSourceIds = config.selectedSourceIds;
        let coordMode = config.coordMode;


        let markers: Array<SourceMarker | RectangleMarker> = [];
        let mode = coordMode;

        if (!header.wcs || !header.wcs.isValid()) mode = 'pixel';

        sources.forEach((source) => {
          if (source.posType != mode) return;
          let selected = selectedSourceIds.includes(source.id);
          let coord = getSourceCoordinates(header, source);

          if (coord == null) {
            return;
          }

          let tooltipMessage = [];
          if (source.label) tooltipMessage.push(source.label)

          let marker: SourceMarker = {
            id: `SOURCE_${layerId}_${source.id}`,
            type: MarkerType.SOURCE,
            ...coord,
            source: source,
            selected: selected,
            data: { source: source },
            tooltip: {
              class: 'source-data-tooltip',
              message: tooltipMessage.join('\n'),
              showDelay: 500,
              hideDelay: null,
            },
            label: config.showSourceLabels ? source.label : '',
            labelRadius: 10,
            // style: {
            //   stroke: settings.markerColor,
            //   selectedStroke: settings.selectedMarkerColor
            // }
          }

          markers.push(marker);
        });

        return markers;
      })
    );

    return combineLatest(sourceSelectionRegionMarkers$, sourceMarkers$).pipe(
      map(([sourceSelectionRegionMarkers, sourceMarkers]) => {
        return {
          viewerId: viewerId,
          markers: sourceMarkers.concat(sourceSelectionRegionMarkers),
        };
      })
    );
  }

  getSourceLayerLabel(sourceId: string) {
    return this.store.select(SourcesState.getSourceById(sourceId)).pipe(
      map(source => source?.layerId),
      distinctUntilChanged(),
      switchMap(layerId => this.store.select(DataFilesState.getLayerById(layerId))),
      map(layer => layer?.name)
    )
  }

  selectSources(sources: Source[]) {
    let selectedSourceIds = this.store.selectSnapshot(WorkbenchState.getSourcePanelConfig).selectedSourceIds;

    this.store.dispatch(
      new UpdateSourcePanelConfig({
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
      .selectSnapshot(WorkbenchState.getSourcePanelConfig)
      .selectedSourceIds.filter((id) => !idsToRemove.includes(id));

    this.store.dispatch(
      new UpdateSourcePanelConfig({
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

  removeSelectedSources() {
    let selectedSourceIds = this.selectionModel.selected;
    this.store.dispatch(new RemoveSources(selectedSourceIds));
  }

  mergeSelectedSourcesDisabled() {
    let sourcesById = this.store.selectSnapshot(SourcesState.getEntities);
    let layerIds = this.selectionModel.selected.map(id => sourcesById[id]?.layerId);
    return layerIds.length < 2 || layerIds.some(v => layerIds.indexOf(v) !== layerIds.lastIndexOf(v));
  }

  mergeSelectedSources() {

    let dialogRef = this.dialog.open(MergeSourcesDialogComponent, {
      width: '500px',
      data: {
        viewerId: this.viewerId,
        sourceIds: this.selectionModel.selected
      },
    });

    dialogRef
      .afterClosed()
      .pipe(withLatestFrom(this.imageLayer$, this.viewportSize$))
      .subscribe(([result, imageLayer, viewportSize]) => {
        if (result) {
          // this.store.dispatch(new InvalidateAutoPhotByLayerId());
        }
      });
  }



  showSelectAll(sources: Source[]) {
    return sources && sources.length != 0;
  }

  isAllSelected(sources: Source[]) {
    const numSelected = this.selectionModel.selected.length;
    const numRows = sources.length;
    return numSelected === numRows;
  }

  exportSourceData(rows: Source[]) {
    let data = this.papa.unparse(
      rows
    );
    var blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `afterglow_sources.csv`);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(sources: Source[]) {
    if (this.isAllSelected(sources)) {
      this.store.dispatch(
        new UpdateSourcePanelConfig({
          selectedSourceIds: [],
        })
      );
    } else {
      this.store.dispatch(
        new UpdateSourcePanelConfig({
          selectedSourceIds: sources.map((s) => s.id),
        })
      );
    }
  }

  trackByFn(index: number, value: Source) {
    return value.id;
  }


  clearPhotDataFromAllFiles() {
    this.store.dispatch(new RemovePhotDatasByLayerId());
  }



  openSourceExtractionDialog() {
    let sourceExtractionSettings = this.store.selectSnapshot(WorkbenchState.getSourceExtractionSettings);
    let config = this.store.selectSnapshot(WorkbenchState.getSourcePanelConfig);
    let dialogRef = this.dialog.open(SourceExtractionRegionDialogComponent, {
      width: '500px',
      data: { viewerId: this.viewerId, region: SourceExtractionRegion.ENTIRE_IMAGE, coordinateMode: config.coordMode },
    });

    dialogRef
      .afterClosed()
      .pipe(withLatestFrom(this.imageLayer$, this.viewportSize$))
      .subscribe(([result, imageLayer, viewportSize]) => {
        if (result) {
          this.store.dispatch(new InvalidateAutoPhotByLayerId());
        }
      });
  }

  onCoordModeChange($event: MatButtonToggleChange) {
    this.store.dispatch(new UpdateSourcePanelConfig({ coordMode: $event.value }));
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(new UpdateSourcePanelConfig({ centroidClicks: $event.checked }));
  }

  onShowSourcesFromAllFilesChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdateSourcePanelConfig({ showSourcesFromAllFiles: $event.checked }));
  }

  onShowSourceLabelsChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdateSourcePanelConfig({ showSourceLabels: $event.checked }));
  }


  onShowSourceMarkersChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdateSourcePanelConfig({ showSourceMarkers: $event.checked }));
  }

  onPlanetCentroidingChange($event: MatSlideToggleChange) {
    this.store.dispatch(new UpdateSourcePanelConfig({ planetCentroiding: $event.checked }));
  }

  trackById(index: number, row: Source) {
    return row.id
  }
}
