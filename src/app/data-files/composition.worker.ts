/// <reference lib="webworker" />

import { compose } from './models/pixel-composer';

addEventListener('message', ({ data }) => {
  compose(data.layers, data.result);
  postMessage(data.result, [data.result.pixels.buffer]);
});
