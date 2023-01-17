import { StretchMode } from './stretch-mode';
import { ColorMap, COLOR_MAPS_BY_NAME, coolColorMap, redColorMap } from './color-map';
import { ImageHistogram, calcLevels } from '../../data-files/models/image-histogram';
import { PixelType } from '../../data-files/models/data-file';

export interface PixelNormalizer {
  mode: 'percentile' | 'pixel';
  backgroundPercentile: number;
  midPercentile?: number,
  peakPercentile: number;
  backgroundLevel?: number;
  midLevel?: number,
  peakLevel?: number;
  colorMapName: string;
  stretchMode: StretchMode;
  inverted: boolean;
  layerScale: number;
  layerOffset: number;
}

// export function createPixelNormalizer(backgroundLevel: number, peakLevel: number, colorMap: ColorMap, stretchMode: StretchMode) : PixelNormalizer {
//   return {

//   }
// }

export function normalize(pixels: PixelType, hist: ImageHistogram, normalizer: PixelNormalizer, rgba: Uint32Array) {
  let stretchMode = normalizer.stretchMode;
  let redLookup = COLOR_MAPS_BY_NAME[normalizer.colorMapName].redLookup;
  let greenLookup = COLOR_MAPS_BY_NAME[normalizer.colorMapName].greenLookup;
  let blueLookup = COLOR_MAPS_BY_NAME[normalizer.colorMapName].blueLookup;

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


  let m = (normalizer.midLevel - backgroundLevel) / (peakLevel - backgroundLevel)
  let stretchFnLookup = {
    [StretchMode.MidTone]: (x: number) => {
      /**
       * https://pixinsight.com/doc/tools/HistogramTransformation/HistogramTransformation.html
       * Midtones Transfer Function MTF
       */
      return x <= 0 ? 0 : (x == m ? 0.5 : (x >= 1 ? 1 : ((m - 1) * x) / ((2 * m - 1) * x - m)))
    },
    [StretchMode.Linear]: (x: number) => {
      return x;
    },
    [StretchMode.Log]: (x: number) => {
      return Math.log10(1000.0 * x + 1) / Math.log10(1001.0);
    },
    [StretchMode.Exponential]: (x: number) => {
      return (Math.pow(10, 2 * x) - 1) / 99;
    },
    [StretchMode.SquareRoot]: (x: number) => {
      return Math.sqrt(x);
    },
    [StretchMode.Square]: (x: number) => {
      return x * x
    },
    [StretchMode.HyperbolicArcSinh]: (x: number) => {
      return Math.asinh(10.0 * x) / Math.asinh(10);
    },
    [StretchMode.HyperbolicSine]: (x: number) => {
      return Math.sinh(10.0 * x) / Math.sinh(10)
    },
    [StretchMode.HyperbolicSine]: (x: number) => {
      return Math.sinh(10.0 * x) / Math.sinh(10)
    },

  }

  let stretchFn = stretchFnLookup[normalizer.stretchMode]

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
  let compositeBitScaler = (256 / 65536)
  for (let i = 0; i < dataLength; i++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    if (!isNaN(pixels[i])) {
      let norm = stretchFn(Math.min(1.0, Math.max(0.0, ((pixels[i] * normalizer.layerScale + normalizer.layerOffset) - backgroundLevel) / normalizationRange))) * 65535.0;
      norm = norm > 65535.0 ? 65535.0 : norm;
      norm = norm < 0 ? 0 : norm;
      let colorIndex = Math.floor(norm * colorIndexScaler);
      if (invert) colorIndex = maxColorIndex - colorIndex;

      r = redLookup[colorIndex] * compositeBitScaler;
      g = greenLookup[colorIndex] * compositeBitScaler;
      b = blueLookup[colorIndex] * compositeBitScaler;
      a = 255;
    }
    let rgbaValue = (a << 24) | (b << 16) | (g << 8) | r;
    rgba[i] = rgbaValue;
  }
}
