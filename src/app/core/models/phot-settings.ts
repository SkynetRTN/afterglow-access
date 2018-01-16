import { CentroidMethod } from './centroid-settings'

export interface PhotSettings {
  aperture: number,
  annulus: number,
  dannulus: number,
  centroid: boolean,
  centroidRadius: number,
  centroidMethod: CentroidMethod
}