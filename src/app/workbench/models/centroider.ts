import { Ellipse } from 'src/app/utils/ellipse-fitter';
import { getWidth, getHeight, ImageLayer, PixelType } from '../../data-files/models/data-file';
import { getPixel, IImageData } from '../../data-files/models/image-data';
import { CentroidSettings, defaults as defaultCentroidSettings } from './centroid-settings';
import { getMedian as getRcrMedian, get68th as getRcr68th, getWeighted68th, getWeightedMedian } from 'src/app/utils/histogram-fitting';
import { saveAs } from 'file-saver/dist/FileSaver';

function getMedian(data: Array<number>, sort = true) {
  if (sort) data.sort((a, b) => a - b);
  let lowMiddle = Math.floor((data.length - 1) / 2);
  let highMiddle = Math.ceil((data.length - 1) / 2);
  return (data[lowMiddle] + data[highMiddle]) / 2;
}

export function centroidDisk(
  imageData: IImageData<PixelType>,
  x: number,
  y: number,
  settings: CentroidSettings = null
) {
  if (settings == null) settings = { ...defaultCentroidSettings }
  let subWidth = settings.diskSearchBoxWidth;
  let nIter = 0;
  let x0 = x;
  let y0 = y;
  let failedResult = { x: x0, y: y0, xErr: null, yErr: null };

  let points: { x: number, y: number, value: number }[];

  while (true) {
    if (isNaN(x0) || isNaN(y0)) return failedResult;
    let recenterSub = false;
    let expandSub = false;

    let sub = getSubframe(subWidth, imageData, x0, y0);
    let pixels = sub.pixels;
    let pixelsSorted = pixels.slice().sort((a, b) => a - b);

    let pixelsD: number[] = [];
    let clipCount = sub.cnx;
    for (let i = clipCount; i < pixels.length - clipCount; i++) {
      pixelsD.push(pixelsSorted[i + 1] - pixelsSorted[i])
    }
    let pixelsDFiltered = [];
    for (let i = 1; i < pixelsD.length - 1; i++) {
      pixelsDFiltered.push(getMedian([pixelsD[i - 1], pixelsD[i], pixelsD[i + 1]]))
    }

    let maxIndex = pixelsDFiltered.indexOf(Math.max.apply(null, pixelsDFiltered))
    let thresh = pixelsSorted[maxIndex + 1 + clipCount];

    // let median = getMedian(pixelsSorted, false);
    // let diffsSorted = pixelsSorted.map((value) => Math.abs(value - median));
    // diffsSorted.sort((a, b) => a - b);
    // let minDiff = diffsSorted[0];
    // let maxDiff = diffsSorted[diffsSorted.length - 1];
    // if (maxDiff == minDiff) return { x: x0, y: y0, xErr: 0, yErr: 0 };

    // let diffsHist = [];
    // for (let i = 0; i < 1024; i++) diffsHist[i] = 0;
    // var indexFactor = (diffsHist.length - 1) / (maxDiff - minDiff);
    // for (let i = 0; i < diffsSorted.length; i++) {
    //   let index = Math.floor((diffsSorted[i] - minDiff) * indexFactor);
    //   diffsHist[index]++;
    // }
    // let lowerPercentile = 0.683 * diffsSorted.length;
    // let count = 0,
    //   index = 0;
    // while (true) {
    //   if (isNaN(count)) return failedResult;
    //   count += diffsHist[index];
    //   if (count >= lowerPercentile) break;
    //   index += 1;
    // }
    // let stdev = (index + 1) / indexFactor;

    // let thresh = median + 10 * stdev;


    let ocxc = sub.cxc;
    let ocyc = sub.cyc;
    let cxc = ocxc;
    let cyc = ocyc;
    let xShift = 0;
    let yShift = 0;

    while (true) {
      let L = Math.sqrt(sub.cnx * sub.cnx + sub.cny * sub.cny) / 2;
      let numSlices = 128;
      points = [];
      for (let sliceIter = 0; sliceIter < numSlices; sliceIter++) {
        let theta = sliceIter / (numSlices - 1) * Math.PI
        let samples: { x: number; y: number; value: number }[] = [];
        for (let r = -L; r < L; r++) {
          let x = r * Math.cos(theta);
          let y = r * Math.sin(theta);
          samples.push({ x: x, y: y, value: getPixel(imageData, x + x0 + cxc - ocxc, y + y0 + cyc - ocyc, true) })
        }
        let samplesFiltered: { x: number; y: number; value: number }[] = [];

        for (let i = 1; i < samples.length - 1; i++) {
          let m = getMedian([samples[i - 1].value, samples[i].value, samples[i + 1].value]);
          samplesFiltered.push({ ...samples[i], value: m < thresh ? 0 : 1 });
        }

        let left = samplesFiltered.splice(0, Math.ceil(samplesFiltered.length / 2));
        let right = samplesFiltered;
        let leftEdge = left.reverse().find(s => s.value == 0)
        let rightEdge = right.find(s => s.value == 0);

        if (!leftEdge || !rightEdge) recenterSub = true;
        if (leftEdge && !rightEdge) expandSub = true;

        if (leftEdge) {
          points.push(leftEdge)
        }

        if (rightEdge) {
          points.push(rightEdge)

        }
      }

      let xShift = 0;
      let yShift = 0;

      let el = new Ellipse();

      while (true) {
        //outlier rejection
        el.setFromPoints(points);

        let a = el.a;
        let b = el.b;
        let xe0 = el.x0;
        let ye0 = el.y0;
        let theta = el.theta;

        points.forEach(p => {
          let x = (p.x - xe0) * Math.cos(theta) + (p.y - ye0) * Math.sin(theta);
          let y = -(p.x - xe0) * Math.sin(theta) + (p.y - ye0) * Math.cos(theta);
          p.value = Math.sqrt(Math.pow(x / a, 2) + Math.pow(y / b, 2))
        })

        let values = points.map(p => p.value).sort((a, b) => (a - b));

        values.forEach(v => {
          console.log(v);
        })
        let mu = getRcrMedian(values);
        let sigma = getRcr68th(values.map(v => Math.abs(v - mu)));
        let cf = 1 + 2.2212 * Math.pow(values.length, -1.137)
        cf = 2.4;

        let nextPoints = points.filter(p => Math.abs(p.value - mu) < cf * sigma);
        if (nextPoints.length == points.length) break;

        points = nextPoints;
      }

      xShift = el.x0;
      yShift = el.y0;



      // let xSlice = [];
      // for (let i = 0; i < sub.cnx; i++) {
      //   if (i == 0 || i == sub.cnx - 1) {
      //     xSlice[i] = null;
      //   } else {
      //     let index = Math.floor(cyc) * sub.cnx + i;
      //     let value = getMedian([pixels[index - 1], pixels[index], pixels[index + 1]]);
      //     xSlice[i] = value < thresh ? 0 : 1;
      //   }
      // }

      // let ySlice = [];
      // for (let j = 0; j < sub.cny; j++) {
      //   if (j == 0 || j == sub.cny - 1) {
      //     ySlice[j] = null;
      //   } else {
      //     let index = j * sub.cnx + Math.floor(cxc);
      //     let value = getMedian([pixels[index - sub.cnx], pixels[index], pixels[index + sub.cnx]]);
      //     ySlice[j] = value < thresh ? 0 : 1;
      //   }
      // }

      // let left = xSlice.splice(0, Math.ceil(xSlice.length / 2));
      // let right = xSlice;
      // let leftEdge = left.lastIndexOf(0);
      // if (leftEdge == -1) leftEdge = 0;
      // let rightEdge = right.indexOf(0);
      // if (rightEdge == -1) rightEdge = right.length - 1;
      // rightEdge += left.length;

      // let upper = ySlice.splice(0, Math.ceil(ySlice.length / 2));
      // let lower = ySlice;
      // let upperEdge = upper.lastIndexOf(0);
      // if (upperEdge == -1) upperEdge = 0;
      // let lowerEdge = lower.indexOf(0);
      // if (lowerEdge == -1) lowerEdge = lower.length - 1;
      // lowerEdge += upper.length;

      // let xSum = 0;
      // let ySum = 0;
      // let count = 0;
      // for (let y = upperEdge; y < lowerEdge; y++) {
      //   for (let x = leftEdge; x < rightEdge; x++) {
      //     let v = pixels[y * sub.cnx + Math.floor(cxc)];
      //     if (isNaN(v) || v < thresh) continue;
      //     xSum += x;
      //     ySum += y;
      //     count++;
      //   }
      // }
      // xShift = xSum / count - cxc;
      // yShift = ySum / count - cyc;

      // xShift = (leftEdge + rightEdge) / 2 - cxc;
      // yShift = (upperEdge + lowerEdge) / 2 - cyc;
      if (isNaN(xShift) || isNaN(yShift)) return failedResult;

      cxc += xShift;
      cyc += yShift;
      nIter++;


      // if (upperEdge == 0 || lowerEdge == subWidth - 1) recenterSub = true;
      // if (upperEdge == 0 && lowerEdge == subWidth - 1) expandSub = true;

      if (
        recenterSub ||
        nIter >= settings.maxIterations ||
        (Math.abs(xShift) < settings.maxCenterShift && Math.abs(yShift) < settings.maxCenterShift)
      ) {
        break;
      }
    }



    x0 += cxc - ocxc;
    y0 += cyc - ocyc;

    if (expandSub) subWidth *= 1.5;

    if (nIter >= settings.maxIterations || !recenterSub) break;
  }

  console.log("ITERATIONS: ", nIter);

  // const rows = points.map(p => [p.x, p.y, p.value]);
  // var blob = new Blob([rows.map(e => e.join(",")).join("\n")], { type: 'data:text/csv;charset=utf-8,' });
  // saveAs(blob, `download.csv`);

  return { x: x0 + .5, y: y0 + .5, xErr: null, yErr: null };
}



