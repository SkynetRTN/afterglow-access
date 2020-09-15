import { Component, OnInit, Output, EventEmitter, Input, ViewChild, TemplateRef, ViewContainerRef, OnChanges, SimpleChanges } from '@angular/core';
import { Viewer } from '../../models/viewer';
import { CanvasMouseEvent } from '../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import { MarkerMouseEvent } from '../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { ViewMode } from '../../models/view-mode';
import { Store } from '@ngxs/store';
import { MoveToOtherView } from '../../workbench.actions';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { MatMenuTrigger } from '@angular/material';
import { ViewerPanelContainer, ViewerPanel } from '../../models/workbench-state';
import { Observable } from 'rxjs';
import { WorkbenchState } from '../../workbench.state';
import { tap } from 'rxjs/operators';
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
  panels$: Observable<{[id: string]: ViewerPanel}>;
  containers$: Observable<{[id: string]: ViewerPanelContainer}>;

  onContextMenu(event: MouseEvent, viewer: Viewer) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { 'viewer': viewer };
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  moveToOtherView(viewerId: string) {
    this.store.dispatch(new MoveToOtherView(viewerId));
  }
  
  ViewMode = ViewMode;
  @Input() container: ViewerPanelContainer;

  @Output() onImageClick = new EventEmitter<ViewerPanelCanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<ViewerPanelCanvasMouseEvent>();
  @Output() onMarkerClick = new EventEmitter<ViewerPanelMarkerMouseEvent>();

  private hotKeys: Array<Hotkey> = [];

  constructor(private store: Store, private _hotkeysService: HotkeysService) {
    this.focusedViewerPanelId$ = this.store.select(WorkbenchState.getFocusedViewerPanelId);
    this.panels$ = this.store.select(WorkbenchState.getViewerPanelEntities).pipe(
      tap(panels => {
        console.log("PANELS CHANGED: ", panels)
      })
    );
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

  

  handleImageMove($event: ViewerCanvasMouseEvent, panelId: string, panel: ViewerPanel) {
    this.onImageMove.emit({
      panelId: panelId,
      panel: panel,
      ...$event
    });
  }

  handleImageClick($event: ViewerCanvasMouseEvent, panelId: string, panel: ViewerPanel) {
    // if(panelId != this.mouseDownActiveViewerId) return;

    this.onImageClick.emit({
      panelId: panelId,
      panel: panel,
      ...$event
    });
  }

  handleMarkerClick($event: ViewerMarkerMouseEvent, panelId: string, panel: ViewerPanel) {
    this.onMarkerClick.emit({
      panelId: panelId,
      panel: panel,
      ...$event
    });
  }
  
}
