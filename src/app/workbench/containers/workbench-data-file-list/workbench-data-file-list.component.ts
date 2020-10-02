import { Component, OnInit, Input, EventEmitter, Output, OnChanges, OnDestroy, SimpleChange } from '@angular/core';
import { DataFile, IHdu } from '../../../data-files/models/data-file';
import { SelectionModel } from '@angular/cdk/collections';
import { ENTER, SPACE } from '@angular/cdk/keycodes';
import { Subscription, BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { Store } from '@ngxs/store';
import { map } from 'rxjs/operators';
import { FileInfoToolsetComponent } from '../../components/file-info-panel/file-info-panel.component';
import { DataFilesState } from '../../../data-files/data-files.state';
import { IDataFileListItem } from '../../models/data-file-list-item';

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

interface DataFileListItem extends IDataFileListItem {
  name: string;
  data: DataFile | IHdu
}


@Component({
  selector: 'app-workbench-data-file-list',
  templateUrl: './workbench-data-file-list.component.html',
  styleUrls: ['./workbench-data-file-list.component.css']
})
export class WorkbenchDataFileListComponent {
  @Input()
  selectedItem: IDataFileListItem;

  @Output() onSelectionChange = new EventEmitter<{ item: IDataFileListItem, doubleClick: boolean }>();

  // preventSingleClick = false;
  // timer: any;
  // delay: Number;
  dataFiles$: Observable<DataFile[]>;
  dataFileEntities$: Observable<{ [id: string]: DataFile }>;
  hduEntities$: Observable<{ [id: string]: IHdu }>;
  rows$: Observable<DataFileListItem[]>;

  nodes$: Observable<TreeNode[]>;
  options = {};

  constructor(private store: Store) {
    this.dataFiles$ = this.store.select(DataFilesState.getDataFiles);
    this.dataFileEntities$ = this.store.select(DataFilesState.getDataFileEntities);
    this.hduEntities$ = this.store.select(DataFilesState.getHduEntities);

    this.rows$ = this.dataFiles$.pipe(
      map(dataFiles => {
        let result: DataFileListItem[] = [];
        dataFiles.forEach(file => {
          result.push({
            id: file.id,
            type: 'file',
            name: file.name,
            data: file
          })
          if (file.hduIds.length > 1) {
            let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
            file.hduIds.map(hduId => hduEntities[hduId])
              .sort((a, b) => (a.order > b.order) ? 1 : -1).forEach((hdu, index) => {
                result.push({
                  id: hdu.id,
                  type: 'hdu',
                  name: `Channel ${index}`,
                  data: hdu
                })
              })
          }
        })
        return result;

      })
    )

    this.nodes$ = combineLatest(
      this.store.select(DataFilesState.getDataFileEntities),
      this.store.select(DataFilesState.getHduEntities)
    ).pipe(
      map(([fileEntities, hduEntities]) => {
        return Object.values(fileEntities)
          .sort((a, b) => (a.name > b.name) ? 1 : -1)
          .map(file => {
            let hdus = Object.values(hduEntities).filter(hdu => hdu.fileId == file.id)
            if (hdus.length > 1) {
              return {
                id: file.id,
                name: file.name,
                children: hdus.map((hdu, index) => {
                  return {
                    id: hdu.id,
                    name: `Channel ${index}`
                  }
                })
              } as TreeNode;
            }
            else {
              let hdu = hdus[0];
              return {
                id: hdu.id,
                name: file.name,
              } as TreeNode;
            }

          })
      })
    )
  }

  trackByFn(index: number, value: DataFile) {
    return value.id;
  }

  onRowClick(item: DataFileListItem) {
    if (this.selectedItem.type == item.type && this.selectedItem.id == item.id) return;

    this.selectedItem = item;
    this.onSelectionChange.emit({ item: item, doubleClick: false });
  }

  onRowDoubleClick(item: DataFileListItem) {
    if (this.selectedItem.type == item.type && this.selectedItem.id == item.id) return;

    this.selectedItem = item;
    this.onSelectionChange.emit({ item: item, doubleClick: true });
  }
}
