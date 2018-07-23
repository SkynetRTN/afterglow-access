import { Component, OnInit, ViewChild, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';

import { DataFile } from '../../../data-files/models/data-file'
import { AuthGuard } from '../../../auth/services/auth-guard.service'
import { ViewerPageComponent } from './viewer-page/viewer-page.component'
import { PlotterPageComponent } from './plotter-page/plotter-page.component';
import { SonifierPageComponent } from './sonifier-page/sonifier-page.component';
import { SourceExtractorPageComponent } from './source-extractor-page/source-extractor-page.component';
import { SidebarView } from '../../models/sidebar-view';

import * as fromRoot from '../../../reducers';
import * as fromDataFiles from '../../../data-files/reducers'
import * as fromCore from '../../reducers';
import * as workbenchActions from '../../actions/workbench'
import * as dataFileActions from '../../../data-files/actions/data-file';
import { Router } from '@angular/router';
import { FocusKeyManager } from '@angular/cdk/a11y';
import { QueryList } from '@angular/core/src/linker/query_list';
import { ContentChildren } from '@angular/core/src/metadata/di';
import { DataFileSelectionListChange } from '../../../data-files/components/data-file-selection-list/data-file-selection-list.component';
import { Viewer } from '../../models/viewer';
import { ImageFileState } from '../../models/image-file-state';
import { Dictionary } from '@ngrx/entity/src/models';
import { Subscription } from '../../../../../node_modules/rxjs';
import { HotkeysService, Hotkey } from '../../../../../node_modules/angular2-hotkeys';



@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrls: ['./workbench.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkbenchComponent implements OnInit, OnDestroy {

  private VIEWER_ROUTE = '/workbench/viewer';
  private PLOTTER_ROUTE = '/workbench/plotter';
  private SONIFIER_ROUTE = '/workbench/sonifier';
  private SOURCE_EXTRACTOR_ROUTE = '/workbench/source-extractor';
  private IMAGE_ARITHMETIC_ROUTE = '/workbench/image-calculator';
  private ALIGNER_ROUTE = '/workbench/aligner';
  private STACKER_ROUTE = '/workbench/stacker';

  private files$: Observable<Array<DataFile>>;
  private selectedFile$: Observable<DataFile>;
  private multiFileSelectionEnabled$: Observable<boolean>;
  private showSidebar$: Observable<boolean>;
  private showConfig$: Observable<boolean>;
  private showConfig: boolean;
  private sidebarView$: Observable<SidebarView>;
  private loading$: Observable<boolean>;
  private fileFilterString: string = '';
  private subs: Subscription[] = [];

  private currentSidebarView: SidebarView = SidebarView.FILES;
  private SidebarView = SidebarView;
  private hotKeys: Array<Hotkey> = [];

  constructor(private store: Store<fromRoot.State>, private router: Router, private _hotkeysService: HotkeysService) {
    this.files$ = this.store.select(fromDataFiles.getAllDataFiles);
    this.selectedFile$ = this.store.select(fromCore.workbench.getActiveFile);

    this.multiFileSelectionEnabled$ = this.store.select(fromCore.workbench.getMultiFileSelectionEnabled);
    this.sidebarView$ = this.store.select(fromCore.workbench.getSidebarView);
    this.showConfig$ = this.store.select(fromCore.workbench.getShowConfig);
    this.showSidebar$ = this.store.select(fromCore.workbench.getShowSidebar);
    this.loading$ = this.store.select(fromDataFiles.getLibraryLoading);

    this.subs.push(this.showConfig$.subscribe(showConfig => this.showConfig = showConfig));

    this.hotKeys.push(new Hotkey('d', (event: KeyboardEvent): boolean => {
      this.router. navigate([this.VIEWER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Display Settings'))


    this.hotKeys.push(new Hotkey('p', (event: KeyboardEvent): boolean => {
      this.router. navigate([this.PLOTTER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Plotter Settings'));

    this.hotKeys.push(new Hotkey('s', (event: KeyboardEvent): boolean => {
      this.router. navigate([this.SONIFIER_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Sonifier Settings'));

    this.hotKeys.push(new Hotkey('e', (event: KeyboardEvent): boolean => {
      this.router. navigate([this.SOURCE_EXTRACTOR_ROUTE]);
      return false; // Prevent bubbling
    }, undefined, 'Extractor Settings'));

    this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));


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
    this.store.dispatch(new dataFileActions.LoadLibrary());
  }

  ngOnDestroy() {
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
  }

  onFileSelect(file: DataFile) {
    if(!file) return;
    this.store.dispatch(new workbenchActions.SelectDataFile({file: file}));
  }

  onMultiFileSelect(files: Array<DataFile>) {
    if(!files) return;
    this.store.dispatch(new workbenchActions.SetMultiFileSelection({files: files}));
  }

  removeAllFiles() {
    this.store.dispatch(new dataFileActions.RemoveAllDataFiles());
  }

  refresh() {
    this.store.dispatch(new dataFileActions.LoadLibrary());
  }

  setSidebarView(value: SidebarView) {
    this.store.dispatch(new workbenchActions.SetSidebarView({ sidebarView: value }))
  }

  onClickWorkbenchNav(isActiveUrl: boolean) {
    if (isActiveUrl) {
      // toggle
      this.store.dispatch(new workbenchActions.ToggleShowConfig());
    }
    else {
      // show
      this.store.dispatch(new workbenchActions.SetShowConfig({ showConfig: true }));
    }
  }

  onWorkbenchNavClick(route: string) {
    if (this.router.isActive(route, false)) {
      // toggle
      this.store.dispatch(new workbenchActions.ToggleShowConfig());
    }
    else {
      // show
      this.store.dispatch(new workbenchActions.SetShowConfig({ showConfig: true }));
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
