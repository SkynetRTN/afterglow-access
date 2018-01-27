import * as math from 'mathjs';



class WcsTrig {
  private static D2R = Math.PI / 180.0;
  private static R2D = 180.0 / Math.PI;
  private static WCSTRIG_TOL = 1e-10;

  public static fmod(numerator, denominator) {
    return numerator - (Math.floor(numerator / denominator) * denominator);
  }

  public static cosdeg(angle) {
    let resid;


    resid = Math.abs(WcsTrig.fmod(angle, 360.0));
    if (resid == 0.0) {
      return 1.0;
    } else if (resid == 90.0) {
      return 0.0;
    } else if (resid == 180.0) {
      return -1.0;
    } else if (resid == 270.0) {
      return 0.0;
    }

    return Math.cos(angle * WcsTrig.D2R);
  }

  /*--------------------------------------------------------------------------*/

  public static sindeg(angle) {
    let resid;

    resid = WcsTrig.fmod(angle - 90.0, 360.0);
    if (resid == 0.0) {
      return 1.0;
    } else if (resid == 90.0) {
      return 0.0;
    } else if (resid == 180.0) {
      return -1.0;
    } else if (resid == 270.0) {
      return 0.0;
    }

    return Math.sin(angle * WcsTrig.D2R);
  }

  /*--------------------------------------------------------------------------*/

  public static tandeg(angle) {
    let resid;

    resid = WcsTrig.fmod(angle, 360.0);
    if (resid == 0.0 || Math.abs(resid) == 180.0) {
      return 0.0;
    } else if (resid == 45.0 || resid == 225.0) {
      return 1.0;
    } else if (resid == -135.0 || resid == -315.0) {
      return -1.0;
    }

    return Math.tan(angle * WcsTrig.D2R);
  }

  /*--------------------------------------------------------------------------*/

  public static acosdeg(v) {
    if (v >= 1.0) {
      if (v - 1.0 < WcsTrig.WCSTRIG_TOL) return 0.0;
    } else if (v == 0.0) {
      return 90.0;
    } else if (v <= -1.0) {
      if (v + 1.0 > -WcsTrig.WCSTRIG_TOL) return 180.0;
    }

    return Math.acos(v) * WcsTrig.R2D;
  }

  /*--------------------------------------------------------------------------*/

  public static asindeg(v) {
    if (v <= -1.0) {
      if (v + 1.0 > -WcsTrig.WCSTRIG_TOL) return -90.0;
    } else if (v == 0.0) {
      return 0.0;
    } else if (v >= 1.0) {
      if (v - 1.0 < WcsTrig.WCSTRIG_TOL) return 90.0;
    }

    return Math.asin(v) * WcsTrig.R2D;
  }

  /*--------------------------------------------------------------------------*/

  public static atandeg(v) {
    if (v == -1.0) {
      return -45.0;
    } else if (v == 0.0) {
      return 0.0;
    } else if (v == 1.0) {
      return 45.0;
    }

    return Math.atan(v) * WcsTrig.R2D;
  }

  /*--------------------------------------------------------------------------*/

  public static atan2deg(y, x) {
    if (y == 0.0) {
      if (x >= 0.0) {
        return 0.0;
      } else if (x < 0.0) {
        return 180.0;
      }
    } else if (x == 0.0) {
      if (y > 0.0) {
        return 90.0;
      } else if (y < 0.0) {
        return -90.0;
      }
    }

    return Math.atan2(y, x) * WcsTrig.R2D;
  }
}

export class Wcs {
  private params: { [key: string]: any } = {};

  constructor(params: { [key: string]: any }) {
    this.params = params;
  }

  public hasWcs() {
    return 'NAXIS1' in this.params &&
      'NAXIS2' in this.params &&
      'CRPIX1' in this.params &&
      'CRPIX2' in this.params &&
      'CRVAL1' in this.params &&
      'CRVAL2' in this.params &&
      'CD1_2' in this.params &&
      'CD2_1' in this.params &&
      'CD2_2' in this.params &&
      'CD2_2' in this.params;
  }

