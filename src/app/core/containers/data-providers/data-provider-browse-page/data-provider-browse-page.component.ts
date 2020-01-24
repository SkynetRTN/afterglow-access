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

import { SlugifyPipe } from "../../../../pipes/slugify.pipe";
import { DataProvider } from "../../../../data-providers/models/data-provider";
import { DataProviderAsset } from "../../../../data-providers/models/data-provider-asset";

import { Subscription, Observable, combineLatest } from "rxjs";
import { filter, map, withLatestFrom, tap } from "rxjs/operators";
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
import { CorrelationIdGenerator } from '../../../../utils/correlated-action';
import { Store } from '@ngxs/store';
import { DataProvidersState } from '../../../../data-providers/data-providers.state';
import { SortDataProviderAssets, LoadDataProviders, LoadDataProviderAssets, ImportSelectedAssets } from '../../../../data-providers/data-providers.actions';

export class DataProviderAssetsDataSource
  implements DataSource<DataProviderAsset> {
  assets$: Observable<DataProviderAsset[]>;
  assets: DataProviderAsset[] = [];
  sub: Subscription;

  constructor(private store: Store) {
    this.assets$ = this.store.select(DataProvidersState.getCurrentAssets).pipe(
      map(assets => assets.slice(0).sort((a, b) => a.name.localeCompare(b.name)))
    );;
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
  sortField$: Observable<string>;
  sortOrder$: Observable<"" | "asc" | "desc">;
  importing$: Observable<boolean>;
  importProgress$: Observable<number>;
  importErrors$: Observable<any[]>;
  currentPathBreadcrumbs$: Observable<Array<{ name: string; url: string }>>;
  lastPath$: Observable<{[id: string]: string}>
  sort: MatSort;
  sortSub: Subscription;

  @ViewChild(MatSort, { static: false })
  set sortSetter(sort: MatSort) {
    if (!sort) return;
    this.sort = sort;
    if (this.sortSub) this.sortSub.unsubscribe();
    this.sortSub = this.sort.sortChange.subscribe(() => {
      this.store.dispatch(
        new SortDataProviderAssets(
          this.sort.active,
          this.sort.direction
        )
      );
    });
  }
  dataSource: DataProviderAssetsDataSource;
  selection = new SelectionModel<DataProviderAsset>(true, []);
  subs: Subscription[] = [];

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private slufigy: SlugifyPipe,
    private corrGen: CorrelationIdGenerator
  ) {
    this.dataProviders$ = store.select(DataProvidersState.getDataProviders);
    this.dataProvidersLoaded$ = store.select(DataProvidersState.getDataProvidersLoaded);
    this.currentProvider$ = store.select(DataProvidersState.getCurrentProvider);
    this.currentProviderColumns$ = this.currentProvider$.pipe(
      filter(provider => provider != null),
      map(provider => [
        "select",
        "name",
        ...provider.columns.map(col => col.fieldName)
      ])
    );
    this.loadingAssets$ = store.select(DataProvidersState.getLoadingAssets);
    this.currentPathBreadcrumbs$ = store.select(DataProvidersState.getCurrentPathBreadcrumbs);
    this.currentAssets$ = store.select(DataProvidersState.getCurrentAssets);
    this.sortField$ = store.select(DataProvidersState.getCurrentSortField);
    this.sortOrder$ = store.select(DataProvidersState.getCurrentSortOrder);
    this.importing$ = store.select(DataProvidersState.getImporting);
    this.importProgress$ = store.select(DataProvidersState.getImportProgress);
    this.lastPath$ = store.select(DataProvidersState.getLastPath);
    this.importErrors$ = store.select(DataProvidersState.getImportErrors);

    this.dataSource = new DataProviderAssetsDataSource(store);
  }

  ngOnInit() {
    this.subs.push(
      combineLatest(
        this.route.params,
        this.route.queryParams,
        this.dataProviders$
      )
        .pipe(withLatestFrom(this.dataProvidersLoaded$, this.lastPath$))
        .subscribe(
          ([[params, qparams, dataProviders], dataProvidersLoaded, lastPath]) => {
            if (!dataProvidersLoaded) {
              this.store.dispatch(new LoadDataProviders());
              return;
            }
            let slug: string = params["slug"];
            let dataProvider = dataProviders.find(
              provider => this.slufigy.transform(provider.name) == slug
            );
            if (dataProvider) {
              // if(!('path' in qparams) && dataProvider.id in lastPath) {
              //   console.log("navigating!!!");
              //   this.router.navigate(['data-providers', this.slufigy.transform(dataProvider.name), 'browse'], {queryParams: {...qparams, path: lastPath[dataProvider.id]}});
              // }
              // else {
              //   let path = qparams['path'];
              //   this.store.dispatch(
              //     new dataProviderActions.LoadDataProviderAssets({
              //       dataProvider: dataProvider,
              //       path: path
              //     })
              //   );
              //   this.selection.clear();
              //   //this.activeCell = null;
              // }
              let path = '';
              if('path' in qparams) {
                path = qparams['path'];
              }
              else if(dataProvider.id in lastPath) {
                path = lastPath[dataProvider.id];
                this.location.go(this.router.createUrlTree(['data-providers', this.slufigy.transform(dataProvider.name), 'browse'], {queryParams: {...qparams, path: lastPath[dataProvider.id]}}).toString())
              }
              this.store.dispatch(
                new LoadDataProviderAssets(
                  dataProvider,
                  path
                )
              );
              this.selection.clear();
              //this.activeCell = null;
            }
          }
        )
    );

    this.subs.push(
      combineLatest(this.importProgress$, this.importing$, this.importErrors$)
        .pipe(
          filter(([progress, importing, errors]) => !importing && progress == 100 && errors.length == 0)
        )
        .subscribe(v => {
          //this.router.navigate(["/workbench"]);
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

  import(provider: DataProvider, assets: DataProviderAsset[]) {
    this.store.dispatch(
      new ImportSelectedAssets(provider.id, assets, this.corrGen.next())
    );
  }

  navigateToCollection(path: string) {
    this.router.navigate([], { queryParams: { path: path } });
  }
}
