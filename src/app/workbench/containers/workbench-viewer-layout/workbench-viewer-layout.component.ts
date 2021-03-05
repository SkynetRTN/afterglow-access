import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  ViewChild,
  TemplateRef,
  ViewContainerRef,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { Viewer } from "../../models/viewer";
import { ViewMode } from "../../models/view-mode";
import { Store } from "@ngxs/store";
import { SplitViewerPanel, SetFocusedViewer } from "../../workbench.actions";
import { MatMenuTrigger } from "@angular/material/menu";
import { ViewerPanelContainer, ViewerPanel, ViewerLayoutItem } from "../../models/workbench-state";
import { Observable } from "rxjs";
import { WorkbenchState } from "../../workbench.state";
import { ViewerMarkerMouseEvent, ViewerCanvasMouseEvent, ViewerCanvasMouseDragEvent } from "../workbench-viewer-panel/workbench-viewer-panel.component";

export interface ViewerPanelCanvasMouseEvent extends ViewerCanvasMouseEvent {
  panelId: string;
  panel: ViewerPanel;
}

export interface ViewerPanelCanvasMouseDragEvent extends ViewerCanvasMouseDragEvent {
  panelId: string;
  panel: ViewerPanel;
}

export interface ViewerPanelMarkerMouseEvent extends ViewerMarkerMouseEvent {
  panelId: string;
  panel: ViewerPanel;
}



@Component({
  selector: "app-workbench-viewer-layout",
  templateUrl: "./workbench-viewer-layout.component.html",
  styleUrls: ["./workbench-viewer-layout.component.css"],
})
export class WorkbenchViewerLayoutComponent implements OnInit, OnChanges {
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: "0px", y: "0px" };
  mouseOverCloseViewerId: string = null;
  focusedViewerPanelId$: Observable<string>;
  layoutItems$: Observable<{ [id: string]: ViewerLayoutItem }>;
  containers$: Observable<{ [id: string]: ViewerPanelContainer }>;
  panels$: Observable<{ [id: string]: ViewerPanel }>;

  onContextMenu(event: MouseEvent, viewer: Viewer) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + "px";
    this.contextMenuPosition.y = event.clientY + "px";
    this.contextMenu.menuData = { viewer: viewer };
    this.contextMenu.menu.focusFirstItem("mouse");
    this.contextMenu.openMenu();
  }

  moveToOtherView(viewerId: string) {
    this.store.dispatch(new SplitViewerPanel(viewerId));
  }

  ViewMode = ViewMode;
  @Input() id: string;
  @Input() itemIds: string[];

  @Output() onImageClick = new EventEmitter<ViewerPanelCanvasMouseEvent>();
  @Output() onImageMouseDown = new EventEmitter<ViewerPanelCanvasMouseEvent>();
  @Output() onImageMouseUp = new EventEmitter<ViewerPanelCanvasMouseEvent>();
  @Output() onImageMouseMove = new EventEmitter<ViewerPanelCanvasMouseEvent>();
  @Output() onImageMouseDragStart = new EventEmitter<ViewerPanelCanvasMouseDragEvent>();
  @Output() onImageMouseDrag = new EventEmitter<ViewerPanelCanvasMouseDragEvent>();
  @Output() onImageMouseDragEnd = new EventEmitter<ViewerPanelCanvasMouseDragEvent>();
  @Output() onMarkerClick = new EventEmitter<ViewerPanelMarkerMouseEvent>();
  @Output() onFileClose = new EventEmitter<string>();
  @Output() onFileSave = new EventEmitter<string>();

  constructor(private store: Store) {
    this.focusedViewerPanelId$ = this.store.select(WorkbenchState.getFocusedViewerPanelId);

    this.layoutItems$ = this.store.select(WorkbenchState.getViewerLayoutItemEntities);
    this.panels$ = this.store.select(WorkbenchState.getViewerPanelEntities);
    this.containers$ = this.store.select(WorkbenchState.getViewerPanelContainerEntities);
  }

  getViewers(viewerIds: string[]) {
    let viewerEntities = this.store.selectSnapshot(WorkbenchState.getViewerEntities);
    let result = viewerIds.map((id) => viewerEntities[id]);
    return result;
  }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {}

  ngOnDestroy() {}

  onPanelImageMouseDown($event: ViewerCanvasMouseEvent, panelId: string, panel: ViewerPanel) {
    this.onImageMouseDown.emit({
      panelId: panelId,
      panel: panel,
      ...$event,
    });
  }

  onPanelImageMouseUp($event: ViewerCanvasMouseEvent, panelId: string, panel: ViewerPanel) {
    this.onImageMouseUp.emit({
      panelId: panelId,
      panel: panel,
      ...$event,
    });
  }

  onPanelImageMouseMove($event: ViewerCanvasMouseEvent, panelId: string, panel: ViewerPanel) {
    this.onImageMouseMove.emit({
      panelId: panelId,
      panel: panel,
      ...$event,
    });
  }

  onPanelImageMouseDragStart($event: ViewerCanvasMouseDragEvent, panelId: string, panel: ViewerPanel) {
    this.onImageMouseDragStart.emit({
      panelId: panelId,
      panel: panel,
      ...$event,
    });
  }

  onPanelImageMouseDrag($event: ViewerCanvasMouseDragEvent, panelId: string, panel: ViewerPanel) {
    this.onImageMouseDrag.emit({
      panelId: panelId,
      panel: panel,
      ...$event,
    });
  }

  onPanelImageMouseDragEnd($event: ViewerCanvasMouseDragEvent, panelId: string, panel: ViewerPanel) {
    this.onImageMouseDragEnd.emit({
      panelId: panelId,
      panel: panel,
      ...$event,
    });
  }

  onPanelImageClick($event: ViewerCanvasMouseEvent, panelId: string, panel: ViewerPanel) {
    // if(panelId != this.mouseDownActiveViewerId) return;

    this.onImageClick.emit({
      panelId: panelId,
      panel: panel,
      ...$event,
    });
  }

  onPanelMarkerClick($event: ViewerMarkerMouseEvent, panelId: string, panel: ViewerPanel) {
    this.onMarkerClick.emit({
      panelId: panelId,
      panel: panel,
      ...$event,
    });
  }

  setFocusedPanel($event: MouseEvent, panel: ViewerPanel) {
    if (panel.id == this.store.selectSnapshot(WorkbenchState.getFocusedViewerPanelId)) return;
    if (!panel.selectedViewerId) return;
    this.store.dispatch(new SetFocusedViewer(panel.selectedViewerId));
  }
}
