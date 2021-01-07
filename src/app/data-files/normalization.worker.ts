/// <reference lib="webworker" />

import { normalize } from "./models/pixel-normalizer";

addEventListener('message', ({ data }) => {
  normalize(data.pixels, data.hist, data.normalizer, data.result)
  postMessage(data, [data.pixels.buffer, data.result.buffer]);
});
