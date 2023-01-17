export interface ImageHistogram {
  loaded: boolean;
  loading: boolean;
  initialized: boolean;
  data: Float32Array;
  minBin: number;
  maxBin: number;

  // upperPercentile: number;
  // lowerPercentile: number;
  // peakLevel?: number;
  // backgroundLevel?: number;

  // get peakLevel() {
  //   hist.update();
  //   return hist.cachedLevels.peakLevel;
  // }

  // get backgroundLevel() {
  //   hist.update();
  //   return hist.cachedLevels.backgroundLevel;
  // }

  // get countsPerBin() {
  //   return hist.numBins == 0 ? 0 : (hist.maxBin - hist.minBin) / hist.numBins;
  // }

  // get numBins() {
  //   return hist.data.length;
  // }

  // public findBin(value: number) {
  // return Math.max(0, Math.min(hist.numBins - 1, Math.floor((value - hist.minBin) / hist.countsPerBin)));
  // }

  // public getValue(index: number) {
  // return hist.data[index];
  // }

  // public getBinLeft(index: number) {
  // return hist.minBin + index * hist.countsPerBin;
  // }

  // public getBinRight(index: number) {
  // return hist.getBinLeft(index + 1);
  // }

  // public getBinCenter(index: number) {
  //   return (hist.getBinLeft(index) + hist.getBinRight(index)) / 2.0;
  // }

  // private update() {
  //   let cacheValid = hist.initialized &&
  //     Object.keys(hist.cachedState).every(key => {
  //       return hist.cachedState[key] == hist[key];
  //     });

  //   let total = 0;
  //   for (let i = 0; i < hist.data.length; i++) {
  //     total += hist.data[i];
  //   }

  //   let marchSum = 0;
  //   let minPixCount = (hist.lowerPercentile / 100.0) * total;
  //   let maxPixCount = (hist.upperPercentile / 100.0) * total;

  //   let blackComplete = false;
  //   let whiteComplete = false;
  //   for (let i = 0; i < hist.data.length; i++) {
  //     marchSum += hist.data[i];
  //     if (!whiteComplete && marchSum > maxPixCount) {
  //       hist.cachedLevels.peakLevel = hist.getBinCenter(i);
  //       if (blackComplete) {
  //         break;
  //       }
  //       whiteComplete = true;
  //     }
  //     if (!blackComplete && marchSum > minPixCount) {
  //       hist.cachedLevels.backgroundLevel = hist.getBinCenter(i);
  //       if (whiteComplete) {
  //         break;
  //       }
  //       blackComplete = true;
  //     }
  //   }
  //   Object.keys(hist.cachedState).forEach(key => {
  //     hist.cachedState[key] = hist[key];
  //   });
  //   hist.initialized = true;
  // }
}

export function getNumBins(hist: ImageHistogram) {
  return hist.data ? hist.data.length : 0;
}

export function getCountsPerBin(hist: ImageHistogram) {
  return getNumBins(hist) == 0 ? 0 : (hist.maxBin - hist.minBin) / getNumBins(hist);
}

export function getBinLeft(hist: ImageHistogram, index: number) {
  return hist.minBin + index * getCountsPerBin(hist);
}

export function getBinRight(hist: ImageHistogram, index: number) {
  return getBinLeft(hist, index + 1);
}

export function getBinCenter(hist: ImageHistogram, index: number) {
  return (getBinLeft(hist, index) + getBinRight(hist, index)) / 2.0;
}

