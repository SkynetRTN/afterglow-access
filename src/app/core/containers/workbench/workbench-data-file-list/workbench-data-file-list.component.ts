import { Component, OnInit, Input, EventEmitter, Output, OnChanges, OnDestroy, SimpleChange } from '@angular/core';
import { DataFile } from '../../../../data-files/models/data-file';
import { SelectionModel, DataSource, CollectionViewer, SelectionChange,  } from '@angular/cdk/collections';
import { ENTER, SPACE, UP_ARROW, DOWN_ARROW } from '@angular/cdk/keycodes';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';

export class DataFilesDataSource implements DataSource<DataFile> {
  files$: Observable<DataFile[]>;
  files: DataFile[] = [];
  sub: Subscription;

  constructor(private store: Store<fromRoot.State>) {
    this.files$ = store.select(fromDataFiles.getAllDataFiles);
  }

  connect(collectionViewer: CollectionViewer): Observable<DataFile[]> {
    this.sub = this.files$
      .subscribe(files => {
        this.files = files;
      });

    return this.files$.pipe(map(files => files.sort((a,b) => {
      if(a.name == b.name) return 0;
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    })));
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.sub.unsubscribe();
  }

}

@Component({
  selector: 'app-workbench-data-file-list',
  templateUrl: './workbench-data-file-list.component.html',
  styleUrls: ['./workbench-data-file-list.component.css']
})
export class WorkbenchDataFileListComponent implements OnInit, OnDestroy {
  @Input() allowMultiSelection: boolean = true;
  @Input() set primarySelection(value: DataFile) {
    if(this.primarySelectionModel.selected.length > 0 && this.primarySelectionModel.selected[0] == value) return;
    this.primarySelectionModel.select(value);
  }
  @Input() set multiSelection(value: DataFile[]) {
    this.multiSelectionModel.clear();
    value.forEach(file => this.multiSelectionModel.select(file));
  }

  @Output() onPrimarySelectionChange = new EventEmitter<DataFile>();
  @Output() onMultiSelectionChange = new EventEmitter<DataFile[]>();

  dataSource: DataFilesDataSource;
  primarySelectionModel = new SelectionModel<DataFile>(false, []);
  multiSelectionModel = new SelectionModel<DataFile>(true, []);
  subs: Subscription[] = [];
  constructor(private store: Store<fromRoot.State>) {
    this.dataSource = new DataFilesDataSource(store);

    
  }

  ngOnInit() {
    this.subs.push(this.primarySelectionModel.changed.subscribe(change => {
      this.onPrimarySelectionChange.emit(this.primarySelectionModel.selected.length == 0 ? null : this.primarySelectionModel.selected[0]);
      this.multiSelectionModel.changed.next();
    }));

    this.subs.push(this.multiSelectionModel.changed.subscribe(change => {
      let result = [...this.multiSelectionModel.selected];
      if(this.primarySelectionModel.selected.length != 0 && this.primarySelectionModel.selected[0] && !result.map(file => file.id).includes(this.primarySelectionModel.selected[0].id)) {
        result.push(this.primarySelectionModel.selected[0])
      }
      this.onMultiSelectionChange.emit(result);
    }));
  }

  ngOnDestroy() {
    this.subs.forEach(sub => {
      sub.unsubscribe();
    })
  }



  showSelectAll() {
    return this.dataSource.files && this.dataSource.files.length != 0;
  }

  isAllSelected() {
    const numSelected = this.multiSelectionModel.selected.length;
    const numRows = this.dataSource.files.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.multiSelectionModel.clear() :
      this.dataSource.files.forEach(file => this.multiSelectionModel.select(file));
  }

  onRowKeyup($event: KeyboardEvent, file: DataFile) {
    switch($event.keyCode) {
      case SPACE: {
        this.primarySelectionModel.select(file);
      }
      case ENTER: {
        this.primarySelectionModel.select(file);
      }
    }
  }

  onRowClick(file: DataFile) {
    this.primarySelectionModel.select(file);
  }
  
  trackByFn(index: number, value: DataFile) {
    return value.id;
  }
}
