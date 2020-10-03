import { Component, OnInit, Input, EventEmitter, Output, OnChanges, OnDestroy, SimpleChange } from '@angular/core';
import { DataFile, IHdu } from '../../../data-files/models/data-file';
import { SelectionModel } from '@angular/cdk/collections';
import { ENTER, SPACE } from '@angular/cdk/keycodes';
import { Subscription, BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { Store } from '@ngxs/store';
import { map } from 'rxjs/operators';
import { FileInfoToolsetComponent } from '../../components/file-info-panel/file-info-panel.component';
import { DataFilesState } from '../../../data-files/data-files.state';

@Component({
  selector: 'app-workbench-data-file-list',
  templateUrl: './workbench-data-file-list.component.html',
  styleUrls: ['./workbench-data-file-list.component.css']
})
export class WorkbenchDataFileListComponent {
  @Input()
  selectedItem: DataFile | IHdu;

  @Input()
  items: Array<DataFile | IHdu>;

  @Output() onSelectionChange = new EventEmitter<{ item: DataFile | IHdu, doubleClick: boolean }>();

  constructor(private store: Store) {
  }

  trackByFn(index: number, value: DataFile | IHdu) {
    return value.id && value.type;
  }

  onRowClick(item: DataFile | IHdu) {
    if (this.selectedItem.type == item.type && this.selectedItem.id == item.id) return;

    this.selectedItem = item;
    this.onSelectionChange.emit({ item: item, doubleClick: false });
  }

  onRowDoubleClick(item: DataFile | IHdu) {
    if (this.selectedItem.type == item.type && this.selectedItem.id == item.id) return;

    this.selectedItem = item;
    this.onSelectionChange.emit({ item: item, doubleClick: true });
  }

  getHduName(hdu: IHdu) {
    let fileEntities = this.store.selectSnapshot(DataFilesState.getDataFileEntities);
    let file = fileEntities[hdu.fileId];
    if(!file) return '???????'
    return file.hduIds.length > 1 ? `Channel ${file.hduIds.indexOf(hdu.id)}` : file.name;
  }
}
