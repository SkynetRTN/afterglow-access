export function convolve(data: Array<number>, width: number, height: number, kernal: Array<Array<number>>) {
  let result: Array<number> = [];
  let matrix = kernal;
  let w = matrix[0].length;
  let h = matrix.length;
  let half = Math.floor(h / 2);
  let factor = 1;
  let bias = 0;

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      let px = (y * width + x);
      let v = 0;

      for (let cy = 0; cy < w; ++cy) {
        for (let cx = 0; cx < h; ++cx) {
          let cpx = ((y + (cy - half)) * width + (x + (cx - half)));
          v += data[cpx] * matrix[cy][cx];
        }
      }

      result[px] = factor * v + bias;
    }
  }

  return result;

}