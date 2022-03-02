import { PixelType } from './data-file';
import { BlendMode } from './blend-mode';

export function compose(
  layers: Array<{ redChannel: Uint16Array; greenChannel: Uint16Array; blueChannel: Uint16Array; composite: Uint32Array, blendMode: BlendMode; alpha: number; visible: boolean }>,
  channelMixer: [[number, number, number], [number, number, number], [number, number, number]],
  result: Uint32Array
) {
  layers = layers.filter((layer) => layer.visible);
  if (layers.length == 0) {
    for (let i = 0; i < result.length; i++) {
      result[i] = 0;
    }
    return new Uint32Array();
  }

  result.set(layers[0].composite);
  let result8 = new Uint8ClampedArray(result.buffer);
  let layers8 = layers.map((layer) => new Uint8ClampedArray(layer.composite.buffer));

  // let baseHsy: [number, number, number] = [0, 0, 0];
  // let blendHsy: [number, number, number] = [0, 0, 0];
  // let resultRgb: [number, number, number] = [0, 0, 0];
  let rr = channelMixer[0][0];
  let rg = channelMixer[0][1];
  let rb = channelMixer[0][2];
  let gr = channelMixer[1][0];
  let gg = channelMixer[1][1];
  let gb = channelMixer[1][2];
  let br = channelMixer[2][0];
  let bg = channelMixer[2][1];
  let bb = channelMixer[2][2];

  //for each pixel in result
  for (let i = 0, j = 0, len = result.length; i != len; i++, j += 4) {
    //for each layer
    for (let k = 1; k < layers.length; k++) {
      let tr = layers8[k][j] / 255.0;
      let tg = layers8[k][j + 1] / 255.0;
      let tb = layers8[k][j + 2] / 255.0;
      let ta = layers[k].alpha;

      if (layers[k].blendMode == BlendMode.Screen) {
        //screen blend mode
        result8[j] = (1 - (1 - result8[j] / 255.0) * (1 - tr)) * 255.0;
        result8[j + 1] = (1 - (1 - result8[j + 1] / 255.0) * (1 - tg)) * 255.0;
        result8[j + 2] = (1 - (1 - result8[j + 2] / 255.0) * (1 - tb)) * 255.0;
        result8[j + 3] = (1 - (1 - result8[j + 3] / 255.0) * (1 - ta)) * 255.0;
      } else if (layers[k].blendMode == BlendMode.Luminosity) {
        let blendHsy = rgbToHsv(tr, tg, tb);
        let baseHsy = rgbToHsv(result8[j] / 255.0, result8[j + 1] / 255.0, result8[j + 2] / 255.0);
        let resultRgb = hsvToRgb(baseHsy[0], baseHsy[1], blendHsy[2]);

        result8[j] = resultRgb[0] * 255;
        result8[j + 1] = resultRgb[1] * 255;
        result8[j + 2] = resultRgb[2] * 255;
        result8[j + 3] = 255.0;
      } else {
        //normal blend mode
        let br = result8[j] / 255.0;
        let bg = result8[j + 1] / 255.0;
        let bb = result8[j + 2] / 255.0;
        result8[j] = (ta * (tr - br) + br) * 255;
        result8[j + 1] = (ta * (tg - bg) + bg) * 255;
        result8[j + 2] = (ta * (tb - bb) + bb) * 255;
        result8[j + 3] = 255.0;
      }
    }
    let r = result8[j] * rr + result8[j + 1] * rg + result8[j + 2] * rb;
    let g = result8[j] * gr + result8[j + 1] * gg + result8[j + 2] * gb;
    let b = result8[j] * br + result8[j + 1] * bg + result8[j + 2] * bb;

    result8[j] = Math.min(255, r)
    result8[j + 1] = Math.min(255, g)
    result8[j + 2] = Math.min(255, b)

  }
  return result;
}

function rgbToHsv(var_R: number, var_G: number, var_B: number) {
  //R, G and B input range = 0 ÷ 1.0
  //H, S and V output range = 0 ÷ 1.0

  let var_Min = Math.min(var_R, var_G, var_B); //Min. value of RGB
  let var_Max = Math.max(var_R, var_G, var_B); //Max. value of RGB
  let del_Max = var_Max - var_Min; //Delta RGB value

  let V = var_Max;
  let H: number;
  let S: number;

  if (del_Max == 0) {
    //This is a gray, no chroma...
    H = 0;
    S = 0;
  } //Chromatic data...
  else {
    S = del_Max / var_Max;

    let del_R = ((var_Max - var_R) / 6 + del_Max / 2) / del_Max;
    let del_G = ((var_Max - var_G) / 6 + del_Max / 2) / del_Max;
    let del_B = ((var_Max - var_B) / 6 + del_Max / 2) / del_Max;

    if (var_R == var_Max) H = del_B - del_G;
    else if (var_G == var_Max) H = 1 / 3 + del_R - del_B;
    else if (var_B == var_Max) H = 2 / 3 + del_G - del_R;

    if (H < 0) H += 1;
    if (H > 1) H -= 1;
  }

  return [H, S, V];
}

