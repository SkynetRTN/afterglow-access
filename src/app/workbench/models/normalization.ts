

import { PixelNormalizer } from './pixel-normalizer'


import { ImageTile } from '../../data-files/models/image-tile'
import { ITiledImageData } from '../../data-files/models/data-file'


export interface Normalization extends ITiledImageData<Uint32Array> {
  normalizer: PixelNormalizer;
  initialized: boolean;
}

