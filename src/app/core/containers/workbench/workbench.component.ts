import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';

import { DataFile } from '../../../data-files/models/data-file'
import { AuthGuard } from '../../../auth/services/auth-guard.service'
import { MenuType } from '../../components/navbar/navbar.metadata';
import { ViewerPageComponent } from './viewer-page/viewer-page.component'
import { PlotterPageComponent } from './plotter-page/plotter-page.component';
import { SonifierPageComponent } from './sonifier-page/sonifier-page.component';
import { SourceExtractorPageComponent } from './source-extractor-page/source-extractor-page.component';

import * as fromRoot from '../../../reducers';
import * as fromDataFiles from '../../../data-files/reducers'
import * as fromCore from '../../reducers';
import * as workbenchActions from '../../actions/workbench'
import * as dataFileActions from '../../../data-files/actions/data-file';

export const workbenchRoutes = [
  {path: 'viewer', title: 'Viewer', component: ViewerPageComponent, canActivate: [AuthGuard], menuType: MenuType.LEFT},
  {path: 'plotter', title: 'Plotter', component: PlotterPageComponent, canActivate: [AuthGuard], menuType: MenuType.LEFT},
  {path: 'sonifier', title: 'Sonifier', component: SonifierPageComponent, canActivate: [AuthGuard], menuType: MenuType.LEFT},
  {path: 'source-analyzer', title: 'Source Analyzer', component: SourceExtractorPageComponent, canActivate: [AuthGuard], menuType: MenuType.LEFT},
  // {path: 'catalog-calibrator', title: 'Catalog Calibrator', component: CatalogCalibratorPageComponent, canActivate: [AuthGuard], menuType: MenuType.LEFT},
  {path: '',  redirectTo: 'viewer', pathMatch: 'full', menuType: MenuType.HIDDEN},
]

@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrls: ['./workbench.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkbenchComponent implements OnInit {

  private files$: Observable<Array<DataFile>>;
  private selectedFile$: Observable<DataFile>;
  private loading$: Observable<boolean>;
  private fileFilterString: string = '';
  private showSearch: boolean = false;

  private routes: any[];
  

  constructor(private store: Store<fromRoot.State>) {
    this.routes = workbenchRoutes;

    this.files$ = this.store.select(fromDataFiles.getAllDataFiles);
    this.selectedFile$ = this.store.select(fromCore.workbench.getFile);
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

  onFileSelect(file: DataFile) {
    this.store.dispatch(new workbenchActions.SelectDataFile(file.id));
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
    if(!this.showSearch) this.fileFilterString = '';
  }

  removeAllFiles() {
    this.store.dispatch(new dataFileActions.RemoveAllDataFiles());
  }

  refresh() {
    this.store.dispatch(new dataFileActions.LoadLibrary());
  }

}
