import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { Observable, combineLatest, merge, of } from 'rxjs';
import {
  map,
  tap,
  filter,
  distinctUntilChanged,
  switchMap,
  withLatestFrom
} from "rxjs/operators";

import { DataFile, ImageFile, getWidth, getHeight, getRaHours, getDecDegs, getDegsPerPixel, Header } from '../../../data-files/models/data-file'
import { SidebarView } from '../../models/sidebar-view';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from '../../../../../node_modules/rxjs';
import { HotkeysService, Hotkey } from '../../../../../node_modules/angular2-hotkeys';
import { MatDialog } from '@angular/material/dialog';
import { Store, Actions, ofActionCompleted, ofActionSuccessful } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { WorkbenchState } from '../../workbench.state';
import { SetShowConfig, SetFullScreen, SetFullScreenPanel, ShowSidebar, LoadCatalogs, LoadFieldCals, SelectDataFile, SetSidebarView, ToggleShowConfig, SetViewMode, SetActiveViewer, SetViewerSyncEnabled, SetNormalizationSyncEnabled, ImportFromSurvey, UpdatePhotometryPageSettings, MoveToOtherView, KeepViewerOpen, SetActiveTool, SetViewerMarkers } from '../../workbench.actions';
import { LoadLibrary, RemoveAllDataFiles, RemoveDataFile, LoadDataFile } from '../../../data-files/data-files.actions';
import { LoadDataProviders } from '../../../data-providers/data-providers.actions';
import { ViewMode } from "../../models/view-mode";
import { MatButtonToggleChange, MatCheckboxChange, MatRadioChange } from '@angular/material';
import { Viewer } from '../../models/viewer';
import { DataProvider } from '../../../data-providers/models/data-provider';
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import { DataProvidersState } from '../../../data-providers/data-providers.state';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { Navigate } from '@ngxs/router-plugin';
import { WorkbenchFileState } from '../../models/workbench-file-state';
import { DataFileType } from '../../../data-files/models/data-file-type';
import { WorkbenchTool } from '../../models/workbench-state';
import { WorkbenchFileStates } from '../../workbench-file-states.state';
import { Marker, MarkerType, CircleMarker } from '../../models/marker';
import { ViewerGridCanvasMouseEvent, ViewerGridMarkerMouseEvent } from './workbench-viewer-grid/workbench-viewer-grid.component';
import { centroidDisk, centroidPsf } from '../../models/centroider';
import { CustomMarker } from '../../models/custom-marker';
import { SelectCustomMarkers, DeselectCustomMarkers, AddCustomMarkers, SetCustomMarkerSelection } from '../../workbench-file-states.actions';
import { MarkerFileState } from '../../models/marker-file-state';



