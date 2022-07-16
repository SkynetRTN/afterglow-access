import { Injectable } from '@angular/core';

interface PhotometricColorBalanceSettings {
  redLayerId: string,
  redZeroPoint: number,
  blueLayerId: string,
  blueZeroPoint: number,
  greenLayerId: string,
  greenZeroPoint: number,
  referenceLayerId: string,
  extinction: number,
  neutralizeBackground: boolean
}

export const FILTER_REFERENCES = [
  { name: 'Black Body Peaking in U Filter', peak: 0.366 },
  { name: 'Black Body Peaking in B Filter', peak: 0.438 },
  { name: 'Black Body Peaking in V Filter', peak: 0.545 },
  { name: 'Black Body Peaking in R Filter', peak: 0.641 },
  { name: 'Black Body Peaking in I Filter', peak: 0.798 },
  { name: "Black Body Peaking in u' Filter", peak: 0.35 },
  { name: "Black Body Peaking in g' Filter", peak: 0.475 },
  { name: "Black Body Peaking in r' Filter", peak: 0.6222 },
  { name: "Black Body Peaking in i' Filter", peak: 0.7362 },
  { name: "Black Body Peaking in z' Filter", peak: 0.9049 },
  { name: 'Black Body Peaking in J Filter', peak: 1.235 },
  { name: 'Black Body Peaking in H Filter', peak: 1.662 },
  { name: 'Black Body Peaking in Ks Filter', peak: 2.159 },
]

export const STELLAR_TYPE_REFERENCES = [
  { name: 'O-Type Star - 41,000K', peak: 2898 / 41000 },
  { name: 'B-Type Star - 31,000K', peak: 2898 / 31000 },
  { name: 'A-Type Star - 9,500K', peak: 2898 / 9500 },
  { name: 'F-Type Star - 7,240K', peak: 2898 / 7240 },
  { name: 'G-Type Star - 5,920K', peak: 2898 / 5920 },
  { name: "K-Type Star - 5,300K", peak: 2898 / 5300 },
  { name: "M-Type Star - 3,850K", peak: 2898 / 3850 }
]

export const WHITE_REFERENCE_GROUPS = [
  { name: 'Black Body with Filter-based Peak', options: FILTER_REFERENCES },
  { name: 'Stellar Spectral Types', options: STELLAR_TYPE_REFERENCES }
]



@Injectable({
  providedIn: 'root'
})
export class PhotometricColorBalanceDialogService {


  private defaults: { [fileId: string]: PhotometricColorBalanceSettings } = {};

  constructor() { }

  getDefault(fileId: string) {
    return this.defaults[fileId];
  }

  saveDefault(fileId: string, settings: PhotometricColorBalanceSettings) {
    this.defaults[fileId] = settings;
  }


}
