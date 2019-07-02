// import { Injectable } from "@angular/core";
// import { Observable, BehaviorSubject } from "rxjs";
// import { filter, map } from "rxjs/operators";

// import * as Module from "./../../wasm/wasm_wcs_minimal/dist/wcslib.js";
// import "!!file-loader?name=wcslib.wasm!../../wasm/wasm_wcs_minimal/dist/wcslib.wasm";

// function string2buffer(str) {
//   let buffer = new ArrayBuffer(str.length);
//   let view = new Uint8Array(buffer);
//   for (let i = 0; i < str.length; i += 1) {
//     view[i] = str.charCodeAt(i);
//   }

//   return buffer;
// }

// function splice(str1, index, remove, str2) {
//   return str1.slice(0, index) + str2 + str1.slice(index + Math.abs(remove));
// }

// function toHeader(wcsObj) {
//   let header = [];
//   let line =
//     "                                                                                ";

//   for (let card in wcsObj) {
//     let value = wcsObj[card];
//     if (value === undefined || value === null) {
//       continue;
//     }

//     if (typeof value === "string" && value !== "T" && value !== "F") {
//       value = "'" + value + "'";
//     }

//     let entry = splice(line, 0, card.length, card);
//     entry = splice(entry, 8, 1, "=");
//     entry = splice(entry, 10, value.toString().length, value);

//     header.push(entry);
//   }

//   return header.join("\n");
// }

// const wcsRegEx = [
//   "DATE-OBS",
//   "EQUINOX",
//   "WCSAXES",
//   "RADESYS",
//   "LONPOLE",
//   "LATPOLE",
//   /NAXIS\d*/,
//   /CTYPE\d+/,
//   /CRPIX\d+/,
//   /CRVAL\d+/,
//   /CUNIT\d+/,
//   /CDELT\d+/,
//   /CD.+/,
//   /PV.+/,
//   /CROTA\d+/
// ];

// // Defines the maximum number of coordinate calculations to perform per WCSlib call. A larger number will result in a faster conversion, but will require more memory
// // Due to the intermediate arrays required, each coordinate calculation requires 68 bytes of memory to be allocated. A default limit of 5000 coordinates per iteration
// // requires 340k of memory.
// const MAX_COORDS = 5000;

// class Wcs {
//   _wcsp2s;
//   _wcss2p;
//   _getWCS;
//   _pix2sky;
//   _sky2pix;
//   _wcsConvertVector;
//   _wcsConvert;
//   coordinatePtr;
//   numConversionCoordinates;
//   conversionPtr;
//   numVectorCoordinates;
//   statusPtrVector;
//   coordinatePtrVector;
//   imgcrdPtrVector;
//   pixPtrVector;
//   phiPtrVector;
//   thetaPtrVector;
//   wcsPtr;

//   constructor(header, private module) {
//     this._wcsp2s = this.module.cwrap("wcsp2s", "number", [
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number"
//     ]);
//     this._wcss2p = this.module.cwrap("wcss2p", "number", [
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number"
//     ]);
//     this._getWCS = this.module.cwrap("getWcs", "number", ["String", "number"]);
//     this._pix2sky = this.module.cwrap("pix2sky", "number", [
//       "number",
//       "number",
//       "number",
//       "number"
//     ]);
//     this._sky2pix = this.module.cwrap("sky2pix", "number", [
//       "number",
//       "number",
//       "number",
//       "number"
//     ]);
//     this._wcsConvertVector = this.module.cwrap("wcsConvertVector", "number", [
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number"
//     ]);
//     this._wcsConvert = this.module.cwrap("wcsConvert", "number", [
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number",
//       "number"
//     ]);

//     let headerStr, nkeyrec, nHeaderBytes, headerPtr, headerHeap;

//     if (typeof header === "object") {
//       header = toHeader(header);
//     }

//     // Split the string into an array and filter based on the WCS regular expressions
//     let headerArray = header.match(/.{1,80}/g);
//     headerArray = headerArray.filter(function(line) {
//       // Extract the keyword
//       let keyword = line.slice(0, 8).trim();

//       for (let i = 0; i < wcsRegEx.length; i += 1) {
//         let regEx = wcsRegEx[i];
//         if (keyword.match(regEx)) {
//           return true;
//         }
//       }

//       return false;
//     });
//     headerStr = headerArray.join("\n");

