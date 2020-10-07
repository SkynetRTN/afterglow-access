import {
  Component, OnInit, Input, Output, OnChanges, OnDestroy,
  ViewChild, ElementRef, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter, Directive
} from '@angular/core';

import { Point, Rectangle } from "paper";
import * as SVG from 'svgjs'
import * as normalizeWheel from 'normalize-wheel';

import { Source } from '../../models/source';
import { Store } from '@ngxs/store';
import { LoadRawImageTile } from '../../../data-files/data-files.actions';
import { animateChild } from '@angular/animations';
import { IImageData, ImageTile, findTiles } from '../../../data-files/models/image-data';
import { BlendMode } from '../../../data-files/models/blend-mode';
import { Transform, invertTransform, transformPoint, getViewportRegion, transformToMatrix } from '../../../data-files/models/transformation';

export type ViewportChangeEvent = {
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

export type ViewportSizeChangeEvent = {
  width: number;
  height: number;
}

export type CanvasSizeChangeEvent = {
  width: number;
  height: number;
}

export type CanvasMouseEvent = {
  imageX: number;
  imageY: number;
  hitImage: boolean;
  source: Source;
  mouseEvent: MouseEvent;
}

export type MoveByEvent = {
  xShift: number;
  yShift: number;
}

export type ZoomByEvent = {
  factor: number;
  anchor: {x: number, y: number}
}

export type ZoomToEvent = {
  factor: number;
  anchor: {x: number, y: number}
}

export type ZoomToFitEvent = {
}

export type LoadTileEvent = {
  imageDataId: string;
  tileIndex: number;
}

@Directive({
  selector: '[app-pan-zoom-canvas]',
  host: {
    // 'class': 'viewer',
    '(click)': 'onViewportClick($event)',
    '(mousemove)': 'onViewportMove($event)',
    // '(touchmove)': 'onViewportMove($event)',
    '[class.dragging]': 'dragging',
    '[class.mouse-over-image]': 'mouseOverImage'
  },
  exportAs: 'panZoomCanvas'
})
export class PanZoomCanvasComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() imageData: IImageData<Uint32Array>;
  @Input() transform: Transform;

  @Output() onViewportChange = new EventEmitter<ViewportChangeEvent>();
  @Output() onCanvasSizeChange = new EventEmitter<CanvasSizeChangeEvent>();
  @Output() onViewportSizeChange = new EventEmitter<ViewportSizeChangeEvent>();
  @Output() onImageClick = new EventEmitter<CanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<CanvasMouseEvent>();

  @Output() onMoveBy = new EventEmitter<MoveByEvent>();
  @Output() onZoomBy = new EventEmitter<ZoomByEvent>();
  @Output() onLoadTile = new EventEmitter<LoadTileEvent>();

  private viewInitialized: boolean = false;
  private placeholder: HTMLDivElement;
  private targetCanvas: HTMLCanvasElement;
  private targetCtx: CanvasRenderingContext2D;
  private imageCanvas: HTMLCanvasElement;
  private imageCtx: CanvasRenderingContext2D;
  private backgroundCanvas: HTMLCanvasElement;
  private backgroundCtx: CanvasRenderingContext2D;
  private lastImageData: IImageData<Uint32Array> = null;

  private lastViewportChangeEvent: ViewportChangeEvent = null;
  private lastViewportSize: { width: number, height: number } = { width: null, height: null };

  private dragging: boolean = false;
  private dragged: boolean = false;
  private mouseOverImage: boolean = false;
  // minimum number of pixels mouse must move after click to not be considered
  private maxDeltaBeforeMove: number = 5;
  private bufferedTiles: { [key: number]: ImageTile<Uint32Array> } = {};


  // a move and not a click

  private sumPixelsMoved: number = 0;
  private zoomStepFactor: number = 0.92;
  private mouseDragVector = new Rectangle(0, 0, 0, 0);

  private handleWindowResizeBound: EventListener;
  private handleImageMouseDownBound: EventListener;
  private handleImageMouseMoveBound: EventListener;
  private handleImageMouseWheelBound: EventListener;
  private handleDocumentMouseUpBound: EventListener;
  private handleDocumentMouseMoveWhileDownBound: EventListener;
  private handleChannelChangeBound: EventListener;
  private handleStateChangeBound: EventListener;

  private resizeMonitor: any;

  constructor(private store: Store, protected viewerPlaceholder: ElementRef) {
  }

  ngOnInit() { }

  initializeResizeMonitor() {
    let self = this;
    this.resizeMonitor = setInterval(function () {
      if (self.checkForResize()) {
        self.lazyLoadPixels();
        self.handleViewportChange();
        self.draw();
      }
    }, 50);
  }

  ngAfterViewInit() {
    this.handleWindowResizeBound = this.handleWindowResize.bind(this);
    this.handleImageMouseDownBound = this.handleImageMouseDown.bind(this);
    this.handleImageMouseMoveBound = this.handleImageMouseMove.bind(this);
    this.handleImageMouseWheelBound = this.handleImageMouseWheel.bind(this);
    this.handleDocumentMouseUpBound = this.handleDocumentMouseUp.bind(this);
    this.handleDocumentMouseMoveWhileDownBound = this.handleDocumentMouseMoveWhileDown.bind(this);

    this.initializeResizeMonitor();

    // background pattern
    let patternWidth = 8;
    this.placeholder = this.viewerPlaceholder.nativeElement;
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = patternWidth * 2;
    this.backgroundCanvas.height = patternWidth * 2;
    this.backgroundCtx = <CanvasRenderingContext2D>this.backgroundCanvas.getContext('2d');
    this.backgroundCtx.fillStyle = "rgb(215, 215, 215)";
    this.backgroundCtx.fillRect(0, 0, patternWidth, patternWidth);
    this.backgroundCtx.fillRect(patternWidth, patternWidth, patternWidth, patternWidth);
    this.backgroundCtx.fillStyle = "rgb(255, 255, 255)";
    this.backgroundCtx.fillRect(patternWidth, 0, patternWidth, patternWidth);
    this.backgroundCtx.fillRect(0, patternWidth, patternWidth, patternWidth);

    this.imageCanvas = document.createElement('canvas');
    this.imageCtx = <CanvasRenderingContext2D>this.imageCanvas.getContext('2d');
    this.setSmoothing(this.imageCtx, false);

    // add different canvas to placeholder.  the target canvas will hold the transformations
    // and the actual canvas will be drawn onto the target canvas
    this.targetCanvas = document.createElement('canvas');
    this.targetCanvas.width = this.placeholder.clientWidth;
    this.targetCanvas.height = this.placeholder.clientHeight;
    this.targetCtx = <CanvasRenderingContext2D>this.targetCanvas.getContext('2d');
    this.setSmoothing(this.targetCtx, false);
    window.addEventListener('resize', this.debounce(this.handleWindowResizeBound, this, 250));
    this.placeholder.addEventListener('mousedown', this.handleImageMouseDownBound);
    // this.placeholder.addEventListener('touchstart', this.handleImageMouseDownBound);
    this.placeholder.addEventListener('mousemove', this.handleImageMouseMoveBound);
    // this.placeholder.addEventListener('touchmove', this.handleImageMouseDownBound);
    this.placeholder.addEventListener('mousewheel', this.handleImageMouseWheelBound);
    this.placeholder.addEventListener('DOMMouseScroll', this.handleImageMouseWheelBound);
    this.placeholder.appendChild(this.targetCanvas);
    this.viewInitialized = true;

    this.handleViewportChange();
    this.draw();
  }

  ngOnDestroy() {
    clearInterval(this.resizeMonitor);
  }

  private setSmoothing(ctx: CanvasRenderingContext2D, value: boolean) {
    //ctx.mozImageSmoothingEnabled = value;
    // ctx.msImageSmoothingEnabled = value;
    //ctx.oImageSmoothingEnabled = value;
    //ctx.webkitImageSmoothingEnabled = value;
    ctx.imageSmoothingEnabled = value;
  }

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
    let currentElement: any = this.targetCanvas;

    do {
      totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
      totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while (currentElement = currentElement.offsetParent)

    canvasX = e.pageX - totalOffsetX;
    canvasY = e.pageY - totalOffsetY;

    // assume we are in the center of the pixel
    return new Point(canvasX + 0.5, canvasY + 0.5);

    //return new Point(e.pageX - this._targetCanvas.offsetLeft, e.pageY - this._targetCanvas.offsetTop);
  }

  get canvas() {
    return this.targetCanvas;
  }

  get canvasWidth() {
    return this.targetCanvas ? this.targetCanvas.width : 0;
  }

  get canvasHeight() {
    return this.targetCanvas ? this.targetCanvas.height : 0;
  }

  get placeholderWidth() {
    return this.placeholder ? this.placeholder.clientWidth : 0;
  }

  get placeholderHeight() {
    return this.placeholder ? this.placeholder.clientHeight : 0;
  }

  get scale() {
    // let temp = this.normalizationConfig.imageToViewportTransform.scaling;
    let temp = new Point(this.transform.a, this.transform.c);
    return temp.getDistance(new Point(0, 0));
  }

  get viewportTopLeft() {
    return new Point(-this.transform.tx, -this.transform.ty);
  }

  public moveBy(xShift: number, yShift: number) {
    this.onMoveBy.emit({xShift: xShift, yShift: yShift})
  }

  public moveToCenter() {
    this.moveTo({ x: this.imageData.width / 2, y: this.imageData.height / 2 })
  }

  public moveTo(imageRef: { x: number, y: number }, canvasRef: { x: number, y: number } = null) {
    if (canvasRef == null) {
      canvasRef = { x: this.canvasWidth / 2, y: this.canvasHeight / 2 };
    }
    let xShift = this.viewportTopLeft.x - (imageRef.x * this.scale - canvasRef.x);
    let yShift = this.viewportTopLeft.y - (imageRef.y * this.scale - canvasRef.y);
    this.moveBy(xShift, yShift);
  }

  public zoomBy(factor: number, imageAnchor: { x: number, y: number } = null) {
    this.onZoomBy.emit({anchor: imageAnchor, factor: factor})
  }

  public get viewportToImageTransform() {
    return invertTransform(this.transform);
  }

  public viewportCoordToImageCoord(p: { x: number, y: number }) {
    let result = transformPoint(p, this.viewportToImageTransform);
    return { x: result.x + 0.5, y: result.y + 0.5 };
  }

  public imageCoordToViewportCoord(p: { x: number, y: number }) {
    return transformPoint({x: p.x - 0.5, y: p.y - 0.5}, this.transform);
  }

  public mouseOnImage(viewportCoord: {x: number, y: number}) {
    // console.log('mouse on image');

    let imagePoint = this.viewportCoordToImageCoord(new Point(viewportCoord.x, viewportCoord.y));
    let mouseOffImage: boolean = imagePoint.x < 0.5 || imagePoint.x >= this.imageData.width + 0.5 ||
      imagePoint.y < 0.5 || imagePoint.y >= this.imageData.height + 0.5;
    //console.log(viewportCoord.x, viewportCoord.y, imagePoint.x, imagePoint.y, !mouseOffImage);
    return !mouseOffImage;
  }

  private handleViewportChange() {
    if(!this.transform) return;
    let viewportSize = { width: this.placeholder.clientWidth, height: this.placeholder.clientHeight };
    if (this.imageData && this.transform) {

      let viewportRegion = getViewportRegion(this.transform, this.imageData.width, this.imageData.height, viewportSize.width, viewportSize.height);

      let $event: ViewportChangeEvent = {
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
        imageX: viewportRegion.x,
        imageY: viewportRegion.y,
        imageWidth: viewportRegion.width,
        imageHeight: viewportRegion.height
      }

      if (JSON.stringify(this.lastViewportChangeEvent) !== JSON.stringify($event)) {
        this.onViewportChange.emit($event);
        this.lastViewportChangeEvent = $event;
      }
    }
    if (JSON.stringify(this.lastViewportSize) !== JSON.stringify(viewportSize)) {
      setTimeout(() => {
        this.onViewportSizeChange.emit({ width: viewportSize.width, height: viewportSize.height })

      });

      
      this.lastViewportSize = viewportSize;
    }

  }

  private handleWindowResize() {
    this.draw();
  }

  public handleImageMouseWheel(event: WheelEvent) {
    if (!this.initialized) return;

    let viewportCoord = this.viewportCoordFromEvent(event);
    if (!this.mouseOnImage(viewportCoord)) {
      return;
    }

    let mouseImage = this.viewportCoordToImageCoord(viewportCoord);
    const normalized = normalizeWheel(event);
    let delta: number = normalized.spinY;

    if (delta > 0) {
      this.zoomBy(Math.pow(this.zoomStepFactor,2), viewportCoord);
    }
    else {
      this.zoomBy(Math.pow(1/this.zoomStepFactor,2), viewportCoord);
    }

    event.preventDefault();
  }

  public handleImageMouseDown(event: MouseEvent) {
    if (!this.initialized) return;

    this.dragging = false;
    this.dragged = false;
    let viewportCoord = this.viewportCoordFromEvent(event);
    if (!this.mouseOnImage(viewportCoord)) {
      return;
    }

    this.mouseDragVector.topLeft = new Point(viewportCoord.x, viewportCoord.y);
    this.placeholder.removeEventListener('mousedown', this.handleImageMouseDownBound);
    // this.placeholder.removeEventListener('touchstart', this.handleImageMouseDownBound);
    document.addEventListener('mouseup', this.handleDocumentMouseUpBound);
    // document.addEventListener('mouseup', this.handleImageMouseUpBound);
    document.addEventListener('mousemove', this.handleDocumentMouseMoveWhileDownBound);
    // document.addEventListener('touchmove', this.handleDocumentMouseMoveWhileDownBound);

    this.sumPixelsMoved = 0;
  }

  public handleImageMouseMove(event: MouseEvent) {
    if (!this.initialized) return;
    let viewportCoord = this.viewportCoordFromEvent(event);
    this.mouseOverImage = this.mouseOnImage(viewportCoord)
    let mouseImage = this.viewportCoordToImageCoord(viewportCoord);
  }

  public handleDocumentMouseMoveWhileDown(event: MouseEvent) {
    if (!this.initialized) return;
    let viewportCoord = this.viewportCoordFromEvent(event);

    this.mouseDragVector.bottomRight = new Point(viewportCoord.x, viewportCoord.y);

    // // test if image is almost entirely out of viewer
    // let buffer = 50;
    // let c1 = this.imageCoordToViewportCoord(new Point(getWidth(this.imageFile), getHeight(this.imageFile)));
    // let c2 = this.imageCoordToViewportCoord(new Point(0, 0));
    // let c3 = this.imageCoordToViewportCoord(new Point(0, getHeight(this.imageFile)));
    // let c4 = this.imageCoordToViewportCoord(new Point(getWidth(this.imageFile), 0));
    // let maxPoint = new Point(Math.max(c1.x, c2.x, c3.x, c4.x), Math.max(c1.y, c2.y, c3.y, c4.y));
    // let minPoint =  new Point(Math.min(c1.x, c2.x, c3.x, c4.x), Math.min(c1.y, c2.y, c3.y, c4.y));
    // let imageRect = new Rectangle(minPoint.x + buffer + this.mouseDragVector.width,
    //   minPoint.y + buffer + this.mouseDragVector.height,
    //   maxPoint.x - minPoint.x - (buffer * 2),
    //   maxPoint.y - minPoint.y - (buffer * 2)
    // );


    // let viewportRect = new Rectangle(0, 0, this.targetCanvas.clientWidth, this.targetCanvas.clientHeight);
    // if (!imageRect.intersects(viewportRect)) {
    //   let e = event || window.event;
    //   return;
    // }


    this.sumPixelsMoved += this.mouseDragVector.topLeft.getDistance(this.mouseDragVector.bottomRight);
    if (this.sumPixelsMoved > this.maxDeltaBeforeMove && !this.dragging) {
      this.dragging = true;
      this.dragged = true;
    }

    if (this.dragging) {
      let e = event || window.event;
      this.moveBy(this.mouseDragVector.width, this.mouseDragVector.height);
      this.mouseDragVector.topLeft = this.mouseDragVector.bottomRight.clone();
      event.preventDefault();
      
    }

    
    
  }

  public handleDocumentMouseUp(event: MouseEvent) {
    if (!this.initialized) return;
    document.removeEventListener('mouseup', this.handleDocumentMouseUpBound);
    document.removeEventListener('mousemove', this.handleDocumentMouseMoveWhileDownBound);
    // document.removeEventListener('touchmove', this.handleDocumentMouseMoveWhileDownBound);
    this.placeholder.addEventListener('mousedown', this.handleImageMouseDownBound);
    // this.placeholder.addEventListener('touchstart', this.handleImageMouseDownBound);
    this.dragging = false;
  }

  onViewportMove($event: MouseEvent) {
    if (this.initialized) {
      let viewportCoord = this.viewportCoordFromEvent($event);
      let onImage = this.mouseOnImage(viewportCoord);
      let mouseImage = this.viewportCoordToImageCoord(viewportCoord);
      this.onImageMove.emit({ hitImage: onImage, imageX: mouseImage.x, imageY: mouseImage.y, mouseEvent: $event, source: null })
    }
  }

  onViewportClick($event: MouseEvent) {
    if (this.initialized && !this.dragged) {
      let viewportCoord = this.viewportCoordFromEvent($event);
      let onImage = this.mouseOnImage(viewportCoord);
      let mouseImage = this.viewportCoordToImageCoord(viewportCoord);
      this.onImageClick.emit({ hitImage: onImage, imageX: mouseImage.x, imageY: mouseImage.y, mouseEvent: $event, source: null })
    }
  }

  ngAfterViewChecked() {
  }

  getViewportTiles() {
    if (this.imageData.width != this.imageCanvas.width || this.imageData.height != this.imageCanvas.height) {
      this.imageCanvas.width = this.imageData.width;
      this.imageCanvas.height = this.imageData.height;
    }

    let c1 = this.viewportCoordToImageCoord(new Point(this.targetCanvas.clientWidth, this.targetCanvas.clientHeight));
    let c2 = this.viewportCoordToImageCoord(new Point(0, 0));
    let c3 = this.viewportCoordToImageCoord(new Point(0,this.targetCanvas.clientHeight));
    let c4 = this.viewportCoordToImageCoord(new Point(this.targetCanvas.clientWidth, 0));
    let maxPoint = new Point(Math.max(c1.x, c2.x, c3.x, c4.x), Math.max(c1.y, c2.y, c3.y, c4.y));
    let minPoint =  new Point(Math.min(c1.x, c2.x, c3.x, c4.x), Math.min(c1.y, c2.y, c3.y, c4.y));

    return findTiles(this.imageData, {x: minPoint.x, y: minPoint.y, width: maxPoint.x-minPoint.x, height: maxPoint.y-minPoint.y});



    // let corner0 = this.viewportCoordToImageCoord(new Point(0, 0));
    // let corner1 = this.viewportCoordToImageCoord(new Point(this.targetCanvas.clientWidth, this.targetCanvas.clientHeight));

    // return findTiles(this.imageFile, Math.min(corner0.x, corner1.x), Math.min(corner0.y, corner1.y), Math.abs(corner1.x - corner0.x), Math.abs(corner1.y - corner0.y));
  }

  checkForNewImage() {
    if (this.lastImageData && this.lastImageData == this.imageData) return;
    //new image detected
    this.lastViewportChangeEvent = null;
    this.lastViewportSize = { width: null, height: null };
    this.lastImageData = this.imageData;
    this.bufferedTiles = {};

    let viewportSize = { width: this.placeholder.clientWidth, height: this.placeholder.clientHeight };
    // this.onViewportSizeChange.emit({ width: viewportSize.width, height: viewportSize.height })
    
  }

  checkForResize() {
    if (this.targetCanvas.width != this.placeholder.clientWidth || this.targetCanvas.height != this.placeholder.clientHeight) {
      this.targetCanvas.width = this.placeholder.clientWidth;
      this.targetCanvas.height = this.placeholder.clientHeight;
      this.setSmoothing(this.targetCtx, false);
      this.onCanvasSizeChange.emit({width: this.targetCanvas.width, height: this.targetCanvas.height});
      return true;
    }
    return false;
  }

  ngOnChanges() {
    if (this.initialized) {
      //must async dispatch actions within life cycle hooks to prevent
      //ExpressionChangedAfterItHasBeenChecked Error
      //https://blog.angularindepth.com/everything-you-need-to-know-about-the-expressionchangedafterithasbeencheckederror-error-e3fd9ce7dbb4 
      setTimeout(() => {
        if (this.initialized) {
          this.checkForNewImage();
          this.checkForResize();
          this.lazyLoadPixels();
          this.handleViewportChange();
          this.draw();
        }

      });
    }
    this.draw();
    //draw immediately for optimal performance once tiles have loaded
  }

  private get initialized(): boolean  {
    if(!this.viewInitialized || !this.imageData || !this.transform || !this.imageData.initialized) return false;
  
    return true;
  }

  public lazyLoadPixels() {
    if (!this.initialized) return;
    let tiles = this.getViewportTiles();
    tiles.forEach(tile => {
      if (!tile.pixelsLoaded && !tile.pixelsLoading && !tile.pixelLoadingFailed) {
        this.onLoadTile.emit({imageDataId: this.imageData.id, tileIndex: tile.index})
      }
    })

  }

  public draw() {
    if (!this.viewInitialized) return;
    let backgroundPattern = this.targetCtx.createPattern(this.backgroundCanvas, 'repeat');
    this.targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.setSmoothing(this.targetCtx, false);
    this.targetCtx.globalAlpha = 1.0;
    this.targetCtx.clearRect(0, 0, this.targetCtx.canvas.width, this.targetCtx.canvas.height);
    this.targetCtx.fillStyle = backgroundPattern;
    this.targetCtx.fillRect(0, 0, this.targetCtx.canvas.width, this.targetCtx.canvas.height);



    if (this.initialized) {
      
      let tiles = this.getViewportTiles();

      console.log('tiles')
      tiles.forEach(tile => {
        if (!tile.pixelsLoaded) {
          // fill in tile with solid background when image file pixels have not been loaded
          this.imageCtx.fillStyle = "rgb(100, 100, 100)";
          this.imageCtx.fillRect(tile.x, tile.y, tile.width, tile.height);
        }
        else {
          if (this.bufferedTiles[tile.index] === tile) {
            //this tile has not changed and is already in the buffered canvas
            return;
          }
          let imageData = this.imageCtx.createImageData(tile.width, tile.height);
          let blendedImageDataUint8Clamped = new Uint8ClampedArray(tile.pixels.buffer);
          imageData.data.set(blendedImageDataUint8Clamped);
          this.imageCtx.putImageData(imageData, tile.x, tile.y);
          this.bufferedTiles[tile.index] = tile;
        }

      })
      let matrix = transformToMatrix(this.transform)
      matrix.applyToContext(this.targetCtx);
      this.targetCtx.drawImage(this.imageCanvas, 0, 0);
    }
    this.setSmoothing(this.targetCtx, true);
    this.targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.targetCtx.globalAlpha = 1.0;
  }

}