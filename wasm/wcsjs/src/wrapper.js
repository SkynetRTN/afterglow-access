addOnPostRun(() => {
  function WCS() {
    this._getWCS = Module.cwrap("getWcs", "number", ["String", "number"]);

    this._hasCelestial = Module.cwrap("hasCelestial", "number", [
      "number"
    ]);

    this._pix2sky = Module.cwrap("pix2sky", "number", [
      "number",
      "number",
      "number",
      "number"
    ]);

    this._sky2pix = Module.cwrap("sky2pix", "number", [
      "number",
      "number",
      "number",
      "number"
    ]);
  }

  function string2buffer(str) {
    let buffer = new ArrayBuffer(str.length);
    let view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i += 1) {
      view[i] = str.charCodeAt(i);
    }

    return buffer;
  }

  function splice(str1, index, remove, str2) {
    return str1.slice(0, index) + str2 + str1.slice(index + Math.abs(remove));
  }

  function toHeader(wcsObj) {
    let header = [];
    let line =
      "                                                                                ";

    for (let card in wcsObj) {
      let value = wcsObj[card];
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value === "string" && value !== "T" && value !== "F") {
        value = "'" + value + "'";
      }

      let entry = splice(line, 0, card.length, card);
      entry = splice(entry, 8, 1, "=");
      entry = splice(entry, 10, value.toString().length, value);

      header.push(entry);
    }

    return header.join("\n");
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
    /CROTA\d+/
  ];

  // Defines the maximum number of coordinate calculations to perform per WCSlib call. A larger number will result in a faster conversion, but will require more memory
  // Due to the intermediate arrays required, each coordinate calculation requires 68 bytes of memory to be allocated. A default limit of 5000 coordinates per iteration
  // requires 340k of memory.
  const MAX_COORDS = 5000;

  // Initialize a WCS object using either a string or object of key value pairs
  WCS.prototype.init = function(header) {
    var headerStr, nkeyrec, nHeaderBytes, headerPtr, headerHeap;

    if (typeof header === "object") {
      header = toHeader(header);
    }

    // Split the string into an array and filter based on the WCS regular expressions
    var headerArray = header.match(/.{1,80}/g);
    headerArray = headerArray.filter(function(line) {
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
    console.log(headerStr);

    nkeyrec = headerArray.length;
    header = string2buffer(headerStr);

    // Allocate string on Emscripten heap and get byte offset
    nHeaderBytes = header.byteLength;
    headerPtr = Module._malloc(nHeaderBytes);
    headerHeap = new Uint8Array(Module.HEAPU8.buffer, headerPtr, nHeaderBytes);
    headerHeap.set(new Uint8Array(header));

    // Allocate memory on the Emscripten heap for coordinates
    this.coordinatePtr = Module._malloc(16);

    // Use byte offset to pass header string to libwcs
    this.wcsPtr = this._getWCS(headerHeap.byteOffset, nkeyrec);
    this.isValid = this.wcsPtr ? true : false;
    // console.log(this.isValid, this.wcsPtr);
  };

  WCS.prototype.pix2sky = function(x, y) {
    const retVal = this._pix2sky(this.wcsPtr, x, y, this.coordinatePtr);
    const world = new Float64Array(
      Module.HEAPF64.buffer,
      this.coordinatePtr,
      2
    );
    return new Float64Array(world);
  };

  WCS.prototype.hasCelestial = function() {
    return this._hasCelestial(this.wcsPtr);
  }

  WCS.prototype.sky2pix = function(ra, dec) {
    this._sky2pix(this.wcsPtr, ra, dec, this.coordinatePtr);
    const pixcrd = new Float64Array(
      Module.HEAPU8.buffer,
      this.coordinatePtr,
      2
    );
    return pixcrd.slice(0);
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = WCS;
  } else {
    window.WCS = WCS;
  }
  console.log("WCS ready");
});
