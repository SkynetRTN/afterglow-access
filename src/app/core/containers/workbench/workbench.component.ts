import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';

import { DataFile, ImageFile, getWidth, getHeight, getRaHours, getDecDegs, getDegsPerPixel } from '../../../data-files/models/data-file'
import { SidebarView } from '../../models/sidebar-view';
import { Router } from '@angular/router';
import { Subscription } from '../../../../../node_modules/rxjs';
import { HotkeysService, Hotkey } from '../../../../../node_modules/angular2-hotkeys';
import { MatDialog } from '@angular/material/dialog';
import { Store, Actions, ofActionCompleted, ofActionSuccessful } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { WorkbenchState } from '../../workbench.state';
import { SetShowConfig, SetFullScreen, SetFullScreenPanel, ShowSidebar, LoadCatalogs, LoadFieldCals, SelectDataFile, SetSidebarView, ToggleShowConfig, SetViewMode, SetActiveViewer, SetViewerSyncEnabled, SetNormalizationSyncEnabled, ImportFromSurvey, UpdatePhotometryPageSettings } from '../../workbench.actions';
import { LoadLibrary, RemoveAllDataFiles, RemoveDataFile } from '../../../data-files/data-files.actions';
import { LoadDataProviders } from '../../../data-providers/data-providers.actions';
import { tap, map, withLatestFrom, filter } from 'rxjs/operators';
import { ViewMode } from "../../models/view-mode";
import { MatButtonToggleChange, MatCheckboxChange, MatRadioChange } from '@angular/material';
import { Viewer } from '../../models/viewer';
import { DataProvider } from '../../../data-providers/models/data-provider';
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import { DataProvidersState } from '../../../data-providers/data-providers.state';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';



