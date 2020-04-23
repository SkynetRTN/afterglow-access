import { ImageFile, getWidth, getHeight, getPixel } from '../../data-files/models/data-file'

export interface DiskCentroiderSettings {
  maxIterations: number,
  maxCenterShift: number,
  diskSearchBoxWidth: number;
}

export function createDiskCentroiderSettings(): DiskCentroiderSettings {
  return {
    maxIterations: 10,
    maxCenterShift: 0.2,
    diskSearchBoxWidth: 200,
  }
}

function getMedian(data: Array<number>) {
  data.sort((a, b) => a - b);
  let lowMiddle = Math.floor((data.length - 1) / 2);
  let highMiddle = Math.ceil((data.length - 1) / 2);
  return (data[lowMiddle] + data[highMiddle]) / 2;
}


export function centroidDisk(imageFile: ImageFile, x: number, y: number, settings: DiskCentroiderSettings = null) {
  if (settings == null) settings = createDiskCentroiderSettings();
  let subWidth = settings.diskSearchBoxWidth;
  let nIter = 0;
  let x0 = x;
  let y0 = y;

  while (true) {
    let recenterSub = false;
    let expandSub = false;

    let sub = getSubframe(subWidth, imageFile, x0, y0);
    let pixels = sub.pixels;
    let pixelsSorted = pixels.slice();
    let median = getMedian(pixelsSorted);
    let diffsSorted = pixelsSorted.map(value => value - median);
    let minDiff = diffsSorted[0];
    let maxDiff = diffsSorted[diffsSorted.length - 1];
    if (maxDiff == minDiff) return { x: x0, y: y0, xErr: 0, yErr: 0 };

    let diffsHist = [];
    for (let i = 0; i < 1024; i++) diffsHist[i] = 0;
    var indexFactor = (diffsHist.length - 1) / (maxDiff - minDiff);
    for (let i = 0; i < diffsSorted.length; i++) {
      let index = Math.floor((diffsSorted[i] - minDiff) * indexFactor);
      diffsHist[index]++;
    }
    let lowerPercentile = 0.683 * diffsSorted.length;
    let count = 0, index = 0;
    while (true) {
      count += diffsHist[index];
      if (count >= lowerPercentile) break;
      index += 1;
    }
    let stdev = (index + 1) / indexFactor;

    // let avg = pixels.reduce( (sum, value) => sum + value, 0)/pixels.length;
    // let diffs = pixels.map(value => value-avg)
    // let sqrDiffs = pixels.map(value => Math.pow(value-avg, 2))
    // console.log('old stdev:', Math.sqrt(sqrDiffs.reduce( (sum, value) => sum + value, 0)/sqrDiffs.length));
    // console.log('new stdev:', stdev);


    let thresh = median + 3.0 * stdev;
    let ocxc = sub.cxc;
    let ocyc = sub.cyc;
    let cxc = ocxc;
    let cyc = ocyc;
    let xShift = 0;
    let yShift = 0;
    while (true) {


      let xSlice = [];
      for (let i = 0; i < sub.cnx; i++) {

        if (i == 0 || i == sub.cnx - 1) {
          xSlice[i] = null;
        }
        else {
          let index = Math.floor(cyc) * sub.cnx + i;
          let value = getMedian([pixels[index - 1], pixels[index], pixels[index + 1]]);
          xSlice[i] = (value < thresh) ? 0 : 1;
        }
      }

      let ySlice = [];
      for (let j = 0; j < sub.cny; j++) {
        if (j == 0 || j == sub.cny - 1) {
          ySlice[j] = null;
        }
        else {
          let index = j * sub.cnx + Math.floor(cxc);
          let value = getMedian([pixels[index - sub.cnx], pixels[index], pixels[index + sub.cnx]]);
          ySlice[j] = (value < thresh) ? 0 : 1;
        }

      }

      let left = xSlice.splice(0, Math.ceil(xSlice.length / 2));
      let right = xSlice;
      let leftEdge = left.lastIndexOf(0);
      if (leftEdge == -1) leftEdge = 0;
      let rightEdge = right.indexOf(0);
      if (rightEdge == -1) rightEdge = right.length - 1;
      rightEdge += left.length;

      let upper = ySlice.splice(0, Math.ceil(ySlice.length / 2));
      let lower = ySlice;
      let upperEdge = upper.lastIndexOf(0);
      if (upperEdge == -1) upperEdge = 0;
      let lowerEdge = lower.indexOf(0);
      if (lowerEdge == -1) lowerEdge = lower.length - 1;
      lowerEdge += upper.length;

      xShift = (leftEdge + rightEdge) / 2 - cxc;
      yShift = (upperEdge + lowerEdge) / 2 - cyc;
      cxc += xShift;
      cyc += yShift;
      nIter++;

      if ((leftEdge == 0) || (rightEdge == subWidth - 1)) recenterSub = true;
      if ((leftEdge == 0) && (rightEdge == subWidth - 1)) expandSub = true;
      if ((upperEdge == 0) || (lowerEdge == subWidth - 1)) recenterSub = true;
      if ((upperEdge == 0) && (lowerEdge == subWidth - 1)) expandSub = true;

      if (recenterSub || nIter >= settings.maxIterations || (Math.abs(xShift) < settings.maxCenterShift && Math.abs(yShift) < settings.maxCenterShift)) {
        break;
      }
    }

    x0 += (cxc - ocxc);
    y0 += (cyc - ocyc);

    if (expandSub) subWidth *= 1.5;

    if (nIter >= settings.maxIterations || !recenterSub) break;
  }

  return { x: x0, y: y0, xErr: null, yErr: null };

}

