

import { PixelNormalizer } from './pixel-normalizer'
import { IImageData } from './image-data';


export interface Normalization extends IImageData<Uint32Array> {
  normalizer: PixelNormalizer;
  initialized: boolean;
}