export function centroidPsf(
  imageData: IImageData<PixelType>,
  x: number,
  y: number,
  settings: CentroidSettings = null
) {
  if (settings == null) settings = { ...defaultCentroidSettings }
  //let oxinit: number;            // initial output x center
  //let oyinit: number;            // initial output y center
  let xcenter: number; // computed x center
  let ycenter: number; // computed y center
  let oxcenter: number; // computed output x center
  let oycenter: number; // computed output y center
  let xshift: number; // total x shift
  let yshift: number; // total y shift
  //let apxshift: number;           // total x shift
  //let apyshift: number;            // total y shift
  //let oxshift: number;       //total output x shift
  //let oyshift: number;       // total output y shift
  let xerr: number; // x error
  let yerr: number; // y error

  let cxc: number; // X center of subraster
  let cyc: number; // Y center of subraster
  let cnx: number; // X dimension of subraster
  let cny: number; // Y dimension of subraster

  let ox = x;
  let oy = y;

  let datamin: number;
  let datamax: number;

  let niter = 0;
  //bool low_signal_to_noise: number

  let failedResult = { x: x, y: y, xErr: null, yErr: null };
  while (true) {
    if (isNaN(ox) || isNaN(oy)) return failedResult;

    let subframeResult = getSubframe(settings.centeringBoxWidth, imageData, ox, oy);
    if (!subframeResult) return failedResult;

    cxc = subframeResult.cxc;
    cyc = subframeResult.cyc;
    cnx = subframeResult.cnx;
    cny = subframeResult.cny;
    let pixels = subframeResult.pixels;

    let dataMin = Math.min(...pixels);

    // Apply threshold and check for positive or negative features.
    //thresholding is not implemented yet
    //however, in IRAF file apfitcen.x, the minimum value in the subframe is subtracted from all subFrame pixels
    //call asubkr (Memr[AP_CTRPIX(ctr)], datamin + cthreshold, Memr[AP_CTRPIX(ctr)], AP_CNX(ctr) * AP_CNY(ctr))
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] -= dataMin;
    }

    //test signal to noise ratio
    /*printf("s/n: %f\n",GetSignalToNoise(subframe));*/
    /*if(GetSignalToNoise(subframe) < centroider.minSignalToNoise) {
        low_signal_to_noise = true;
    }
    else {
        low_signal_to_noise = false;
    }*/

    let centroidResult = handleCentroidMethod(settings, pixels, cnx, cny);
    xcenter = centroidResult.xCenter;
    ycenter = centroidResult.yCenter;
    xerr = centroidResult.xErr;
    yerr = centroidResult.yErr;

    //printf("CNX,CNY: (%f,%f)\n",cnx,cny);
    //printf("center: (%lf +/- %lf,%lf +/- %lf)\n",xcenter,xerr,ycenter,yerr);

    // Confine the next x and y center to the data box
    xcenter = Math.max(0.5, Math.min(cnx + 0.5, xcenter));
    ycenter = Math.max(0.5, Math.min(cny + 0.5, ycenter));

    xshift = xcenter - cxc;
    yshift = ycenter - cyc;

    xcenter = xshift + ox;
    //apxshift = xcenter - x;

    ycenter = yshift + oy;
    //apyshift = ycenter - y;

    //oxinit = xcenter - apxshift;
    //oyinit = ycenter - apyshift;
    oxcenter = xcenter;
    oycenter = ycenter;
    //oxshift = apxshift;
    //oyshift = apyshift;

    // Setup for next iteration.
    niter = niter + 1;
    ox = xcenter;
    oy = ycenter;

    //printf("niter: %d\nxshift: %lf yshift: %lf => (%lf,%lf)\n",niter,xshift,yshift,ox,oy);
    if (
      niter > settings.maxIterations ||
      (Math.abs(xshift) < settings.maxCenterShift && Math.abs(yshift) < settings.maxCenterShift)
    ) {
      break;
    }

    //system("pause");
  }
  return { x: oxcenter, y: oycenter, xErr: xerr, yErr: yerr };
}

