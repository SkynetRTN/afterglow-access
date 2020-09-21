import { Component, OnInit, Output, EventEmitter, Input, ViewChild, TemplateRef, ViewContainerRef, OnChanges, SimpleChanges } from '@angular/core';
import { Viewer } from '../../models/viewer';
import { CanvasMouseEvent } from '../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import { MarkerMouseEvent } from '../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { ViewMode } from '../../models/view-mode';
import { Store } from '@ngxs/store';
import { SplitViewerPanel, SetFocusedViewer } from '../../workbench.actions';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { MatMenuTrigger } from '@angular/material';
import { ViewerPanelContainer, ViewerPanel, ViewerLayoutItem } from '../../models/workbench-state';
import { Observable } from 'rxjs';
import { WorkbenchState } from '../../workbench.state';
import { tap, map } from 'rxjs/operators';
import { ViewerMarkerMouseEvent, ViewerCanvasMouseEvent } from '../workbench-viewer-panel/workbench-viewer-panel.component';

export interface ViewerPanelCanvasMouseEvent extends ViewerCanvasMouseEvent {
  panelId: string;
  panel: ViewerPanel;
}

export interface ViewerPanelMarkerMouseEvent extends ViewerMarkerMouseEvent {
  panelId: string;
  panel: ViewerPanel;
}

@Component({
  selector: 'app-workbench-viewer-layout',
  templateUrl: './workbench-viewer-layout.component.html',
  styleUrls: ['./workbench-viewer-layout.component.css']
})
export class WorkbenchViewerLayoutComponent implements OnInit, OnChanges {
  @ViewChild(MatMenuTrigger, {static: false})
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };
  mouseOverCloseViewerId: string = null;
  focusedViewerPanelId$: Observable<string>;
  layoutItems$: Observable<{[id: string]: ViewerLayoutItem}>;
  containers$: Observable<{[id: string]: ViewerPanelContainer}>;
  panels$: Observable<{[id: string]: ViewerPanel}>;

  onContextMenu(event: MouseEvent, viewer: Viewer) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { 'viewer': viewer };
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  moveToOtherView(viewerId: string) {
    this.store.dispatch(new SplitViewerPanel(viewerId));
  }
  
  ViewMode = ViewMode;
  @Input() id: string;
  @Input() itemIds: string[];

  @Output() onImageClick = new EventEmitter<ViewerPanelCanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<ViewerPanelCanvasMouseEvent>();
  @Output() onMarkerClick = new EventEmitter<ViewerPanelMarkerMouseEvent>();

  private hotKeys: Array<Hotkey> = [];

  constructor(private store: Store, private _hotkeysService: HotkeysService) {
    this.focusedViewerPanelId$ = this.store.select(WorkbenchState.getFocusedViewerPanelId);
    
    this.layoutItems$ = this.store.select(WorkbenchState.getViewerLayoutItemEntities);
    this.panels$ = this.store.select(WorkbenchState.getViewerPanelEntities);
    this.containers$ = this.store.select(WorkbenchState.getViewerPanelContainerEntities);
  }

  getViewers(viewerIds: string[]) {
    let viewerEntities = this.store.selectSnapshot(WorkbenchState.getViewerEntities)
    return viewerIds.map(id => viewerEntities[id])
  }


  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {

  }

  ngOnDestroy() {
  }

  handleViewerPanelContainerImageMove($event: ViewerPanelCanvasMouseEvent) {
    this.onImageMove.emit($event);
  }

  handleViewerPanelContainerImageClick($event: ViewerPanelCanvasMouseEvent) {
    // if(panelId != this.mouseDownActiveViewerId) return;

    this.onImageClick.emit($event);
  }

  handleViewerPanelContainerMarkerClick($event: ViewerPanelMarkerMouseEvent) {
    this.onMarkerClick.emit($event);
  }

  handleViewerPanelImageMove($event: ViewerCanvasMouseEvent, panelId: string, panel: ViewerPanel) {
    this.onImageMove.emit({
      panelId: panelId,
      panel: panel,
      ...$event
    });
  }

  handleViewerPanelImageClick($event: ViewerCanvasMouseEvent, panelId: string, panel: ViewerPanel) {
    // if(panelId != this.mouseDownActiveViewerId) return;

    this.onImageClick.emit({
      panelId: panelId,
      panel: panel,
      ...$event
    });
  }

  handleViewerPanelMarkerClick($event: ViewerMarkerMouseEvent, panelId: string, panel: ViewerPanel) {
    this.onMarkerClick.emit({
      panelId: panelId,
      panel: panel,
      ...$event
    });
  }

  setFocusedPanel($event: MouseEvent, panel: ViewerPanel) {
    if(panel.id == this.store.selectSnapshot(WorkbenchState.getFocusedViewerPanelId)) return;
    if(!panel.selectedViewerId) return;

    this.store.dispatch(new SetFocusedViewer(panel.selectedViewerId))
  }
  
}
