import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild
} from "@angular/core";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { Location } from "@angular/common";
import { MatSort } from "@angular/material/sort";
import { SelectionModel } from "@angular/cdk/collections";
import { CollectionViewer, DataSource } from "@angular/cdk/collections";

import { Store } from "@ngrx/store";
import * as fromRoot from "../../../../reducers";
import * as fromDataProviders from "../../../../data-providers/reducers";

import { SlugifyPipe } from "../../../../pipes/slugify.pipe";
import { DataProvider } from "../../../../data-providers/models/data-provider";
import { DataProviderAsset } from "../../../../data-providers/models/data-provider-asset";
import * as dataProviderActions from "../../../../data-providers/actions/data-provider";

import { Subscription, Observable, combineLatest } from "rxjs";
import { filter, map, withLatestFrom } from "rxjs/operators";
import {
  // UP_ARROW,
  // DOWN_ARROW,
  LEFT_ARROW,
  RIGHT_ARROW,
  TAB,
  A,
  Z,
  ZERO,
  NINE
} from "@angular/cdk/keycodes";

export class DataProviderAssetsDataSource
  implements DataSource<DataProviderAsset> {
  assets$: Observable<DataProviderAsset[]>;
  assets: DataProviderAsset[] = [];
  sub: Subscription;

  constructor(private store: Store<fromRoot.State>) {
    this.assets$ = store.select(fromDataProviders.getCurrentAssets);
  }

  connect(collectionViewer: CollectionViewer): Observable<DataProviderAsset[]> {
    this.sub = this.assets$.subscribe(assets => {
      this.assets = assets;
    });

    return this.assets$;
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.sub.unsubscribe();
  }
}

@Component({
  selector: "app-data-provider-browse-page",
  templateUrl: "./data-provider-browse-page.component.html",
  styleUrls: ["./data-provider-browse-page.component.css"]
})
export class DataProviderBrowsePageComponent
  implements OnInit, AfterViewInit, OnDestroy {
  dataProvidersLoaded$: Observable<boolean>;
  dataProviders$: Observable<DataProvider[]>;
  currentProvider$: Observable<DataProvider>;
  currentProviderColumns$: Observable<string[]>;
  loadingAssets$: Observable<boolean>;
  currentAssets$: Observable<DataProviderAsset[]>;
  selectedAssets$: Observable<DataProviderAsset[]>;
  sortField$: Observable<string>;
  sortOrder$: Observable<"" | "asc" | "desc">;
  importing$: Observable<boolean>;
  pendingImports$: Observable<DataProviderAsset[]>;
  completedImports$: Observable<DataProviderAsset[]>;
  importProgress$: Observable<number>;
  importErrors$: Observable<any[]>;
  currentPathBreadcrumbs$: Observable<Array<{ name: string; url: string }>>;
  sort: MatSort;
  sortSub: Subscription;

  @ViewChild(MatSort, { static: false })
  set sortSetter(sort: MatSort) {
    if (!sort) return;
    this.sort = sort;
    if (this.sortSub) this.sortSub.unsubscribe();
    this.sortSub = this.sort.sortChange.subscribe(() => {
      this.store.dispatch(
        new dataProviderActions.SortDataProviderAssets({
          fieldName: this.sort.active,
          order: this.sort.direction
        })
      );
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
    private slufigy: SlugifyPipe
  ) {
    let state$ = store.select(fromDataProviders.getDataProvidersState);
    this.dataProviders$ = store.select(fromDataProviders.getDataProviders);
    this.dataProvidersLoaded$ = store.select(
      fromDataProviders.getDataProvidersLoaded
    );
    this.currentProvider$ = store.select(fromDataProviders.getCurrentProvider);
    this.currentProviderColumns$ = this.currentProvider$.pipe(
      filter(provider => provider != null),
      map(provider => [
        "select",
        "name",
        ...provider.columns.map(col => col.fieldName)
      ])
    );
    this.loadingAssets$ = store.select(fromDataProviders.getLoadingAssets);
    this.currentPathBreadcrumbs$ = store.select(
      fromDataProviders.getCurrentPathBreadcrumbs
    );
    this.currentAssets$ = store.select(fromDataProviders.getCurrentAssets);
    this.selectedAssets$ = store.select(fromDataProviders.getSelectedAssets);
    this.sortField$ = store.select(fromDataProviders.getCurrentSortField);
    this.sortOrder$ = store.select(fromDataProviders.getCurrentSortOrder);
    this.importing$ = store.select(fromDataProviders.getImporting);
    this.importProgress$ = store.select(fromDataProviders.getImportProgress);
    this.pendingImports$ = store.select(fromDataProviders.getPendingImports);
    this.completedImports$ = store.select(
      fromDataProviders.getCompletedImports
    );
    this.importErrors$ = store.select(fromDataProviders.getImportErrors);

    this.dataSource = new DataProviderAssetsDataSource(store);
  }

  ngOnInit() {
    this.subs.push(
      combineLatest(
        this.route.params,
        this.route.queryParams,
        this.dataProviders$
      )
        .pipe(withLatestFrom(this.dataProvidersLoaded$))
        .subscribe(
          ([[params, qparams, dataProviders], dataProvidersLoaded]) => {
            if (!dataProvidersLoaded) {
              this.store.dispatch(new dataProviderActions.LoadDataProviders());
              return;
            }
            let slug: string = params["slug"];
            let dataProvider = dataProviders.find(
              provider => this.slufigy.transform(provider.name) == slug
            );
            if (dataProvider) {
              this.store.dispatch(
                new dataProviderActions.LoadDataProviderAssets({
                  dataProvider: dataProvider,
                  path: qparams["path"]
                })
              );
              this.selection.clear();
              //this.activeCell = null;
            }
          }
        )
    );

    this.subs.push(
      this.completedImports$.subscribe(completedImports => {
        completedImports.forEach(asset => {
          this.selection.deselect(asset);
        });
      })
    );

    this.subs.push(
      this.importProgress$
        .pipe(
          withLatestFrom(this.importErrors$),
          filter(([progress, errors]) => progress == 1 && errors.length == 0)
        )
        .subscribe(v => {
          this.router.navigate(["/workbench"]);
        })
    );
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  showSelectAll() {
    return (
      this.dataSource &&
      this.dataSource.assets &&
      this.dataSource.assets.filter(asset => !asset.collection).length != 0
    );
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.assets.filter(asset => !asset.collection)
      .length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.assets
          .filter(asset => !asset.collection)
          .forEach(row => this.selection.select(row));
  }

  onRowClick(row: DataProviderAsset) {
    if (!row.collection) this.selection.toggle(row);
  }

  onSpaceSelect($event: KeyboardEvent, row: DataProviderAsset) {
    if (row.collection) return;

    this.selection.toggle(row);
    $event.preventDefault();
  }

  isArray(value: any) {
    return Array.isArray(value);
  }

  import() {
    this.store.dispatch(
      new dataProviderActions.ImportAssets({ assets: this.selection.selected })
    );
  }

  navigateToCollection(path: string) {
    this.router.navigate([], { queryParams: { path: path } });
  }
}
