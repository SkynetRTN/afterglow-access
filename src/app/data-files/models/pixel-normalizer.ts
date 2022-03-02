import { StretchMode } from './stretch-mode';
import { ColorMap, COLOR_MAPS, coolColorMap, redColorMap } from './color-map';
import { ImageHist, calcLevels } from '../../data-files/models/image-hist';
import { PixelType } from '../../data-files/models/data-file';

export interface PixelNormalizer {
  mode: 'percentile' | 'pixel';
  backgroundPercentile: number;
  peakPercentile: number;
  backgroundLevel?: number;
  peakLevel?: number;
  colorMapName: string;
  stretchMode: StretchMode;
  inverted: boolean;
  balance: number;
}

// export function createPixelNormalizer(backgroundLevel: number, peakLevel: number, colorMap: ColorMap, stretchMode: StretchMode) : PixelNormalizer {
//   return {

//   }
// }

export function normalize(pixels: PixelType, hist: ImageHist, normalizer: PixelNormalizer, redChannel: Uint16Array, greenChannel: Uint16Array, blueChannel: Uint16Array, composite: Uint32Array) {
  let stretchMode = normalizer.stretchMode;
  let redLookup = COLOR_MAPS[normalizer.colorMapName].redLookup;
  let greenLookup = COLOR_MAPS[normalizer.colorMapName].greenLookup;
  let blueLookup = COLOR_MAPS[normalizer.colorMapName].blueLookup;

  let backgroundLevel = normalizer.backgroundLevel;
  let peakLevel = normalizer.peakLevel;
  // if (normalizer.mode == 'percentile') {
  //   let levels = calcLevels(hist, normalizer.backgroundPercentile, normalizer.peakPercentile);
  //   backgroundLevel = levels.backgroundLevel;
  //   peakLevel = levels.peakLevel;
  // }


  if (normalizer.inverted) {
    [backgroundLevel, peakLevel] = [peakLevel, backgroundLevel]
  }

  let stretchFn: (x: number) => number;
  switch (stretchMode) {
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

  let invert;
  if ((invert = backgroundLevel > peakLevel)) {
    //swap values
    peakLevel = [backgroundLevel, (backgroundLevel = peakLevel)][0];
  }
  let normalizationRange = (peakLevel - backgroundLevel);
  let maxColorIndex = redLookup.length - 1;
  let colorIndexScaler = maxColorIndex / 65535.0;
  let dataLength = pixels.length;
  let i = dataLength;
  //while(i--) {
  let compositeBitScaler = (255 / 65535)
  for (let i = 0; i < dataLength; i++) {
    let norm = stretchFn(Math.min(1.0, Math.max(0.0, (pixels[i] - backgroundLevel) / normalizationRange))) * 65535.0;
    norm = norm > 65535.0 ? 65535.0 : norm;
    norm = norm < 0 ? 0 : norm;
    let colorIndex = Math.floor(norm * colorIndexScaler);
    if (invert) colorIndex = maxColorIndex - colorIndex;

    let r = redLookup[colorIndex]
    let g = greenLookup[colorIndex]
    let b = blueLookup[colorIndex]

    let r8 = r * compositeBitScaler;
    let g8 = g * compositeBitScaler;
    let b8 = b * compositeBitScaler;

    let rgba = (255 << 24) | (b8 << 16) | (g8 << 8) | r8;

    composite[i] = rgba;
    redChannel[i] = r;
    greenChannel[i] = g;
    blueChannel[i] = b;

    // let color = colorMapLookup[Math.floor(colorIndex)];
    // let r = (color >> 16) & 0xff;
    // let g = (color >> 8) & 0xff;
    // let b = (color >> 0) & 0xff;
  }
}
