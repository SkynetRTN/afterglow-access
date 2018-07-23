export interface Astrometry {
  ra_hours: number;
  dec_degs: number;
  pm_sky: number;
  pm_pos_angle_sky: number;

  x: number;
  y: number;
  pm_pixel: number;
  pm_pos_angle_pixel: number;
  pm_epoch: string;

  fwhm_x: number;
  fwhm_y: number;
  theta: number;
}