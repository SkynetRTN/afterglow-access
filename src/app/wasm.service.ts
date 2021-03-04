import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject } from "rxjs";

// set Module.locateFile in index.html
// @ts-ignore
import * as Module from "../wasm/wcs.js";
import "!!file-loader?name=wasm/wcslib.wasm!../wasm/wcslib.wasm";

let WcsModule: any;

@Injectable()
export class WasmService {
  wasmReady$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.instantiateWasm("wasm/wcslib.wasm");
  }

  private async instantiateWasm(url: string) {
    // fetch the wasm file
    const wasmFile = await fetch(url);

    // convert it into a binary array
    const buffer = await wasmFile.arrayBuffer();
    const binary = new Uint8Array(buffer);

    // create module arguments
    // including the wasm-file
    const moduleArgs = {
      wasmBinary: binary,
      onRuntimeInitialized: () => {
        this.wasmReady$.next(true);
      },
    };

    // instantiate the module
    WcsModule = Module(moduleArgs);
  }
}

const wcsRegEx = [
  "DATE-OBS",
  "EQUINOX",
  "WCSAXES",
  "RADESYS",
  "LONPOLE",
  "LATPOLE",
  /NAXIS\d*/,
  /CTYPE\d+/,
  /CRPIX\d+/,
  /CRVAL\d+/,
  /CUNIT\d+/,
  /CDELT\d+/,
  /CD.+/,
  /PC.+/,
  /PV.+/,
  /CROTA\d+/,
];

// Defines the maximum number of coordinate calculations to perform per WCSlib call. A larger number will result in a faster conversion, but will require more memory
// Due to the intermediate arrays required, each coordinate calculation requires 68 bytes of memory to be allocated. A default limit of 5000 coordinates per iteration
// requires 340k of memory.
const MAX_COORDS = 5000;

export class WcsLib {
  _getWCS: any;
  _hasCelestial: any;
  _pix2sky: any;
  _sky2pix: any;
  coordinatePtr: any;
  wcsPtr: any;
  isValid: any;

  constructor(header: any) {
    this._getWCS = WcsModule.cwrap("getWcs", "number", ["String", "number"]);

    this._hasCelestial = WcsModule.cwrap("hasCelestial", "number", ["number"]);

    this._pix2sky = WcsModule.cwrap("pix2sky", "number", ["number", "number", "number", "number"]);

    this._sky2pix = WcsModule.cwrap("sky2pix", "number", ["number", "number", "number", "number"]);

    var headerStr, nkeyrec, nHeaderBytes, headerPtr, headerHeap;

    if (typeof header === "object") {
      header = this.toHeader(header);
    }

    // Split the string into an array and filter based on the WCS regular expressions
    var headerArray: any[] = header.match(/.{1,80}/g);
    headerArray = headerArray.filter(line => {
      // Extract the keyword
      var keyword = line.slice(0, 8).trim();

      for (var i = 0; i < wcsRegEx.length; i += 1) {
        var regEx = wcsRegEx[i];
        if (keyword.match(regEx)) {
          return true;
        }
      }

      return false;
    });
    headerStr = headerArray.join("\n");

    nkeyrec = headerArray.length;
    header = this.string2buffer(headerStr);

    // Allocate string on Emscripten heap and get byte offset
    nHeaderBytes = header.byteLength;
    headerPtr = WcsModule._malloc(nHeaderBytes);
    headerHeap = new Uint8Array(WcsModule.HEAPU8.buffer, headerPtr, nHeaderBytes);
    headerHeap.set(new Uint8Array(header));

    // Allocate memory on the Emscripten heap for coordinates
    this.coordinatePtr = WcsModule._malloc(16);

    // Use byte offset to pass header string to libwcs
    this.wcsPtr = this._getWCS(headerHeap.byteOffset, nkeyrec);
    this.isValid = this.wcsPtr ? true : false;
    // console.log(this.isValid, this.wcsPtr);
  }

  private string2buffer(str: string) {
    let buffer = new ArrayBuffer(str.length);
    let view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i += 1) {
      view[i] = str.charCodeAt(i);
    }

    return buffer;
  }

  private splice(str1: string, index: number, remove: number, str2: string) {
    return str1.slice(0, index) + str2 + str1.slice(index + Math.abs(remove));
  }

  private toHeader(wcsObj: any) {
    let header = [];
    let line = "                                                                                ";

    for (let card in wcsObj) {
      let value = wcsObj[card];
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value === "string" && value !== "T" && value !== "F") {
        value = "'" + value + "'";
      }

      let entry = this.splice(line, 0, card.length, card);
      entry = this.splice(entry, 8, 1, "=");
      entry = this.splice(entry, 10, value.toString().length, value);

      header.push(entry);
    }

    return header.join("\n");
  }

  public pix2sky(x: number, y: number) {
    const retVal = this._pix2sky(this.wcsPtr, x, y, this.coordinatePtr);
    const world = new Float64Array(WcsModule.HEAPF64.buffer, this.coordinatePtr, 2);
    return new Float64Array(world);
  };

  public hasCelestial() {
    return this._hasCelestial(this.wcsPtr);
  };

  public sky2pix(ra: number, dec: number) {
    this._sky2pix(this.wcsPtr, ra, dec, this.coordinatePtr);
    const pixcrd = new Float64Array(WcsModule.HEAPU8.buffer, this.coordinatePtr, 2);
    return pixcrd.slice(0);
  };
}
