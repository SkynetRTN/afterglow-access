import { Component, OnInit, Input, EventEmitter, Output, OnChanges, OnDestroy, SimpleChange } from '@angular/core';
import { DataFile } from '../../../../data-files/models/data-file';
import { SelectionModel} from '@angular/cdk/collections';
import { ENTER, SPACE } from '@angular/cdk/keycodes';
import { Subscription } from 'rxjs';
import { Store } from '@ngxs/store';

@Component({
  selector: 'app-workbench-data-file-list',
  templateUrl: './workbench-data-file-list.component.html',
  styleUrls: ['./workbench-data-file-list.component.css']
})
export class WorkbenchDataFileListComponent implements OnInit, OnDestroy {
  @Input()
  selectedFileId: string;

  @Input()
  dataFiles: DataFile[];

  @Output() onSelectionChange = new EventEmitter<DataFile>();

  constructor(private store: Store) {
  }

  ngOnInit() {
  
  }

  ngOnDestroy() {
  }

  onRowKeyup($event: KeyboardEvent, file: DataFile) {
    switch($event.keyCode) {
      case SPACE: {
        this.selectedFileId = file.id;
        this.onSelectionChange.emit(file);
      }
      case ENTER: {
        this.selectedFileId = file.id;
        this.onSelectionChange.emit(file);
      }
    }
  }

  onRowClick(file: DataFile) {
    this.selectedFileId = file.id;
    this.onSelectionChange.emit(file);
  }
  
  trackByFn(index: number, value: DataFile) {
    return value.id;
  }
}
