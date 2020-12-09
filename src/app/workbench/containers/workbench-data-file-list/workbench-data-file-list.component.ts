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
import { distinctUntilChanged, map, switchMap, tap } from "rxjs/operators";
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
    this.nodes$ = this.files$.pipe(
      distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index].id == value.id)),
      switchMap((files) => {
        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        return combineLatest(
          ...files.map((file) => {
            return this.store.select(DataFilesState.getFileById).pipe(
              map((fn) => fn(file.id)),
              distinctUntilChanged((a, b) => a && b && a.name == b.name && a.hduIds == b.hduIds),
              map((file) => {
                let result: INode;
                if (file.hduIds.length > 1) {
                  result = {
                    id: file.id,
                    name: file.name,
                    tooltip: file.name,
                    children: file.hduIds.map((hduId, index) => ({
                      id: `${file.id}-${hduId}`,
                      name: `Channel ${index}`,
                      children: [],
                      hasChildren: false,
                      isExpanded: false,
                      fileId: file.id,
                      hduId: hduId,
                      showButtonBar: false,
                      icon: hduEntities[hduId].hduType == HduType.IMAGE ? "insert_photo" : "toc",
                      tooltip: `${file.name} - Channel ${index}`,
                      modified: null,
                    })),
                    hasChildren: true,
                    isExpanded: true,
                    fileId: file.id,
                    hduId: null,
                    showButtonBar: true,
                    icon: null,
                    modified: file.hduIds.map(hduId => hduEntities[hduId].modified).some(v => v),
                  };
                } else {
                  let hduId = file.hduIds[0];
                  result = {
                    id: `${file.id}-${hduId}`,
                    name: file.name,
                    tooltip: file.name,
                    children: [],
                    hasChildren: false,
                    isExpanded: false,
                    fileId: file.id,
                    hduId: hduId,
                    showButtonBar: true,
                    icon: hduEntities[hduId].hduType == HduType.IMAGE ? "insert_photo" : "toc",
                    modified: hduEntities[hduId].modified,
                  };
                }
                return result;
              })
            );
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

      console.log("NEW SELECTION: ", selectedNodeIds, selectedItemId)

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
    this.onSaveFile.emit(data.fileId)
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
