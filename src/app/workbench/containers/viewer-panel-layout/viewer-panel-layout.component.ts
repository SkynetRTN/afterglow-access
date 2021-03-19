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
} from '@angular/core';
import { IViewer } from '../../models/viewer';
import { ViewMode } from '../../models/view-mode';
import { Store } from '@ngxs/store';
import { SplitViewerPanel, SetFocusedViewer } from '../../workbench.actions';
import { MatMenuTrigger } from '@angular/material/menu';
import { ViewerPanelContainer, ViewerPanel, ViewerLayoutItem } from '../../models/workbench-state';
import { Observable } from 'rxjs';
import { WorkbenchState } from '../../workbench.state';

@Component({
  selector: 'app-viewer-panel-layout',
  templateUrl: './viewer-panel-layout.component.html',
  styleUrls: ['./viewer-panel-layout.component.css'],
})
export class ViewerPanelLayoutComponent implements OnInit, OnChanges {
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };
  mouseOverCloseViewerId: string = null;
  focusedViewerPanelId$: Observable<string>;
  layoutItems$: Observable<{ [id: string]: ViewerLayoutItem }>;
  containers$: Observable<{ [id: string]: ViewerPanelContainer }>;
  panels$: Observable<{ [id: string]: ViewerPanel }>;

  onContextMenu(event: MouseEvent, viewer: IViewer) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { viewer: viewer };
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  moveToOtherView(viewerId: string) {
    this.store.dispatch(new SplitViewerPanel(viewerId));
  }

  ViewMode = ViewMode;
  @Input() id: string;
  @Input() itemIds: string[];

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

  setFocusedPanel($event: Event, panel: ViewerPanel) {
    if (panel.id == this.store.selectSnapshot(WorkbenchState.getFocusedViewerPanelId)) return;
    if (!panel.selectedViewerId) return;
    this.store.dispatch(new SetFocusedViewer(panel.selectedViewerId));
  }
}
