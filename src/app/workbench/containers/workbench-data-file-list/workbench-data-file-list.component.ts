import { Component, OnInit, Input, EventEmitter, Output, OnChanges, OnDestroy, SimpleChange } from '@angular/core';
import { DataFile, IHeaderDataUnit } from '../../../data-files/models/data-file';
import { SelectionModel} from '@angular/cdk/collections';
import { ENTER, SPACE } from '@angular/cdk/keycodes';
import { Subscription, BehaviorSubject, Observable } from 'rxjs';
import { Store } from '@ngxs/store';
import { map } from 'rxjs/operators';
import { FileInfoToolsetComponent } from '../../components/file-info-panel/file-info-panel.component';

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
  selectedFileId: string;

  @Input()
  selectedHduIndex: number;

  @Input("files")
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Output() onSelectionChange = new EventEmitter<{file: DataFile, doubleClick: boolean}>();

  // preventSingleClick = false;
  // timer: any;
  // delay: Number;
  nodes$: Observable<TreeNode[]>;
  nodes = [
    {
      id: 1,
      name: 'root1',
      children: [
        { id: 2, name: 'child1' },
        { id: 3, name: 'child2' }
      ]
    },
    {
      id: 4,
      name: 'root2',
      children: [
        { id: 5, name: 'child2.1' },
        {
          id: 6,
          name: 'child2.2',
          children: [
            { id: 7, name: 'subsub' }
          ]
        }
      ]
    }
  ];
  options = {};
  
  trackByFn(index: number, value: DataFile) {
    return value.id;
  }

  onRowClick(file: DataFile, hdu: IHeaderDataUnit) {
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

  onRowDoubleClick(file: DataFile, hdu: IHeaderDataUnit) {
    
      // this.preventSingleClick = true;
      // clearTimeout(this.timer);
      this.selectedFileId = file.id;
      this.onSelectionChange.emit({file: file, doubleClick: true});
    }
}
