import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  ViewChild,
  ViewContainerRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { isImageViewer, isTableViewer, IViewer } from '../../models/viewer';

import { DataFile, IHdu } from '../../../data-files/models/data-file';
import { Subscription } from 'rxjs';
import { ViewMode } from '../../models/view-mode';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../workbench.state';
import { DataFilesState } from '../../../data-files/data-files.state';
import { SetFocusedViewer, CloseViewer, KeepViewerOpen, SplitViewerPanel, MoveViewer } from '../../workbench.actions';
import { MatMenuTrigger } from '@angular/material/menu';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ImageViewerEventService } from '../../services/image-viewer-event.service';

@Component({
  selector: 'app-viewer-panel',
  templateUrl: './viewer-panel.component.html',
  styleUrls: ['./viewer-panel.component.css'],
})
export class ViewerPanelComponent implements OnInit, OnChanges {
  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };
  mouseOverCloseViewerId: string = null;

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
  isImageViewer = isImageViewer;
  isTableViewer = isTableViewer;

  @Input('viewers')
  set viewers(viewers: IViewer[]) {
    this.viewers$.next(viewers);
  }
  get viewers() {
    return this.viewers$.getValue();
  }
  viewers$ = new BehaviorSubject<IViewer[]>([]);

  @Input() id: string;
  @Input() selectedViewerId: string;
  @Input() hasFocus: boolean;

  @Output() onFileClose = new EventEmitter<string>();
  @Output() onFileSave = new EventEmitter<string>();

  selectedViewerIndex = 0;
  layerEntities$: Observable<{ [id: string]: IHdu }>;
  fileEntities$: Observable<{ [id: string]: DataFile }>;
  dropListConnections$: Observable<string[]>;
  subs: Subscription[] = [];
  mouseDownActiveViewerId: string;
  zoomStepFactor: number = 0.75;

  constructor(
    private store: Store,
    public viewContainerRef: ViewContainerRef,
    private viewerEventService: ImageViewerEventService
  ) {
    this.layerEntities$ = this.store.select(DataFilesState.getHduEntities);
    this.fileEntities$ = this.store.select(DataFilesState.getFileEntities);
    this.dropListConnections$ = this.store.select(WorkbenchState.getViewerPanelIds);
  }

  public getTabLabel(viewer: IViewer) {
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let layerEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let file = fileEntities[viewer.fileId];
    if (!file) return '';

    let filename = file.name;
    if (viewer.layerId) {
      let layer = layerEntities[viewer.layerId];
      if (!layer) return '';

      if (file.layerIds.length > 1) {
        return layer.name ? layer.name : `${file.name} - Layer ${file.layerIds.indexOf(layer.id)}`;
      }
    } else if (file.layerIds.length > 1) {
      filename += ` [Composite]`;
    }
    return filename;
  }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedViewerId || changes.viewers) {
      let nextSelectedViewerIndex = this.viewers
        .filter((viewer) => viewer != null)
        .map((viewer) => viewer.id)
        .indexOf(this.selectedViewerId);
      if (this.selectedViewerIndex != nextSelectedViewerIndex) {
        setTimeout(() => {
          this.selectedViewerIndex = nextSelectedViewerIndex;
        });
      }
    }
  }

  ngOnDestroy() { }

  viewerTrackByFn(index, item: IViewer) {
    // using the viewer's unique ID causes problems when the viewers are reordered.
    // Example,  open three viewers,  split one viewer to the right then drag a second viewer into the right panel.
    // The right panel's tab group shows the correct selected index but it does not detect that the viewer at that index
    // has changed and so it does not updatae the tab content.
    // return item.viewerId;
    return `${item.id}-${index}`;
  }

  closeViewer(viewerId: string) {
    this.store.dispatch(new CloseViewer(viewerId));
  }

  closeOtherViewers(viewerId: string) {
    this.store.dispatch([
      this.viewers.filter((viewer) => viewer.id != viewerId).map((viewer) => new CloseViewer(viewer.id)),
    ]);
  }

  closeViewersToTheRight(viewerId: string) {
    let viewerIds = this.viewers.map((viewer) => viewer.id);
    let index = viewerIds.indexOf(viewerId);
    if (index != -1) {
      let viewerIdsToClose = viewerIds.slice(index + 1, viewerIds.length);
      this.store.dispatch(viewerIdsToClose.map((id) => new CloseViewer(id)));
    }
  }

  closeAllViewers() {
    let viewerIds = this.viewers.map((viewer) => viewer.id);
    this.store.dispatch(viewerIds.map((id) => new CloseViewer(id)));
  }

  keepViewerOpen(viewerId: string) {
    this.store.dispatch(new KeepViewerOpen(viewerId));
  }

  setFocusedViewer($event: Event, viewerId: string, viewer: IViewer) {
    this.mouseDownActiveViewerId = this.selectedViewerId;
    if (viewerId != this.selectedViewerId || !this.hasFocus) {
      this.store.dispatch(new SetFocusedViewer(viewerId));
      $event.preventDefault();
      $event.stopImmediatePropagation();
    }
  }

  onSelectedViewerIndexChange(index) {
    // can't use this since it fires for both programmatic changes as well as user intiiated changes
    // use the click and mouse down events on the tab label for now until a better solution can be found
    // example: if the user drags the currently focused tab to a different panel,  the state action handler
    // will set focus to the tab in the new panel.  However,  the tab group in the source panel will detect
    // the change in selected index and fire this event which changes focus back to this panel.
    // if(index < 0 || index >= this.viewers.length) return;
    // let viewerId = this.viewers[index].viewerId;
    // if (viewerId != this.selectedViewerId || !this.hasFocus) {
    //   this.store.dispatch(new SetFocusedViewer(viewerId));
    // }
  }

  drop(event: CdkDragDrop<string[]>) {
    var srcPanelId = event.previousContainer.id;
    var targetPanelId = event.container.id;
    let viewer: IViewer = event.item.data;

    this.store.dispatch(new MoveViewer(viewer.id, srcPanelId, targetPanelId, event.currentIndex));
  }

  splitViewerPanel(viewerId: string, direction: 'up' | 'down' | 'left' | 'right') {
    this.store.dispatch(new SplitViewerPanel(viewerId, direction));
  }
}
