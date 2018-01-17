import { ImageFile, getWidth, getHeight, getPixel } from '../../data-files/models/data-file'
declare let d3: any;

export enum CentroidNoiseModel {
  POISSON,
  CONSTANT
}


export interface Centroider {
  centeringBoxWidth: number;
  minSignalToNoise: number;
  maxIterations: number;
  maxCenterShift: number;
  noiseModel: CentroidNoiseModel;
  gain: number;
}

export function createCentroider(): Centroider{
  return {
    centeringBoxWidth: 5,
    minSignalToNoise: 1.0,
    maxIterations: 10,
    maxCenterShift: 0.2,
    noiseModel: CentroidNoiseModel.POISSON,
    gain: 10.0,
  }
}


export function centroidDisk(centroider: Centroider, imageFile: ImageFile, x: number, y: number) {
  
}

export function centroidPsf(centroider: Centroider, imageFile: ImageFile, x: number, y: number) {
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
    while(true) {
        let subframeResult = getSubframe(centroider, imageFile, ox, oy);
        cxc = subframeResult.cxc
        cyc = subframeResult.cyc
        cnx = subframeResult.cnx
        cny = subframeResult.cny
        let pixels = subframeResult.pixels

        console.log('subframe: ', subframeResult, subframeResult.pixels);

        let dataMin = d3.min(pixels);

        // Apply threshold and check for positive or negative features.
        //thresholding is not implemented yet
        //however, in IRAF file apfitcen.x, the minimum value in the subframe is subtracted from all subFrame pixels
        //call asubkr (Memr[AP_CTRPIX(ctr)], datamin + cthreshold, Memr[AP_CTRPIX(ctr)], AP_CNX(ctr) * AP_CNY(ctr))
        for(let i=0; i<pixels.length; i++) {
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




        let centroidResult = handleCentroidMethod(centroider, pixels, cnx, cny);
        xcenter = centroidResult.xCenter;
        ycenter = centroidResult.yCenter;
        xerr = centroidResult.xErr
        yerr = centroidResult.yErr;

        console.log('subframe center:', xcenter, ycenter);

        //printf("CNX,CNY: (%f,%f)\n",cnx,cny);
        //printf("center: (%lf +/- %lf,%lf +/- %lf)\n",xcenter,xerr,ycenter,yerr);

        // Confine the next x and y center to the data box
        xcenter = Math.max(0.5,Math.min (cnx + 0.5,xcenter));
        ycenter = Math.max (0.5, Math.min (cny + 0.5,ycenter));
        
        console.log('subframe center constrained:', xcenter, ycenter);
        
        xshift = xcenter - cxc;
        yshift = ycenter - cyc;
        console.log('shift required:', xshift, yshift);
        
        xcenter = xshift + ox;
        //apxshift = xcenter - x;
        
        ycenter = yshift + oy;
        //apyshift = ycenter - y;

        console.log('new center:', xcenter, ycenter);


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
        if(niter > centroider.maxIterations || (Math.abs(xshift) < centroider.maxCenterShift && Math.abs(yshift) < centroider.maxCenterShift)) {
          console.log("FINISHED.......", niter, niter > centroider.maxIterations, xshift, Math.abs(xshift) < centroider.maxCenterShift, yshift, Math.abs(yshift) < centroider.maxCenterShift)
            break;
        }



        //system("pause");
    }
    return {x: oxcenter, y: oycenter, xErr: xerr, yErr: yerr};
    
}

function getSubframe(centroider: Centroider, imageFile: ImageFile, x: number, y: number) {
    // Test for out of bounds pixels
    let halfCenteringBoxWidth = (centroider.centeringBoxWidth - 1.0) / 2.0;
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
    let c1 = Math.max(0.0, Math.min(ncols-1, xc1))+0.5;
    let c2 = Math.max(0.0, Math.min(ncols-1, xc2))+0.5;
    let l1 = Math.max(0.0, Math.min(nlines-1, xl1))+0.5;
    let l2 = Math.max(0.0, Math.min(nlines-1, xl2))+0.5;

    let cnx = Math.round(c2 - c1) + 1;
    let cny = Math.round(l2 - l1) + 1;
    let cxc = x - c1;
    let cyc = y - l1;

    let result = Array(cnx*cny);
    

    for(let j = l1; j <= l2; j++) {
        for(let i = c1; i <= c2; i++) {
            let index = (j-l1)*cnx+(i-c1);
            result[index] = getPixel(imageFile, i,j);
            //printf("(%d,%d): %f\n",i,j,image.pixel(i,j));
        }
    }

    return {cxc: cxc, cyc: cyc, cnx: cnx, cny: cny, pixels: result}
}

function handleCentroidMethod(centroider: Centroider, subframe: Array<number>, width: number, height: number) {
    let md = getMarginalDistributions(centroider, subframe, width, height);
    let xm = md.xm;
    let ym = md.ym;


    for(let i=0; i<xm.length; i++) {
        xm[i] = xm[i] / height;
        //printf("xm[%d] = %f\n",i,xm[i]);
    }
    for(let i=0; i<ym.length; i++) {
        ym[i] = ym[i] / width;
        //printf("ym[%d] = %f\n",i,ym[i]);
    }

    let xResult = centroidAlgorithm(centroider, xm);
    let yResult = centroidAlgorithm(centroider, ym);
    return {xCenter: xResult.center, xErr: xResult.error, yCenter: yResult.center, yErr: yResult.error};
}

function centroidAlgorithm(centroider: Centroider, marg: Array<number>) {
    let sum = 0.0;
    for (let i=0; i < marg.length; i++) {
        sum += marg[i];
    }

    let mean = sum/marg.length;
    let npos = 0;
    let sumi = 0.0;
    let sumix = 0.0;
    let sumix2 = 0.0;

    // Accumulate the sums.
    for( let i=0; i<marg.length; i++) {
        let val = (marg[i] - mean);
        if (val > 0.0) {
            npos = npos + 1;
            sumi = sumi + val;
            //printf("sumix (%f) +- val (%f) * i (%d)\n",sumix,val,(i+1));
            sumix = sumix + val * (i+1);
            sumix2 = sumix2 + val * Math.pow( (i+1) ,2.0);
        }
    }

    //printf("sumi: %lf\nsumix: %lf\nsumix2: %lf\n",sumi,sumix,sumix2);

    // Compute the position and the error.
    let center;
    let error;
    if (npos <= 0) {
        center =  (1.0 + marg.length) / 2.0;
        error = -1.0;
    } else {
        center = sumix / sumi;
        error = (sumix2 / sumi - center * center);
        if (error <= 0.0) {
            error = 0.0;
        } else {
            error = Math.sqrt (error / ((sumi + mean * marg.length) * centroider.gain));
            if (error > marg.length) {
                error = -1.0;
            }   
        }
    }

    //correct for 0 based array vs. 1 based array
    center = center - 1.0;

    return {center: center, error: error}

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

function getMarginalDistributions(centroider: Centroider, subframe: Array<number>, width: number, height: number)
{
    let xm = new Array(width);
    let ym = new Array(height);
    //printf("Marginal Dist\n");

    // Compute the x marginal.
    for(let i=0; i<width; i++) {
        let sum = 0.0;
        for(let j=0; j<height; j++) {
            let index = j*width+i;
            sum = sum + subframe[index];
        }
        xm[i] = sum;
        //printf("xm[%d]: %f\n",i,xm[i]);
    }

    // Compute the y marginal.
    for(let j=0; j<height; j++) {
        let sum = 0.0;
        for(let i=0; i<width; i++) {
            let index = j*width+i;
            sum = sum + subframe[index]
        }
        ym[j] = sum;
        //printf("ym[%d]: %f\n",j,ym[j]);
    }

    return {xm: xm, ym: ym};
}