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

  @Output() onSelectionChange = new EventEmitter<{file: DataFile, doubleClick: boolean}>();

  // preventSingleClick = false;
  // timer: any;
  // delay: Number;

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
        this.onSelectionChange.emit({file: file, doubleClick: false});
      }
      case ENTER: {
        this.selectedFileId = file.id;
        this.onSelectionChange.emit({file: file, doubleClick: false});
      }
    }
  }
  
  trackByFn(index: number, value: DataFile) {
    return value.id;
  }

  onRowClick(file: DataFile) {
    if(file.id == this.selectedFileId) return;

    this.selectedFileId = file.id;
    this.onSelectionChange.emit({file: file, doubleClick: false});
    // this.preventSingleClick = false;
    //  const delay = 200;
    //   this.timer = setTimeout(() => {
    //     if (!this.preventSingleClick) {
    //       this.selectedFileId = file.id;
    //       this.onSelectionChange.emit({file: file, doubleClick: false});
    //     }
    //   }, delay);
  }

  onRowDoubleClick(file: DataFile) {
    
      // this.preventSingleClick = true;
      // clearTimeout(this.timer);
      this.selectedFileId = file.id;
      this.onSelectionChange.emit({file: file, doubleClick: true});
    }
}
