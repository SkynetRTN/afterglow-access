import {
  Component, OnInit, AfterViewInit, Renderer, Output, EventEmitter, OnDestroy, Optional,
  Inject, ViewChild, Directive, HostListener, ContentChildren, QueryList, ViewChildren, ElementRef,
  Attribute, Input, AfterContentInit, forwardRef, ContentChild, OnChanges
} from '@angular/core';
import { DOCUMENT, DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MatCheckboxChange, MatTableDataSource, MatSort, Sort, MatCell, MatRow, MatColumnDef, MatHeaderCell, MatTable, MatCheckbox, MatSortHeader } from '@angular/material';
import { ENTER, SPACE, UP_ARROW, DOWN_ARROW } from '@angular/cdk/keycodes';
import { SelectionModel } from '@angular/cdk/collections';
import { CollectionViewer, DataSource } from "@angular/cdk/collections";
import { FocusableOption, FocusKeyManager } from '@angular/cdk/a11y'

import { Store } from '@ngrx/store';
import * as fromRoot from '../../../../reducers';
import * as fromDataProviders from '../../../../data-providers/reducers'

import { SlugifyPipe } from '../../../../pipes/slugify.pipe';
import { DataProvider } from '../../../../data-providers/models/data-provider';
import { DataProviderAsset } from '../../../../data-providers/models/data-provider-asset';
import * as dataProviderActions from '../../../../data-providers/actions/data-provider';

import { Subscription } from 'rxjs/Rx';
import { Observable } from 'rxjs/Rx';
import {
  // UP_ARROW,
  // DOWN_ARROW,
  LEFT_ARROW,
  RIGHT_ARROW,
  TAB,
  A,
  Z,
  ZERO,
  NINE,
} from '@angular/cdk/keycodes';
import { CdkColumnDef } from '@angular/cdk/table';


@Directive({
  selector: 'app-focusable-cell',
  host: {
    '[attr.tabindex]': '(hasFocus || inTabOrder) ? 0 : -1',
    '(focusin)': '_handleFocusIn()',
    '(focusout)': '_handleFocusOut()',
  },
  exportAs: 'cell'
})
export class FocusableCell {
  hasFocus: boolean = false;
  @Input() rowIndex: number;
  @Input() columnIndex: number;
  @Input() inTabOrder: boolean = false;

  constructor(columnDef: CdkColumnDef,
    protected elementRef: ElementRef,
    renderer: Renderer) {
    elementRef.nativeElement.classList.add(`cdk-column-${columnDef.cssClassFriendlyName}`);
  }

  /** Allows for programmatic focusing of the option. */
  focus(): void {
    this.elementRef.nativeElement.focus();
  }

  _handleFocusIn() {
    this.hasFocus = true;
  }

  _handleFocusOut() {
    this.hasFocus = false;
  }
}

@Directive({
  selector: 'app-focusable-header-cell',
  host: {
    '[attr.tabindex]': '!sortButton && (hasFocus || inTabOrder) ? 0 : -1',
    '(focus)': '_handleFocus()',
    '(focusin)': '_handleFocusIn()',
    '(focusout)': '_handleFocusOut()',
  },
  exportAs: 'cell',
  providers: [{ provide: FocusableCell, useExisting: forwardRef(() => FocusableHeaderCell) }]
})
export class FocusableHeaderCell extends FocusableCell implements AfterViewInit {
  sortButton: HTMLButtonElement;

  constructor(columnDef: CdkColumnDef,
    elementRef: ElementRef,
    renderer: Renderer) {
    super(columnDef, elementRef, renderer);
  }

  ngAfterViewInit() {
    let buttons = this.elementRef.nativeElement.querySelectorAll('button');
    if (buttons.length != 0) {
      this.sortButton = buttons[0];
      this.sortButton.tabIndex = this.inTabOrder ? 0 : -1;
    }
  }

  ngOnChanges() {
    if (this.sortButton) {
      this.sortButton.tabIndex = this.inTabOrder ? 0 : -1;
    }
  }

  /** Allows for programmatic focusing of the option. */
  focus(): void {
    this.elementRef.nativeElement.focus();
  }

  _handleFocus() {
    if (this.sortButton) this.sortButton.focus();
  }

  _handleFocusIn() {
    this.hasFocus = true;
  }

  _handleFocusOut() {
    this.hasFocus = false;
  }
}


@Directive({
  selector: 'app-focusable-checkbox-cell',
  host: {
    'class': 'mat-cell',
    'role': 'gridcell',
    '[attr.tabindex]': '(!cb || cb.disabled) && (hasFocus || inTabOrder) ? 0 : -1',
    '(focus)': '_handleFocus()',
    '(focusin)': '_handleFocusIn()',
    '(focusout)': '_handleFocusOut()',
  },
  exportAs: 'cell',
  providers: [{ provide: FocusableCell, useExisting: forwardRef(() => FocusableCheckboxCell) }]
})
export class FocusableCheckboxCell extends FocusableCell {

  @ContentChild(MatCheckbox) cb: MatCheckbox;

  constructor(private columnDef: CdkColumnDef,
    elementRef: ElementRef,
    private renderer: Renderer) {
    super(columnDef, elementRef, renderer);
  }

  /** Allows for programmatic focusing of the option. */
  focus(): void {
    this.elementRef.nativeElement.focus();
  }

  _handleFocus() {
    if (this.cb && !this.cb.disabled) this.cb.focus();
  }

  _handleFocusIn() {
    this.hasFocus = true;
  }

  _handleFocusOut() {
    this.hasFocus = false;
  }
}


