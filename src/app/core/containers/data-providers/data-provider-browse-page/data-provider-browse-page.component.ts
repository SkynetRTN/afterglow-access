import { Component, OnInit, AfterViewInit, OnDestroy, Optional, Inject, ViewChild } from '@angular/core';
import { DOCUMENT, DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatCheckboxChange, MatTableDataSource, MatSort, Sort } from '@angular/material';
import { ENTER, SPACE, UP_ARROW, DOWN_ARROW } from '@angular/cdk/keycodes';
import { SelectionModel } from '@angular/cdk/collections';
import { CollectionViewer, DataSource } from "@angular/cdk/collections";

import { Store } from '@ngrx/store';
import * as fromRoot from '../../../../reducers';
import * as fromDataProviders from '../../../../data-providers/reducers'

import { SlugifyPipe } from '../../../../pipes/slugify.pipe';
import { DataProvider } from '../../../../data-providers/models/data-provider';
import { DataProviderAsset } from '../../../../data-providers/models/data-provider-asset';
import * as dataProviderActions from '../../../../data-providers/actions/data-provider';

import { Subscription } from 'rxjs/Rx';
import { Observable } from 'rxjs/Rx';

export class DataProviderAssetsDataSource implements DataSource<DataProviderAsset> {
  assets$: Observable<DataProviderAsset[]>;
  assets: DataProviderAsset[] = [];
  sub: Subscription;

  constructor(private store: Store<fromRoot.State>) {
    this.assets$ = store.select(fromDataProviders.getCurrentAssets);

    this.sub = this.assets$
      .subscribe(assets => this.assets = assets);
  }

  connect(collectionViewer: CollectionViewer): Observable<DataProviderAsset[]> {
    return this.assets$;
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.sub.unsubscribe();
  }

}

@Component({
  selector: 'app-data-provider-browse-page',
  templateUrl: './data-provider-browse-page.component.html',
  styleUrls: ['./data-provider-browse-page.component.css']
})
export class DataProviderBrowsePageComponent implements OnInit, AfterViewInit, OnDestroy {

  dataProviders$: Observable<DataProvider[]>;
  currentProvider$: Observable<DataProvider>;
  loadingAssets$: Observable<boolean>;
  currentAssets$: Observable<DataProviderAsset[]>;
  selectedAssets$: Observable<DataProviderAsset[]>;
  sortField$: Observable<string>;
  sortOrder$: Observable<'' | 'asc' | 'desc'>;
  importing$: Observable<boolean>;
  pendingImports$: Observable<DataProviderAsset[]>;
  completedImports$: Observable<DataProviderAsset[]>;
  importProgress$: Observable<number>;
  importErrors$: Observable<any[]>;
  currentPathBreadcrumbs$: Observable<Array<{ name: string, url: string }>>;
  sort: MatSort;
  sortSub: Subscription;

  @ViewChild(MatSort) set sortSetter(sort: MatSort) {
    if (!sort) return;
    this.sort = sort;
    if (this.sortSub) this.sortSub.unsubscribe();
    this.sortSub = this.sort.sortChange
      .subscribe(() => {
        this.store.dispatch(new dataProviderActions.SortDataProviderAssets({ fieldName: this.sort.active, order: this.sort.direction }))
      });
  }
  dataSource: DataProviderAssetsDataSource;
  selection = new SelectionModel<DataProviderAsset>(true, []);
  subs: Subscription[] = [];


  constructor(
    private store: Store<fromRoot.State>,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private slufigy: SlugifyPipe) {

    let state$ = store.select(fromDataProviders.getDataProvidersState);
    this.dataProviders$ = store.select(fromDataProviders.getDataProviders);
    this.currentProvider$ = store.select(fromDataProviders.getCurrentProvider);
    this.loadingAssets$ = store.select(fromDataProviders.getLoadingAssets);
    this.currentPathBreadcrumbs$ = store.select(fromDataProviders.getCurrentPathBreadcrumbs);
    this.currentAssets$ = store.select(fromDataProviders.getCurrentAssets);
    this.selectedAssets$ = store.select(fromDataProviders.getSelectedAssets);
    this.sortField$ = store.select(fromDataProviders.getCurrentSortField);
    this.sortOrder$ = store.select(fromDataProviders.getCurrentSortOrder);
    this.importing$ = store.select(fromDataProviders.getImporting);
    this.importProgress$ = store.select(fromDataProviders.getImportProgress);
    this.pendingImports$ = store.select(fromDataProviders.getPendingImports);
    this.completedImports$ = store.select(fromDataProviders.getCompletedImports);
    this.importErrors$ = store.select(fromDataProviders.getImportErrors);

    this.dataSource = new DataProviderAssetsDataSource(store);
  }

  ngOnInit() {
    this.store.dispatch(new dataProviderActions.LoadDataProviders());

    this.subs.push(Observable.combineLatest(this.route.params, this.route.queryParams, this.dataProviders$)
      .subscribe(([params, qparams, dataProviders]) => {
        let slug: string = params['slug'];
        let dataProvider = dataProviders.find(provider => this.slufigy.transform(provider.name) == slug);
        if (dataProvider) {
          this.store.dispatch(new dataProviderActions.LoadDataProviderAssets({ dataProvider: dataProvider, path: qparams['path'] }))
          this.selection.clear();
        }
      }));

    this.subs.push(this.completedImports$.subscribe(completedImports => {
      completedImports.forEach(asset => {
        this.selection.deselect(asset);
      })
    }))
  }

  ngAfterViewInit() {
    
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  showSelectAll() {
    return this.dataSource && this.dataSource.assets && this.dataSource.assets.filter(asset => !asset.collection).length != 0;
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.assets.filter(asset => !asset.collection).length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.assets.filter(asset => !asset.collection).forEach(row => this.selection.select(row));
  }

  onRowClick(row: DataProviderAsset) {
    if (!row.collection) this.selection.toggle(row);
  }

  getDataProviderColumns(dataProvider: DataProvider) {
    return ['select', 'name', ...dataProvider.columns.map(col => col.fieldName)];
  }

  isArray(value: any) {
    return Array.isArray(value);
  }

  import() {
    this.store.dispatch(new dataProviderActions.ImportAssets({ assets: this.selection.selected }));
  }

}




// onSortChange(sort: Sort) {
  // const assets = this.dataSource.data.slice();
  // if (!sort.active || sort.direction == '') {
  //   this.dataSource.data = assets;
  //   return;
  // }

  // let sortField = sort.active;
  // let isAsc = sort.direction == 'asc'
  // if(0 in assets.map(asset => sortField in asset.metadata ? 1 : 0)) sortField = 'name';

  // this.dataSource.data = assets.sort((a,b) => {
  //   if(sortField != 'name') {
  //     return (a[sortField] < b[sortField] ? -1 : 1) * (isAsc ? 1 : -1);
  //   }

  //   if (a.collection != b.collection) {
  //     return a.collection ? -1 : 1;
  //   }

  //   return (a.name < b.name ? -1 : 1) * (isAsc ? 1 : -1);
  // })
// }