  public worldToPix(raDec: Array<number>) {
    if (!this.hasWcs()) return [null, null];

    let lng = raDec[0] * 15.0;
    let lat = raDec[1];
    let h = this.params['NAXIS2'];
    let crpix1 = this.params['CRPIX1'];
    let crval1 = this.params['CRVAL1'];
    let crpix2 = this.params['CRPIX2'];
    let crval2 = this.params['CRVAL2'];
    let cd1_1 = this.params['CD1_1'];
    let cd1_2 = this.params['CD1_2'];
    let cd2_1 = this.params['CD2_1'];
    let cd2_2 = this.params['CD2_2'];

    let mat = new math.Matrix([cd1_1, cd2_1], [cd1_2, cd2_2]);
    mat = mat.inv();
    cd1_1 = mat.get([1, 1]);
    cd1_2 = mat.get([1, 2]);
    cd2_1 = mat.get([2, 1]);
    cd2_2 = mat.get([2, 2]);

    //cel.c -> celset(pcode,cel,prg)
    let alpha0 = crval1; // is ref[0]
    let del0 = crval2; // is ref[1]

    let phip; // is LONGPOLE or ref[2]
    if (del0 != 90.0) {
      phip = 180.0;
    }
    else {
      phip = 0.0;
    }

    //proj.c tanset(prj)
    let phi0 = 0.0;
    let theta0 = 90.0;

    let alphap = alpha0;
    let delp = del0; // is LATPOLE or ref[3]

    let euler0 = crval1;
    let euler1 = 90.0 - crval2;
    let euler2 = phip;
    let euler3 = WcsTrig.cosdeg(euler1);
    let euler4 = WcsTrig.sindeg(euler1);


    //sphfwd
    let coslat = WcsTrig.cosdeg(lat);
    let sinlat = WcsTrig.sindeg(lat);

    let dlng = lng - euler0;
    let coslng = WcsTrig.cosdeg(dlng);
    let sinlng = WcsTrig.sindeg(dlng);

    let x = sinlat * euler4 - coslat * euler3 * coslng;
    let tol = 1.0e-5;
    if (Math.abs(x) < tol) {
      x = -WcsTrig.cosdeg(lat + euler1) + coslat * euler3 * (1.0 - coslng);
    }
    let y = -coslat * sinlng;
    let dphi;
    if (x != 0.0 || y != 0.0) {
      dphi = WcsTrig.atan2deg(y, x);
    }
    else {
      dphi = dlng - 180;
    }

    let phi = euler2 + dphi;

    /* Normalize the native longitude. */
    if (phi > 180.0) {
      phi -= 360.0;
    } else if (phi < -180.0) {
      phi += 360.0;
    }

    /* Compute the native latitude. */
    let theta;
    let z;
    if (WcsTrig.fmod(dlng, 180.0) == 0.0) {
      theta = lat + coslng * euler1;
      if (theta > 90.0) theta = 180.0 - theta;
      if (theta < -90.0) theta = -180.0 - theta;
    }
    else {
      z = sinlat * euler3 + coslat * euler4 * coslng;
      /* Use an alternative formula for greater numerical accuracy. */
      if (Math.abs(z) > 0.99) {
        if (z < 0)
          theta = -WcsTrig.acosdeg(Math.sqrt(x * x + y * y));
        else
          theta = WcsTrig.acosdeg(Math.sqrt(x * x + y * y));
      } else {
        theta = WcsTrig.asindeg(z);
      }
    }

    //prjfwd
    let s = WcsTrig.sindeg(theta);
    let r0 = 180.0 / Math.PI;
    let r = r0 * WcsTrig.cosdeg(theta) / s;

    let xoffset = r * WcsTrig.sindeg(phi);
    let yoffset = -r * WcsTrig.cosdeg(phi);

    x = cd1_1 * xoffset + cd1_2 * yoffset;
    y = cd2_1 * xoffset + cd2_2 * yoffset;

    x = crpix1 + x;
    y = (crpix2 + y);

    return [x, y];
  }

