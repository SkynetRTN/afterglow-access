import {
  Component, OnInit, Input, Output, OnChanges, OnDestroy,
  ViewChild, ElementRef, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter
} from '@angular/core';

import { Store } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Point, Rectangle } from "paper";
import { Observable } from 'rxjs/Observable';
import * as SVG from 'svgjs'
import normalizeWheel from 'normalize-wheel';

import { ImageFile, getWidth, getHeight, findTiles, getPixel, getHasWcs, getWcs } from '../../../data-files/models/data-file';
import { ViewerFileState } from '../../models/viewer-file-state';
import { Marker, RectangleMarker, EllipseMarker, LineMarker, MarkerType } from '../../models/marker';
import { Region } from '../../models/region';
import { Source } from '../../models/source';

import * as fromCore from '../../reducers';
import * as workbenchActions from '../../actions/workbench';
import * as viewerActions from '../../actions/viewer';
import * as imageFileActions from '../../../data-files/actions/image-file';
import * as dataFileActions from '../../../data-files/actions/data-file';
import { Subscription } from 'rxjs/Subscription';

export type ViewportChangeEvent = {
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

export type ViewerMouseEvent = {
  imageX: number;
  imageY: number;
  hitImage: boolean;
  source: Source;
  mouseEvent: MouseEvent;
}

@Component({
  selector: 'app-pan-zoom-viewer',
  templateUrl: './pan-zoom-viewer.component.html',
  styleUrls: ['./pan-zoom-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanZoomViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input() imageFile: ImageFile;
  @Input() viewerState: ViewerFileState;
  @Input() showInfoBar: boolean = false;
  @Input() showCustomMarkers: boolean = false;
  @Input() showRegionMarker: boolean = false;
  @Input() region: Region;
  @Input() showSourceMarkers: boolean = false;
  @Input() sources: Source[] = [];
  @Input() selectedSources: Source[] = [];
  @Input() showLineMarker: boolean = false;
  @Input() line: {x1: number, y1: number, x2: number, y2: number};

  @Output() onViewportChange = new EventEmitter<ViewportChangeEvent>();
  @Output() onImageClick = new EventEmitter<ViewerMouseEvent>();
  @Output() onImageMove = new EventEmitter<ViewerMouseEvent>();

  @ViewChild('viewerPlaceholder') viewerPlaceholder: ElementRef;
  @ViewChild('svgGroup') svgGroup: ElementRef;
  private mouseInfo$ = new BehaviorSubject<{x: number, y: number, value: number, raHours: number, decDegs: number}>(null);
  private MarkerType = MarkerType;
  private viewInitialized: boolean = false;
  private placeholder: HTMLDivElement;
  private targetCanvas: HTMLCanvasElement;
  private targetCtx: CanvasRenderingContext2D;
  private imageCanvas: HTMLCanvasElement;
  private imageCtx: CanvasRenderingContext2D;
  private backgroundCanvas: HTMLCanvasElement;
  private backgroundCtx: CanvasRenderingContext2D;
  private lastClickWasDrag: boolean = false;

  private lastViewportChangeEvent: ViewportChangeEvent = null;
  private lastViewportSize: {width: number, height: number} = {width: null, height: null};

  private dragging: boolean = false;
  private zooming: boolean = false;
  private zoomingTime: number = 0.01;
  // minimum number of pixels mouse must move after click to not be considered
  private maxDeltaBeforeMove: number = 3;
  

  // a move and not a click

  private sumPixelsMoved: number = 0;
  private windowMaskUpdateNeeded: boolean = true;
  private zoomStepFactor: number = 0.92;
  private reachedMaxZoom: boolean = false;
  private reachedMinZoom: boolean = false;
  private mouseDragVector: Rectangle = new Rectangle(0, 0, 0, 0);

  private handleWindowResizeBound: EventListener;
  private handleImageMouseDownBound: EventListener;
  private handleImageMouseMoveBound: EventListener;
  private handleImageMouseWheelBound: EventListener;
  private handleDocumentMouseUpBound: EventListener;
  private handleDocumentMouseMoveWhileDownBound: EventListener;
  private handleChannelChangeBound: EventListener;
  private handleStateChangeBound: EventListener;

  private subs: Subscription[] = [];

  constructor(private store: Store<fromCore.State>, private cdRef:ChangeDetectorRef) {
    // TODO: find a better way to trigger the redraw
    this.subs.push(Observable.merge(
      this.store.select(fromCore.workbench.getShowConfig),
      this.store.select(fromCore.workbench.getShowSidebar))
      .subscribe(showConfig => {
      setTimeout(() => {
        if(!this.initialized) return;

        this.checkForResize();
        this.lazyLoadPixels();
        this.handleViewportChange();
        this.draw();
      }, 100);
    }))

  }

  removeFromLibrary() {
    if(this.imageFile) {
      this.store.dispatch(new dataFileActions.RemoveDataFile({file: this.imageFile}));
    }
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.handleWindowResizeBound = this.handleWindowResize.bind(this);
    this.handleImageMouseDownBound = this.handleImageMouseDown.bind(this);
    this.handleImageMouseMoveBound = this.handleImageMouseMove.bind(this);
    this.handleImageMouseWheelBound = this.handleImageMouseWheel.bind(this);
    this.handleDocumentMouseUpBound = this.handleDocumentMouseUp.bind(this);
    this.handleDocumentMouseMoveWhileDownBound = this.handleDocumentMouseMoveWhileDown.bind(this);




    // background pattern
    this.placeholder = this.viewerPlaceholder.nativeElement;
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = 16;
    this.backgroundCanvas.height = 16;
    this.backgroundCtx = <CanvasRenderingContext2D>  this.backgroundCanvas.getContext('2d');
    this.backgroundCtx.fillStyle = "rgb(215, 215, 215)";
    this.backgroundCtx.fillRect(0, 0, 8, 8);
    this.backgroundCtx.fillRect(8, 8, 8, 8);
    this.backgroundCtx.fillStyle = "rgb(255, 255, 255)";
    this.backgroundCtx.fillRect(8, 0, 8, 8);
    this.backgroundCtx.fillRect(0, 8, 8, 8);


    this.imageCanvas = document.createElement('canvas');
    this.imageCtx = <CanvasRenderingContext2D>  this.imageCanvas.getContext('2d');
    this.setSmoothing(this.imageCtx, false);

    // add different canvas to placeholder.  the target canvas will hold the transformations
    // and the actual canvas will be drawn onto the target canvas
    this.targetCanvas = document.createElement('canvas');
    this.targetCanvas.width = this.placeholder.clientWidth;
    this.targetCanvas.height = this.placeholder.clientHeight;
    this.targetCtx = <CanvasRenderingContext2D> this.targetCanvas.getContext('2d');
    this.setSmoothing(this.targetCtx, false);

    window.addEventListener('resize', this.debounce(this.handleWindowResizeBound, this, 250));
    
    
    // console.log('event listeners', this._targetCanvas);
    this.placeholder.addEventListener('mousedown', this.handleImageMouseDownBound);
    this.placeholder.addEventListener('mousemove', this.handleImageMouseMoveBound);
    this.placeholder.addEventListener('mousewheel', this.handleImageMouseWheelBound);
    this.placeholder.addEventListener('DOMMouseScroll', this.handleImageMouseWheelBound);

    // empty placeholder
    // while (this._placeholder.firstChild) {
    //   this._placeholder.removeChild(this._placeholder.firstChild);
    // }
    this.placeholder.appendChild(this.targetCanvas);
    
    // this._svg = SVG(this._svgDiv);
    // this._svgMarkerGroup = this._svg.group();

    this.viewInitialized = true;

    this.handleViewportChange();
    this.draw();
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  private setSmoothing(ctx: CanvasRenderingContext2D, value: boolean) {
    ctx.mozImageSmoothingEnabled = value;
    // ctx.msImageSmoothingEnabled = value;
    ctx.oImageSmoothingEnabled = value;
    ctx.webkitImageSmoothingEnabled = value;
    ctx.imageSmoothingEnabled = value;
  }

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  private debounce(func: any, context: any, wait: number, immediate: boolean = false) {
    let timeout: any;
    return function () {
      let args = arguments;
      let later = function () {
        timeout = NaN;
        if (!immediate) {
          func.apply(context, args);
        }
      };
      let callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        func.apply(context, args);
      }
    };
  }

  public viewportCoordFromEvent(e: MouseEvent) {
    let totalOffsetX = 0;
    let totalOffsetY = 0;
    let canvasX = 0;
    let canvasY = 0;
    let currentElement : any = this.targetCanvas;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

    canvasX = e.pageX - totalOffsetX;
    canvasY = e.pageY - totalOffsetY;

    // assume we are in the center of the pixel
    return new Point(canvasX+0.5, canvasY+0.5);

      //return new Point(e.pageX - this._targetCanvas.offsetLeft, e.pageY - this._targetCanvas.offsetTop);
  }

  get width() {
    return this.targetCanvas.width;
  }

  get height() {
    return this.targetCanvas.height;
  }

  get scale() {
    // let temp = this.viewerStateConfig.imageToViewportTransform.scaling;
    let temp = new Point(this.viewerState.imageToViewportTransform.a, this.viewerState.imageToViewportTransform.c);
    return temp.getDistance(new Point(0, 0));
  }

  get viewportTopLeft() {
    return new Point(-this.viewerState.imageToViewportTransform.tx, -this.viewerState.imageToViewportTransform.ty);
  }

  public moveBy(xShift: number, yShift: number) {
    this.store.dispatch(new viewerActions.MoveBy({
      file: this.imageFile,
      xShift: xShift,
      yShift: yShift,
    }));
  }

  public moveToCenter() {
    this.moveTo({x: getWidth(this.imageFile)/2, y: getHeight(this.imageFile)/2})
  }

  public moveTo(imageRef: {x: number, y: number}, canvasRef: {x: number, y: number} = null) {
    if(canvasRef == null) {
        canvasRef = {x: this.width/2, y: this.height/2};
    }
    let xShift = this.viewportTopLeft.x - (imageRef.x * this.scale - canvasRef.x);
    let yShift = this.viewportTopLeft.y - (imageRef.y * this.scale - canvasRef.y);
    this.moveBy(xShift, yShift);
  }

  public zoomIn(imageAnchor: {x: number, y: number}=null) {
    if (!this.reachedMaxZoom) {
        this.zoomBy(1.0 / this.zoomStepFactor, imageAnchor);
    }
  }

  public zoomOut(imageAnchor: {x: number, y: number}=null) {
    this.zoomBy(this.zoomStepFactor, imageAnchor);
  }

  public zoomBy(factor: number, imageAnchor: {x: number, y: number}=null) {
    // max zoom reached when 1 pixel fills viewport
    let viewportUpperLeft = this.imageCoordToViewportCoord({x: 1, y: 1});
    let viewportULP = new Point(viewportUpperLeft.x, viewportUpperLeft.y)
    let viewportLowerRight = this.imageCoordToViewportCoord({x: 2, y: 2});
    let viewportLRP = new Point(viewportLowerRight.x, viewportLowerRight.y);
    
    let d = viewportULP.getDistance(viewportLRP);
    this.reachedMaxZoom = d > this.targetCanvas.clientWidth || d > this.targetCanvas.clientHeight;

    // min zoom reached when image fits in viewer
    viewportLowerRight = this.imageCoordToViewportCoord(new Point(getWidth(this.imageFile), getHeight(this.imageFile)));
    viewportLRP = new Point(viewportLowerRight.x, viewportLowerRight.y);
    d = viewportULP.getDistance(viewportLRP);
    this.reachedMinZoom = d < this.targetCanvas.clientWidth && d < this.targetCanvas.clientHeight;

    if (factor === 1 || (factor > 1 && this.reachedMaxZoom) || (factor < 1 && this.reachedMinZoom)) {
        // do nothing
        
        return;
    }

    this.zooming = true;

    // if image anchor is null, set to center of image viewer
    if (arguments.length === 1 || imageAnchor==null) {
        let centerViewer = new Point(this.targetCanvas.width / 2.0, this.targetCanvas.height / 2.0);
        imageAnchor = this.viewportCoordToImageCoord(centerViewer);
    }
    this.store.dispatch(new viewerActions.ZoomBy({
      file: this.imageFile,
      scaleFactor: factor,
      anchorPoint: {x: imageAnchor.x, y: imageAnchor.y}
    }));
  }

  public zoomTo(value: number, imageAnchor: Point=null) {
    let factor = value / this.scale;
    this.zoomBy(factor, imageAnchor);
  }

  public zoomToFit(padding: number=0) {
    // let xScale = (this.targetCanvas.width-2*padding)/getWidth(this.imageFile);
    // let yScale = (this.targetCanvas.height-2*padding)/getHeight(this.imageFile);
    // this.zoomTo(Math.min(xScale, yScale));

    this.store.dispatch(new viewerActions.CenterRegionInViewport({
      file: this.imageFile,
      region: {x: 1, y: 1, width: getWidth(this.imageFile), height: getHeight(this.imageFile)},
      viewportSize: {width: this.targetCanvas.width, height: this.targetCanvas.height}
    }))

    // this.moveTo(
    //     new Point(this.state.width/2.0, this.state.height/2.0),
    //     new Point(this._targetCanvas.width, this._targetCanvas.height)
    // );
    
  }

  public get viewportToImageTransform() {
    return this.viewerState.imageToViewportTransform.inverted();
  }

  public viewportCoordToImageCoord(p: {x: number, y: number}) {
    let result = this.viewportToImageTransform.transform(new Point(p.x, p.y));
    return {x: result.x+0.5, y: result.y+0.5};
  }

  public imageCoordToViewportCoord(p: {x: number, y: number}) {
    let result = this.viewerState.imageToViewportTransform.transform(new Point(p.x-0.5, p.y-0.5));
    return {x: result.x, y: result.y};
  }

  public mouseOnImage(viewportCoord: Point) {
    // console.log('mouse on image');

    let imagePoint = this.viewportCoordToImageCoord(new Point(viewportCoord.x, viewportCoord.y));
    let mouseOffImage: boolean = imagePoint.x < 0.5 || imagePoint.x >= getWidth(this.imageFile)+0.5 ||
      imagePoint.y < 0.5 || imagePoint.y >= getHeight(this.imageFile)+0.5;
    //console.log(viewportCoord.x, viewportCoord.y, imagePoint.x, imagePoint.y, !mouseOffImage);
    return !mouseOffImage;
  }

  private handleViewportChange() {
    let viewportSize = {width: this.placeholder.clientWidth, height: this.placeholder.clientHeight};
    if(this.imageFile && this.imageFile.headerLoaded && this.viewerState) {
      let transform = this.viewerState.imageToViewportTransform.inverted();
      let ul = transform.transform(new Point(0.5, 0.5));
      ul.x += 0.5;
      ul.y += 0.5;
      let lr = transform.transform(new Point(viewportSize.width+0.5, viewportSize.height+0.5));
      lr.x += 0.5;
      lr.y += 0.5;
      
      let x = Math.max(0.5, ul.x);
      let y = Math.max(0.5, lr.y);
      let $event: ViewportChangeEvent = {
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
        imageX: x,
        imageY: y,
        imageWidth: Math.abs(Math.min(getWidth(this.imageFile)+0.5, lr.x) - x),
        imageHeight: Math.abs(y-Math.min(getHeight(this.imageFile)+0.5, ul.y))
      }
      
      if(JSON.stringify(this.lastViewportChangeEvent) !== JSON.stringify($event) ) {
        this.onViewportChange.emit($event);
        this.lastViewportChangeEvent = $event;
      }
    }
    if(JSON.stringify(this.lastViewportSize) !== JSON.stringify(viewportSize) ) {
      this.store.dispatch(new viewerActions.UpdateViewportSize({width: viewportSize.width, height: viewportSize.height}));
      this.lastViewportSize = viewportSize;
    }
    
  }

  private handleWindowResize() {
    this.draw();
  }

  public handleImageMouseWheel(event: WheelEvent) {
    if(!this.initialized) return;

    
    // console.log('mouse wheel', event);
    let viewportCoord = this.viewportCoordFromEvent(event);
    if (!this.mouseOnImage(viewportCoord)) {
      return;
    }

    let mouseImage = this.viewportCoordToImageCoord(viewportCoord);
    const normalized = normalizeWheel(event);
    let delta: number = normalized.spinY;

    /*TODO: Use the scroll distance to change zoom amount*/
    if (delta > 0) {
      this.zoomOut(mouseImage);
      this.zoomOut(mouseImage);
    }
    else {
      this.zoomIn(mouseImage);
      this.zoomIn(mouseImage);
    }

    event.preventDefault();
  }

  public handleImageMouseDown(event: MouseEvent) {
    if(!this.initialized) return;

    this.dragging = false;
    // console.log('image mouse down');
    let viewportCoord = this.viewportCoordFromEvent(event);
    if (!this.mouseOnImage(viewportCoord)) {
      return;
    }

    this.mouseDragVector.topLeft = new Point(viewportCoord.x, viewportCoord.y);
    this.placeholder.removeEventListener('mousedown', this.handleImageMouseDownBound);
    document.addEventListener('mouseup', this.handleDocumentMouseUpBound);
    // document.addEventListener('mouseup', this.handleImageMouseUpBound);
    document.addEventListener('mousemove', this.handleDocumentMouseMoveWhileDownBound);

    this.sumPixelsMoved = 0;
  }

  public handleImageMouseMove(event: MouseEvent) {
    if(!this.initialized) return;
    // console.log('image mouse move');
    let viewportCoord = this.viewportCoordFromEvent(event);
    if (!this.mouseOnImage(viewportCoord))
      return;

    let mouseImage = this.viewportCoordToImageCoord(viewportCoord);
    //this.fire(new ImageViewerMouseEvent("imagemousemove", mouseImage.x, mouseImage.y));
  }

  public handleDocumentMouseMoveWhileDown(event: MouseEvent) {
    if(!this.initialized) return;
    // console.log('image mouse move while down');
    let viewportCoord = this.viewportCoordFromEvent(event);

    this.mouseDragVector.bottomRight = new Point(viewportCoord.x, viewportCoord.y);

    // test if image is almost entirely out of viewer
    let buffer = 50;
    let ul = this.imageCoordToViewportCoord(new Point(getWidth(this.imageFile), getHeight(this.imageFile)));
    let lr = this.imageCoordToViewportCoord(new Point(0, 0));
    let imageRect = new Rectangle(Math.min(ul.x, lr.x) + buffer + this.mouseDragVector.width,
      Math.min(ul.y, lr.y) + buffer + this.mouseDragVector.height,
      Math.abs(ul.x - lr.x) - (buffer * 2),
      Math.abs(ul.y - lr.y) - (buffer * 2)
    );


    let viewportRect = new Rectangle(0, 0, this.targetCanvas.clientWidth, this.targetCanvas.clientHeight);
    if (!imageRect.intersects(viewportRect)) {
      let e = event || window.event;
      //EventTarget.pauseEvent(e);
      return;
    }


    this.sumPixelsMoved += this.mouseDragVector.topLeft.getDistance(this.mouseDragVector.bottomRight);
    if (this.sumPixelsMoved > this.maxDeltaBeforeMove && !this.dragging) {
      this.dragging = true;
      // this.dispatchEvent(new FitsViewerMouseEvent(FitsViewerMouseEvent.PAN_START,this.mouseImage));
    }

    if (this.dragging) {
      let e = event || window.event;
      //EventTarget.pauseEvent(e);
    }

    this.moveBy(this.mouseDragVector.width, this.mouseDragVector.height);
    // console.log('moving by: ', this._mouseDragVector.width, this._mouseDragVector.height)
    // console.log(this._sumPixelsMoved);
    this.mouseDragVector.topLeft = this.mouseDragVector.bottomRight.clone();
    if(this.dragging) {
      //this.fire(new ImageViewerMouseEvent("imagemousedrag", null, null));
    }
    event.preventDefault();
  }

  public handleDocumentMouseUp(event: MouseEvent) {
    if(!this.initialized) return;
    // console.log('document mouse up');
    document.removeEventListener('mouseup', this.handleDocumentMouseUpBound);
    // document.removeEventListener('mouseup', this.handleImageMouseUpBound);
    document.removeEventListener('mousemove', this.handleDocumentMouseMoveWhileDownBound);
    this.placeholder.addEventListener('mousedown', this.handleImageMouseDownBound);

    // if (this.dragging) {
    //   // this.dispatchEvent(new FitsViewerMouseEvent(FitsViewerMouseEvent.PAN_END,this.mouseImage));
    // }
    // else {
      


    // }
    // this.dragging = false;
  }

  onViewportMove($event: MouseEvent) {
    if (this.initialized) {
      let viewportCoord = this.viewportCoordFromEvent($event);
      let onImage = this.mouseOnImage(viewportCoord);
      let mouseImage = this.viewportCoordToImageCoord(viewportCoord);
      this.onImageMove.emit({hitImage: onImage, imageX: mouseImage.x, imageY: mouseImage.y, mouseEvent: $event, source: null})

      if(onImage) {
        let x = mouseImage.x
        let y = mouseImage.y
        let value = getPixel(this.imageFile, x, y);
          
        let raHours = null;
        let decDegs = null;
    
        if(this.imageFile.header && getHasWcs(this.imageFile)) {
          let wcs = getWcs(this.imageFile);
          let raDec = wcs.pixToWorld([x,y]);
          raHours = raDec[0];
          decDegs = raDec[1];
        }
    
        this.mouseInfo$.next({x: x, y: y, value: value, raHours: raHours, decDegs: decDegs});
    
      }
      else {
        this.mouseInfo$.next(null);
      }
      
      //this.fire(new ImageViewerMouseEvent("imagemouseclick", mouseImage.x, mouseImage.y));
    }
  }

  onViewportClick($event: MouseEvent, source: Source = null) {
    if (this.initialized && !this.dragging) {
      let viewportCoord = this.viewportCoordFromEvent($event);
      let onImage = this.mouseOnImage(viewportCoord);
      let mouseImage = this.viewportCoordToImageCoord(viewportCoord);
      this.onImageClick.emit({hitImage: onImage, imageX: mouseImage.x, imageY: mouseImage.y, mouseEvent: $event, source: source})
      //this.fire(new ImageViewerMouseEvent("imagemouseclick", mouseImage.x, mouseImage.y));
    }
  }

  onSourceClick($event: MouseEvent, source: Source) {
    this.onViewportClick($event, source)
    $event.stopPropagation();
  }

  ngAfterViewChecked() {
    // console.log("after view check");
    // this.draw();
    // this.cdRef.detectChanges();
  }

  getViewportTiles() {
     //console.log(this._imageCanvas);
     if(getWidth(this.imageFile) != this.imageCanvas.width || getHeight(this.imageFile) != this.imageCanvas.height) {
      this.imageCanvas.width = getWidth(this.imageFile);
      this.imageCanvas.height = getHeight(this.imageFile);
    }

    let corner0 = this.viewportCoordToImageCoord(new Point(0, 0));
    let corner1 = this.viewportCoordToImageCoord(new Point(this.targetCanvas.clientWidth, this.targetCanvas.clientHeight));

    return findTiles(this.imageFile, Math.min(corner0.x, corner1.x), Math.min(corner0.y, corner1.y), Math.abs(corner1.x-corner0.x), Math.abs(corner1.y-corner0.y));
  }

  checkForResize() {
    if(this.targetCanvas.width != this.placeholder.clientWidth || this.targetCanvas.height != this.placeholder.clientHeight) {
      this.targetCanvas.width = this.placeholder.clientWidth;
      this.targetCanvas.height = this.placeholder.clientHeight;
      // this._svg.size(this._placeholder.clientWidth, this._placeholder.clientHeight);
      this.setSmoothing(this.targetCtx, false);
    }
  }

  ngOnChanges() {
    if(this.initialized) {
      //must async dispatch actions within life cycle hooks to prevent
      //ExpressionChangedAfterItHasBeenChecked Error
      //https://blog.angularindepth.com/everything-you-need-to-know-about-the-expressionchangedafterithasbeencheckederror-error-e3fd9ce7dbb4 
      setTimeout(() => {
        this.checkForResize();
        this.lazyLoadPixels();
        this.handleViewportChange();
      });
    }
    
    this.draw();
    //draw immediately for optimal performance once tiles have loaded
  }
  
  private get initialized() {
    return this.viewInitialized && this.imageFile && this.viewerState && this.imageFile.headerLoaded;
  }

  public lazyLoadPixels() {
    if(!this.initialized) return;
    let tiles = this.getViewportTiles();
    tiles.forEach(tile => {
      let normTile = this.viewerState.normalizedTiles[tile.index];
      if(!tile.pixelsLoaded && !tile.pixelsLoading && !tile.pixelLoadingFailed) {
        this.store.dispatch(new imageFileActions.LoadImageTilePixels({
          file: this.imageFile,
          tile: tile
        }));
      }
      else if(tile.pixelsLoaded && !normTile.pixelsLoaded && !normTile.pixelsLoading && !normTile.pixelLoadingFailed) {
        this.store.dispatch(new viewerActions.NormalizeImageTile({
          file: this.imageFile,
          tile: tile
        }));
      }
    })

  }

  public draw() {
    if(!this.viewInitialized) return;
    let backgroundPattern = this.targetCtx.createPattern(this.backgroundCanvas, 'repeat');
    this.targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.setSmoothing(this.targetCtx, false);
    this.targetCtx.globalAlpha = 1.0;
    this.targetCtx.clearRect(0, 0, this.targetCtx.canvas.width, this.targetCtx.canvas.height);
    this.targetCtx.fillStyle = backgroundPattern;
    this.targetCtx.fillRect(0, 0, this.targetCtx.canvas.width, this.targetCtx.canvas.height);

    if(this.initialized) {
      let tiles = this.getViewportTiles();

      tiles.forEach(tile => {
        let normTile = this.viewerState.normalizedTiles[tile.index];
        if(!tile.pixelsLoaded) {
          // fill in tile with solid background when image file pixels have not been loaded
          this.imageCtx.fillStyle = "rgb(100, 100, 100)";
          this.imageCtx.fillRect(tile.x, tile.y, tile.width, tile.height);
        }
        else if(normTile.pixelsLoaded) {
          let imageData = this.imageCtx.createImageData(normTile.width, normTile.height);
          let blendedImageDataUint8Clamped = new Uint8ClampedArray(normTile.pixels.buffer);
          imageData.data.set(blendedImageDataUint8Clamped);
          this.imageCtx.putImageData(imageData, normTile.x, normTile.y);
          
          // setTimeout(() => {
          //   this.store.dispatch(new workbenchActions.ImageTileDrawn({
          //     file: this.imageFile,
          //     tile: tile
          //   }));
          // });
        }
        
      })

      this.viewerState.imageToViewportTransform.applyToContext(this.targetCtx);
      this.targetCtx.drawImage(this.imageCanvas, 0, 0);

      let t = this.viewerState.imageToViewportTransform;
      this.svgGroup.nativeElement.setAttribute('transform', `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.tx} ${t.ty})`);

    }
    
    
    


    
    this.setSmoothing(this.targetCtx, true);
    this.targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.targetCtx.globalAlpha = 1.0;


  }

}