@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrls: ['./workbench.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkbenchComponent implements OnInit, OnDestroy {
  WorkbenchTool = WorkbenchTool;
  ViewMode = ViewMode;

  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  showSidebar$: Observable<boolean>;
  sidebarView$: Observable<SidebarView>;
  files$: Observable<Array<DataFile>>;
  fileEntities$: Observable<{ [id: string]: DataFile }>;
  loadingFiles$: Observable<boolean>;
  selectedFile$: Observable<DataFile>;
  viewMode$: Observable<ViewMode>;
  primaryViewers$: Observable<Viewer[]>;
  secondaryViewers$: Observable<Viewer[]>;
  activeViewer$: Observable<Viewer>;
  activeViewerId$: Observable<string>;
  viewerFileIds$: Observable<string[]>;
  viewerImageFiles$: Observable<ImageFile[]>;
  viewerImageFileHeaders$: Observable<Header[]>;
  viewerImageFileStates$: Observable<WorkbenchFileState[]>;
  viewerFileCustomMarkers$: Observable<Array<Marker[]>>;
  activeImageFile$: Observable<ImageFile>;
  activeImageFileState$: Observable<WorkbenchFileState>;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  viewers$: Observable<Viewer[]>;
  viewerSyncEnabled$: Observable<boolean>;
  normalizationSyncEnabled$: Observable<boolean>;
  surveyDataProvider$: Observable<DataProvider>;
  surveyImportCorrId$: Observable<string>;
  dssImportLoading$: Observable<boolean>;
  activeTool$: Observable<WorkbenchTool>;
  showConfig$: Observable<boolean>;

  fileLoaderSub: Subscription;
  queryParamSub: Subscription;
  markerOverlaySub: Subscription;

  useWcsCenter: boolean = false;
  currentSidebarView = SidebarView.FILES;
  SidebarView = SidebarView;
  hotKeys: Array<Hotkey> = [];

  constructor(private actions$: Actions, private store: Store, private router: Router, private _hotkeysService: HotkeysService, public dialog: MatDialog, private corrGen: CorrelationIdGenerator, private activeRoute: ActivatedRoute) {
    this.fileEntities$ = this.store.select(DataFilesState.getEntities);
    this.files$ = this.store.select(DataFilesState.getDataFiles).pipe(
      map(files => files.sort((a, b) => a.name.localeCompare(b.name)))
    );
    this.primaryViewers$ = this.store.select(WorkbenchState.getPrimaryViewers);
    this.activeTool$ = this.store.select(WorkbenchState.getActiveTool);
    this.secondaryViewers$ = this.store.select(WorkbenchState.getSecondaryViewers);
    this.selectedFile$ = this.store.select(WorkbenchState.getActiveImageFile);
    this.viewers$ = this.store.select(WorkbenchState.getViewers);
    this.sidebarView$ = this.store.select(WorkbenchState.getSidebarView);
    this.showConfig$ = this.store.select(WorkbenchState.getShowConfig);
    this.showSidebar$ = this.store.select(WorkbenchState.getShowSidebar);
    this.loadingFiles$ = this.store.select(DataFilesState.getLoading);
    this.viewMode$ = this.store.select(WorkbenchState.getViewMode);
    this.activeViewerId$ = this.store.select(WorkbenchState.getActiveViewerId);
    this.activeViewer$ = this.store.select(WorkbenchState.getActiveViewer);
    this.dssImportLoading$ = store.select(WorkbenchState.getDssImportLoading);
    this.surveyDataProvider$ = this.store.select(DataProvidersState.getDataProviders).pipe(
      map(dataProviders => dataProviders.find(dp => dp.name == 'Imaging Surveys'))
    );

    this.activeImageFile$ = store.select(WorkbenchState.getActiveImageFile);

    this.activeImageFileState$ = store.select(WorkbenchState.getActiveImageFileState);
    this.viewerFileIds$ = this.store.select(WorkbenchState.getViewerIds).pipe(
      switchMap(viewerIds => {

        console.log("Viewer File Ids Change")
        return combineLatest(
          ...viewerIds.map(viewerId => {
            return this.store.select(WorkbenchState.getViewerById).pipe(
              map(fn => fn(viewerId).fileId),
              distinctUntilChanged()
            )
          })
        )
      })
    )

    this.viewerImageFiles$ = this.viewerFileIds$.pipe(
      switchMap(fileIds => {
        return combineLatest(
          ...fileIds.map(fileId => {
            return this.store.select(DataFilesState.getDataFileById).pipe(
              map(fn => {
                if (fileId == null || !fn(fileId) || fn(fileId).type != DataFileType.IMAGE) return null;
                return fn(fileId) as ImageFile;
              }),
              distinctUntilChanged()
            )
          })
        )
      })
    )

    this.viewerFileCustomMarkers$ = combineLatest(
      this.activeTool$,
      this.viewerFileIds$
    ).pipe(
      switchMap(([activeTool, fileIds]) => {
        
        return combineLatest(
          ...fileIds.map(fileId => {
            if (activeTool != WorkbenchTool.CUSTOM_MARKER) return of([]);
            return this.store.select(WorkbenchFileStates.getWorkbenchFileStateByFileId).pipe(
              map(fn => {
                return fn(fileId).marker;
              }),
              distinctUntilChanged(),
              map(markerFileState => Object.values(markerFileState.entities))
            )
          })
        )
      })
    )

    this.markerOverlaySub = combineLatest(
      this.viewerFileCustomMarkers$
    ).pipe(
      withLatestFrom(
        this.viewers$
      )
    ).subscribe(([[viewerCustomMarkers], viewers]) => {
      viewers.forEach((viewer, index) => {
        this.store.dispatch(new SetViewerMarkers(viewer.viewerId, Object.values(viewerCustomMarkers[index])));
      })

    })

    this.fileLoaderSub = this.viewerFileIds$.subscribe(ids => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      ids.forEach(id => {
        let f = dataFiles[id];
        if (!f || ((f.headerLoaded || f.headerLoading) && (f.type != DataFileType.IMAGE || ((f as ImageFile).histLoaded || (f as ImageFile).histLoading)))) return;

        this.store.dispatch(new LoadDataFile(id));

      })
    })


    this.viewerSyncEnabled$ = store.select(
      WorkbenchState.getViewerSyncEnabled
    );
    this.normalizationSyncEnabled$ = store.select(
      WorkbenchState.getNormalizationSyncEnabled
    );

    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);
    this.queryParamSub = this.activeRoute.queryParams.subscribe(p => {

      let tool = WorkbenchTool.VIEWER;
      if (p.tool && Object.values(WorkbenchTool).includes(p.tool)) {
        tool = p.tool;
      }

      this.store.dispatch(
        new SetActiveTool(tool)
      );
    });

    this.hotKeys.push(new Hotkey('d', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new Navigate([], { tool: WorkbenchTool.VIEWER }, { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }));
      return false; // Prevent bubbling
    }, undefined, 'Display Settings'))

    this.hotKeys.push(new Hotkey('i', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new Navigate([], { tool: WorkbenchTool.INFO }, { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }));
      return false; // Prevent bubbling
    }, undefined, 'File Info'));

    this.hotKeys.push(new Hotkey('m', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new SetActiveTool(WorkbenchTool.CUSTOM_MARKER));
      return false; // Prevent bubbling
    }, undefined, 'Markers'));

    this.hotKeys.push(new Hotkey('P', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new SetActiveTool(WorkbenchTool.PLOTTER));
      return false; // Prevent bubbling
    }, undefined, 'Plotter'));

    this.hotKeys.push(new Hotkey('s', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new SetActiveTool(WorkbenchTool.SONIFIER));
      return false; // Prevent bubbling
    }, undefined, 'Sonifier'));

    // this.hotKeys.push(new Hotkey('f', (event: KeyboardEvent): boolean => {
    //   this.store.dispatch(new SetShowConfig(true));
    //   this.store.dispatch(new Navigate([this.FIELD_CAL_ROUTE]);
    //   return false; // Prevent bubbling
    // }, undefined, 'Field Calibration'));

    this.hotKeys.push(new Hotkey('p', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new SetActiveTool(WorkbenchTool.PHOTOMETRY));
      return false; // Prevent bubbling
    }, undefined, 'Photometry'));

    this.hotKeys.push(new Hotkey('/', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new SetActiveTool(WorkbenchTool.IMAGE_CALC));
      return false; // Prevent bubbling
    }, undefined, 'Image Arithmetic'));

    this.hotKeys.push(new Hotkey('a', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new SetActiveTool(WorkbenchTool.ALIGNER));
      return false; // Prevent bubbling
    }, undefined, 'Aligning'));

    this.hotKeys.push(new Hotkey('S', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.store.dispatch(new SetActiveTool(WorkbenchTool.STACKER));
      return false; // Prevent bubbling
    }, undefined, 'Stacking'));



    this.hotKeys.push(new Hotkey('esc', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetFullScreen(false))
      return false; // Prevent bubbling
    }, undefined, 'Reset workbench views'));

    this.hotKeys.push(new Hotkey('1', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetFullScreen(true));
      this.store.dispatch(new SetFullScreenPanel('file'));
      this.store.dispatch(new ShowSidebar());
      return false; // Prevent bubbling
    }, undefined, 'Show workbench file panel'));

    this.hotKeys.push(new Hotkey('2', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetFullScreen(true));
      this.store.dispatch(new SetFullScreenPanel('viewer'))
      return false; // Prevent bubbling
    }, undefined, 'Show workbench file panel'));

    this.hotKeys.push(new Hotkey('3', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetFullScreen(true));
      this.store.dispatch(new SetFullScreenPanel('tool'))
      this.store.dispatch(new SetShowConfig(true));
      return false; // Prevent bubbling
    }, undefined, 'Show workbench file panel'));



    this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));


    // if(localStorage.getItem('previouslyVisited') != 'true') {
    //   localStorage.setItem('previouslyVisited', 'true')
    //   let dialogRef = this.dialog.open(TourDialogComponent);

    //   dialogRef.afterClosed().subscribe(result => {
    //     // console.log('The dialog was closed', result);
    //     if(result) this.tourService.start();
    //   });

    // }


    //this.loading$ = this.fileLibraryStore.loading$;

    // this.imageFiles$ = imageFileService.imageFiles$;

    // this.imageFileService.imageFile$.subscribe(imageFile => {
    //   this.selectedImageFile = imageFile;
    // });

    // this.selectedFile$.subscribe(selectedFile => {
    //   if(!selectedFile.loaded && !selectedFile.loading) this.fileLibraryStore.loadFile(selectedFile.id);
    // })

  }

  selectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(
      new SelectCustomMarkers(fileId, customMarkers)
    );
  }

  deselectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(
      new DeselectCustomMarkers(fileId, customMarkers)
    );
  }

  onImageClick($event: ViewerGridCanvasMouseEvent) {
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        let imageFileState = this.store.selectSnapshot(WorkbenchFileStates.getEntities)[$event.targetFile.id];
        let settings = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPageSettings);
        let centroidSettings = this.store.selectSnapshot(WorkbenchState.getCentroidSettings);
        let selectedCustomMarkers = Object.values(imageFileState.marker.entities).filter(marker => marker.selected);
        if ($event.hitImage) {
          if (selectedCustomMarkers.length == 0 || $event.mouseEvent.altKey) {
            let x = $event.imageX;
            let y = $event.imageY;
            if (settings.centroidClicks) {
              let result: { x: number; y: number };
              if (settings.usePlanetCentroiding) {
                result = centroidDisk(
                  $event.targetFile,
                  x,
                  y,
                  centroidSettings.diskCentroiderSettings
                );
              } else {
                result = centroidPsf(
                  $event.targetFile,
                  x,
                  y,
                  centroidSettings.psfCentroiderSettings
                );
              }
              x = result.x;
              y = result.y;
            }

            let customMarker: CircleMarker = {
              type: MarkerType.CIRCLE,
              label: null,
              x: x,
              y: y,
              radius: 10,
              labelGap: 8,
              labelTheta: 0
            }

            this.store.dispatch(
              new AddCustomMarkers($event.targetFile.id, [customMarker])
            );
          } else {
            this.store.dispatch(
              new SetCustomMarkerSelection($event.targetFile.id, [])
            );
          }
        }
        break;
      }
    }

  }

  onMarkerClick($event: ViewerGridMarkerMouseEvent) {
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        if ($event.mouseEvent.altKey) return;

        // let customMarker = this.customMarkers.find(
        //   customMarker =>
        //     $event.marker.data && customMarker.id == $event.marker.data["id"]
        // );

        // if (!customMarker) return;

        // let customMarkerSelected = this.selectedCustomMarkers.includes(
        //   customMarker
        // );

        // if ($event.mouseEvent.ctrlKey) {
        //   if (!customMarkerSelected) {
        //     // select the source
        //     this.selectCustomMarkers([customMarker]);
        //   } else {
        //     // deselect the source
        //     this.deselectCustomMarkers([customMarker]);
        //   }
        // } else {
        //   this.store.dispatch(
        //     new SetCustomMarkerSelection([customMarker])
        //   );
        // }
        // $event.mouseEvent.stopImmediatePropagation();
        // $event.mouseEvent.preventDefault();
        break;
      }
    }

  }



  ngOnInit() {

    this.store.dispatch([new LoadLibrary(), new LoadCatalogs(), new LoadFieldCals(), new LoadDataProviders()]);


  }

  ngOnDestroy() {
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
    this.fileLoaderSub.unsubscribe();
    this.queryParamSub.unsubscribe();
    this.markerOverlaySub.unsubscribe();
  }

  onFileSelect($event: { file: DataFile, doubleClick: boolean }) {
    if (!$event.file) return;

    if (!$event.doubleClick) {
      this.store.dispatch(new SelectDataFile($event.file.id));
    }
    else {
      this.store.dispatch(new KeepViewerOpen(this.store.selectSnapshot(WorkbenchState.getActiveViewerId)));
    }

  }

  // onMultiFileSelect(files: Array<DataFile>) {
  //   if(!files) return;
  //   this.store.dispatch(new SetMultiFileSelection(files.map(f => f.id)));
  // }

  removeAllFiles() {
    let dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: "300px",
      data: {
        message: "Are you sure you want to delete all files from your library?",
        confirmationBtn: {
          color: 'warn',
          label: 'Delete All Files'
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(new RemoveAllDataFiles());
      }
    });


  }

  refresh() {
    this.store.dispatch(new LoadLibrary());
  }

  setSidebarView(value: SidebarView) {
    this.store.dispatch(new SetSidebarView(value))
  }

  setViewModeOption($event: MatButtonToggleChange) {
    this.store.dispatch(
      new SetViewMode($event.value)
    );
  }

  onActiveViewerIdChange(value: string) {
    this.store.dispatch(
      new SetActiveViewer(value)
    );
  }

  onClickWorkbenchNav(isActiveUrl: boolean) {
    if (isActiveUrl) {
      // toggle
      this.store.dispatch(new ToggleShowConfig());
    }
    else {
      // show
      this.store.dispatch(new SetShowConfig(true));
    }
  }

  onWorkbenchNavClick(currentTool: string, targetTool: string) {
    if (currentTool == targetTool) {
      // toggle
      this.store.dispatch(new ToggleShowConfig());
    }
    else {
      // show
      this.store.dispatch(new SetShowConfig(true));
    }
    this.store.dispatch(new Navigate([], { tool: targetTool }, { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }));
  }


  /* for data file selection list */
  trackByFn(index, item) {
    return item.id; // or item.id
  }

  getToolbarTooltip(isActive: boolean, base: string) {
    let showToolPanel = this.store.selectSnapshot(WorkbenchState.getShowConfig);
    return (showToolPanel && isActive ? 'Hide ' : 'Show ') + base;
  }

  onViewerSyncEnabledChange($event) {
    this.store.dispatch(
      new SetViewerSyncEnabled($event.checked)
    );
  }

  onNormalizationSyncEnabledChange($event) {
    this.store.dispatch(
      new SetNormalizationSyncEnabled($event.checked)
    );
  }

  importFromSurvey(surveyDataProvider: DataProvider, imageFile: ImageFile) {
    let centerRaDec;
    let pixelScale;


    if (imageFile.wcs && imageFile.wcs.isValid() && this.useWcsCenter) {
      centerRaDec = imageFile.wcs.pixToWorld([
        getWidth(imageFile) / 2,
        getHeight(imageFile) / 2
      ]);
      pixelScale = imageFile.wcs.getPixelScale() * 60;
    }
    else {
      let centerRa = getRaHours(imageFile);
      let centerDec = getDecDegs(imageFile);
      if (centerRa == undefined || centerDec == undefined) return;

      centerRaDec = [centerRa, centerDec];
      pixelScale = getDegsPerPixel(imageFile) * 60;

      if (pixelScale == undefined) return;

    }

    let width = pixelScale * getWidth(imageFile);
    let height = pixelScale * getHeight(imageFile);

    this.store.dispatch(
      new ImportFromSurvey(
        surveyDataProvider.id,
        centerRaDec[0],
        centerRaDec[1],
        width,
        height,
        this.corrGen.next())
    );
  }

  // onUseWcsCenterChange($event: MatCheckboxChange) {
  //   this.useWcsCenter = $event.checked;
  // }

  onUseWcsCenterChange($event: MatRadioChange) {
    this.useWcsCenter = $event.value == 'wcs';
  }

  moveToOtherView(viewer: Viewer) {
    this.store.dispatch(new MoveToOtherView(viewer.viewerId));
  }


}
