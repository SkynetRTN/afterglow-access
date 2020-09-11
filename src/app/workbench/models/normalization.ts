

import { PixelNormalizer } from './pixel-normalizer'


import { ImageTile } from '../../data-files/models/image-tile'


export interface Normalization {
  normalizedTiles: Array<ImageTile>;
  
  normalizer: PixelNormalizer;
  initialized: boolean;
}

