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
exports.CustomMarkersState = void 0;
var store_1 = require("@ngxs/store");
var custom_markers_actions_1 = require("./custom-markers.actions");
var immer_adapter_1 = require("@ngxs-labs/immer-adapter");
var auth_actions_1 = require("../auth/auth.actions");
var customMarkersDefaultState = {
    version: 1,
    nextIdSeed: 0,
    ids: [],
    entities: {},
    selectedMarkerIds: []
};
var CustomMarkersState = /** @class */ (function () {
    function CustomMarkersState() {
        this.prefix = 'MARKER';
    }
    CustomMarkersState.getState = function (state) {
        return state;
    };
    CustomMarkersState.getEntities = function (state) {
        return state.entities;
    };
    CustomMarkersState.getCustomMarkers = function (state) {
        return Object.values(state.entities);
    };
    CustomMarkersState.getSelectedCustomMarkers = function (state) {
        return Object.values(state.selectedMarkerIds.map(function (id) { return state.entities[id]; }));
    };
    CustomMarkersState.getCustomMarkersByFileId = function (state) {
        return function (id) {
            console.log("Custom markers for file id " + id + " changed");
            return Object.values(state.entities).filter(function (v) { return v.fileId == id; });
        };
    };
    CustomMarkersState.prototype.resetState = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        setState(function (state) {
            return customMarkersDefaultState;
        });
    };
    CustomMarkersState.prototype.updateCustomMarker = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var markerId = _b.markerId, changes = _b.changes;
        var state = getState();
        setState(function (state) {
            if (state.ids.includes(markerId)) {
                state.entities[markerId] = __assign(__assign({}, state.entities[markerId]), changes);
            }
            return state;
        });
    };
    CustomMarkersState.prototype.addCustomMarkers = function (_a, _b) {
        var _this = this;
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var markers = _b.markers;
        var state = getState();
        setState(function (state) {
            markers.forEach(function (marker) {
                var nextSeed = state.nextIdSeed++;
                if (marker.marker.label == null || marker.marker.label == undefined) {
                    // marker.marker.label = `M${nextSeed}`;
                    marker.marker.label = '';
                }
                var id = _this.prefix + nextSeed;
                state.ids.push(id);
                state.entities[id] = __assign(__assign({}, marker), { id: id });
            });
            return state;
        });
    };
    CustomMarkersState.prototype.removeCustomMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var markers = _b.markers;
        var state = getState();
        setState(function (state) {
            var idsToRemove = markers.map(function (m) { return m.id; });
            state.ids = state.ids.filter(function (id) { return !idsToRemove.includes(id); });
            state.selectedMarkerIds = state.selectedMarkerIds.filter(function (id) { return !idsToRemove.includes(id); });
            markers.forEach(function (marker) {
                if (marker.id in state.entities)
                    delete state.entities[marker.id];
            });
            return state;
        });
    };
    CustomMarkersState.prototype.selectCustomMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var markers = _b.markers;
        var state = getState();
        setState(function (state) {
            state.selectedMarkerIds = __spreadArrays(state.selectedMarkerIds, markers.map(function (m) { return m.id; }));
            return state;
        });
    };
    CustomMarkersState.prototype.deselectCustomMarkers = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var markers = _b.markers;
        var state = getState();
        setState(function (state) {
            var deselectedMarkerIds = markers.map(function (marker) { return marker.id; });
            state.selectedMarkerIds = state.selectedMarkerIds
                .filter(function (markerId) {
                return !deselectedMarkerIds.includes(markerId);
            });
            return state;
        });
    };
    CustomMarkersState.prototype.setCustomMarkerSelection = function (_a, _b) {
        var getState = _a.getState, setState = _a.setState, dispatch = _a.dispatch;
        var markers = _b.markers;
        var state = getState();
        setState(function (state) {
            state.selectedMarkerIds = markers.map(function (marker) { return marker.id; });
            return state;
        });
    };
    __decorate([
        store_1.Action(auth_actions_1.ResetState),
        immer_adapter_1.ImmutableContext()
    ], CustomMarkersState.prototype, "resetState");
    __decorate([
        store_1.Action(custom_markers_actions_1.UpdateCustomMarker),
        immer_adapter_1.ImmutableContext()
    ], CustomMarkersState.prototype, "updateCustomMarker");
    __decorate([
        store_1.Action(custom_markers_actions_1.AddCustomMarkers),
        immer_adapter_1.ImmutableContext()
    ], CustomMarkersState.prototype, "addCustomMarkers");
    __decorate([
        store_1.Action(custom_markers_actions_1.RemoveCustomMarkers),
        immer_adapter_1.ImmutableContext()
    ], CustomMarkersState.prototype, "removeCustomMarkers");
    __decorate([
        store_1.Action(custom_markers_actions_1.SelectCustomMarkers),
        immer_adapter_1.ImmutableContext()
    ], CustomMarkersState.prototype, "selectCustomMarkers");
    __decorate([
        store_1.Action(custom_markers_actions_1.DeselectCustomMarkers),
        immer_adapter_1.ImmutableContext()
    ], CustomMarkersState.prototype, "deselectCustomMarkers");
    __decorate([
        store_1.Action(custom_markers_actions_1.SetCustomMarkerSelection),
        immer_adapter_1.ImmutableContext()
    ], CustomMarkersState.prototype, "setCustomMarkerSelection");
    __decorate([
        store_1.Selector()
    ], CustomMarkersState, "getState");
    __decorate([
        store_1.Selector()
    ], CustomMarkersState, "getEntities");
    __decorate([
        store_1.Selector()
    ], CustomMarkersState, "getCustomMarkers");
    __decorate([
        store_1.Selector()
    ], CustomMarkersState, "getSelectedCustomMarkers");
    __decorate([
        store_1.Selector()
    ], CustomMarkersState, "getCustomMarkersByFileId");
    CustomMarkersState = __decorate([
        store_1.State({
            name: 'customMarkers',
            defaults: customMarkersDefaultState
        })
    ], CustomMarkersState);
    return CustomMarkersState;
}());
exports.CustomMarkersState = CustomMarkersState;
