import { Injectable } from '@angular/core';

interface SourceNeutralizationSettings {
  selectedLayerIds: string,
  referenceLayerId: string,
  neutralizeBackground: boolean
}

@Injectable({
  providedIn: 'root'
})
export class SourceNeutralizationDialogService {


  private defaults: { [fileId: string]: SourceNeutralizationSettings } = {};

  constructor() { }

  getDefault(fileId: string) {
    return this.defaults[fileId];
  }

  saveDefault(fileId: string, settings: SourceNeutralizationSettings) {
    this.defaults[fileId] = settings;
  }


}