function hsvToRgb(H: number, S: number, V: number) {
  //H, S and V input range = 0 ÷ 1.0
  //R, G and B output range = 0 ÷ 1.0

  let R: number;
  let G: number;
  let B: number;

  if (S == 0) {
    R = V;
    G = V;
    B = V;
  } else {
    let var_h = H * 6;
    if (var_h == 6) var_h = 0; //H must be < 1
    let var_i = Math.floor(var_h); //Or ... var_i = floor( var_h )
    let var_1 = V * (1 - S);
    let var_2 = V * (1 - S * (var_h - var_i));
    let var_3 = V * (1 - S * (1 - (var_h - var_i)));

    let var_r: number;
    let var_g: number;
    let var_b: number;

    if (var_i == 0) {
      var_r = V;
      var_g = var_3;
      var_b = var_1;
    } else if (var_i == 1) {
      var_r = var_2;
      var_g = V;
      var_b = var_1;
    } else if (var_i == 2) {
      var_r = var_1;
      var_g = V;
      var_b = var_3;
    } else if (var_i == 3) {
      var_r = var_1;
      var_g = var_2;
      var_b = V;
    } else if (var_i == 4) {
      var_r = var_3;
      var_g = var_1;
      var_b = V;
    } else {
      var_r = V;
      var_g = var_1;
      var_b = var_2;
    }

    R = var_r;
    G = var_g;
    B = var_b;
  }

  return [R, G, B];
}

// let R=0.3, G=0.59, B=0.11;

// /**
//  * This is the formula used by Photoshop to convert a color from
//  * RGB (Red, Green, Blue) to HSY (Hue, Saturation, Luminosity).
//  * The hue is calculated using the exacone approximation of the saturation
//  * cone.
//  * @param rgb The input color RGB normalized components.
//  * @param hsy The output color HSY normalized components.
//  */
// function rgbToHsy(rgb: number[] | Uint8ClampedArray, hsy: number[] | Uint8ClampedArray) {

//   let r = Math.min(Math.max(rgb[0], 0), 1);
//   let g = Math.min(Math.max(rgb[1], 0), 1);
//   let b = Math.min(Math.max(rgb[2], 0), 1);

//   let h;
//   let s;
//   let y;

//   // For saturation equals to 0 any value of hue are valid.
//   // In this case we choose 0 as a default value.

//   if (r == g && g == b) {            // Limit case.
//       s = 0;
//       h = 0;
//   } else if ((r >= g) && (g >= b)) { // Sector 0: 0° - 60°
//       s = r - b;
//       h = 60 * (g - b) / s;
//   } else if ((g > r) && (r >= b)) {  // Sector 1: 60° - 120°
//       s = g - b;
//       h = 60 * (g - r) / s  + 60;
//   } else if ((g >= b) && (b > r)) {  // Sector 2: 120° - 180°
//       s = g - r;
//       h = 60 * (b - r) / s + 120;
//   } else if ((b > g) && (g > r)) {   // Sector 3: 180° - 240°
//       s = b - r;
//       h = 60 * (b - g) / s + 180;
//   } else if ((b > r) && (r >= g)) {  // Sector 4: 240° - 300°
//       s = b - g;
//       h = 60 * (r - g) / s + 240;
//   } else {                           // Sector 5: 300° - 360°
//       s = r - g;
//       h = 60 * (r - b) / s + 300;
//   }

//   y = R * r + G * g + B * b;

//   // Approximations erros can cause values to exceed bounds.

//   hsy[0] = h % 360;
//   hsy[1] = Math.min(Math.max(s, 0), 1);
//   hsy[2] = Math.min(Math.max(y, 0), 1);
// }

// /**
// * This is the formula used by Photoshop to convert a color from
// * HSY (Hue, Saturation, Luminosity) to RGB (Red, Green, Blue).
// * The hue is calculated using the exacone approximation of the saturation
// * cone.
// * @param hsy The input color HSY normalized components.
// * @param rgb The output color RGB normalized components.
// */
// function hsyToRgb(hsy: number[] | Uint8ClampedArray, rgb: number[] | Uint8ClampedArray) {

//   let h = hsy[0] % 360;
//   let s = Math.min(Math.max(hsy[1], 0), 1);
//   let y = Math.min(Math.max(hsy[2], 0), 1);

//   let r;
//   let g;
//   let b;

//   let k; // Intermediate letiable.

//   if (h >= 0 && h < 60) {           // Sector 0: 0° - 60°
//       k = s * h / 60;
//       b = y - R * s - G * k;
//       r = b + s;
//       g = b + k;
//   } else if (h >= 60 && h < 120) {  // Sector 1: 60° - 120°
//       k = s * (h - 60) / 60;
//       g = y + B * s + R * k;
//       b = g - s;
//       r = g - k;
//   } else if (h >= 120 && h < 180) { // Sector 2: 120° - 180°
//       k = s * (h - 120) / 60;
//       r = y - G * s - B * k;
//       g = r + s;
//       b = r + k;
//   } else if (h >= 180 && h < 240) { // Sector 3: 180° - 240°
//       k = s * (h - 180) / 60;
//       b = y + R * s + G * k;
//       r = b - s;
//       g = b - k;
//   } else if (h >= 240 && h < 300) { // Sector 4: 240° - 300°
//       k = s * (h - 240) / 60;
//       g = y - B * s - R * k;
//       b = g + s;
//       r = g + k;
//   } else {                          // Sector 5: 300° - 360°
//       k = s * (h - 300) / 60;
//       r = y + G * s + B * k;
//       g = r - s;
//       b = r - k;
//   }

