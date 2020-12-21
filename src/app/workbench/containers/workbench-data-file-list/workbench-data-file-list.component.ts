import {
  Component,
  Input,
  EventEmitter,
  Output,
  OnChanges,
  OnDestroy,
  SimpleChange,
  ChangeDetectionStrategy,
} from "@angular/core";
import { DataFile, IHdu } from "../../../data-files/models/data-file";
import { Store } from "@ngxs/store";
import { HduType } from "../../../data-files/models/data-file-type";
import { BehaviorSubject, Observable, combineLatest } from "rxjs";
import { distinctUntilChanged, map, switchMap, tap, distinctUntilKeyChanged, filter } from "rxjs/operators";
import { DataFilesState } from "../../../data-files/data-files.state";
import {
  TREE_ACTIONS,
  KEYS,
  IActionMapping,
  TreeModel,
  TreeNode,
  ITreeOptions,
  ITreeState,
} from "@circlon/angular-tree-component";
import { DataProvidersState } from '../../../data-providers/data-providers.state';

interface INode {
  id: string;
  name: string;
  children: INode[];
  hasChildren: boolean;
  isExpanded: boolean;
  fileId: string;
  hduId: string;
  showButtonBar: boolean;
  icon: string;
  tooltip: string;
  modified: boolean;
}

export interface ISelectedFileListItem {
  fileId: string;
  hduId: string;
}