function getSubframe(size: number, imageData: IImageData<PixelType>, x: number, y: number) {
  // convert to zero-based indexing
  x -= 1;
  y -= 1;

  let halfCenteringBoxWidth = (size - 1) / 2.0;
  let ncols = imageData.width;
  let nlines = imageData.height;

  let xc1 = Math.floor(x - halfCenteringBoxWidth);
  let xc2 = Math.floor(x + halfCenteringBoxWidth);
  let xl1 = Math.floor(y - halfCenteringBoxWidth);
  let xl2 = Math.floor(y + halfCenteringBoxWidth);

  if (xc1 >= ncols || xc2 < 0.0 || xl1 >= nlines || xl2 < 0.0) {
    return null;
  }

  // Get column and line limits, dimensions and center of subraster.
  let c1 = Math.max(0.0, Math.min(ncols - 1, xc1));
  let c2 = Math.max(0.0, Math.min(ncols - 1, xc2));
  let l1 = Math.max(0.0, Math.min(nlines - 1, xl1));
  let l2 = Math.max(0.0, Math.min(nlines - 1, xl2));

  let cnx = c2 - c1 + 1;
  let cny = l2 - l1 + 1;
  let cxc = x - c1;
  let cyc = y - l1;

  let result = Array(cnx * cny);

  for (let j = l1; j <= l2; j++) {
    for (let i = c1; i <= c2; i++) {
      let index = (j - l1) * cnx + (i - c1);
      //convert to ones-based indexing
      result[index] = getPixel(imageData, i + 1, j + 1);
      //printf("(%d,%d): %f\n",i,j,image.pixel(i,j));
    }
  }

  return { cxc: cxc, cyc: cyc, cnx: cnx, cny: cny, pixels: result };
}

