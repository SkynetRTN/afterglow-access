import { Component, OnInit, AfterViewInit, OnDestroy, Optional, Inject } from '@angular/core';
import { DOCUMENT, DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Location }               from '@angular/common';
import { MatCheckboxChange } from '@angular/material';
import { ENTER, SPACE, UP_ARROW, DOWN_ARROW } from '@angular/cdk/keycodes';
import { ITdDataTableColumn, ITdDataTableSortChangeEvent, TdDataTableSortingOrder } from '@covalent/core';
import { TdDialogService } from '@covalent/core';

import { Store } from '@ngrx/store';
import * as fromRoot from '../../../../reducers';
import * as fromDataProviders from '../../../../data-providers/reducers'

import { SlugifyPipe } from '../../../../pipes/slugify.pipe';
import { DataProvider } from '../../../../data-providers/models/data-provider';
import { DataProviderAsset } from '../../../../data-providers/models/data-provider-asset';
import * as dataProviderActions from '../../../../data-providers/actions/data-provider';

import { Subscription } from 'rxjs/Rx';
import { Observable } from 'rxjs/Rx';
import { TdDataTableCellComponent } from '@covalent/core/data-table/data-table-cell/data-table-cell.component';

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
  sortOrder$: Observable<TdDataTableSortingOrder>;
  currentPathBreadcrumbs$: Observable<Array<{name: string, url: string}>>;
  routeParamSub: Subscription;

  selectAllIndeterminate: boolean = false;
  allSelected: boolean = false;
  

  constructor(
    private store: Store<fromRoot.State>,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private slufigy: SlugifyPipe,
    @Optional() @Inject(DOCUMENT) private _document: any,) {
      let state$ = store.select(fromDataProviders.getDataProvidersState);
      this.dataProviders$ =  store.select(fromDataProviders.getDataProviders);
      this.currentProvider$ =  store.select(fromDataProviders.getCurrentProvider);
      this.loadingAssets$ = store.select(fromDataProviders.getLoadingAssets);
      this.currentPathBreadcrumbs$ =  store.select(fromDataProviders.getCurrentPathBreadcrumbs);
      this.currentAssets$ =  store.select(fromDataProviders.getCurrentAssets);
      this.selectedAssets$ =  store.select(fromDataProviders.getSelectedAssets);
      this.sortField$ =  store.select(fromDataProviders.getCurrentSortField);
      this.sortOrder$ =  store.select(fromDataProviders.getCurrentSortOrder);
  }

  ngOnInit() {
    this.store.dispatch(new dataProviderActions.LoadDataProviders());
    this.routeParamSub = Observable.combineLatest(this.route.params, this.route.queryParams, this.dataProviders$)
    .subscribe(([params, qparams, dataProviders]) => {
      let slug : string = params['slug'];
      let dataProvider = dataProviders.find(provider => this.slufigy.transform(provider.name) == slug);
      if(dataProvider) {
        this.store.dispatch(new dataProviderActions.LoadDataProviderAssets({dataProvider: dataProvider, path: qparams['path']}))
      }
    });
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.routeParamSub.unsubscribe();
  }

  rowKeyup(event: KeyboardEvent, asset: DataProviderAsset): void {
    switch (event.keyCode) {
      case ENTER:
      case SPACE:
        if(asset.collection) return;
        this.store.dispatch(new dataProviderActions.ToggleDataProviderAssetSelect({asset: asset}));
        break;
      // case UP_ARROW:
      //   /**
      //    * if users presses the up arrow, we focus the prev row
      //    * unless its the first row
      //    */
      //   if (index > 0) {
      //     this._rows.toArray()[index - 1].focus();
      //   }
      //   this.blockEvent(event);
      //   if (this.selectable && this.multiple && event.shiftKey && this.fromRow + index >= 0) {
      //     this._doSelection(this._data[this.fromRow + index], this.fromRow + index);
      //   }
      //   break;
      // case DOWN_ARROW:
      //   /**
      //    * if users presses the down arrow, we focus the next row
      //    * unless its the last row
      //    */
      //   if (index < (this._rows.toArray().length - 1)) {
      //     this._rows.toArray()[index + 1].focus();
      //   }
      //   this.blockEvent(event);
      //   if (this.selectable && this.multiple && event.shiftKey && this.fromRow + index < this._data.length) {
      //     this._doSelection(this._data[this.fromRow + index], this.fromRow + index);
      //   }
      //   break;
      default:
        // default
    }
  }

    /**
   * Overrides the onselectstart method of the document so other text on the page
   * doesn't get selected when doing shift selections.
   */
  disableTextSelection(): void {
    if (this._document) {
      this._document.onselectstart = function(): boolean {
        return false;
      };
    }
  }

  /**
   * Resets the original onselectstart method.
   */
  enableTextSelection(): void {
    if (this._document) {
      this._document.onselectstart = undefined;
    }
  }

  blockEvent(event: Event): void {
    event.preventDefault();
  }

   /**
   * Selects or clears all rows depending on 'checked' value.
   */
  onSelectAll(checked: boolean): void {
    let toggledRows: any[] = [];
    if (checked) {
      this.allSelected = true;
      this.selectAllIndeterminate = true;
      this.store.dispatch(new dataProviderActions.SelectAllDataProviderAssets({}));
    } else {
      this.allSelected = false;
      this.selectAllIndeterminate = false;
      this.store.dispatch(new dataProviderActions.DeselectAllDataProviderAssets({}));
    }
  }

  onAssetClick($event: Event, asset: DataProviderAsset) {
    console.log('row click', $event, asset);
    if(asset.collection) return;
    this.store.dispatch(new dataProviderActions.ToggleDataProviderAssetSelect({asset: asset}));
  }

  import() {
    this.store.dispatch(new dataProviderActions.ImportSelectedAssets());
  }

  onSortChange($event: ITdDataTableSortChangeEvent) {
    let newSortOrder = TdDataTableSortingOrder.Ascending;
    if($event.order == TdDataTableSortingOrder.Ascending ) {
      newSortOrder = TdDataTableSortingOrder.Descending;
    }
    
    this.store.dispatch(new dataProviderActions.SortDataProviderAssets({fieldName: $event.name, order: newSortOrder}))
  }

  // selectAsset(asset: DataProviderAsset) {
  //   this.dataProviderStore.selectAsset(asset);
  // }

  // deselectAsset(asset: DataProviderAsset) {
  //   this.dataProviderStore.deselectAsset(asset);
  // }

  // import( ) {
  //   let obs = this.dataProviderStore.importSelectedAssets().flatMap(r => this.fileLibraryStore.loadLibrary());
  //   obs.subscribe(r => {
  //     this.router.navigate(['/workbench']);
  //   })
  // }

  

}
