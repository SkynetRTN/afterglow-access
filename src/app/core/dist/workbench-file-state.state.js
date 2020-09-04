"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.WorkbenchFileStates = void 0;
var store_1 = require("@ngxs/store");
var paper_1 = require("paper");
var workbench_file_state_actions_1 = require("./workbench-file-state.actions");
var data_files_actions_1 = require("../data-files/data-files.actions");
var immer_adapter_1 = require("@ngxs-labs/immer-adapter");
var data_file_type_1 = require("../data-files/models/data-file-type");
var color_map_1 = require("./models/color-map");
var stretch_mode_1 = require("./models/stretch-mode");
var sonifier_file_state_1 = require("./models/sonifier-file-state");
var data_file_1 = require("../data-files/models/data-file");
var data_files_state_1 = require("../data-files/data-files.state");
var pixel_normalizer_1 = require("./models/pixel-normalizer");
var transformation_1 = require("./models/transformation");
var auth_actions_1 = require("../auth/auth.actions");
var defaultWorkbenchFileStatesModel = {
    version: 1,
    ids: [],
    entities: {},
    nextMarkerId: 0
};
var WorkbenchFileStates = /** @class */ (function () {
    function WorkbenchFileStates(store, afterglowDataFileService, correlationIdGenerator, actions$) {
        this.store = store;
        this.afterglowDataFileService = afterglowDataFileService;
        this.correlationIdGenerator = correlationIdGenerator;
        this.actions$ = actions$;
    }
    WorkbenchFileStates.getState = function (state) {
        return state;
    };
    WorkbenchFileStates.getEntities = function (state) {
        return state.entities;
    };
    WorkbenchFileStates.getIds = function (state) {
        return state.ids;
    };
    WorkbenchFileStates.getImageFileStates = function (state) {
        return Object.values(state.entities);
    };
    WorkbenchFileStates.getImageFileStateByFileId = function (state) {
        return function (id) {
            return state.entities[id];
        };
    };
    WorkbenchFileStates.prototype.resetState = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            return defaultWorkbenchFileStatesModel;
        });
    };
    WorkbenchFileStates.prototype.initializeImageFileState = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileIds = _b.fileIds;
        setState(function (state) {
            fileIds.forEach(function (fileId) {
                state.entities[fileId] = {
                    imageFileId: fileId,
                    normalization: {
                        normalizedTiles: null,
                        initialized: false,
                        normalizer: {
                            backgroundPercentile: 10,
                            peakPercentile: 99,
                            colorMapName: color_map_1.grayColorMap.name,
                            stretchMode: stretch_mode_1.StretchMode.Linear,
                            inverted: false
                        }
                    },
                    transformation: {
                        imageTransform: null,
                        viewportTransform: null,
                        imageToViewportTransform: null,
                        viewportSize: null
                    },
                    plotter: {
                        measuring: false,
                        lineMeasureStart: null,
                        lineMeasureEnd: null
                    },
                    sonifier: {
                        sonificationUri: null,
                        regionHistory: [],
                        regionHistoryIndex: null,
                        regionHistoryInitialized: false,
                        regionMode: sonifier_file_state_1.SonifierRegionMode.VIEWPORT,
                        viewportSync: true,
                        duration: 10,
                        toneCount: 22,
                        progressLine: null
                    },
                    photometry: {
                        selectedSourceIds: [],
                        sourceExtractionJobId: null
                    },
                    marker: {
                        entities: {},
                        ids: []
                    }
                };
                state.ids.push(fileId);
            });
            return state;
        });
    };
    WorkbenchFileStates.prototype.removeDataFileSuccess = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            state.ids = state.ids.filter(function (id) { return id != fileId; });
            if (fileId in state.entities)
                delete state.entities[fileId];
            return state;
        });
    };
    WorkbenchFileStates.prototype.initImageTiles = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            var normalization = state.entities[fileId].normalization;
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var tiles = [];
            for (var j = 0; j < data_file_1.getYTileDim(imageFile); j += 1) {
                var tw = imageFile.tileWidth;
                var th = imageFile.tileHeight;
                if (j === data_file_1.getYTileDim(imageFile) - 1) {
                    th -= (j + 1) * imageFile.tileHeight - data_file_1.getHeight(imageFile);
                }
                for (var i = 0; i < data_file_1.getXTileDim(imageFile); i += 1) {
                    if (i === data_file_1.getXTileDim(imageFile) - 1) {
                        tw -= (i + 1) * imageFile.tileWidth - data_file_1.getWidth(imageFile);
                    }
                    tiles.push({
                        index: j * data_file_1.getXTileDim(imageFile) + i,
                        x: i * imageFile.tileWidth,
                        y: j * imageFile.tileHeight,
                        width: tw,
                        height: th,
                        pixelsLoaded: false,
                        pixelsLoading: false,
                        pixelLoadingFailed: false,
                        pixels: null
                    });
                }
            }
            normalization.normalizedTiles = tiles;
            // also initialize the transformation matrix since it requires the 
            // image height
            var transformation = state.entities[fileId].transformation;
            var imageMatrix = new paper_1.Matrix(1, 0, 0, -1, 0, data_file_1.getHeight(imageFile));
            var viewportMatrix = new paper_1.Matrix(1, 0, 0, 1, 0, 0);
            var imageToViewportMatrix = viewportMatrix.appended(imageMatrix);
            if (!transformation.imageTransform || !transformation.viewportTransform || !transformation.imageToViewportTransform) {
                transformation.imageTransform = transformation_1.matrixToTransform(imageMatrix);
                transformation.viewportTransform = transformation_1.matrixToTransform(viewportMatrix);
                transformation.imageToViewportTransform = transformation_1.matrixToTransform(imageToViewportMatrix);
            }
            return state;
        });
    };
    WorkbenchFileStates.prototype.renormalizeImageFile = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            var normalization = state.entities[fileId].normalization;
            normalization.normalizedTiles.forEach(function (tile) {
                tile.pixelsLoaded = false;
                tile.pixelsLoading = false;
                tile.pixels = null;
            });
            return state;
        });
    };
    WorkbenchFileStates.prototype.normalizeImageTile = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, tileIndex = _b.tileIndex;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var normalization = state.entities[fileId].normalization;
            var tile = normalization.normalizedTiles[tileIndex];
            tile.pixelsLoaded = true;
            tile.pixelsLoading = false;
            tile.pixels = pixel_normalizer_1.normalize(imageFile.tiles[tileIndex].pixels, imageFile.hist, normalization.normalizer);
            return state;
        });
    };
    WorkbenchFileStates.prototype.updateNormalizer = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, changes = _b.changes;
        setState(function (state) {
            var normalizer = state.entities[fileId].normalization.normalizer;
            state.entities[fileId].normalization.normalizer = __assign(__assign({}, normalizer), changes);
            return state;
        });
        return dispatch(new workbench_file_state_actions_1.RenormalizeImageFile(fileId));
    };
    /*Sonification*/
    WorkbenchFileStates.prototype.loadDataFileHdrSuccess = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, header = _b.header;
        var state = getState();
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var dataFile = dataFiles[fileId];
        var result = [];
        if (dataFile.type == data_file_type_1.DataFileType.IMAGE) {
            var sonifierState = state.entities[dataFile.id].sonifier;
            var sourceExtractorState = state.entities[dataFile.id].photometry;
            //add effects for image file selection
            var imageFile = dataFile;
            dispatch(new data_files_actions_1.InitImageTiles(fileId));
            if (!sonifierState.regionHistoryInitialized) {
                dispatch(new workbench_file_state_actions_1.AddRegionToHistory(imageFile.id, {
                    x: 0,
                    y: 0,
                    width: data_file_1.getWidth(imageFile),
                    height: data_file_1.getHeight(imageFile)
                }));
            }
        }
    };
    WorkbenchFileStates.prototype.regionHistoryChanged = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        var state = getState();
        if (state.entities[fileId].sonifier.regionMode == sonifier_file_state_1.SonifierRegionMode.CUSTOM) {
            dispatch(new workbench_file_state_actions_1.SonificationRegionChanged(fileId));
        }
    };
    WorkbenchFileStates.prototype.sonificationRegionChanged = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var imageFile = dataFiles[fileId];
        var sonifierState = getState().entities[fileId].sonifier;
        var transformationState = getState().entities[fileId].transformation;
        var sourceExtractorState = getState().entities[fileId].photometry;
        if (sonifierState.regionMode == sonifier_file_state_1.SonifierRegionMode.CUSTOM &&
            sonifierState.viewportSync) {
            var region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
            dispatch(new workbench_file_state_actions_1.CenterRegionInViewport(fileId, region, transformationState.viewportSize));
        }
    };
    WorkbenchFileStates.prototype.updateSonifierFileState = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, changes = _b.changes;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var sonifierState = state.entities[fileId].sonifier;
            state.entities[fileId].sonifier = __assign(__assign({}, state.entities[fileId].sonifier), changes);
            dispatch(new workbench_file_state_actions_1.SonificationRegionChanged(fileId));
            return state;
        });
    };
    WorkbenchFileStates.prototype.addRegionToHistory = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, region = _b.region;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var sonifierState = state.entities[fileId].sonifier;
            if (!sonifierState.regionHistoryInitialized) {
                sonifierState.regionHistoryIndex = 0;
                sonifierState.regionHistory = [region];
                sonifierState.regionHistoryInitialized = true;
            }
            else {
                sonifierState.regionHistory = __spreadArrays(sonifierState.regionHistory.slice(0, sonifierState.regionHistoryIndex + 1), [region]);
                sonifierState.regionHistoryIndex++;
            }
            return state;
        });
    };
    WorkbenchFileStates.prototype.undoRegionSelection = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var sonifierState = state.entities[fileId].sonifier;
            if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == 0)
                return state;
            sonifierState.regionHistoryIndex--;
            return state;
        });
    };
    WorkbenchFileStates.prototype.redoRegionSelection = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var sonifierState = state.entities[fileId].sonifier;
            if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == sonifierState.regionHistory.length - 1)
                return state;
            sonifierState.regionHistoryIndex++;
            return state;
        });
    };
    WorkbenchFileStates.prototype.clearRegionHistory = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var sonifierState = state.entities[fileId].sonifier;
            if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == (sonifierState.regionHistory.length - 1))
                return state;
            sonifierState.regionHistoryIndex = null;
            sonifierState.regionHistory = [];
            sonifierState.regionHistoryInitialized = false;
            return state;
        });
    };
    WorkbenchFileStates.prototype.setProgressLine = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, line = _b.line;
        setState(function (state) {
            var sonifierState = state.entities[fileId].sonifier;
            sonifierState.progressLine = line;
            return state;
        });
    };
    WorkbenchFileStates.prototype.updatePhotometryFileState = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, changes = _b.changes;
        setState(function (state) {
            state.entities[fileId].photometry = __assign(__assign({}, state.entities[fileId].photometry), changes);
            return state;
        });
    };
    // @Action(SetSourceExtractorRegion)
    // @ImmutableContext()
    // public setSourceExtractorRegion({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, region }: SetSourceExtractorRegion) {
    //   setState((state: ImageFilesStateModel) => {
    //     state.entities[fileId].sourceExtractor.region = region;
    //     return state;
    //   });
    // }
    // @Action(UpdateSourceExtractorRegion)
    // @ImmutableContext()
    // public updateSourceExtractorRegion({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: UpdateSourceExtractorRegion) {
    //   let state = getState();
    //   let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    //   let imageFile = dataFiles[fileId] as ImageFile;
    //   let sonifierState = state.entities[fileId].sonifier;
    //   let transformationState = state.entities[fileId].transformation;
    //   let sourceExtractorState = state.entities[fileId].sourceExtractor;
    //   let region = null;
    //   if (
    //     sourceExtractorState.regionOption ==
    //     PhotometryRegionOption.VIEWPORT
    //   ) {
    //     region = getViewportRegion(
    //       transformationState,
    //       imageFile
    //     );
    //     // region = {
    //     //   x: imageFileGlobalState.viewport.imageX,
    //     //   y: imageFileGlobalState.viewport.imageY,
    //     //   width: imageFileGlobalState.viewport.imageWidth,
    //     //   height: imageFileGlobalState.viewport.imageHeight
    //     // }
    //   } else if (
    //     sourceExtractorState.regionOption ==
    //     PhotometryRegionOption.SONIFIER_REGION
    //   ) {
    //     region = sonifierState.region;
    //   } else {
    //     region = {
    //       x: 0,
    //       y: 0,
    //       width: getWidth(imageFile),
    //       height: getHeight(imageFile)
    //     };
    //   }
    //   return dispatch(new SetSourceExtractorRegion(fileId, region));
    // }
    /* Transformation */
    WorkbenchFileStates.prototype.centerRegionInViewport = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, region = _b.region, viewportSize = _b.viewportSize;
        var state = getState();
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var imageFile = dataFiles[fileId];
        var transformationState = state.entities[fileId].transformation;
        if (!viewportSize)
            viewportSize = transformationState.viewportSize;
        var viewportAnchor = new paper_1.Point(viewportSize.width / 2, viewportSize.height / 2);
        var scale = Math.min((viewportSize.width - 20) / region.width, (viewportSize.height - 20) / region.height);
        var xShift = viewportAnchor.x - scale * (region.x + region.width / 2);
        var yShift = viewportAnchor.y -
            scale * (data_file_1.getHeight(imageFile) - (region.y + region.height / 2));
        var viewportTransform = new paper_1.Matrix(scale, 0, 0, scale, xShift, yShift);
        return dispatch([
            new workbench_file_state_actions_1.ResetImageTransform(fileId),
            new workbench_file_state_actions_1.SetViewportTransform(fileId, viewportTransform)
        ]);
    };
    WorkbenchFileStates.prototype.zoomTo = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, scale = _b.scale, anchorPoint = _b.anchorPoint;
        var state = getState();
        var dataFiles = this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
        var transformationState = state.entities[fileId].transformation;
        var zoomByFactor = scale / transformation_1.getScale(transformationState);
        return dispatch(new workbench_file_state_actions_1.ZoomBy(fileId, zoomByFactor, anchorPoint));
    };
    WorkbenchFileStates.prototype.zoomBy = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, scaleFactor = _b.scaleFactor, viewportAnchor = _b.viewportAnchor;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var transformation = state.entities[fileId].transformation;
            var viewportMatrix = transformation_1.transformToMatrix(transformation.viewportTransform);
            var imageMatrix = transformation_1.transformToMatrix(transformation.imageTransform);
            var imageToViewportMatrix = transformation_1.transformToMatrix(transformation.imageToViewportTransform);
            // max zoom reached when 1 pixel fills viewport
            var viewportULP = imageToViewportMatrix.transform(new paper_1.Point(0.5, 0.5));
            var viewportLRP = imageToViewportMatrix.transform(new paper_1.Point(1.5, 1.5));
            var d = viewportULP.getDistance(viewportLRP);
            var reachedMaxZoom = d > transformation.viewportSize.width || d > transformation.viewportSize.height;
            // min zoom reached when image fits in viewer
            viewportLRP = imageToViewportMatrix.transform(new paper_1.Point(data_file_1.getWidth(imageFile) - 0.5, data_file_1.getHeight(imageFile) - 0.5));
            d = viewportULP.getDistance(viewportLRP);
            var reachedMinZoom = d < transformation.viewportSize.width && d < transformation.viewportSize.height;
            if (scaleFactor === 1 || (scaleFactor > 1 && reachedMaxZoom) || (scaleFactor < 1 && reachedMinZoom)) {
                return state;
            }
            // if image anchor is null, set to center of image viewer
            var anchorPoint = viewportAnchor;
            if (anchorPoint == null) {
                anchorPoint = { x: transformation.viewportSize.width / 2.0, y: transformation.viewportSize.height / 2.0 };
                // let centerViewerPoint = new Point(transformation.viewportSize.width / 2.0, transformation.viewportSize.height / 2.0);
                //let newAnchor = imageToViewportMatrix.inverted().transform(centerViewerPoint);
                //anchorPoint = {x: newAnchor.x+0.5, y: newAnchor.y+0.5};
            }
            anchorPoint = viewportMatrix.inverted().transform(new paper_1.Point(anchorPoint.x, anchorPoint.y));
            viewportMatrix.scale(scaleFactor, anchorPoint);
            imageToViewportMatrix = viewportMatrix.appended(imageMatrix);
            transformation.imageTransform = transformation_1.matrixToTransform(imageMatrix);
            transformation.viewportTransform = transformation_1.matrixToTransform(viewportMatrix);
            transformation.imageToViewportTransform = transformation_1.matrixToTransform(imageToViewportMatrix);
            return state;
        });
    };
    WorkbenchFileStates.prototype.moveBy = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, xShift = _b.xShift, yShift = _b.yShift;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var transformation = state.entities[fileId].transformation;
            var viewportMatrix = transformation_1.transformToMatrix(transformation.viewportTransform);
            var imageMatrix = transformation_1.transformToMatrix(transformation.imageTransform);
            var imageToViewportMatrix = transformation_1.transformToMatrix(transformation.imageToViewportTransform);
            // test if image is almost entirely out of viewer
            var buffer = 50;
            var c1 = imageToViewportMatrix.transform(new paper_1.Point(data_file_1.getWidth(imageFile), data_file_1.getHeight(imageFile)));
            var c2 = imageToViewportMatrix.transform(new paper_1.Point(0, 0));
            var c3 = imageToViewportMatrix.transform(new paper_1.Point(0, data_file_1.getHeight(imageFile)));
            var c4 = imageToViewportMatrix.transform(new paper_1.Point(data_file_1.getWidth(imageFile), 0));
            var maxPoint = new paper_1.Point(Math.max(c1.x, c2.x, c3.x, c4.x), Math.max(c1.y, c2.y, c3.y, c4.y));
            var minPoint = new paper_1.Point(Math.min(c1.x, c2.x, c3.x, c4.x), Math.min(c1.y, c2.y, c3.y, c4.y));
            var imageRect = new paper_1.Rectangle(minPoint.x + buffer + xShift, minPoint.y + buffer + yShift, maxPoint.x - minPoint.x - (buffer * 2), maxPoint.y - minPoint.y - (buffer * 2));
            var viewportRect = new paper_1.Rectangle(0, 0, transformation.viewportSize.width, transformation.viewportSize.height);
            if (!imageRect.intersects(viewportRect)) {
                return state;
            }
            var xScale = Math.abs(transformation.viewportTransform.a);
            var yScale = Math.abs(transformation.viewportTransform.d);
            viewportMatrix.translate(xShift / xScale, yShift / yScale);
            imageToViewportMatrix = viewportMatrix.appended(imageMatrix);
            transformation.imageTransform = transformation_1.matrixToTransform(imageMatrix);
            transformation.viewportTransform = transformation_1.matrixToTransform(viewportMatrix);
            transformation.imageToViewportTransform = transformation_1.matrixToTransform(imageToViewportMatrix);
            return state;
        });
    };
    WorkbenchFileStates.prototype.setViewportTransform = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, transform = _b.transform;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var transformation = state.entities[fileId].transformation;
            var viewportMatrix = transformation_1.transformToMatrix(transform);
            var imageMatrix = transformation_1.transformToMatrix(transformation.imageTransform);
            var imageToViewportMatrix = transformation_1.transformToMatrix(transformation.imageToViewportTransform);
            imageToViewportMatrix = viewportMatrix.appended(imageMatrix);
            transformation.imageTransform = transformation_1.matrixToTransform(imageMatrix);
            transformation.viewportTransform = transformation_1.matrixToTransform(viewportMatrix);
            transformation.imageToViewportTransform = transformation_1.matrixToTransform(imageToViewportMatrix);
            return state;
        });
    };
    WorkbenchFileStates.prototype.setImageTransform = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, transform = _b.transform;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var transformation = state.entities[fileId].transformation;
            var viewportMatrix = transformation_1.transformToMatrix(transformation.viewportTransform);
            var imageMatrix = transformation_1.transformToMatrix(transform);
            var imageToViewportMatrix = transformation_1.transformToMatrix(transformation.imageToViewportTransform);
            imageToViewportMatrix = viewportMatrix.appended(imageMatrix);
            transformation.imageTransform = transformation_1.matrixToTransform(imageMatrix);
            transformation.viewportTransform = transformation_1.matrixToTransform(viewportMatrix);
            transformation.imageToViewportTransform = transformation_1.matrixToTransform(imageToViewportMatrix);
            return state;
        });
    };
    WorkbenchFileStates.prototype.resetImageTransform = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var transformation = state.entities[fileId].transformation;
            var viewportMatrix = transformation_1.transformToMatrix(transformation.viewportTransform);
            var imageMatrix = transformation_1.transformToMatrix(transformation.imageTransform);
            var imageToViewportMatrix = transformation_1.transformToMatrix(transformation.imageToViewportTransform);
            imageMatrix = new paper_1.Matrix(1, 0, 0, -1, 0, data_file_1.getHeight(imageFile));
            imageToViewportMatrix = viewportMatrix.appended(imageMatrix);
            transformation.imageTransform = transformation_1.matrixToTransform(imageMatrix);
            transformation.viewportTransform = transformation_1.matrixToTransform(viewportMatrix);
            transformation.imageToViewportTransform = transformation_1.matrixToTransform(imageToViewportMatrix);
            return state;
        });
    };
    WorkbenchFileStates.prototype.rotateBy = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, rotationAngle = _b.rotationAngle, anchorPoint = _b.anchorPoint;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var transformation = state.entities[fileId].transformation;
            var viewportMatrix = transformation_1.transformToMatrix(transformation.viewportTransform);
            var imageMatrix = transformation_1.transformToMatrix(transformation.imageTransform);
            var imageToViewportMatrix = transformation_1.transformToMatrix(transformation.imageToViewportTransform);
            if (anchorPoint == null) {
                anchorPoint = new paper_1.Point(transformation.viewportSize.width / 2.0, transformation.viewportSize.height / 2.0);
            }
            anchorPoint = imageToViewportMatrix.inverted().transform(new paper_1.Point(anchorPoint.x, anchorPoint.y));
            imageMatrix.rotate(-rotationAngle, anchorPoint);
            imageToViewportMatrix = viewportMatrix.appended(imageMatrix);
            transformation.imageTransform = transformation_1.matrixToTransform(imageMatrix);
            transformation.viewportTransform = transformation_1.matrixToTransform(viewportMatrix);
            transformation.imageToViewportTransform = transformation_1.matrixToTransform(imageToViewportMatrix);
            return state;
        });
    };
    WorkbenchFileStates.prototype.flip = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var transformation = state.entities[fileId].transformation;
            var viewportMatrix = transformation_1.transformToMatrix(transformation.viewportTransform);
            var imageMatrix = transformation_1.transformToMatrix(transformation.imageTransform);
            var imageToViewportMatrix = transformation_1.transformToMatrix(transformation.imageToViewportTransform);
            imageMatrix.scale(-1, 1, data_file_1.getWidth(imageFile) / 2, data_file_1.getHeight(imageFile) / 2);
            imageToViewportMatrix = viewportMatrix.appended(imageMatrix);
            transformation.imageTransform = transformation_1.matrixToTransform(imageMatrix);
            transformation.viewportTransform = transformation_1.matrixToTransform(viewportMatrix);
            transformation.imageToViewportTransform = transformation_1.matrixToTransform(imageToViewportMatrix);
            return state;
        });
    };
    WorkbenchFileStates.prototype.updateCurrentViewportSize = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, viewportSize = _b.viewportSize;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            if (!imageFile || !state.entities[imageFile.id])
                return state;
            var transformation = state.entities[fileId].transformation;
            transformation.viewportSize = viewportSize;
            return state;
        });
    };
    WorkbenchFileStates.prototype.startLine = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, point = _b.point;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var plotterState = state.entities[fileId].plotter;
            if (!plotterState.measuring) {
                plotterState.lineMeasureStart = __assign({}, point);
                plotterState.lineMeasureEnd = __assign({}, point);
            }
            else {
                plotterState.lineMeasureEnd = __assign({}, point);
            }
            plotterState.measuring = !plotterState.measuring;
            return state;
        });
    };
    WorkbenchFileStates.prototype.updateLine = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, point = _b.point;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            var plotterState = state.entities[fileId].plotter;
            if (!plotterState.measuring)
                return state;
            plotterState.lineMeasureEnd = point;
            return state;
        });
    };
    WorkbenchFileStates.prototype.updatePlotterFileState = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, changes = _b.changes;
        setState(function (state) {
            var dataFiles = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getEntities);
            var imageFile = dataFiles[fileId];
            state.entities[fileId].plotter = __assign(__assign({}, state.entities[fileId].plotter), changes);
            return state;
        });
    };
    //   @Action([MoveBy, ZoomBy, UpdateCurrentViewportSize, ResetImageTransform, SetViewportTransform, SetImageTransform])
    //   @ImmutableContext()
    //   public viewportChanged({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: MoveBy | ZoomBy | UpdateCurrentViewportSize | ResetImageTransform | SetViewportTransform | SetImageTransform) {
    //     let imageFileState = getState().entities[fileId];
    //     let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    //     let imageFile = dataFiles[fileId] as ImageFile;
    //     let result = [];
    //     if (
    //       imageFile.headerLoaded &&
    //       imageFileState &&
    //       imageFileState.transformation.viewportSize
    //     ) {
    //       let sonifier = imageFileState.sonifier;
    //       let sourceExtractor = imageFileState.sourceExtractor;
    //       if (sonifier.regionMode == SonifierRegionMode.VIEWPORT) {
    //         result.push(new UpdateSonifierRegion(fileId));
    //       }
    //             // region = {
    //             //   x: imageFileGlobalState.viewport.imageX,
    //             //   y: imageFileGlobalState.viewport.imageY,
    //             //   width: imageFileGlobalState.viewport.imageWidth,
    //             //   height: imageFileGlobalState.viewport.imageHeight
    //             // }
    //       if (sourceExtractor.regionOption == PhotometryRegionOption.VIEWPORT) {
    //         result.push(new UpdateSourceExtractorRegion(fileId));
    //       }
    //     }
    //     return dispatch(result);
    //   }
    /*  Custom Markers */
    WorkbenchFileStates.prototype.updateCustomMarker = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, markerId = _b.markerId, changes = _b.changes;
        var state = getState();
        setState(function (state) {
            var markerState = state.entities[fileId].marker;
            if (markerState.ids.includes(markerId)) {
                markerState.entities[markerId] = __assign(__assign({}, markerState.entities[markerId]), changes);
            }
            return state;
        });
    };
    WorkbenchFileStates.prototype.addCustomMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, markers = _b.markers;
        var state = getState();
        setState(function (state) {
            var markerState = state.entities[fileId].marker;
            markers.forEach(function (marker) {
                var nextSeed = state.nextMarkerId++;
                if (marker.label == null || marker.label == undefined) {
                    // marker.marker.label = `M${nextSeed}`;
                    marker.label = '';
                }
                var id = nextSeed.toString();
                markerState.ids.push(id);
                markerState.entities[id] = __assign(__assign({}, marker), { id: id });
            });
            return state;
        });
    };
    WorkbenchFileStates.prototype.removeCustomMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, markers = _b.markers;
        var state = getState();
        setState(function (state) {
            var markerState = state.entities[fileId].marker;
            var idsToRemove = markers.map(function (m) { return m.id; });
            markerState.ids = markerState.ids.filter(function (id) { return !idsToRemove.includes(id); });
            markers.forEach(function (marker) {
                if (marker.id in markerState.entities)
                    delete markerState.entities[marker.id];
            });
            return state;
        });
    };
    WorkbenchFileStates.prototype.selectCustomMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, markers = _b.markers;
        var state = getState();
        setState(function (state) {
            var markerState = state.entities[fileId].marker;
            markers.forEach(function (marker) {
                if (markerState.ids.includes(marker.id)) {
                    markerState.entities[marker.id].selected = true;
                }
            });
            return state;
        });
    };
    WorkbenchFileStates.prototype.deselectCustomMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, markers = _b.markers;
        var state = getState();
        setState(function (state) {
            var markerState = state.entities[fileId].marker;
            markers.forEach(function (marker) {
                if (markerState.ids.includes(marker.id)) {
                    markerState.entities[marker.id].selected = false;
                }
            });
            return state;
        });
    };
    WorkbenchFileStates.prototype.setCustomMarkerSelection = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var fileId = _b.fileId, markers = _b.markers;
        var state = getState();
        setState(function (state) {
            var markerState = state.entities[fileId].marker;
            var selectedMarkerIds = markers.map(function (m) { return m.id; });
            markerState.ids.forEach(function (markerId) {
                markerState.entities[markerId].selected = selectedMarkerIds.includes(markerId);
            });
            return state;
        });
    };
    __decorate([
        store_1.Action(auth_actions_1.ResetState),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "resetState");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.InitializeImageFileState),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "initializeImageFileState");
    __decorate([
        store_1.Action(data_files_actions_1.RemoveDataFileSuccess),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "removeDataFileSuccess");
    __decorate([
        store_1.Action(data_files_actions_1.InitImageTiles),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "initImageTiles");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.RenormalizeImageFile),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "renormalizeImageFile");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.NormalizeImageTile),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "normalizeImageTile");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.UpdateNormalizer),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "updateNormalizer");
    __decorate([
        store_1.Action(data_files_actions_1.LoadDataFileHdrSuccess),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "loadDataFileHdrSuccess");
    __decorate([
        store_1.Action([workbench_file_state_actions_1.AddRegionToHistory, workbench_file_state_actions_1.UndoRegionSelection, workbench_file_state_actions_1.RedoRegionSelection]),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "regionHistoryChanged");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.SonificationRegionChanged),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "sonificationRegionChanged");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.UpdateSonifierFileState),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "updateSonifierFileState");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.AddRegionToHistory),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "addRegionToHistory");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.UndoRegionSelection),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "undoRegionSelection");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.RedoRegionSelection),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "redoRegionSelection");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.ClearRegionHistory),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "clearRegionHistory");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.SetProgressLine),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "setProgressLine");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.UpdatePhotometryFileState),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "updatePhotometryFileState");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.CenterRegionInViewport),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "centerRegionInViewport");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.ZoomTo),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "zoomTo");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.ZoomBy),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "zoomBy");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.MoveBy),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "moveBy");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.SetViewportTransform),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "setViewportTransform");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.SetImageTransform),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "setImageTransform");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.ResetImageTransform),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "resetImageTransform");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.RotateBy),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "rotateBy");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.Flip),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "flip");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.UpdateCurrentViewportSize),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "updateCurrentViewportSize");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.StartLine),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "startLine");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.UpdateLine),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "updateLine");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.UpdatePlotterFileState),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "updatePlotterFileState");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.UpdateCustomMarker),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "updateCustomMarker");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.AddCustomMarkers),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "addCustomMarkers");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.RemoveCustomMarkers),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "removeCustomMarkers");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.SelectCustomMarkers),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "selectCustomMarkers");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.DeselectCustomMarkers),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "deselectCustomMarkers");
    __decorate([
        store_1.Action(workbench_file_state_actions_1.SetCustomMarkerSelection),
        immer_adapter_1.ImmutableContext()
    ], WorkbenchFileStates.prototype, "setCustomMarkerSelection");
    __decorate([
        store_1.Selector()
    ], WorkbenchFileStates, "getState");
    __decorate([
        store_1.Selector()
    ], WorkbenchFileStates, "getEntities");
    __decorate([
        store_1.Selector()
    ], WorkbenchFileStates, "getIds");
    __decorate([
        store_1.Selector()
    ], WorkbenchFileStates, "getImageFileStates");
    __decorate([
        store_1.Selector()
    ], WorkbenchFileStates, "getImageFileStateByFileId");
    WorkbenchFileStates = __decorate([
        store_1.State({
            name: 'imageFiles',
            defaults: defaultWorkbenchFileStatesModel
        })
    ], WorkbenchFileStates);
    return WorkbenchFileStates;
}());
exports.WorkbenchFileStates = WorkbenchFileStates;