export enum CentroidNoiseModel {
  POISSON,
  CONSTANT
}

export interface PsfCentroiderSettings {
  centeringBoxWidth: number;
  minSignalToNoise: number;
  maxIterations: number;
  maxCenterShift: number;
  noiseModel: CentroidNoiseModel;
  gain: number;
}

export function createPsfCentroiderSettings(): PsfCentroiderSettings {
  return {
    centeringBoxWidth: 5,
    minSignalToNoise: 1.0,
    maxIterations: 10,
    maxCenterShift: 0.2,
    noiseModel: CentroidNoiseModel.POISSON,
    gain: 10.0
  }
}


export function centroidPsf(imageFile: ImageFile, x: number, y: number, settings: PsfCentroiderSettings = null) {
  if (settings == null) settings = createPsfCentroiderSettings();
  //let oxinit: number;            // initial output x center
  //let oyinit: number;            // initial output y center
  let xcenter: number;        // computed x center
  let ycenter: number;        // computed y center
  let oxcenter: number;        // computed output x center
  let oycenter: number;        // computed output y center
  let xshift: number;           // total x shift
  let yshift: number;            // total y shift
  //let apxshift: number;           // total x shift
  //let apyshift: number;            // total y shift
  //let oxshift: number;       //total output x shift
  //let oyshift: number;       // total output y shift
  let xerr: number;           // x error
  let yerr: number;           // y error

  let cxc: number;           // X center of subraster
  let cyc: number;           // Y center of subraster
  let cnx: number;           // X dimension of subraster
  let cny: number;          // Y dimension of subraster


  let ox = x;
  let oy = y;

  let datamin: number;
  let datamax: number;

  let niter = 0;
  //bool low_signal_to_noise: number
  while (true) {
    let subframeResult = getSubframe(settings.centeringBoxWidth, imageFile, ox, oy);
    cxc = subframeResult.cxc
    cyc = subframeResult.cyc
    cnx = subframeResult.cnx
    cny = subframeResult.cny
    let pixels = subframeResult.pixels

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
    xerr = centroidResult.xErr
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
    if (niter > settings.maxIterations || (Math.abs(xshift) < settings.maxCenterShift && Math.abs(yshift) < settings.maxCenterShift)) {
      break;
    }



    //system("pause");
  }
  return { x: oxcenter, y: oycenter, xErr: xerr, yErr: yerr };

}

function getSubframe(size: number, imageFile: ImageFile, x: number, y: number) {
  // convert to zero-based indexing
  x -= 1;
  y -= 1;

  let halfCenteringBoxWidth = (size-1) / 2.0;
  let ncols = getWidth(imageFile);
  let nlines = getHeight(imageFile);

  let xc1 = Math.floor(x - halfCenteringBoxWidth);
  let xc2 = Math.floor(x + halfCenteringBoxWidth);
  let xl1 = Math.floor(y - halfCenteringBoxWidth);
  let xl2 = Math.floor(y + halfCenteringBoxWidth);

  if (xc1 >= ncols || xc2 < 0.0 || xl1 >= nlines || xl2 < 0.0) {
    throw new Error('centering box does not intersect image');
  }

  // Get column and line limits, dimensions and center of subraster.
  let c1 = Math.max(0.0, Math.min(ncols - 1, xc1));
  let c2 = Math.max(0.0, Math.min(ncols - 1, xc2));
  let l1 = Math.max(0.0, Math.min(nlines - 1, xl1));
  let l2 = Math.max(0.0, Math.min(nlines - 1, xl2));

  let cnx = (c2 - c1) + 1;
  let cny = (l2 - l1) + 1;
  let cxc = x - c1;
  let cyc = y - l1;

  let result = Array(cnx * cny);

  for (let j = l1; j <= l2; j++) {
    for (let i = c1; i <= c2; i++) {
      let index = (j - l1) * cnx + (i - c1);
      //convert to ones-based indexing
      result[index] = getPixel(imageFile, i+1, j+1);
      //printf("(%d,%d): %f\n",i,j,image.pixel(i,j));
    }
  }

  return { cxc: cxc, cyc: cyc, cnx: cnx, cny: cny, pixels: result }
}

function handleCentroidMethod(settings: PsfCentroiderSettings, subframe: Array<number>, width: number, height: number) {
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

function centroidAlgorithm(settings: PsfCentroiderSettings, marg: Array<number>) {
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
    let val = (marg[i] - mean);
    if (val > 0.0) {
      npos = npos + 1;
      sumi = sumi + val;
      //printf("sumix (%f) +- val (%f) * i (%d)\n",sumix,val,(i+1));
      sumix = sumix + val * (i + 1);
      sumix2 = sumix2 + val * Math.pow((i + 1), 2.0);
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
    error = (sumix2 / sumi - center * center);
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

  return { center: center, error: error }

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

function getMarginalDistributions(settings: PsfCentroiderSettings, subframe: Array<number>, width: number, height: number) {
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
      sum = sum + subframe[index]
    }
    ym[j] = sum;
    //printf("ym[%d]: %f\n",j,ym[j]);
  }

  return { xm: xm, ym: ym };
}