@Component({
  selector: "app-workbench-data-file-list",
  templateUrl: "./workbench-data-file-list.component.html",
  styleUrls: ["./workbench-data-file-list.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchDataFileListComponent {
  @Input("selectedItem")
  set selectedItem(files: ISelectedFileListItem) {
    this.selectedItem$.next(files);
  }
  get selectedItem() {
    return this.selectedItem$.getValue();
  }
  private selectedItem$ = new BehaviorSubject<ISelectedFileListItem>(null);

  @Input("files")
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Output() onSelectionChange = new EventEmitter<{
    item: ISelectedFileListItem;
  }>();

  @Output() onItemDoubleClick = new EventEmitter<{
    item: ISelectedFileListItem;
  }>();

  @Output() onCloseFile = new EventEmitter<string>();

  @Output() onSaveFile = new EventEmitter<string>();

  HduType = HduType;
  treeFocused = false;
  hoverNodeId: string = null;

  actionMapping: IActionMapping = {
    mouse: {
      click: (tree, node, $event) => this.onItemClick(tree, node, $event),
      dblClick: (tree, node, $event) => this.onItemDblClick(tree, node, $event),
    },
    keys: {
      [KEYS.SPACE]: (tree, node, $event) => this.onItemClick(tree, node, $event),
      [KEYS.ENTER]: (tree, node, $event) => this.onItemClick(tree, node, $event),
    },
  };

  options: ITreeOptions = {
    actionMapping: this.actionMapping,
  };

  state: ITreeState;

  nodes$: Observable<INode[]>;

  constructor(private store: Store) {
    this.nodes$ = this.store.select(DataFilesState.getFileIds).pipe(
      switchMap((fileIds) => {
        return combineLatest(
          ...fileIds.map((fileId) => {
            let file$ = this.store.select(DataFilesState.getFileById).pipe(
              map((fn) => fn(fileId)),
              filter(f => f != null),
              distinctUntilKeyChanged('id'),
              distinctUntilKeyChanged('name'),
              distinctUntilKeyChanged('hduIds'),
              distinctUntilKeyChanged('name'),
            );
            let hdus$ = file$.pipe(
              switchMap((file) =>
                combineLatest(
                  file.hduIds.map((hduId) => this.store.select(DataFilesState.getHduById).pipe(
                    map((fn) => fn(hduId)),
                    filter(f => f != null),
                    distinctUntilKeyChanged('id'),
                    distinctUntilKeyChanged('modified'),
                    distinctUntilKeyChanged('hduType'),
                  ))
                )
              )
            );
            return combineLatest(file$, hdus$).pipe(
              map(([file, hdus]) => {
                let dataProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[file.dataProviderId];
                let result: INode = null;
                let tooltip = file.name;
                if(dataProvider && file.assetPath != null) {
                  tooltip = `${dataProvider.name}${file.assetPath}`
                }
                if (hdus.length > 1) {
                  result = {
                    id: file.id,
                    name: file.name,
                    tooltip: tooltip,
                    children: hdus.map((hdu, index) => ({
                      id: `${file.id}-${hdu.id}`,
                      name: `Channel ${index}`,
                      children: [],
                      hasChildren: false,
                      isExpanded: false,
                      fileId: file.id,
                      hduId: hdu.id,
                      showButtonBar: false,
                      icon: hdu.hduType == HduType.IMAGE ? "insert_photo" : "toc",
                      tooltip: `${tooltip} - Channel ${index}`,
                      modified: null,
                    })),
                    hasChildren: true,
                    isExpanded: true,
                    fileId: file.id,
                    hduId: null,
                    showButtonBar: true,
                    icon: null,
                    modified: hdus.map((hdu) => hdu.modified).some((v) => v),
                  };
                } else if(hdus.length == 1) {
                  let hdu = hdus[0];
                  result = {
                    id: `${file.id}-${hdu.id}`,
                    name: file.name,
                    tooltip: tooltip,
                    children: [],
                    hasChildren: false,
                    isExpanded: false,
                    fileId: file.id,
                    hduId: hdu.id,
                    showButtonBar: true,
                    icon:hdu.hduType == HduType.IMAGE ? "insert_photo" : "toc",
                    modified: hdu.modified,
                  };
                }
                return result;
              })
            )
          })
        );
      })
    );

   

    this.selectedItem$.subscribe((selectedItem) => {
      let selectedNodeIds = {};
      let selectedItemId = null;
      if (selectedItem) {
        selectedItemId = selectedItem.fileId;
        if (selectedItem.hduId) {
          selectedItemId = selectedItemId.concat(`-${selectedItem.hduId}`);
        }
        selectedNodeIds[selectedItemId] = true;
      }

      this.state = {
        ...this.state,
        activeNodeIds: selectedNodeIds,
        focusedNodeId: selectedItemId,
      };
    });
  }

  onItemClick(tree: TreeModel, node: TreeNode, $event) {
    if (!tree.focusedNode || tree.focusedNode.data.id != node.data.id) {
      this.onSelectionChange.emit({ item: { fileId: node.data.fileId, hduId: node.data.hduId } });
      return TREE_ACTIONS.SELECT(tree, node, $event);
    }
  }

  onItemDblClick(tree: TreeModel, node: TreeNode, $event) {
    this.onItemDoubleClick.emit({ item: { fileId: node.data.fileId, hduId: node.data.hduId } });
    // return TREE_ACTIONS.SELECT(tree, node, $event);
  }

  onFocus() {
    this.treeFocused = true;
  }

  onBlur() {
    this.treeFocused = false;
  }

  saveFile($event: MouseEvent, data: INode) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.onSaveFile.emit(data.fileId);
  }

  closeFile($event: MouseEvent, data: INode) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.onCloseFile.emit(data.fileId);
  }

  onMouseEnterNode(node: INode) {
    this.hoverNodeId = node.id;
  }

  onMouseLeaveNode(node: INode) {
    this.hoverNodeId = null;
  }

  // onRowClick(item: { fileId: string; hduId: string;}) {
  //   if (this.selectedItem && this.selectedItem.hduId == item.hduId && this.selectedItem.fileId == item.fileId) return;

  //   this.selectedItem = item;
  //   this.onSelectionChange.emit({ item: item, doubleClick: false });
  // }

  // onRowDoubleClick(item: { fileId: string; hduId: string;}) {
  //   this.selectedItem = item;
  //   this.onSelectionChange.emit({ item: item, doubleClick: true });
  // }
}