export function calcLevels(
  hist: ImageHistogram,
  backgroundPercentile: number = 10,
  midPercentile: number = 50,
  peakPercentile: number = 99,
  round: boolean = false
) {
  let result = {
    peakLevel: 0,
    midLevel: 0,
    backgroundLevel: 0,
  };

  if (hist.data.length == 0) return result;

  let total = 0;
  for (let i = 0; i < hist.data.length; i++) {
    total += hist.data[i];
  }

  let x0 = 0;
  let backgroundTarget = (backgroundPercentile / 100.0) * total;
  let midTarget = (midPercentile / 100.0) * total;
  let peakTarget = (peakPercentile / 100.0) * total;

  let backgroundComplete = false;
  let midComplete = false;
  let saturationComplete = false;

  if (backgroundPercentile == 100) {
    backgroundComplete = true;
    result.backgroundLevel = getBinRight(hist, hist.data.length - 1);
  }
  if (midPercentile == 100) {
    midComplete = true;
    result.midLevel = getBinRight(hist, hist.data.length - 1);
  }
  if (peakPercentile == 100) {
    saturationComplete = true;
    result.peakLevel = getBinRight(hist, hist.data.length - 1);
  }

  let sum = 0;
  for (let i = 0; i < hist.data.length; i++) {
    sum += hist.data[i];
    if (!backgroundComplete && sum >= backgroundTarget) {
      result.backgroundLevel =
        ((backgroundTarget - (sum - hist.data[i])) / hist.data[i]) * (getBinRight(hist, i) - getBinLeft(hist, i)) +
        getBinLeft(hist, i);
      backgroundComplete = true;
    }
    if (!midComplete && sum >= midTarget) {
      result.midLevel =
        ((midTarget - (sum - hist.data[i])) / hist.data[i]) * (getBinRight(hist, i) - getBinLeft(hist, i)) +
        getBinLeft(hist, i);
      midComplete = true;
    }
    if (!saturationComplete && sum >= peakTarget) {
      result.peakLevel =
        ((peakTarget - (sum - hist.data[i])) / hist.data[i]) * (getBinRight(hist, i) - getBinLeft(hist, i)) +
        getBinLeft(hist, i);
      saturationComplete = true;
    }
    if (saturationComplete && backgroundComplete && midComplete) break;
  }
  if (round) {
    let roundFactor = Math.pow(
      10,
      Math.abs(Math.min(-3, Math.floor(Math.log10(result.peakLevel - result.backgroundLevel)) - 3))
    );
    result.peakLevel = Math.round(result.peakLevel * roundFactor) / roundFactor;
    result.midLevel = Math.round(result.midLevel * roundFactor) / roundFactor;
    result.backgroundLevel = Math.round(result.backgroundLevel * roundFactor) / roundFactor;
  }

  return result;
}

export function calcPercentiles(hist: ImageHistogram, backgroundLevel: number, midLevel: number, peakLevel: number) {
  let result = {
    lowerPercentile: 0,
    midPercentile: 0,
    upperPercentile: 0,
  };

  if (hist.data.length == 0) return result;

  let total = 0;
  for (let i = 0; i < hist.data.length; i++) {
    total += hist.data[i];
  }

  let y1 = 0;
  let lowerComplete = false;
  let midComplete = false;
  let upperComplete = false;
  let maxPixCount = total,
    minPixCount = 0,
    midPixCount = 0
  for (let i = 0; i < hist.data.length; i++) {
    y1 += hist.data[i];
    let x1 = getBinRight(hist, i);
    if (!upperComplete && x1 > peakLevel) {
      let x0 = getBinLeft(hist, i);
      let y0 = y1 - hist.data[i];
      let x = peakLevel;
      let y = (y0 * (x1 - x) + y1 * (x - x0)) / (x1 - x0);
      maxPixCount = y;
      if (lowerComplete && midComplete) {
        break;
      }
      upperComplete = true;
    }
    if (!midComplete && x1 > midLevel) {
      let x0 = getBinLeft(hist, i);
      let y0 = y1 - hist.data[i];
      let x = midLevel;
      let y = (y0 * (x1 - x) + y1 * (x - x0)) / (x1 - x0);
      midPixCount = y;
      if (lowerComplete && upperComplete) {
        break;
      }
      midComplete = true;
    }
    if (!lowerComplete && x1 > backgroundLevel) {
      let x0 = getBinLeft(hist, i);
      let y0 = y1 - hist.data[i];
      let x = backgroundLevel;
      let y = (y0 * (x1 - x) + y1 * (x - x0)) / (x1 - x0);
      minPixCount = y;
      if (upperComplete && midComplete) {
        break;
      }
      lowerComplete = true;
    }
  }

  result.lowerPercentile = (minPixCount / total) * 100.0;
  result.midPercentile = (midPixCount / total) * 100.0;
  result.upperPercentile = (maxPixCount / total) * 100.0;
  return result;
}