function handleCentroidMethod(settings: CentroidSettings, subframe: Array<number>, width: number, height: number) {
  let md = getMarginalDistributions(settings, subframe, width, height);
  let xm = md.xm;
  let ym = md.ym;

  for (let i = 0; i < xm.length; i++) {
    xm[i] = xm[i] / height;
    //printf("xm[%d] = %f\n",i,xm[i]);
  }
  for (let i = 0; i < ym.length; i++) {
    ym[i] = ym[i] / width;
    //printf("ym[%d] = %f\n",i,ym[i]);
  }

  let xResult = centroidAlgorithm(settings, xm);
  let yResult = centroidAlgorithm(settings, ym);
  return { xCenter: xResult.center, xErr: xResult.error, yCenter: yResult.center, yErr: yResult.error };
}

function centroidAlgorithm(settings: CentroidSettings, marg: Array<number>) {
  let sum = 0.0;
  for (let i = 0; i < marg.length; i++) {
    sum += marg[i];
  }

  let mean = sum / marg.length;
  let npos = 0;
  let sumi = 0.0;
  let sumix = 0.0;
  let sumix2 = 0.0;

  // Accumulate the sums.
  for (let i = 0; i < marg.length; i++) {
    let val = marg[i] - mean;
    if (val > 0.0) {
      npos = npos + 1;
      sumi = sumi + val;
      //printf("sumix (%f) +- val (%f) * i (%d)\n",sumix,val,(i+1));
      sumix = sumix + val * (i + 1);
      sumix2 = sumix2 + val * Math.pow(i + 1, 2.0);
    }
  }

  //printf("sumi: %lf\nsumix: %lf\nsumix2: %lf\n",sumi,sumix,sumix2);

  // Compute the position and the error.
  let center;
  let error;
  if (npos <= 0) {
    center = (1.0 + marg.length) / 2.0;
    error = -1.0;
  } else {
    center = sumix / sumi;
    error = sumix2 / sumi - center * center;
    if (error <= 0.0) {
      error = 0.0;
    } else {
      error = Math.sqrt(error / ((sumi + mean * marg.length) * settings.gain));
      if (error > marg.length) {
        error = -1.0;
      }
    }
  }

  //correct for 0 based array vs. 1 based array
  center = center - 1.0;

  return { center: center, error: error };
}

