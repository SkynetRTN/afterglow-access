export interface ImageHist {
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
  return hist.data.length;
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
  upperPercentile: number = 98) : {backgroundLevel: number, peakLevel: number} {

  let total = 0;
  for (let i = 0; i < hist.data.length; i++) {
    total += hist.data[i];
  }

  let marchSum = 0;
  let minPixCount = (lowerPercentile / 100.0) * total;
  let maxPixCount = (upperPercentile / 100.0) * total;

  let blackComplete = false;
  let whiteComplete = false;
  let peakLevel, backgroundLevel;
  for (let i = 0; i < hist.data.length; i++) {
    marchSum += hist.data[i];
    if (!whiteComplete && marchSum > maxPixCount) {
      peakLevel = getBinCenter(hist, i);
      if (blackComplete) {
        break;
      }
      whiteComplete = true;
    }
    if (!blackComplete && marchSum > minPixCount) {
      backgroundLevel = getBinCenter(hist, i);
      if (whiteComplete) {
        break;
      }
      blackComplete = true;
    }
  }
  return {backgroundLevel: backgroundLevel, peakLevel: peakLevel};
}