@Component({
  selector: 'app-asset-name-cell',
  styleUrls: ['./data-provider-browse-page.component.css'],
  template: `
    <div class="valign-center" *ngIf="!asset.collection">
      <mat-icon class="mr-1">photo</mat-icon>
      {{asset.name}}
    </div>
    <div class="valign-center" *ngIf="asset.collection">
      <mat-icon class="mr-1">folder</mat-icon>
      <a #collectionLink [tabIndex]="hasFocus || inTabOrder ? 0 : -1" [routerLink]="[]" [queryParams]="{path: asset.path}">
        {{asset.name}}
      </a>
    </div>`,
  host: {
    'class': 'mat-cell',
    'role': 'gridcell',
    '[attr.tabindex]': '(!asset.collection && (hasFocus || inTabOrder)) ? 0 : -1',
    '(focus)': '_handleFocus()',
    '(focusin)': '_handleFocusIn()',
    '(focusout)': '_handleFocusOut()',
  },
  providers: [{ provide: FocusableCell, useExisting: forwardRef(() => AssetNameCell) }]
})
export class AssetNameCell extends FocusableCell {
  @ViewChild('collectionLink') collectionLink: ElementRef;
  @Input() asset: DataProviderAsset;


  constructor(private columnDef: CdkColumnDef,
    elementRef: ElementRef,
    private renderer: Renderer) {
    super(columnDef, elementRef, renderer);
  }

  _handleFocus() {
    if (this.asset.collection && this.collectionLink) this.collectionLink.nativeElement.focus();
  }

  _handleFocusIn() {
    this.hasFocus = true;
  }

  _handleFocusOut() {
    this.hasFocus = false;
  }

}



export class DataProviderAssetsDataSource implements DataSource<DataProviderAsset> {
  assets$: Observable<DataProviderAsset[]>;
  assets: DataProviderAsset[] = [];
  sub: Subscription;

  constructor(private store: Store<fromRoot.State>) {
    this.assets$ = store.select(fromDataProviders.getCurrentAssets);
  }

  connect(collectionViewer: CollectionViewer): Observable<DataProviderAsset[]> {
    this.sub = this.assets$
    .subscribe(assets => {
      this.assets = assets;
    });

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

  dataProvidersLoaded$: Observable<boolean>;
  dataProviders$: Observable<DataProvider[]>;
  currentProvider$: Observable<DataProvider>;
  currentProviderColumns$: Observable<string[]>;
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

  activeRowIndex: number = 0;
  activeColIndex: number = 0;
  activeCell: FocusableCell = null;
  @ViewChildren(MatColumnDef) columns: QueryList<MatColumnDef>;
  @ViewChildren(FocusableCell) cells: QueryList<FocusableCell>;

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
    this.dataProvidersLoaded$ = store.select(fromDataProviders.getDataProvidersLoaded);
    this.currentProvider$ = store.select(fromDataProviders.getCurrentProvider);
    this.currentProviderColumns$ = this.currentProvider$.filter(provider => provider != null).map(provider => ['select', 'name', ...provider.columns.map(col => col.fieldName)]);
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


    this.subs.push(Observable.combineLatest(this.route.params, this.route.queryParams, this.dataProviders$)
      .withLatestFrom(this.dataProvidersLoaded$)
      .subscribe(([[params, qparams, dataProviders], dataProvidersLoaded]) => {
        if (!dataProvidersLoaded) {
          this.store.dispatch(new dataProviderActions.LoadDataProviders());
          return;
        }
        let slug: string = params['slug'];
        let dataProvider = dataProviders.find(provider => this.slufigy.transform(provider.name) == slug);
        if (dataProvider) {
          this.store.dispatch(new dataProviderActions.LoadDataProviderAssets({ dataProvider: dataProvider, path: qparams['path'] }))
          this.selection.clear();
          this.activeCell = null; 
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


  isArray(value: any) {
    return Array.isArray(value);
  }

  import() {
    this.store.dispatch(new dataProviderActions.ImportAssets({ assets: this.selection.selected }));
  }




  /* focus manager */

  getRowCount() {
    return this.cells.length / this.getColumnCount();
  }

  getColumnCount() {
    return this.columns.length;
  }

  setActiveCell(cell: FocusableCell) {
    if (!cell) return;

    this.activeColIndex = cell.columnIndex;
    this.activeRowIndex = cell.rowIndex;

    this.activeCell = cell;
  }

  setActiveColumnDeltaIndex(delta: number) {
    if (this.getColumnCount() == 0) return;
    this.activeColIndex += delta;
    this.activeColIndex = Math.min(Math.max(0, this.activeColIndex), this.getColumnCount() - 1);
    this.setActiveCell(this.cells.find(cell => cell.rowIndex == this.activeRowIndex && cell.columnIndex == this.activeColIndex));
    if (this.activeCell) this.activeCell.focus();
  }

  setActiveRowDeltaIndex(delta: number) {
    if (this.getRowCount() == 0) return;
    this.activeRowIndex += delta;
    this.activeRowIndex = Math.min(Math.max(0, this.activeRowIndex), this.getRowCount() - 1);
    this.setActiveCell(this.cells.find(cell => cell.rowIndex == this.activeRowIndex && cell.columnIndex == this.activeColIndex));
    if (this.activeCell) this.activeCell.focus();
  }

  onKeydown(event: KeyboardEvent): void {
    const keyCode = event.keyCode;
    switch (keyCode) {
      case DOWN_ARROW:
        this.setActiveRowDeltaIndex(1);
        break;

      case UP_ARROW:
        this.setActiveRowDeltaIndex(-1);
        break;

      case RIGHT_ARROW:
        this.setActiveColumnDeltaIndex(1);
        break;

      case LEFT_ARROW:
        this.setActiveColumnDeltaIndex(-1);
        break;

      default:
        // Note that we return here, in order to avoid preventing
        // the default action of non-navigational keys.
        return;
    }
    event.preventDefault();
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
