import { ImageHdu } from "../data-files/models/data-file";
import { getBinCenter } from "../data-files/models/image-hist";
import { erf } from "./math";

export type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;

export function fitHistogram(hdu: ImageHdu, fitSources = true) {
    let hist = hdu.hist;

    let N0 = 0;
    hist.data.forEach(v => N0 += v)

    // correct for strobing effect which is caused by histogram sampling of images with discrete levels
    let y = new Float32Array(hist.data.length);
    for (let i = 1; i < hist.data.length - 1; i++) {
        let a = hist.data[i - 1];
        let b = hist.data[i];
        let c = hist.data[i + 1];
        y[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }

    let N = 0;
    y.forEach(v => N += v)


    // renormalize histogram to restore original number of pixels after median filtering
    // remove 0 bins
    let x = new Float32Array(hist.data.length)
    let index = 0;
    for (let i = 0; i < y.length; i++) {
        if (y[i] == 0) {
            continue
        }
        y[index] = y[i] * (N0 / N);
        // y[index] = y[i]
        x[index] = getBinCenter(hist, i);
        index++;
    }
    x = x.slice(0, index)
    y = y.slice(0, index);

    if (x.length == 0) {
        //no pixels left, skip median filter
        x = new Float32Array(hist.data.length);
        y = new Float32Array(hist.data.length);
        index = 0;
        for (let i = 0; i < hist.data.length; i++) {
            if (hist.data[i] == 0) {
                continue
            }
            y[index] = hist.data[i]
            x[index] = getBinCenter(hist, i);
            index++;
        }
        x = x.slice(0, index)
        y = y.slice(0, index)

    }




    // let N0 = 1;
    // let N = 1;
    // let x = new Float32Array(hist.data.length)
    // let y = new Float32Array(hist.data.length);
    // let index = 0;
    // for (let i = 0; i < hist.data.length; i++) {
    //   if (hist.data[i] == 0) {
    //     continue
    //   }
    //   y[index] = hist.data[i];
    //   x[index] = getBinCenter(hist, i);
    //   index++;
    // }
    // x = x.slice(0, index)
    // y = y.slice(0, index);



    // saveCsv(`${hdu.name}-hist.csv`, x, y)

    // extract background
    let { peak: bkgPeak, mu: bkgMu, sigma: bkgSigma, x: xBkg, y: yBkg } = fitBackground(hdu, x, y);

    let xSrc: Float32Array, ySrc: Float32Array;

    if (fitSources) {
        //subtract background
        let gaussian = (t: number) => bkgPeak * Math.exp(-0.5 * Math.pow((t - bkgMu) / bkgSigma, 2))
        xSrc = new Float32Array(x.length)
        ySrc = new Float32Array(y.length);
        let startIndex = 0;
        let firstPeakFound = false;
        index = 0;
        for (let i = 0; i < x.length - 1; i++) {
            if (x[i] <= xBkg[xBkg.length - 1]) continue;
            // if (x[i] <= bkgMu) continue;
            let yi = y[i] - gaussian(x[i]);
            if (yi <= 1) continue;

            xSrc[index] = x[i] - bkgMu
            // xSrc[index] = x[i]
            ySrc[index] = yi

            if (!firstPeakFound) {
                if (ySrc[index] >= ySrc[startIndex]) {
                    startIndex = index;
                }
                else {
                    firstPeakFound = true;
                }
            }


            index++;
        }
        xSrc = xSrc.slice(startIndex, index)
        ySrc = ySrc.slice(startIndex, index);
    }


    // saveCsv(`${hdu.name}-src.csv`, xSrc, ySrc)



    return {
        hdu: hdu,
        bkgMu: bkgMu,
        bkgSigma: bkgSigma,
        bkgPeak: bkgPeak,
        xSrc: xSrc,
        ySrc: ySrc,
        norm: (N0 / N)
    }

}


export function fitBackground(hdu: ImageHdu, x: Float32Array, y: Float32Array) {
    let index: number;
    let sigma: number, mu: number;

    while (true) {
        mu = getWeightedMode(y.length, y, x);
        index = 0;
        let xBkgDevs = new Float32Array(y.length)
        let yBkgDevs = new Float32Array(y.length);
        for (let i = 0; i < y.length; i++) {
            if (x[i] > mu) break;
            yBkgDevs[index] = y[i]
            xBkgDevs[index] = Math.abs(x[i] - mu)
            index++
        }
        xBkgDevs = xBkgDevs.slice(0, index)
        yBkgDevs = yBkgDevs.slice(0, index)
        sigma = getWeighted68th(yBkgDevs, xBkgDevs);

        let N = y.length;
        index = 0;
        let xNext = new Float32Array(x.length)
        let yNext = new Float32Array(y.length)
        for (let i = 0; i < y.length; i++) {
            let P = 1 - erf((Math.abs(x[i] - mu) / sigma) / Math.sqrt(2))
            let NP = N * P;
            if (x[i] > mu && NP < 0.5) continue
            xNext[index] = x[i]
            yNext[index] = y[i]
            index++
        }
        xNext = xNext.slice(0, index)
        yNext = yNext.slice(0, index)

        if (xNext.length == x.length) break;

        x = xNext;
        y = yNext;

    }

    let aNumerator = 0, aDenominator = 0, peak = 1;
    let gaussian = (t: number) => Math.exp(-0.5 * Math.pow((t - mu) / sigma, 2))

    //ignore possible pileup in first bin
    for (let i = 1; i < y.length; i++) {
        let g = gaussian(x[i])
        aNumerator += y[i] * g;
        aDenominator += Math.pow(g, 2);
    }
    peak = aNumerator / aDenominator;

    return { peak: peak, mu: mu, sigma: sigma, x: x, y: y }
}

function isEqual(x: number, y: number, maxRelativeError = .00000001, maxAbsoluteError = 2.2250738585072013830902327173324040642192159804623318306e-308)// .000001; .0000001;.00000001
{
    if (Math.abs(x - y) < maxAbsoluteError) {
        return true;
    }
    let relativeError = (Math.abs(y) > Math.abs(x) ? Math.abs((x - y) / y) : Math.abs((x - y) / x));
    if (relativeError <= maxRelativeError) {
        return true;
    }
    return false;
}


function getWeightedMean(trueCount: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let top = 0, bottom = 0;
    for (let i = 0; i < trueCount; i++) {
        top += w[i] * y[i];
        bottom += w[i];
    }

    return top / bottom;
}

function getWeightedMedian(trueCount: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let sumCounter = 0;
    let median = 0, totalSum = 0, runningSum = 0;
    for (let i = 0; i < trueCount; i++) {
        totalSum += w[i];
    }
    if (trueCount > 1) {
        runningSum = w[sumCounter] * .5;
        while (runningSum < .5 * totalSum) {
            sumCounter++;
            runningSum += w[sumCounter - 1] * .5 + w[sumCounter] * .5;
        }
        if (sumCounter == 0) {
            median = y[0];
        }
        else {
            median = y[sumCounter - 1] + (.5 * totalSum - (runningSum - (w[sumCounter - 1] * .5 + w[sumCounter] * .5))) / (w[sumCounter - 1] * .5 + w[sumCounter] * .5) * (y[sumCounter] - y[sumCounter - 1]);
        }
    }
    else {
        median = y[0];
    }
    return median;
}

function getWeightedMode(trueCount: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let k, lowerLimit = 0, upperLimit = trueCount - 1, lowerLimitIn = -1, upperLimitIn = -1, finalLower = -1, finalUpper = -1, size: number;
    let halfWeightSum = 0, sSum, total, minDist = 999999;
    let sVec: number[];

    while (lowerLimit != lowerLimitIn || upperLimit != upperLimitIn) {
        //std::cout<< lowerLimit << "\t" << upperLimit << "\n";
        lowerLimitIn = lowerLimit;
        upperLimitIn = upperLimit;
        size = upperLimit - lowerLimit + 1;
        minDist = 999999;
        halfWeightSum = 0;
        for (let i = lowerLimit; i < upperLimit + 1; i++) {
            halfWeightSum += w[i];
        }
        halfWeightSum *= .5;

        sVec = Array(size).fill(0)
        sSum = .5 * w[lowerLimit];
        sVec[0] = sSum;
        for (let i = lowerLimit + 1; i < lowerLimit + size; i++) {
            sSum += w[i - 1] * .5 + w[i] * .5;
            sVec[i - lowerLimit] = sSum;
        }

        for (let i = 0; i < sVec.length; i++) {
            if ((sVec[i] < halfWeightSum) || isEqual(sVec[i], halfWeightSum)) {
                total = sVec[i] + halfWeightSum;
                k = i; // was 0
                while (k < sVec.length && ((sVec[k] < total) || isEqual(sVec[k], total))) {
                    k++;
                }
                k--;
                total = Math.abs(y[k + lowerLimit] - y[i + lowerLimit]);


                if (isEqual(total, minDist)) {
                    finalLower = Math.floor(Math.min(finalLower, i + lowerLimit));
                    finalUpper = Math.floor(Math.max(finalUpper, k + lowerLimit));
                }
                else if (total < minDist) {
                    minDist = total;
                    finalLower = Math.floor(i + lowerLimit);
                    finalUpper = k + lowerLimit;
                }
            }
            if ((sVec[i] > halfWeightSum) || isEqual(sVec[i], halfWeightSum)) {
                total = sVec[i] - halfWeightSum;
                k = i; // was svec.size() - 1
                while (k > -1 && ((sVec[k] > total) || isEqual(sVec[k], total))) {
                    k--;
                }
                k++;
                total = Math.abs(y[i + lowerLimit] - y[k + lowerLimit]);


                if (isEqual(total, minDist)) {
                    finalLower = Math.floor(Math.min(finalLower, k + lowerLimit));
                    finalUpper = Math.floor(Math.max(finalUpper, i + lowerLimit));
                }
                else if (total < minDist) {
                    minDist = total;
                    finalLower = k + lowerLimit;
                    finalUpper = i + lowerLimit;
                }
            }
        }

        lowerLimit = finalLower;
        upperLimit = finalUpper;

        sVec = [];
    }

    let newValues = y.slice(lowerLimit, upperLimit + 1);
    let newWeights = w.slice(lowerLimit, upperLimit + 1);
    return getWeightedMedian(newWeights.length, newWeights, newValues);
}

function getWeightedStDev(delta: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let size = w.length;
    let top = 0, wSum = 0, wSumSq = 0, weight;
    for (let i = 0; i < size; i++) {
        weight = w[i];
        top += weight * y[i] * y[i];
        wSum += weight;
        wSumSq += weight * weight;
    }
    return Math.sqrt(top / (wSum - delta * wSumSq / wSum));
}

function swap(a: number, b: number, y: number[] | TypedArray) {
    let tmp: number;
    tmp = y[a];
    y[a] = y[b];
    y[b] = tmp;
}

function QS(left: number, right: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let i = left, j = right;
    let pivot = y[Math.floor((left + right) / 2)];

    while (i <= j) {
        while (y[i] < pivot) {
            i++;
        }
        while (y[j] > pivot) {
            j--;
        }
        if (i <= j) {
            swap(i, j, y);
            swap(i, j, w);
            i++;
            j--;
        }
    }

    if (left < j) {
        QS(left, j, w, y);
    }
    if (i < right) {
        QS(i, right, w, y);
    }
}

function sort(w: number[] | TypedArray, y: number[] | TypedArray) {
    QS(0, y.length - 1, w, y);
}

function getWeighted68th(w: number[] | TypedArray, y: number[] | TypedArray) {
    let sumCounter = 0;
    let stDev = 0, totalSum = 0, runningSum: number; //, temp = 0, weightTemp = 0;
    sort(w, y);
    for (let i = 0; i < y.length; i++) {
        totalSum += w[i];
    }
    if (y.length > 1) {
        runningSum = w[sumCounter] * .682689;
        while (runningSum < .682689 * totalSum) {
            sumCounter++;
            runningSum += w[sumCounter - 1] * .317311 + w[sumCounter] * .682689;
        }
        if (sumCounter == 0) {
            stDev = y[0];
        }
        else {
            stDev = y[sumCounter - 1] + (.682689 * totalSum - (runningSum - (w[sumCounter - 1] * .317311 + w[sumCounter] * .682689))) / (w[sumCounter - 1] * .317311 + w[sumCounter] * .682689) * (y[sumCounter] - y[sumCounter - 1]);
        }
    }
    else {
        stDev = y[0];
    }

    return stDev;
}


function binarySearch(searchUp: boolean, minimumIndex: number, toFind: number, toSearch: number[]) {
    let low: number, high: number, midPoint = 0, lowIn = -1, highIn = -1;
    if (searchUp) {
        low = minimumIndex;
        high = toSearch.length;
    }
    else {
        low = 0;
        high = minimumIndex;
    }
    while (low != lowIn || high != highIn) {
        lowIn = low;
        highIn = high;
        midPoint = Math.floor((low + (high - low) / 2.0));

        if (isEqual(toFind, toSearch[midPoint])) {
            low = midPoint;
            high = midPoint;

        }
        else if (toFind > toSearch[midPoint]) {
            low = midPoint;
        }
        else if (toFind < toSearch[midPoint]) {
            high = midPoint;
        }

    }
    if (searchUp) {
        return low;
    }
    else {
        return high;
    }
}

function getMedian(y: number[] | TypedArray) {
    let high = (Math.floor(y.length / 2));
    let low = high - 1;
    let runningSum = 0, median = 0;
    let totalSum = y.length;
    if (y.length > 1) {
        if (y.length % 2 == 0) {
            runningSum = y.length / 2.0 + .5;
        }
        else {
            runningSum = y.length / 2.0;
        }
        median = y[low] + (.5 * totalSum - runningSum + 1.0) * (y[high] - y[low]);
    }

    else {
        median = y[0];
    }
    return median;

}

function getMode(trueCount: number, y: number[]) {
    let k: number, lowerLimit = 0, upperLimit = trueCount - 1, lowerLimitIn = -1, upperLimitIn = -1, finalLower = -1, finalUpper = -1, size: number;
    let halfWeightSum = 0, sSum: number, total: number, minDist = 999999;
    let sVec: number[] = [];
    while (lowerLimit != lowerLimitIn || upperLimit != upperLimitIn) {
        lowerLimitIn = lowerLimit;
        upperLimitIn = upperLimit;
        size = upperLimit - lowerLimit + 1;
        minDist = 999999;
        halfWeightSum = 0;
        halfWeightSum = size;

        halfWeightSum *= 0.5;
        sVec = new Array(size).fill(0);
        sSum = .5;
        sVec[0] = sSum;
        for (let i = lowerLimit + 1; i < lowerLimit + size; i++) {
            sSum += 1;
            sVec[i - lowerLimit] = sSum;
        }
        for (let i = 0; i < sVec.length; i++) {
            if ((sVec[i] < halfWeightSum) || isEqual(sVec[i], halfWeightSum)) {
                total = sVec[i] + halfWeightSum;
                /*k = 0;
                while (k < sVec.size() && sVec[k] <= total)
                {
                k++;
                }
                k--;*/
                k = binarySearch(true, i, total, sVec);
                total = Math.abs(y[k + lowerLimit] - y[i + lowerLimit]);


                if (isEqual(total, minDist)) {
                    finalLower = Math.floor(Math.min(finalLower, i + lowerLimit));
                    finalUpper = Math.floor(Math.max(finalUpper, k + lowerLimit));
                }
                else if (total < minDist) {
                    minDist = total;
                    finalLower = Math.floor(i + lowerLimit);
                    finalUpper = k + lowerLimit;
                }
            }
            if ((sVec[i] > halfWeightSum) || isEqual(sVec[i], halfWeightSum)) {
                total = sVec[i] - halfWeightSum;
                /*k = sVec.size() - 1;
                while (k > -1 && sVec[k] >= total)
                {
                k--;
                }
                k++;*/
                k = binarySearch(false, i, total, sVec);

                total = Math.abs(y[i + lowerLimit] - y[k + lowerLimit]);

                if (isEqual(total, minDist)) {
                    finalLower = Math.floor(Math.min(finalLower, k + lowerLimit));
                    finalUpper = Math.floor(Math.max(finalUpper, i + lowerLimit));
                }
                else if (total < minDist) {
                    minDist = total;
                    finalLower = k + lowerLimit;
                    finalUpper = Math.floor(i + lowerLimit);
                }

            }
        }
        lowerLimit = finalLower;
        upperLimit = finalUpper;
        sVec = []
    }
    let newValues = y.slice(lowerLimit, upperLimit + 1);
    return getMedian(newValues);
}

function get68th(y: number[]) {
    let sumCounter = 0;
    let stDev = 0, totalSum = 0, runningSum: number; //, temp = 0, weightTemp = 0;
    y = y.sort();
    for (let i = 0; i < y.length; i++) {
        totalSum += 1.0;
    }
    if (y.length > 1) {
        runningSum = 1.0 * .682689;
        while (runningSum < .682689 * totalSum) {
            sumCounter++;
            runningSum += 1.0 * .317311 + 1.0 * .682689;
        }
        if (sumCounter == 0) {
            stDev = y[0];
        }
        else {
            stDev = y[sumCounter - 1] + (.682689 * totalSum - (runningSum - (1.0 * .317311 + 1.0 * .682689))) / (1.0 * .317311 + 1.0 * .682689) * (y[sumCounter] - y[sumCounter - 1]);
        }
    }
    else {
        stDev = y[0];
    }

    return stDev;

}