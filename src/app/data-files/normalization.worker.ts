/// <reference lib="webworker" />

import { normalize } from "./models/pixel-normalizer";

addEventListener('message', ({ data }) => {
  console.log("RECEIVED NORMALIZATION POST.  ")
  let result = {
    pixels: normalize(data.pixels, data.hist, data.normalizer)
  }
  postMessage(result, [result.pixels.buffer]);
});
