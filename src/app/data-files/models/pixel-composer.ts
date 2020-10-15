import { PixelType } from './data-file';
import { BlendMode } from './blend-mode';

export function compose(layers: Array<{pixels: Uint32Array, blendMode: BlendMode, alpha: number}>, result: Uint32Array) {
    result.set(layers[0].pixels)
    let result8 = new Uint8ClampedArray(result.buffer);
    let layers8 = layers.map(layer => new Uint8ClampedArray(layer.pixels.buffer))

    //for each pixel in result
    for (let i=0, j=0, len=result.length; i != len ; i++, j+=4) {
        //for each layer
        for(let k=1; k < layers.length; k++) {
            let tr = layers8[k][j] / 255.0;
            let tg = layers8[k][j+1] / 255.0;
            let tb = layers8[k][j+2] / 255.0;
            let ta = layers[k].alpha;

            if (layers[k].blendMode == BlendMode.Screen) {
                //screen blend mode
                result8[j] = (1 - (1 - result8[j]/255.0) * (1 - tr))*255.0;
                result8[j+1] = (1 - (1 - result8[j+1]/255.0) * (1 - tg))*255.0;
                result8[j+2] = (1 - (1 - result8[j+2]/255.0) * (1 - tb))*255.0;
                result8[j+3] =( 1 - (1 - result8[j+3]/255.0) * (1 - ta))*255.0;
            }
            else {
                //normal blend mode
                let br = result8[j]/255.0
                let bg = result8[j+1]/255.0
                let bb = result8[j+2]/255.0
                result8[j] = (ta * (tr - br) + br)*255;
                result8[j+1] = (ta * (tg - bg) + bg)*255;
                result8[j+2] = (ta * (tb - bb) + bb)*255;
                result8[j+3] = 1.0;
            }
        }
    }
    return result;
}