//     nkeyrec = headerArray.length;
//     header = string2buffer(headerStr);

//     // Allocate string on Emscripten heap and get byte offset
//     nHeaderBytes = Math.ceil(header.byteLength / 8) * 8;
//     headerPtr = this.module._malloc(nHeaderBytes);
//     headerHeap = new Uint8Array(
//       this.module.HEAPU8.buffer,
//       headerPtr,
//       nHeaderBytes
//     );
//     headerHeap.set(new Uint8Array(header));

//     // Allocate memory on the Emscripten heap for coordinates and intermediate values
//     this.coordinatePtr = this.module._malloc(16);
//     // For wcs <-> wcs conversion
//     this.numConversionCoordinates = MAX_COORDS;
//     this.conversionPtr = this.module._malloc(this.numConversionCoordinates);

//     // For pix <-> wcs conversion
//     this.numVectorCoordinates = MAX_COORDS;
//     this.statusPtrVector = this.module._malloc(this.numVectorCoordinates * 4);
//     this.coordinatePtrVector = this.module._malloc(
//       this.numVectorCoordinates * 16
//     );
//     this.imgcrdPtrVector = this.module._malloc(this.numVectorCoordinates * 16);
//     this.pixPtrVector = this.module._malloc(this.numVectorCoordinates * 16);
//     this.phiPtrVector = this.module._malloc(this.numVectorCoordinates * 8);
//     this.thetaPtrVector = this.module._malloc(this.numVectorCoordinates * 8);
//     // Use byte offset to pass header string to libwcs
//     this.wcsPtr = this._getWCS(headerHeap.byteOffset, nkeyrec);
//   }

//   pix2sky(x, y) {
//     const retVal = this._pix2sky(this.wcsPtr, x, y, this.coordinatePtr);
//     const world = new Float64Array(
//       this.module.HEAPF64.buffer,
//       this.coordinatePtr,
//       2
//     );
//     return new Float64Array(world);
//   }

//   convertWCS(sys1, sys2, ra, dec) {
//     const values = new Float64Array([ra, dec]);
//     this.module.HEAPF64.set(values, this.coordinatePtr / 8);
//     this._wcsConvert(sys1, sys2, 0.0, 0.0, 0.0, 1, this.coordinatePtr);
//     const converted = new Float64Array(
//       this.module.HEAPF64.buffer,
//       this.coordinatePtr,
//       2
//     );
//     return new Float64Array(converted);
//   }

//   convertWCSVector(N, sys1, sys2, values) {
//     if (sys1 === sys2) {
//       return values;
//     }
//     let convertedVals = new Float64Array(2 * N);
//     let numRemaining = N;
//     let index = 0;

//     while (numRemaining > 0) {
//       const numIter = Math.min(numRemaining, MAX_COORDS);
//       if (numIter > this.numConversionCoordinates) {
//         this.module._free(this.conversionPtr);
//         this.conversionPtr = this.module._malloc(numIter * 16);
//         this.numConversionCoordinates = numIter;
//       }

//       this.module.HEAPF64.set(
//         values.subarray(index, index + numIter * 2),
//         this.conversionPtr / 8
//       );
//       this._wcsConvertVector(
//         sys1,
//         sys2,
//         0.0,
//         0.0,
//         0.0,
//         numIter,
//         this.conversionPtr
//       );
//       let converted = new Float64Array(
//         this.module.HEAPF64.buffer,
//         this.conversionPtr,
//         2 * numIter
//       );
//       convertedVals.set(converted, index);
//       index += numIter * 2;
//       numRemaining -= numIter;
//     }
//     return convertedVals;
//   }

//   pix2skyVector(N, values) {
//     let worldVals = new Float64Array(2 * N);
//     let numRemaining = N;
//     let index = 0;

