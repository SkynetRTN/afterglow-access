export interface ImageHist {
  loaded: boolean;
  loading: boolean;
  initialized: boolean;
  data: Uint32Array;
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

export function getNumBins(hist: ImageHist) {
  return hist.data ? hist.data.length : 0;
}

export function getCountsPerBin(hist: ImageHist) {
  return getNumBins(hist) == 0 ? 0 : (hist.maxBin - hist.minBin) / getNumBins(hist);
}

export function getBinLeft(hist: ImageHist, index: number) {
  return hist.minBin + index * getCountsPerBin(hist);
}

export function getBinRight(hist: ImageHist, index: number) {
  return getBinLeft(hist, index + 1);
}

export function getBinCenter(hist: ImageHist, index: number) {
  return (getBinLeft(hist, index) + getBinRight(hist, index)) / 2.0;
}

export function calcLevels(
  hist: ImageHist,
  lowerPercentile: number = 10,
  upperPercentile: number = 99,
  round: boolean = false
) {
  let result = {
    peakLevel: 0,
    backgroundLevel: 0,
  };

  if (hist.data.length == 0) return result;

  let total = 0;
  for (let i = 0; i < hist.data.length; i++) {
    total += hist.data[i];
  }

  let x0 = 0;
  let backgroundTarget = (lowerPercentile / 100.0) * total;
  let peakTarget = (upperPercentile / 100.0) * total;

  let blackComplete = false;
  let whiteComplete = false;

  if (lowerPercentile == 100) {
    blackComplete = true;
    result.backgroundLevel = getBinRight(hist, hist.data.length - 1);
  }
  if (upperPercentile == 100) {
    whiteComplete = true;
    result.peakLevel = getBinRight(hist, hist.data.length - 1);
  }

  let sum = 0;
  for (let i = 0; i < hist.data.length; i++) {
    sum += hist.data[i];
    if (!blackComplete && sum >= backgroundTarget) {
      result.backgroundLevel =
        ((backgroundTarget - (sum - hist.data[i])) / hist.data[i]) * (getBinRight(hist, i) - getBinLeft(hist, i)) +
        getBinLeft(hist, i);
      blackComplete = true;
    }
    if (!whiteComplete && sum >= peakTarget) {
      result.peakLevel =
        ((peakTarget - (sum - hist.data[i])) / hist.data[i]) * (getBinRight(hist, i) - getBinLeft(hist, i)) +
        getBinLeft(hist, i);
      whiteComplete = true;
    }
    if (whiteComplete && blackComplete) break;
  }
  if (round) {
    let roundFactor = Math.pow(
      10,
      Math.abs(Math.min(-3, Math.floor(Math.log10(result.peakLevel - result.backgroundLevel)) - 3))
    );
    result.peakLevel = Math.round(result.peakLevel * roundFactor) / roundFactor;
    result.backgroundLevel = Math.round(result.backgroundLevel * roundFactor) / roundFactor;
  }

  return result;
}

export function calcPercentiles(hist: ImageHist, backgroundLevel: number, peakLevel: number) {
  let result = {
    lowerPercentile: 0,
    upperPercentile: 0,
  };

  if (hist.data.length == 0) return result;

  let total = 0;
  for (let i = 0; i < hist.data.length; i++) {
    total += hist.data[i];
  }

  let y0 = 0;
  let lowerComplete = false;
  let upperComplete = false;
  let maxPixCount: number = 0,
    minPixCount: number = 0;
  for (let i = 0; i < hist.data.length - 1; i++) {
    y0 += hist.data[i];
    let x1 = getBinCenter(hist, i + 1);
    if (!upperComplete && x1 > peakLevel) {
      let x0 = getBinCenter(hist, i);
      let y1 = y0 + hist.data[i + 1];
      let x = peakLevel;
      let y = (y0 * (x1 - x) + y1 * (x - x0)) / (x1 - x0);
      maxPixCount = y;
      if (lowerComplete) {
        break;
      }
      upperComplete = true;
    }
    if (!lowerComplete && x1 > backgroundLevel) {
      let x0 = getBinCenter(hist, i);
      let y1 = y0 + hist.data[i + 1];
      let x = backgroundLevel;
      let y = (y0 * (x1 - x) + y1 * (x - x0)) / (x1 - x0);
      minPixCount = y;
      if (upperComplete) {
        break;
      }
      lowerComplete = true;
    }
  }

  result.lowerPercentile = (minPixCount / total) * 100.0;
  result.upperPercentile = (maxPixCount / total) * 100.0;
  return result;
}
