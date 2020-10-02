import { Component, OnInit, Input, EventEmitter, Output, OnChanges, OnDestroy, SimpleChange } from '@angular/core';
import { DataFile, IHdu } from '../../../data-files/models/data-file';
import { SelectionModel } from '@angular/cdk/collections';
import { ENTER, SPACE } from '@angular/cdk/keycodes';
import { Subscription, BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { Store } from '@ngxs/store';
import { map } from 'rxjs/operators';
import { FileInfoToolsetComponent } from '../../components/file-info-panel/file-info-panel.component';
import { DataFilesState } from '../../../data-files/data-files.state';
import { HdusState } from '../../../data-files/hdus.state';

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}


@Component({
  selector: 'app-workbench-data-file-list',
  templateUrl: './workbench-data-file-list.component.html',
  styleUrls: ['./workbench-data-file-list.component.css']
})
export class WorkbenchDataFileListComponent {
  @Input()
  selectedItem: DataFile | IHdu;

  @Output() onSelectionChange = new EventEmitter<{ file: DataFile, doubleClick: boolean }>();

  // preventSingleClick = false;
  // timer: any;
  // delay: Number;
  nodes$: Observable<TreeNode[]>;
  options = {};

  constructor(private store: Store) {
    this.nodes$ = combineLatest(
      this.store.select(DataFilesState.getEntities),
      this.store.select(HdusState.getEntities)
    ).pipe(
      map(([fileEntities, hduEntities]) => {
        return Object.values(fileEntities)
        .sort((a, b) => (a.name > b.name) ? 1 : -1)
        .map(file => {
          let hdus = Object.values(hduEntities).filter(hdu => hdu.fileId == file.id)
          if(hdus.length > 1) {
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

  onRowClick(file: DataFile, hdu: IHdu) {
    // if (file.id == this.selectedFileId) return;

    // this.selectedFileId = file.id;
    // this.onSelectionChange.emit({ file: file, doubleClick: false });
    
  }

  onRowDoubleClick(file: DataFile, hdu: IHdu) {
    // this.selectedFileId = file.id;
    // this.onSelectionChange.emit({ file: file, doubleClick: true });
  }
}