  public pixToWorld(xy: Array<number>) {
    if (!this.hasWcs()) return [null, null];

    let xpix = xy[0];
    let ypix = xy[1];
    let h = this.params['NAXIS2'];
    let crpix1 = this.params['CRPIX1'];
    let crval1 = this.params['CRVAL1'];
    let crpix2 = this.params['CRPIX2'];
    let crval2 = this.params['CRVAL2'];
    let cd1_1 = this.params['CD1_1'];
    let cd1_2 = this.params['CD1_2'];
    let cd2_1 = this.params['CD2_1'];
    let cd2_2 = this.params['CD2_2'];
    let x = cd1_1 * (xpix - crpix1) + cd1_2 * (ypix - crpix2);
    let y = cd2_1 * (xpix - crpix1) + cd2_2 * (ypix - crpix2);

    //proj.c tanset(prj)
    let phi0 = 0.0;
    let theta0 = 90.0;


    //cel.c -> celset(pcode,cel,prg)
    let alpha0 = crval1; // is ref[0]
    let del0 = crval2; // is ref[1]

    let phip; // is LONGPOLE or ref[2]
    if (del0 != 90.0) {
      phip = 180.0;
    }
    else {
      phip = 0.0;
    }

    let alphap = alpha0;
    let delp = del0; // is LATPOLE or ref[3]

    let euler0 = crval1;
    let euler1 = 90.0 - crval2;
    let euler2 = phip;
    let euler3 = WcsTrig.cosdeg(euler1);
    let euler4 = WcsTrig.sindeg(euler1);


    //proj.c tanrev()
    let r = Math.sqrt(x * x + y * y);
    let r0 = 180.0 / Math.PI;
    let phi;
    if (r == 0.0) {
      phi = 0.0;
    }
    else {
      phi = WcsTrig.atan2deg(x, -y);
    }
    //let Rtheta = Math.sqrt(x*x + y*y);

    let theta = WcsTrig.atan2deg(r0, r);

    //sph.c sphrev()
    let tol = 1.0e-5;
    let costhe = WcsTrig.cosdeg(theta);
    let sinthe = WcsTrig.sindeg(theta);

    let dphi = phi - euler2;
    let cosphi = WcsTrig.cosdeg(dphi);
    let sinphi = WcsTrig.sindeg(dphi);

    /* Compute the celestial longitude. */
    let x2 = sinthe * euler4 - costhe * euler3 * cosphi;
    if (Math.abs(x2) < tol) {
      /* Rearrange formula to reduce roundoff errors. */
      x2 = -WcsTrig.cosdeg(theta + euler1) + costhe * euler3 * (1.0 - cosphi);
    }
    let y2 = -costhe * sinphi;
    let dlng;
    if (x2 != 0.0 || y2 != 0.0) {
      dlng = WcsTrig.atan2deg(y2, x2);
    } else {
      /* Change of origin of longitude. */
      dlng = dphi + 180.0;
    }
    let alpha = euler0 + dlng;

    /* Normalize the celestial longitude. */
    if (euler0 >= 0.0) {
      if (alpha < 0.0) alpha += 360.0;
    } else {
      if (alpha > 0.0) alpha -= 360.0;
    }

    if (alpha > 360.0) {
      alpha -= 360.0;
    } else if (alpha < -360.0) {
      alpha += 360.0;
    }

    /* Compute the celestial latitude. */
    let del;
    if (WcsTrig.fmod(dphi, 180.0) == 0.0) {
      del = theta + cosphi * euler1;
      if (del > 90.0) del = 180.0 - del;
      if (del < -90.0) del = -180.0 - del;
    } else {
      let z = sinthe * euler3 + costhe * euler4 * cosphi;

      /* Use an alternative formula for greater numerical accuracy. */
      if (Math.abs(z) > 0.99) {
        if (z < 0) {
          del = -WcsTrig.acosdeg(Math.sqrt(x * x + y * y));
        }
        else {
          del = WcsTrig.acosdeg(Math.sqrt(x * x + y * y));
        }
      } else {
        del = WcsTrig.asindeg(z);
      }
    }

    return [alpha / 15.0, del];
  }

  public getPixelScale() {
    if (!this.hasWcs()) return null;

    let cd1_1 = this.params['CD1_1'];
    let cd1_2 = this.params['CD1_2'];
    let cd2_1 = this.params['CD2_1'];
    let cd2_2 = this.params['CD2_2'];

    return (Math.abs(cd1_1) + Math.abs(cd2_2)) / 2.0;
  }
}