//     while (numRemaining > 0) {
//       const numIter = Math.min(numRemaining, MAX_COORDS);
//       if (numIter > this.numVectorCoordinates) {
//         this.module._free(this.statusPtrVector);
//         this.module._free(this.coordinatePtrVector);
//         this.module._free(this.imgcrdPtrVector);
//         this.module._free(this.pixPtrVector);
//         this.module._free(this.phiPtrVector);
//         this.module._free(this.thetaPtrVector);
//         this.statusPtrVector = this.module._malloc(numIter * 4);
//         this.coordinatePtrVector = this.module._malloc(numIter * 16);
//         this.imgcrdPtrVector = this.module._malloc(numIter * 16);
//         this.pixPtrVector = this.module._malloc(numIter * 16);
//         this.phiPtrVector = this.module._malloc(numIter * 8);
//         this.thetaPtrVector = this.module._malloc(numIter * 8);
//         this.numVectorCoordinates = numIter;
//       }
//       this.module.HEAPF64.set(
//         values.subarray(index, index + numIter * 2),
//         this.pixPtrVector / 8
//       );
//       this._wcsp2s(
//         this.wcsPtr,
//         numIter,
//         2,
//         this.pixPtrVector,
//         this.imgcrdPtrVector,
//         this.phiPtrVector,
//         this.thetaPtrVector,
//         this.coordinatePtrVector,
//         this.statusPtrVector
//       );
//       let world = new Float64Array(
//         this.module.HEAPF64.buffer,
//         this.coordinatePtrVector,
//         2 * numIter
//       );
//       worldVals.set(world, index);
//       index += numIter * 2;
//       numRemaining -= numIter;
//     }
//     return worldVals;
//   }

//   sky2pixVector(N, values) {
//     let pixVals = new Float64Array(2 * N);
//     let numRemaining = N;
//     let index = 0;

//     while (numRemaining > 0) {
//       const numIter = Math.min(numRemaining, MAX_COORDS);
//       if (numIter > this.numVectorCoordinates) {
//         this.module._free(this.statusPtrVector);
//         this.module._free(this.coordinatePtrVector);
//         this.module._free(this.imgcrdPtrVector);
//         this.module._free(this.pixPtrVector);
//         this.module._free(this.phiPtrVector);
//         this.module._free(this.thetaPtrVector);
//         this.statusPtrVector = this.module._malloc(numIter * 4);
//         this.coordinatePtrVector = this.module._malloc(numIter * 16);
//         this.imgcrdPtrVector = this.module._malloc(numIter * 16);
//         this.pixPtrVector = this.module._malloc(numIter * 16);
//         this.phiPtrVector = this.module._malloc(numIter * 8);
//         this.thetaPtrVector = this.module._malloc(numIter * 8);
//         this.numVectorCoordinates = numIter;
//       }
//       this.module.HEAPF64.set(
//         values.subarray(index, index + numIter * 2),
//         this.coordinatePtrVector / 8
//       );
//       this._wcss2p(
//         this.wcsPtr,
//         numIter,
//         2,
//         this.coordinatePtrVector,
//         this.phiPtrVector,
//         this.thetaPtrVector,
//         this.imgcrdPtrVector,
//         this.pixPtrVector,
//         this.statusPtrVector
//       );
//       let pix = new Float64Array(
//         this.module.HEAPF64.buffer,
//         this.pixPtrVector,
//         2 * numIter
//       );
//       pixVals.set(pix, index);
//       index += numIter * 2;
//       numRemaining -= numIter;
//     }
//     return pixVals;
//   }

//   sky2pix(ra, dec) {
//     this._sky2pix(this.wcsPtr, ra, dec, this.coordinatePtr);
//     const pixcrd = new Float64Array(
//       this.module.HEAPU8.buffer,
//       this.coordinatePtr,
//       2
//     );
//     return pixcrd.slice(0);
//   }
// }

// @Injectable()
// export class WcsLib {
//   module: any;

//   wasmReady = new BehaviorSubject<boolean>(false);

//   constructor() {
//     this.instantiateWasm("wcslib.wasm");
//   }

//   private async instantiateWasm(url: string) {
//     // fetch the wasm file
//     const wasmFile = await fetch(url);

//     // convert it into a binary array
//     const buffer = await wasmFile.arrayBuffer();
//     const binary = new Uint8Array(buffer);

//     // create module arguments
//     // including the wasm-file
//     const moduleArgs = {
//       wasmBinary: binary,
//       onRuntimeInitialized: () => {
//         // instantiate the module
//         this.wasmReady.next(true);
//       }
//     };

//     this.module = Module(moduleArgs);
//   }

//   public getWcs(input: any): Observable<Wcs> {
//     return this.wasmReady.pipe(filter(value => value === true)).pipe(
//       map(() => {
//         return new Wcs(input, this.module);
//       })
//     );
//   }
// }
