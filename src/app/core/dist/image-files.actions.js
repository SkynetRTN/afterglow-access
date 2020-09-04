"use strict";
exports.__esModule = true;
exports.SetCustomMarkerSelection = exports.DeselectCustomMarkers = exports.SelectCustomMarkers = exports.RemoveCustomMarkers = exports.AddCustomMarkers = exports.UpdateCustomMarker = exports.SetSourceLabel = exports.RemoveAllSources = exports.RemoveSelectedSources = exports.UpdatePhotometryFileState = exports.UpdateFilteredSources = exports.UpdateCurrentViewportSize = exports.CenterRegionInViewport = exports.Flip = exports.RotateTo = exports.RotateBy = exports.SetViewportTransform = exports.ResetImageTransform = exports.SetImageTransform = exports.MoveBy = exports.ZoomTo = exports.ZoomBy = exports.UpdateLine = exports.StartLine = exports.UpdatePlotterFileState = exports.SetProgressLine = exports.UpdateSonifierFileState = exports.RedoRegionSelection = exports.UndoRegionSelection = exports.ClearRegionHistory = exports.AddRegionToHistory = exports.SonificationRegionChanged = exports.SonificationViewportSync = exports.UpdateNormalizer = exports.NormalizeImageTile = exports.RenormalizeImageFile = exports.InitializeImageFileState = void 0;
var InitializeImageFileState = /** @class */ (function () {
    function InitializeImageFileState(fileIds) {
        this.fileIds = fileIds;
    }
    InitializeImageFileState.type = '[Viewer] Initialize Image File State';
    return InitializeImageFileState;
}());
exports.InitializeImageFileState = InitializeImageFileState;
/* Normalization */
var RenormalizeImageFile = /** @class */ (function () {
    function RenormalizeImageFile(fileId) {
        this.fileId = fileId;
    }
    RenormalizeImageFile.type = '[Viewer] Renormalize Image File';
    return RenormalizeImageFile;
}());
exports.RenormalizeImageFile = RenormalizeImageFile;
var NormalizeImageTile = /** @class */ (function () {
    function NormalizeImageTile(fileId, tileIndex) {
        this.fileId = fileId;
        this.tileIndex = tileIndex;
    }
    NormalizeImageTile.type = '[Viewer] Normalize Image Tile';
    return NormalizeImageTile;
}());
exports.NormalizeImageTile = NormalizeImageTile;
var UpdateNormalizer = /** @class */ (function () {
    function UpdateNormalizer(fileId, changes) {
        this.fileId = fileId;
        this.changes = changes;
    }
    UpdateNormalizer.type = '[Viewer] Update Normalizer';
    return UpdateNormalizer;
}());
exports.UpdateNormalizer = UpdateNormalizer;
/* Sonification */
var SonificationViewportSync = /** @class */ (function () {
    function SonificationViewportSync(fileId) {
        this.fileId = fileId;
    }
    SonificationViewportSync.type = '[Sonifier] Sonification Viewport Sync';
    return SonificationViewportSync;
}());
exports.SonificationViewportSync = SonificationViewportSync;
var SonificationRegionChanged = /** @class */ (function () {
    function SonificationRegionChanged(fileId) {
        this.fileId = fileId;
    }
    SonificationRegionChanged.type = '[Sonifier] Region Changed';
    return SonificationRegionChanged;
}());
exports.SonificationRegionChanged = SonificationRegionChanged;
var AddRegionToHistory = /** @class */ (function () {
    function AddRegionToHistory(fileId, region) {
        this.fileId = fileId;
        this.region = region;
    }
    AddRegionToHistory.type = '[Sonifier] Add Region to History';
    return AddRegionToHistory;
}());
exports.AddRegionToHistory = AddRegionToHistory;
var ClearRegionHistory = /** @class */ (function () {
    function ClearRegionHistory(fileId) {
        this.fileId = fileId;
    }
    ClearRegionHistory.type = '[Sonifier] Clear Region History';
    return ClearRegionHistory;
}());
exports.ClearRegionHistory = ClearRegionHistory;
var UndoRegionSelection = /** @class */ (function () {
    function UndoRegionSelection(fileId) {
        this.fileId = fileId;
    }
    UndoRegionSelection.type = '[Sonifier] Undo Region Selection';
    return UndoRegionSelection;
}());
exports.UndoRegionSelection = UndoRegionSelection;
var RedoRegionSelection = /** @class */ (function () {
    function RedoRegionSelection(fileId) {
        this.fileId = fileId;
    }
    RedoRegionSelection.type = '[Sonifier] Redo Region Selection';
    return RedoRegionSelection;
}());
exports.RedoRegionSelection = RedoRegionSelection;
var UpdateSonifierFileState = /** @class */ (function () {
    function UpdateSonifierFileState(fileId, changes) {
        this.fileId = fileId;
        this.changes = changes;
    }
    UpdateSonifierFileState.type = '[Sonifier] Update File State';
    return UpdateSonifierFileState;
}());
exports.UpdateSonifierFileState = UpdateSonifierFileState;
var SetProgressLine = /** @class */ (function () {
    function SetProgressLine(fileId, line) {
        this.fileId = fileId;
        this.line = line;
    }
    SetProgressLine.type = '[Sonifier] Set Progress Line';
    return SetProgressLine;
}());
exports.SetProgressLine = SetProgressLine;
/* Plotting */
var UpdatePlotterFileState = /** @class */ (function () {
    function UpdatePlotterFileState(fileId, changes) {
        this.fileId = fileId;
        this.changes = changes;
    }
    UpdatePlotterFileState.type = '[Plotter] Update Plotter File State';
    return UpdatePlotterFileState;
}());
exports.UpdatePlotterFileState = UpdatePlotterFileState;
var StartLine = /** @class */ (function () {
    function StartLine(fileId, point) {
        this.fileId = fileId;
        this.point = point;
    }
    StartLine.type = '[Plotter] Start Line';
    return StartLine;
}());
exports.StartLine = StartLine;
var UpdateLine = /** @class */ (function () {
    function UpdateLine(fileId, point) {
        this.fileId = fileId;
        this.point = point;
    }
    UpdateLine.type = '[Plotter] Update Line';
    return UpdateLine;
}());
exports.UpdateLine = UpdateLine;
/* Transformations */
var ZoomBy = /** @class */ (function () {
    function ZoomBy(fileId, scaleFactor, viewportAnchor) {
        this.fileId = fileId;
        this.scaleFactor = scaleFactor;
        this.viewportAnchor = viewportAnchor;
    }
    ZoomBy.type = '[Transformation] Zoom By';
    return ZoomBy;
}());
exports.ZoomBy = ZoomBy;
var ZoomTo = /** @class */ (function () {
    function ZoomTo(fileId, scale, anchorPoint) {
        this.fileId = fileId;
        this.scale = scale;
        this.anchorPoint = anchorPoint;
    }
    ZoomTo.type = '[Transformation] Zoom To';
    return ZoomTo;
}());
exports.ZoomTo = ZoomTo;
var MoveBy = /** @class */ (function () {
    function MoveBy(fileId, xShift, yShift) {
        this.fileId = fileId;
        this.xShift = xShift;
        this.yShift = yShift;
    }
    MoveBy.type = '[Transformation] Move By';
    return MoveBy;
}());
exports.MoveBy = MoveBy;
var SetImageTransform = /** @class */ (function () {
    function SetImageTransform(fileId, transform) {
        this.fileId = fileId;
        this.transform = transform;
    }
    SetImageTransform.type = '[Transformation] Set Image Transform';
    return SetImageTransform;
}());
exports.SetImageTransform = SetImageTransform;
var ResetImageTransform = /** @class */ (function () {
    function ResetImageTransform(fileId) {
        this.fileId = fileId;
    }
    ResetImageTransform.type = '[Transformation] Reset Image Transform';
    return ResetImageTransform;
}());
exports.ResetImageTransform = ResetImageTransform;
var SetViewportTransform = /** @class */ (function () {
    function SetViewportTransform(fileId, transform) {
        this.fileId = fileId;
        this.transform = transform;
    }
    SetViewportTransform.type = '[Transformation] Set Viewport Transform';
    return SetViewportTransform;
}());
exports.SetViewportTransform = SetViewportTransform;
var RotateBy = /** @class */ (function () {
    function RotateBy(fileId, rotationAngle, anchorPoint) {
        this.fileId = fileId;
        this.rotationAngle = rotationAngle;
        this.anchorPoint = anchorPoint;
    }
    RotateBy.type = '[Transformation] Rotate By';
    return RotateBy;
}());
exports.RotateBy = RotateBy;
var RotateTo = /** @class */ (function () {
    function RotateTo(fileId, rotationAngle, anchorPoint) {
        this.fileId = fileId;
        this.rotationAngle = rotationAngle;
        this.anchorPoint = anchorPoint;
    }
    RotateTo.type = '[Transformation] Rotate To';
    return RotateTo;
}());
exports.RotateTo = RotateTo;
var Flip = /** @class */ (function () {
    function Flip(fileId) {
        this.fileId = fileId;
    }
    Flip.type = '[Transformation] Flip';
    return Flip;
}());
exports.Flip = Flip;
var CenterRegionInViewport = /** @class */ (function () {
    function CenterRegionInViewport(fileId, region, viewportSize) {
        this.fileId = fileId;
        this.region = region;
        this.viewportSize = viewportSize;
    }
    CenterRegionInViewport.type = '[Transformation] Center Region In Viewport';
    return CenterRegionInViewport;
}());
exports.CenterRegionInViewport = CenterRegionInViewport;
var UpdateCurrentViewportSize = /** @class */ (function () {
    function UpdateCurrentViewportSize(fileId, viewportSize) {
        this.fileId = fileId;
        this.viewportSize = viewportSize;
    }
    UpdateCurrentViewportSize.type = '[Transformation] Update Current Viewport Size';
    return UpdateCurrentViewportSize;
}());
exports.UpdateCurrentViewportSize = UpdateCurrentViewportSize;
/*Source Extractor*/
var UpdateFilteredSources = /** @class */ (function () {
    function UpdateFilteredSources(fileId) {
        this.fileId = fileId;
    }
    UpdateFilteredSources.type = '[Source Extractor] Update Filtered Sources';
    return UpdateFilteredSources;
}());
exports.UpdateFilteredSources = UpdateFilteredSources;
var UpdatePhotometryFileState = /** @class */ (function () {
    function UpdatePhotometryFileState(fileId, changes) {
        this.fileId = fileId;
        this.changes = changes;
    }
    UpdatePhotometryFileState.type = '[Source Extractor] Update File State';
    return UpdatePhotometryFileState;
}());
exports.UpdatePhotometryFileState = UpdatePhotometryFileState;
var RemoveSelectedSources = /** @class */ (function () {
    function RemoveSelectedSources(fileId) {
        this.fileId = fileId;
    }
    RemoveSelectedSources.type = '[Source Extractor] Remove Selected Sources';
    return RemoveSelectedSources;
}());
exports.RemoveSelectedSources = RemoveSelectedSources;
var RemoveAllSources = /** @class */ (function () {
    function RemoveAllSources(fileId) {
        this.fileId = fileId;
    }
    RemoveAllSources.type = '[Source Extractor] Remove All Sources';
    return RemoveAllSources;
}());
exports.RemoveAllSources = RemoveAllSources;
var SetSourceLabel = /** @class */ (function () {
    function SetSourceLabel(fileId, source, label) {
        this.fileId = fileId;
        this.source = source;
        this.label = label;
    }
    SetSourceLabel.type = '[Source Extractor] Set Source Label';
    return SetSourceLabel;
}());
exports.SetSourceLabel = SetSourceLabel;
/* Markers */
var UpdateCustomMarker = /** @class */ (function () {
    function UpdateCustomMarker(fileId, markerId, changes) {
        this.fileId = fileId;
        this.markerId = markerId;
        this.changes = changes;
    }
    UpdateCustomMarker.type = '[Markers] Update Custom Marker';
    return UpdateCustomMarker;
}());
exports.UpdateCustomMarker = UpdateCustomMarker;
var AddCustomMarkers = /** @class */ (function () {
    function AddCustomMarkers(fileId, markers) {
        this.fileId = fileId;
        this.markers = markers;
    }
    AddCustomMarkers.type = '[Markers] Add Custom Marker';
    return AddCustomMarkers;
}());
exports.AddCustomMarkers = AddCustomMarkers;
var RemoveCustomMarkers = /** @class */ (function () {
    function RemoveCustomMarkers(fileId, markers) {
        this.fileId = fileId;
        this.markers = markers;
    }
    RemoveCustomMarkers.type = '[Markers] Remove Custom Marker';
    return RemoveCustomMarkers;
}());
exports.RemoveCustomMarkers = RemoveCustomMarkers;
var SelectCustomMarkers = /** @class */ (function () {
    function SelectCustomMarkers(fileId, markers) {
        this.fileId = fileId;
        this.markers = markers;
    }
    SelectCustomMarkers.type = '[Markers] Select Custom Markers';
    return SelectCustomMarkers;
}());
exports.SelectCustomMarkers = SelectCustomMarkers;
var DeselectCustomMarkers = /** @class */ (function () {
    function DeselectCustomMarkers(fileId, markers) {
        this.fileId = fileId;
        this.markers = markers;
    }
    DeselectCustomMarkers.type = '[Markers] Deselect Custom Markers';
    return DeselectCustomMarkers;
}());
exports.DeselectCustomMarkers = DeselectCustomMarkers;
var SetCustomMarkerSelection = /** @class */ (function () {
    function SetCustomMarkerSelection(fileId, markers) {
        this.fileId = fileId;
        this.markers = markers;
    }
    SetCustomMarkerSelection.type = '[Markers] Set Custom Marker Selection';
    return SetCustomMarkerSelection;
}());
exports.SetCustomMarkerSelection = SetCustomMarkerSelection;