@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrls: ['./workbench.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkbenchComponent implements OnInit, OnDestroy {

  private VIEWER_ROUTE = '/workbench/viewer';
  private MARKER_ROUTE = '/workbench/markers';
  private FILE_INFO_ROUTE = '/workbench/file-info';
  private PLOTTER_ROUTE = '/workbench/plotter';
  private SONIFIER_ROUTE = '/workbench/sonifier';
  private FIELD_CAL_ROUTE = '/workbench/field-cal';
  private PHOTOMETRY_ROUTE = '/workbench/photometry';
  private IMAGE_ARITHMETIC_ROUTE = '/workbench/image-calculator';
  private ALIGNER_ROUTE = '/workbench/aligner';
  private STACKER_ROUTE = '/workbench/stacker';

  ViewMode = ViewMode;

  files$: Observable<Array<DataFile>>;
  private selectedFile$: Observable<DataFile>;
  fxShowSidebar$: Observable<boolean>;
  fxShowTool$: Observable<boolean>;
  showSidebar$: Observable<boolean>;
  surveyDataProvider$: Observable<DataProvider>;
  surveyImportCorrId$: Observable<string>;

  useWcsCenter: boolean = false;
  viewMode$: Observable<ViewMode>;
  viewers$: Observable<Viewer[]>;
  viewerSyncEnabled$: Observable<boolean>;
  normalizationSyncEnabled$: Observable<boolean>;
  activeViewerId$: Observable<string>;
  activeViewer$: Observable<Viewer>;
  private showConfig$: Observable<boolean>;
  private showConfig: boolean;
  sidebarView$: Observable<SidebarView>;
  private loading$: Observable<boolean>;
  private fileFilterString: string = '';
  private subs: Subscription[] = [];
  fileEntities$: Observable<{ [id: string]: DataFile }>;
  imageFile$: Observable<ImageFile>;

  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  dssImportLoading$: Observable<boolean>;


  private currentSidebarView: SidebarView = SidebarView.FILES;
  SidebarView = SidebarView;
  private hotKeys: Array<Hotkey> = [];

  constructor(private actions$: Actions, private store: Store, private router: Router, private _hotkeysService: HotkeysService, public dialog: MatDialog, private corrGen: CorrelationIdGenerator) {
    this.fileEntities$ = this.store.select(DataFilesState.getEntities);
    this.files$ = this.store.select(DataFilesState.getDataFiles).pipe(
      map(files => files.sort((a, b) => a.name.localeCompare(b.name)))
    );
    this.selectedFile$ = this.store.select(WorkbenchState.getActiveImageFile);
    this.viewers$ = this.store.select(WorkbenchState.getViewers);
    this.sidebarView$ = this.store.select(WorkbenchState.getSidebarView);
    this.showConfig$ = this.store.select(WorkbenchState.getShowConfig);
    this.showSidebar$ = this.store.select(WorkbenchState.getShowSidebar);
    this.loading$ = this.store.select(DataFilesState.getLoading);
    this.viewMode$ = this.store.select(WorkbenchState.getViewMode);
    this.activeViewerId$ = this.store.select(WorkbenchState.getActiveViewerId);
    this.activeViewer$ = this.store.select(WorkbenchState.getActiveViewer);
    this.imageFile$ = store.select(WorkbenchState.getActiveImageFile);
    this.dssImportLoading$ = store.select(WorkbenchState.getDssImportLoading);
    this.surveyDataProvider$ = this.store.select(DataProvidersState.getDataProviders).pipe(
      map(dataProviders => dataProviders.find(dp => dp.name == 'Imaging Surveys'))
    );

    this.viewerSyncEnabled$ = store.select(
      WorkbenchState.getViewerSyncEnabled
    );
    this.normalizationSyncEnabled$ = store.select(
      WorkbenchState.getNormalizationSyncEnabled
    );

    this.subs.push(this.showConfig$.subscribe(showConfig => this.showConfig = showConfig));

    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);

    this.hotKeys.push(new Hotkey('d', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router.navigate([this.VIEWER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Display Settings'))

    this.hotKeys.push(new Hotkey('i', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router.navigate([this.FILE_INFO_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'File Info'));

    this.hotKeys.push(new Hotkey('m', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router.navigate([this.MARKER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Markers'));

    this.hotKeys.push(new Hotkey('P', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router.navigate([this.PLOTTER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Plotter'));

    this.hotKeys.push(new Hotkey('s', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router.navigate([this.SONIFIER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Sonifier'));

    // this.hotKeys.push(new Hotkey('f', (event: KeyboardEvent): boolean => {
    //   this.store.dispatch(new SetShowConfig(true));
    //   this.router.navigate([this.FIELD_CAL_ROUTE]);
    //   return false; // Prevent bubbling
    // }, undefined, 'Field Calibration'));

    this.hotKeys.push(new Hotkey('p', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.PHOTOMETRY_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Photometry'));

    this.hotKeys.push(new Hotkey('/', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router.navigate([this.IMAGE_ARITHMETIC_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Image Arithmetic'));

    this.hotKeys.push(new Hotkey('a', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router.navigate([this.ALIGNER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Aligning'));

    this.hotKeys.push(new Hotkey('S', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router.navigate([this.STACKER_ROUTE]);
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



  ngOnInit() {

    this.store.dispatch([new LoadLibrary(), new LoadCatalogs(), new LoadFieldCals(), new LoadDataProviders()]);

  }

  ngOnDestroy() {
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
  }

  onFileSelect(file: DataFile) {
    if (!file) return;

    this.store.dispatch(new SelectDataFile(file.id));
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

  onWorkbenchNavClick(route: string) {
    if (this.router.isActive(route, false)) {
      // toggle
      this.store.dispatch(new ToggleShowConfig());
    }
    else {
      // show
      this.store.dispatch(new SetShowConfig(true));
    }
    this.router.navigate([route]);
  }


  /* for data file selection list */
  trackByFn(index, item) {
    return item.id; // or item.id
  }

  getToolbarTooltip(route: string, base: string) {
    return (this.showConfig && this.router.isActive(route, false) ? 'Hide ' : 'Show ') + base;
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
      pixelScale = getDegsPerPixel(imageFile)*60;

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


}
