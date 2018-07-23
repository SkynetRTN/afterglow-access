

import { PixelNormalizer } from './pixel-normalizer'


import { ImageTile } from '../../data-files/models/image-tile'


export interface Normalization {
  normalizedTiles: Array<ImageTile>;
  
  normalizer: PixelNormalizer;

  autoUpperPercentile: number;
  autoLowerPercentile: number;
  autoLevelsInitialized: boolean;
  autoPeakLevel?: number;
  autoBkgLevel?: number;
}

