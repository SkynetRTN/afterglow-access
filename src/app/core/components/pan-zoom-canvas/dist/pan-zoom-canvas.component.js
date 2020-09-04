"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.PanZoomCanvasComponent = void 0;
var core_1 = require("@angular/core");
var paper_1 = require("paper");
var normalizeWheel = require("normalize-wheel");
var data_file_1 = require("../../../data-files/models/data-file");
var transformation_1 = require("../../models/transformation");
var workbench_file_states_actions_1 = require("../../workbench-file-states.actions");
var data_files_actions_1 = require("../../../data-files/data-files.actions");
var PanZoomCanvasComponent = /** @class */ (function () {
    function PanZoomCanvasComponent(store, viewerPlaceholder) {
        this.store = store;
        this.viewerPlaceholder = viewerPlaceholder;
        this.onViewportChange = new core_1.EventEmitter();
        this.onViewportSizeChange = new core_1.EventEmitter();
        this.onImageClick = new core_1.EventEmitter();
        this.onImageMove = new core_1.EventEmitter();
        this.lastImageFile = null;
        this.viewInitialized = false;
        this.lastViewportChangeEvent = null;
        this.lastViewportSize = { width: null, height: null };
        this.dragging = false;
        this.dragged = false;
        this.mouseOverImage = false;
        // minimum number of pixels mouse must move after click to not be considered
        this.maxDeltaBeforeMove = 5;
        this.bufferedTiles = {};
        // a move and not a click
        this.sumPixelsMoved = 0;
        this.zoomStepFactor = 0.92;
        this.mouseDragVector = new paper_1.Rectangle(0, 0, 0, 0);
    }
    PanZoomCanvasComponent.prototype.ngOnInit = function () { };
    PanZoomCanvasComponent.prototype.initializeResizeMonitor = function () {
        var self = this;
        this.resizeMonitor = setInterval(function () {
            if (self.checkForResize()) {
                self.lazyLoadPixels();
                self.handleViewportChange();
                self.draw();
            }
        }, 50);
    };
    PanZoomCanvasComponent.prototype.ngAfterViewInit = function () {
        this.handleWindowResizeBound = this.handleWindowResize.bind(this);
        this.handleImageMouseDownBound = this.handleImageMouseDown.bind(this);
        this.handleImageMouseMoveBound = this.handleImageMouseMove.bind(this);
        this.handleImageMouseWheelBound = this.handleImageMouseWheel.bind(this);
        this.handleDocumentMouseUpBound = this.handleDocumentMouseUp.bind(this);
        this.handleDocumentMouseMoveWhileDownBound = this.handleDocumentMouseMoveWhileDown.bind(this);
        this.initializeResizeMonitor();
        // background pattern
        var patternWidth = 8;
        this.placeholder = this.viewerPlaceholder.nativeElement;
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.width = patternWidth * 2;
        this.backgroundCanvas.height = patternWidth * 2;
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.backgroundCtx.fillStyle = "rgb(215, 215, 215)";
        this.backgroundCtx.fillRect(0, 0, patternWidth, patternWidth);
        this.backgroundCtx.fillRect(patternWidth, patternWidth, patternWidth, patternWidth);
        this.backgroundCtx.fillStyle = "rgb(255, 255, 255)";
        this.backgroundCtx.fillRect(patternWidth, 0, patternWidth, patternWidth);
        this.backgroundCtx.fillRect(0, patternWidth, patternWidth, patternWidth);
        this.imageCanvas = document.createElement('canvas');
        this.imageCtx = this.imageCanvas.getContext('2d');
        this.setSmoothing(this.imageCtx, false);
        // add different canvas to placeholder.  the target canvas will hold the transformations
        // and the actual canvas will be drawn onto the target canvas
        this.targetCanvas = document.createElement('canvas');
        this.targetCanvas.width = this.placeholder.clientWidth;
        this.targetCanvas.height = this.placeholder.clientHeight;
        this.targetCtx = this.targetCanvas.getContext('2d');
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
    };
    PanZoomCanvasComponent.prototype.ngOnDestroy = function () {
        clearInterval(this.resizeMonitor);
    };
    PanZoomCanvasComponent.prototype.setSmoothing = function (ctx, value) {
        //ctx.mozImageSmoothingEnabled = value;
        // ctx.msImageSmoothingEnabled = value;
        //ctx.oImageSmoothingEnabled = value;
        //ctx.webkitImageSmoothingEnabled = value;
        ctx.imageSmoothingEnabled = value;
    };
    PanZoomCanvasComponent.prototype.debounce = function (func, context, wait, immediate) {
        if (immediate === void 0) { immediate = false; }
        var timeout;
        return function () {
            var args = arguments;
            var later = function () {
                timeout = NaN;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
    };
    PanZoomCanvasComponent.prototype.viewportCoordFromEvent = function (e) {
        var totalOffsetX = 0;
        var totalOffsetY = 0;
        var canvasX = 0;
        var canvasY = 0;
        var currentElement = this.targetCanvas;
        do {
            totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
            totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
        } while (currentElement = currentElement.offsetParent);
        canvasX = e.pageX - totalOffsetX;
        canvasY = e.pageY - totalOffsetY;
        // assume we are in the center of the pixel
        return new paper_1.Point(canvasX + 0.5, canvasY + 0.5);
        //return new Point(e.pageX - this._targetCanvas.offsetLeft, e.pageY - this._targetCanvas.offsetTop);
    };
    Object.defineProperty(PanZoomCanvasComponent.prototype, "canvas", {
        get: function () {
            return this.targetCanvas;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PanZoomCanvasComponent.prototype, "canvasWidth", {
        get: function () {
            return this.targetCanvas ? this.targetCanvas.width : 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PanZoomCanvasComponent.prototype, "canvasHeight", {
        get: function () {
            return this.targetCanvas ? this.targetCanvas.height : 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PanZoomCanvasComponent.prototype, "placeholderWidth", {
        get: function () {
            return this.placeholder ? this.placeholder.clientWidth : 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PanZoomCanvasComponent.prototype, "placeholderHeight", {
        get: function () {
            return this.placeholder ? this.placeholder.clientHeight : 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PanZoomCanvasComponent.prototype, "scale", {
        get: function () {
            // let temp = this.normalizationConfig.imageToViewportTransform.scaling;
            var temp = new paper_1.Point(this.transformation.imageToViewportTransform.a, this.transformation.imageToViewportTransform.c);
            return temp.getDistance(new paper_1.Point(0, 0));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PanZoomCanvasComponent.prototype, "viewportTopLeft", {
        get: function () {
            return new paper_1.Point(-this.transformation.imageToViewportTransform.tx, -this.transformation.imageToViewportTransform.ty);
        },
        enumerable: false,
        configurable: true
    });
    PanZoomCanvasComponent.prototype.moveBy = function (xShift, yShift) {
        this.store.dispatch(new workbench_file_states_actions_1.MoveBy(this.imageFile.id, xShift, yShift));
    };
    PanZoomCanvasComponent.prototype.moveToCenter = function () {
        this.moveTo({ x: data_file_1.getWidth(this.imageFile) / 2, y: data_file_1.getHeight(this.imageFile) / 2 });
    };
    PanZoomCanvasComponent.prototype.moveTo = function (imageRef, canvasRef) {
        if (canvasRef === void 0) { canvasRef = null; }
        if (canvasRef == null) {
            canvasRef = { x: this.canvasWidth / 2, y: this.canvasHeight / 2 };
        }
        var xShift = this.viewportTopLeft.x - (imageRef.x * this.scale - canvasRef.x);
        var yShift = this.viewportTopLeft.y - (imageRef.y * this.scale - canvasRef.y);
        this.moveBy(xShift, yShift);
    };
    PanZoomCanvasComponent.prototype.zoomBy = function (factor, imageAnchor) {
        if (imageAnchor === void 0) { imageAnchor = null; }
        this.store.dispatch(new workbench_file_states_actions_1.ZoomBy(this.imageFile.id, factor, imageAnchor));
    };
    Object.defineProperty(PanZoomCanvasComponent.prototype, "viewportToImageTransform", {
        get: function () {
            return transformation_1.transformToMatrix(this.transformation.imageToViewportTransform).inverted();
        },
        enumerable: false,
        configurable: true
    });
    PanZoomCanvasComponent.prototype.viewportCoordToImageCoord = function (p) {
        var result = this.viewportToImageTransform.transform(new paper_1.Point(p.x, p.y));
        return { x: result.x + 0.5, y: result.y + 0.5 };
    };
    PanZoomCanvasComponent.prototype.imageCoordToViewportCoord = function (p) {
        var result = transformation_1.transformToMatrix(this.transformation.imageToViewportTransform).transform(new paper_1.Point(p.x - 0.5, p.y - 0.5));
        return { x: result.x, y: result.y };
    };
    PanZoomCanvasComponent.prototype.mouseOnImage = function (viewportCoord) {
        // console.log('mouse on image');
        var imagePoint = this.viewportCoordToImageCoord(new paper_1.Point(viewportCoord.x, viewportCoord.y));
        var mouseOffImage = imagePoint.x < 0.5 || imagePoint.x >= data_file_1.getWidth(this.imageFile) + 0.5 ||
            imagePoint.y < 0.5 || imagePoint.y >= data_file_1.getHeight(this.imageFile) + 0.5;
        //console.log(viewportCoord.x, viewportCoord.y, imagePoint.x, imagePoint.y, !mouseOffImage);
        return !mouseOffImage;
    };
    PanZoomCanvasComponent.prototype.handleViewportChange = function () {
        var viewportSize = { width: this.placeholder.clientWidth, height: this.placeholder.clientHeight };
        if (this.imageFile && this.imageFile.headerLoaded && this.transformation && this.transformation.viewportSize) {
            var viewportRegion = transformation_1.getViewportRegion(this.transformation, this.imageFile);
            var $event = {
                viewportWidth: viewportSize.width,
                viewportHeight: viewportSize.height,
                imageX: viewportRegion.x,
                imageY: viewportRegion.y,
                imageWidth: viewportRegion.width,
                imageHeight: viewportRegion.height
            };
            if (JSON.stringify(this.lastViewportChangeEvent) !== JSON.stringify($event)) {
                this.onViewportChange.emit($event);
                this.lastViewportChangeEvent = $event;
            }
        }
        if (JSON.stringify(this.lastViewportSize) !== JSON.stringify(viewportSize)) {
            this.onViewportSizeChange.emit({ width: viewportSize.width, height: viewportSize.height });
            if (this.imageFile)
                this.store.dispatch(new workbench_file_states_actions_1.UpdateCurrentViewportSize(this.imageFile.id, { width: viewportSize.width, height: viewportSize.height }));
            this.lastViewportSize = viewportSize;
        }
    };
    PanZoomCanvasComponent.prototype.handleWindowResize = function () {
        this.draw();
    };
    PanZoomCanvasComponent.prototype.handleImageMouseWheel = function (event) {
        if (!this.initialized)
            return;
        var viewportCoord = this.viewportCoordFromEvent(event);
        if (!this.mouseOnImage(viewportCoord)) {
            return;
        }
        var mouseImage = this.viewportCoordToImageCoord(viewportCoord);
        var normalized = normalizeWheel(event);
        var delta = normalized.spinY;
        if (delta > 0) {
            this.zoomBy(Math.pow(this.zoomStepFactor, 2), viewportCoord);
        }
        else {
            this.zoomBy(Math.pow(1 / this.zoomStepFactor, 2), viewportCoord);
        }
        event.preventDefault();
    };
    PanZoomCanvasComponent.prototype.handleImageMouseDown = function (event) {
        if (!this.initialized)
            return;
        this.dragging = false;
        this.dragged = false;
        var viewportCoord = this.viewportCoordFromEvent(event);
        if (!this.mouseOnImage(viewportCoord)) {
            return;
        }
        this.mouseDragVector.topLeft = new paper_1.Point(viewportCoord.x, viewportCoord.y);
        this.placeholder.removeEventListener('mousedown', this.handleImageMouseDownBound);
        // this.placeholder.removeEventListener('touchstart', this.handleImageMouseDownBound);
        document.addEventListener('mouseup', this.handleDocumentMouseUpBound);
        // document.addEventListener('mouseup', this.handleImageMouseUpBound);
        document.addEventListener('mousemove', this.handleDocumentMouseMoveWhileDownBound);
        // document.addEventListener('touchmove', this.handleDocumentMouseMoveWhileDownBound);
        this.sumPixelsMoved = 0;
    };
    PanZoomCanvasComponent.prototype.handleImageMouseMove = function (event) {
        if (!this.initialized)
            return;
        var viewportCoord = this.viewportCoordFromEvent(event);
        this.mouseOverImage = this.mouseOnImage(viewportCoord);
        var mouseImage = this.viewportCoordToImageCoord(viewportCoord);
    };
    PanZoomCanvasComponent.prototype.handleDocumentMouseMoveWhileDown = function (event) {
        if (!this.initialized)
            return;
        var viewportCoord = this.viewportCoordFromEvent(event);
        this.mouseDragVector.bottomRight = new paper_1.Point(viewportCoord.x, viewportCoord.y);
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
            var e = event || window.event;
            this.moveBy(this.mouseDragVector.width, this.mouseDragVector.height);
            this.mouseDragVector.topLeft = this.mouseDragVector.bottomRight.clone();
            event.preventDefault();
        }
    };
    PanZoomCanvasComponent.prototype.handleDocumentMouseUp = function (event) {
        if (!this.initialized)
            return;
        document.removeEventListener('mouseup', this.handleDocumentMouseUpBound);
        document.removeEventListener('mousemove', this.handleDocumentMouseMoveWhileDownBound);
        // document.removeEventListener('touchmove', this.handleDocumentMouseMoveWhileDownBound);
        this.placeholder.addEventListener('mousedown', this.handleImageMouseDownBound);
        // this.placeholder.addEventListener('touchstart', this.handleImageMouseDownBound);
        this.dragging = false;
    };
    PanZoomCanvasComponent.prototype.onViewportMove = function ($event) {
        if (this.initialized) {
            var viewportCoord = this.viewportCoordFromEvent($event);
            var onImage = this.mouseOnImage(viewportCoord);
            var mouseImage = this.viewportCoordToImageCoord(viewportCoord);
            this.onImageMove.emit({ targetFile: this.imageFile, hitImage: onImage, imageX: mouseImage.x, imageY: mouseImage.y, mouseEvent: $event, source: null });
        }
    };
    PanZoomCanvasComponent.prototype.onViewportClick = function ($event) {
        if (this.initialized && !this.dragged) {
            var viewportCoord = this.viewportCoordFromEvent($event);
            var onImage = this.mouseOnImage(viewportCoord);
            var mouseImage = this.viewportCoordToImageCoord(viewportCoord);
            this.onImageClick.emit({ targetFile: this.imageFile, hitImage: onImage, imageX: mouseImage.x, imageY: mouseImage.y, mouseEvent: $event, source: null });
        }
    };
    PanZoomCanvasComponent.prototype.ngAfterViewChecked = function () {
    };
    PanZoomCanvasComponent.prototype.getViewportTiles = function () {
        if (data_file_1.getWidth(this.imageFile) != this.imageCanvas.width || data_file_1.getHeight(this.imageFile) != this.imageCanvas.height) {
            this.imageCanvas.width = data_file_1.getWidth(this.imageFile);
            this.imageCanvas.height = data_file_1.getHeight(this.imageFile);
        }
        var c1 = this.viewportCoordToImageCoord(new paper_1.Point(this.targetCanvas.clientWidth, this.targetCanvas.clientHeight));
        var c2 = this.viewportCoordToImageCoord(new paper_1.Point(0, 0));
        var c3 = this.viewportCoordToImageCoord(new paper_1.Point(0, this.targetCanvas.clientHeight));
        var c4 = this.viewportCoordToImageCoord(new paper_1.Point(this.targetCanvas.clientWidth, 0));
        var maxPoint = new paper_1.Point(Math.max(c1.x, c2.x, c3.x, c4.x), Math.max(c1.y, c2.y, c3.y, c4.y));
        var minPoint = new paper_1.Point(Math.min(c1.x, c2.x, c3.x, c4.x), Math.min(c1.y, c2.y, c3.y, c4.y));
        return data_file_1.findTiles(this.imageFile, minPoint.x, minPoint.y, maxPoint.x - minPoint.x, maxPoint.y - minPoint.y);
        // let corner0 = this.viewportCoordToImageCoord(new Point(0, 0));
        // let corner1 = this.viewportCoordToImageCoord(new Point(this.targetCanvas.clientWidth, this.targetCanvas.clientHeight));
        // return findTiles(this.imageFile, Math.min(corner0.x, corner1.x), Math.min(corner0.y, corner1.y), Math.abs(corner1.x - corner0.x), Math.abs(corner1.y - corner0.y));
    };
    PanZoomCanvasComponent.prototype.checkForNewImage = function () {
        if (this.lastImageFile && this.imageFile.id == this.lastImageFile.id)
            return;
        //new image detected
        this.lastViewportChangeEvent = null;
        this.lastViewportSize = { width: null, height: null };
        this.lastImageFile = this.imageFile;
        this.bufferedTiles = {};
        var viewportSize = { width: this.placeholder.clientWidth, height: this.placeholder.clientHeight };
        this.store.dispatch(new workbench_file_states_actions_1.UpdateCurrentViewportSize(this.imageFile.id, { width: viewportSize.width, height: viewportSize.height }));
    };
    PanZoomCanvasComponent.prototype.checkForResize = function () {
        if (this.targetCanvas.width != this.placeholder.clientWidth || this.targetCanvas.height != this.placeholder.clientHeight) {
            this.targetCanvas.width = this.placeholder.clientWidth;
            this.targetCanvas.height = this.placeholder.clientHeight;
            this.setSmoothing(this.targetCtx, false);
            return true;
        }
        return false;
    };
    PanZoomCanvasComponent.prototype.ngOnChanges = function () {
        var _this = this;
        if (this.initialized) {
            //must async dispatch actions within life cycle hooks to prevent
            //ExpressionChangedAfterItHasBeenChecked Error
            //https://blog.angularindepth.com/everything-you-need-to-know-about-the-expressionchangedafterithasbeencheckederror-error-e3fd9ce7dbb4 
            setTimeout(function () {
                if (_this.initialized) {
                    _this.checkForNewImage();
                    _this.checkForResize();
                    _this.lazyLoadPixels();
                    _this.handleViewportChange();
                    _this.draw();
                }
            });
        }
        this.draw();
        //draw immediately for optimal performance once tiles have loaded
    };
    Object.defineProperty(PanZoomCanvasComponent.prototype, "initialized", {
        get: function () {
            return this.viewInitialized && this.imageFile && this.normalization && this.imageFile.headerLoaded && this.transformation && this.transformation.imageToViewportTransform;
        },
        enumerable: false,
        configurable: true
    });
    PanZoomCanvasComponent.prototype.lazyLoadPixels = function () {
        var _this = this;
        if (!this.initialized)
            return;
        var tiles = this.getViewportTiles();
        tiles.forEach(function (tile) {
            var normTile = _this.normalization.normalizedTiles[tile.index];
            if (!tile.pixelsLoaded && !tile.pixelsLoading && !tile.pixelLoadingFailed) {
                _this.store.dispatch(new data_files_actions_1.LoadImageTilePixels(_this.imageFile.id, tile.index));
            }
            else if (tile.pixelsLoaded && !normTile.pixelsLoaded && !normTile.pixelsLoading && !normTile.pixelLoadingFailed) {
                _this.store.dispatch(new workbench_file_states_actions_1.NormalizeImageTile(_this.imageFile.id, tile.index));
            }
        });
    };
    PanZoomCanvasComponent.prototype.draw = function () {
        var _this = this;
        if (!this.viewInitialized)
            return;
        var backgroundPattern = this.targetCtx.createPattern(this.backgroundCanvas, 'repeat');
        this.targetCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.setSmoothing(this.targetCtx, false);
        this.targetCtx.globalAlpha = 1.0;
        this.targetCtx.clearRect(0, 0, this.targetCtx.canvas.width, this.targetCtx.canvas.height);
        this.targetCtx.fillStyle = backgroundPattern;
        this.targetCtx.fillRect(0, 0, this.targetCtx.canvas.width, this.targetCtx.canvas.height);
        if (this.initialized) {
            var tiles = this.getViewportTiles();
            tiles.forEach(function (tile) {
                var normTile = _this.normalization.normalizedTiles[tile.index];
                if (!tile.pixelsLoaded) {
                    // fill in tile with solid background when image file pixels have not been loaded
                    _this.imageCtx.fillStyle = "rgb(100, 100, 100)";
                    _this.imageCtx.fillRect(tile.x, tile.y, tile.width, tile.height);
                }
                else if (normTile.pixelsLoaded) {
                    if (_this.bufferedTiles[normTile.index] === normTile) {
                        //this tile has not changed and is already in the buffered canvas
                        return;
                    }
                    var imageData = _this.imageCtx.createImageData(normTile.width, normTile.height);
                    var blendedImageDataUint8Clamped = new Uint8ClampedArray(normTile.pixels.buffer);
                    imageData.data.set(blendedImageDataUint8Clamped);
                    _this.imageCtx.putImageData(imageData, normTile.x, normTile.y);
                    _this.bufferedTiles[normTile.index] = normTile;
                }
            });
            transformation_1.transformToMatrix(this.transformation.imageToViewportTransform).applyToContext(this.targetCtx);
            this.targetCtx.drawImage(this.imageCanvas, 0, 0);
        }
        this.setSmoothing(this.targetCtx, true);
        this.targetCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.targetCtx.globalAlpha = 1.0;
    };
    __decorate([
        core_1.Input()
    ], PanZoomCanvasComponent.prototype, "imageFile");
    __decorate([
        core_1.Input()
    ], PanZoomCanvasComponent.prototype, "normalization");
    __decorate([
        core_1.Input()
    ], PanZoomCanvasComponent.prototype, "transformation");
    __decorate([
        core_1.Output()
    ], PanZoomCanvasComponent.prototype, "onViewportChange");
    __decorate([
        core_1.Output()
    ], PanZoomCanvasComponent.prototype, "onViewportSizeChange");
    __decorate([
        core_1.Output()
    ], PanZoomCanvasComponent.prototype, "onImageClick");
    __decorate([
        core_1.Output()
    ], PanZoomCanvasComponent.prototype, "onImageMove");
    PanZoomCanvasComponent = __decorate([
        core_1.Directive({
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
    ], PanZoomCanvasComponent);
    return PanZoomCanvasComponent;
}());
exports.PanZoomCanvasComponent = PanZoomCanvasComponent;
