import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';

import { DataFile } from '../../../data-files/models/data-file'
import { SidebarView } from '../../models/sidebar-view';
import { Router } from '@angular/router';
import { Subscription } from '../../../../../node_modules/rxjs';
import { HotkeysService, Hotkey } from '../../../../../node_modules/angular2-hotkeys';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { WorkbenchState } from '../../workbench.state';
import { SetShowConfig, SetFullScreen, SetFullScreenPanel, ShowSidebar, LoadCatalogs, LoadFieldCals, SelectDataFile, SetMultiFileSelection, SetSidebarView, ToggleShowConfig } from '../../workbench.actions';
import { LoadLibrary, RemoveAllDataFiles } from '../../../data-files/data-files.actions';
import { LoadDataProviders } from '../../../data-providers/data-providers.actions';



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
  private SOURCE_EXTRACTOR_ROUTE = '/workbench/source-extractor';
  private FIELD_CAL_ROUTE = '/workbench/field-cal';
  private IMAGE_ARITHMETIC_ROUTE = '/workbench/image-calculator';
  private ALIGNER_ROUTE = '/workbench/aligner';
  private STACKER_ROUTE = '/workbench/stacker';

  files$: Observable<Array<DataFile>>;
  private selectedFile$: Observable<DataFile>;
  private multiFileSelectionEnabled$: Observable<boolean>;
  fxShowSidebar$: Observable<boolean>;
  fxShowTool$: Observable<boolean>;
  showSidebar$: Observable<boolean>;
  private showConfig$: Observable<boolean>;
  private showConfig: boolean;
  sidebarView$: Observable<SidebarView>;
  private loading$: Observable<boolean>;
  private fileFilterString: string = '';
  private subs: Subscription[] = [];

  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;

  private currentSidebarView: SidebarView = SidebarView.FILES;
  SidebarView = SidebarView;
  private hotKeys: Array<Hotkey> = [];

  constructor(private store: Store, private router: Router, private _hotkeysService: HotkeysService, public dialog: MatDialog) {
    this.files$ = this.store.select(DataFilesState.getDataFiles);
    this.selectedFile$ = this.store.select(WorkbenchState.getActiveImageFile);

    this.multiFileSelectionEnabled$ = this.store.select(WorkbenchState.getMultiFileSelectionEnabled);
    this.sidebarView$ = this.store.select(WorkbenchState.getSidebarView);
    this.showConfig$ = this.store.select(WorkbenchState.getShowConfig);
    this.showSidebar$ = this.store.select(WorkbenchState.getShowSidebar);
    this.loading$ = this.store.select(DataFilesState.getLoading);

    this.subs.push(this.showConfig$.subscribe(showConfig => this.showConfig = showConfig));

    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);

    this.hotKeys.push(new Hotkey('d', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.VIEWER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Display Settings'))

    this.hotKeys.push(new Hotkey('i', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.FILE_INFO_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'File Info'));

    this.hotKeys.push(new Hotkey('m', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.MARKER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Markers'));

    this.hotKeys.push(new Hotkey('c', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.PLOTTER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Plotter'));

    this.hotKeys.push(new Hotkey('s', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.SONIFIER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Sonifier'));

    this.hotKeys.push(new Hotkey('f', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.FIELD_CAL_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Field Calibration'));

    this.hotKeys.push(new Hotkey('p', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.SOURCE_EXTRACTOR_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Photometry'));

    this.hotKeys.push(new Hotkey('o', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.IMAGE_ARITHMETIC_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Image Arithmetic'));

    this.hotKeys.push(new Hotkey('a', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.ALIGNER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Aligning'));

    this.hotKeys.push(new Hotkey('z', (event: KeyboardEvent): boolean => {
      this.store.dispatch(new SetShowConfig(true));
      this.router. navigate([this.STACKER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Stacking'));

    

    // this.hotKeys.push(new Hotkey('0', (event: KeyboardEvent): boolean => {
    //   this.store.dispatch(new SetFullScreen({value: false}))
    //   return false; // Prevent bubbling
    // }, undefined, 'Show all workbench panels'));

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
    if(!file) return;
    
    this.store.dispatch(new SelectDataFile(file.id));
  }

  onMultiFileSelect(files: Array<DataFile>) {
    if(!files) return;
    this.store.dispatch(new SetMultiFileSelection(files.map(f => f.id)));
  }

  removeAllFiles() {
    this.store.dispatch(new RemoveAllDataFiles());
  }

  refresh() {
    this.store.dispatch(new LoadLibrary());
  }

  setSidebarView(value: SidebarView) {
    this.store.dispatch(new SetSidebarView(value))
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

}
