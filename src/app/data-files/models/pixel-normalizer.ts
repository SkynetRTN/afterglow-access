import { StretchMode } from "./stretch-mode";
import { ColorMap, COLOR_MAPS } from "./color-map";
import { ImageHist, calcLevels } from "../../data-files/models/image-hist";
import { PixelType } from "../../data-files/models/data-file";

export interface PixelNormalizer {
  backgroundPercentile: number;
  peakPercentile: number;
  colorMapName: string;
  stretchMode: StretchMode;
  inverted: boolean;
}

// export function createPixelNormalizer(backgroundLevel: number, peakLevel: number, colorMap: ColorMap, stretchMode: StretchMode) : PixelNormalizer {
//   return {

//   }
// }

export function normalize(pixels: PixelType, hist: ImageHist, normalizer: PixelNormalizer, result: Uint32Array) {
  let stretchMode = normalizer.stretchMode;
  let colorMapLookup = COLOR_MAPS[normalizer.colorMapName].lookup;

  let levels = calcLevels(hist, normalizer.backgroundPercentile, normalizer.peakPercentile);
  let backgroundLevel = levels.backgroundLevel;
  let peakLevel = levels.peakLevel;

  if (normalizer.inverted) {
    backgroundLevel = levels.peakLevel;
    peakLevel = levels.backgroundLevel;
  }

  let stretchFn: (x: number) => number;
  switch (+stretchMode) {
    case StretchMode.ArcSinh: {
      stretchFn = function (x: number) {
        return Math.asinh(10.0 * x) / 3.0;
      };
      // console.log('ArcSinh');
      break;
    }

    case StretchMode.Log: {
      stretchFn = function (x: number) {
        return Math.log10(1000.0 * x + 1) / Math.log10(1000.0);
      };
      // console.log('Log');
      break;
    }

    case StretchMode.SquareRoot: {
      stretchFn = function (x: number) {
        return Math.sqrt(x);
      };
      // console.log('SquareRoot');
      break;
    }

    default: {
      stretchFn = function (x: number) {
        return x;
      }; //linear
      // console.log('Linear');
      break;
    }
  }

  // console.log(stretchFn);

  let normalizationScaler = 65535.0 / (peakLevel - backgroundLevel);
  let invert;
  if ((invert = backgroundLevel > peakLevel)) {
    //swap values
    peakLevel = [backgroundLevel, (backgroundLevel = peakLevel)][0];
  }
  let normalizationRange = peakLevel - backgroundLevel;
  let maxColorIndex = colorMapLookup.length - 1;
  let colorIndexScaler = maxColorIndex / 65535.0;
  let dataLength = pixels.length;
  let i = dataLength;
  //while(i--) {
  for (let i = 0; i < dataLength; i++) {
    let norm = stretchFn(Math.min(1.0, Math.max(0.0, (pixels[i] - backgroundLevel) / normalizationRange))) * 65535.0;
    norm = norm > 65535.0 ? 65535.0 : norm;
    norm = norm < 0 ? 0 : norm;
    let colorIndex = norm * colorIndexScaler;
    if (invert) colorIndex = colorMapLookup.length - 1 - colorIndex;
    result[i] = colorMapLookup[Math.floor(colorIndex)];
    // let color = colorMapLookup[Math.floor(colorIndex)];
    // let r = (color >> 16) & 0xff;
    // let g = (color >> 8) & 0xff;
    // let b = (color >> 0) & 0xff;
  }
}