//   // Approximations erros can cause values to exceed bounds.

//   rgb[0] = Math.min(Math.max(r, 0), 1);
//   rgb[1] = Math.min(Math.max(g, 0), 1);
//   rgb[2] = Math.min(Math.max(b, 0), 1);
// }

// /**
//  * Converts an RGB color value to HSL. Conversion formula
//  * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
//  * Assumes r, g, and b are contained in the set [0, 255] and
//  * returns h, s, and l in the set [0, 1].
//  *
//  * @param   Number  r       The red color value
//  * @param   Number  g       The green color value
//  * @param   Number  b       The blue color value
//  * @return  Array           The HSL representation
//  */
// function rgbToHsl(r: number, g: number, b: number, result: [number, number, number]) {
//   let max = Math.max(r, g, b), min = Math.min(r, g, b);
//   let h: number;
//   let s: number;
//   let l = (max + min) / 2;

//   if (max == min) {
//     h = s = 0; // achromatic
//   } else {
//     let d = max - min;
//     s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

//     switch (max) {
//       case r: h = (g - b) / d + (g < b ? 6 : 0); break;
//       case g: h = (b - r) / d + 2; break;
//       case b: h = (r - g) / d + 4; break;
//     }

//     h /= 6;
//   }

//   result[0] = h;
//   result[1] = s;
//   result[2] = l;
// }

// /**
//  * Converts an HSL color value to RGB. Conversion formula
//  * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
//  * Assumes h, s, and l are contained in the set [0, 1] and
//  * returns r, g, and b in the set [0, 255].
//  *
//  * @param   Number  h       The hue
//  * @param   Number  s       The saturation
//  * @param   Number  l       The lightness
//  * @return  Array           The RGB representation
//  */
// function hslToRgb(h: number, s: number, l: number, result: [number, number, number]) {
//   let r: number, g: number, b: number;

//   if (s == 0) {
//     r = g = b = l; // achromatic
//   } else {
//     function hue2rgb(p, q, t) {
//       if (t < 0) t += 1;
//       if (t > 1) t -= 1;
//       if (t < 1/6) return p + (q - p) * 6 * t;
//       if (t < 1/2) return q;
//       if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
//       return p;
//     }

//     let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
//     let p = 2 * l - q;

//     r = hue2rgb(p, q, h + 1/3);
//     g = hue2rgb(p, q, h);
//     b = hue2rgb(p, q, h - 1/3);
//   }

//   result[0] = r;
//   result[1] = g;
//   result[2] = b;
// }

// /**
//  * Converts an RGB color value to HSV. Conversion formula
//  * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
//  * Assumes r, g, and b are contained in the set [0, 255] and
//  * returns h, s, and v in the set [0, 1].
//  *
//  * @param   Number  r       The red color value
//  * @param   Number  g       The green color value
//  * @param   Number  b       The blue color value
//  * @return  Array           The HSV representation
//  */
// function rgbToHsv(r: number, g: number, b: number, result: [number, number, number]) {
//   let max = Math.max(r, g, b), min = Math.min(r, g, b);
//   let h: number, s: number, v = max;

//   let d = max - min;
//   s = max == 0 ? 0 : d / max;

//   if (max == min) {
//     h = 0; // achromatic
//   } else {
//     switch (max) {
//       case r: h = (g - b) / d + (g < b ? 6 : 0); break;
//       case g: h = (b - r) / d + 2; break;
//       case b: h = (r - g) / d + 4; break;
//     }

//     h /= 6;
//   }

//   result[0] = h;
//   result[1] = s;
//   result[2] = v;
// }

// /**
//  * Converts an HSV color value to RGB. Conversion formula
//  * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
//  * Assumes h, s, and v are contained in the set [0, 1] and
//  * returns r, g, and b in the set [0, 255].
//  *
//  * @param   Number  h       The hue
//  * @param   Number  s       The saturation
//  * @param   Number  v       The value
//  * @return  Array           The RGB representation
//  */
// function hsvToRgb(h: number, s: number, v: number, result: [number, number, number]) {
//   let r: number, g: number, b: number;

//   let i = Math.floor(h * 6);
//   let f = h * 6 - i;
//   let p = v * (1 - s);
//   let q = v * (1 - f * s);
//   let t = v * (1 - (1 - f) * s);

//   switch (i % 6) {
//     case 0: r = v, g = t, b = p; break;
//     case 1: r = q, g = v, b = p; break;
//     case 2: r = p, g = v, b = t; break;
//     case 3: r = p, g = q, b = v; break;
//     case 4: r = t, g = p, b = v; break;
//     case 5: r = v, g = p, b = q; break;
//   }

//   result[0] = r;
//   result[1] = g;
//   result[2] = b;
// }