// function getSignalToNoise(subframe)
// {
//     Stats<PixelType> stats = Stats<PixelType>(subframe);
//     let signal, noise;
//     if(centroider.noiseModel == POISSON) {
//         signal = stats.total();
//         noise = sqrt (fabs (signal / centroider.gain));

//         if(signal <= 0.0) {
//             return 0.0;
//         }
//         else if(noise <= 0.0) {
//             return DBL_MAX;
//         }

//         return signal/noise;
//     }
//     else if(centroider.noiseModel == CONSTANT) {
//         return 0.0;
//     }

//     return 0.0;
// }

function getMarginalDistributions(
  settings: CentroidSettings,
  subframe: Array<number>,
  width: number,
  height: number
) {
  let xm = new Array(width);
  let ym = new Array(height);
  //printf("Marginal Dist\n");

  // Compute the x marginal.
  for (let i = 0; i < width; i++) {
    let sum = 0.0;
    for (let j = 0; j < height; j++) {
      let index = j * width + i;
      sum = sum + subframe[index];
    }
    xm[i] = sum;
    //printf("xm[%d]: %f\n",i,xm[i]);
  }

  // Compute the y marginal.
  for (let j = 0; j < height; j++) {
    let sum = 0.0;
    for (let i = 0; i < width; i++) {
      let index = j * width + i;
      sum = sum + subframe[index];
    }
    ym[j] = sum;
    //printf("ym[%d]: %f\n",j,ym[j]);
  }

  return { xm: xm, ym: ym };
}
