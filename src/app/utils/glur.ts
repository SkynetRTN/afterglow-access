// Calculate Gaussian blur of an image using IIR filter
// The method is taken from Intel's white paper and code example attached to it:
// https://software.intel.com/en-us/articles/iir-gaussian-blur-filter
// -implementation-using-intel-advanced-vector-extensions

let a0, a1, a2, a3, b1, b2, left_corner, right_corner;

function gaussCoef(sigma: number) {
    if (sigma < 0.5) {
        sigma = 0.5;
    }

    let a = Math.exp(0.726 * 0.726) / sigma,
        g1 = Math.exp(-a),
        g2 = Math.exp(-2 * a),
        k = (1 - g1) * (1 - g1) / (1 + 2 * a * g1 - g2);

    a0 = k;
    a1 = k * (a - 1) * g1;
    a2 = k * (a + 1) * g1;
    a3 = -k * g2;
    b1 = 2 * g1;
    b2 = -g2;
    left_corner = (a0 + a1) / (1 - b1 - b2);
    right_corner = (a2 + a3) / (1 - b1 - b2);

    // Attempt to force type to FP32.
    return new Float32Array([a0, a1, a2, a3, b1, b2, left_corner, right_corner]);
}

function convolve(src: ImageDataType, out: ImageDataType, line: Float32Array, coeff: Float32Array, width: number, height: number) {
    // takes src image and writes the blurred and transposed result into out

    let prev_src: number, curr_src: number, curr_out: number, prev_out: number, prev_prev_out: number;
    let src_index: number, out_index: number, line_index: number;
    let i: number, j: number;
    let coeff_a0: number, coeff_a1: number, coeff_b1: number, coeff_b2: number;

    for (i = 0; i < height; i++) {
        src_index = i * width;
        out_index = i;
        line_index = 0;

        // left to right
        prev_src = src[src_index];
        prev_prev_out = prev_src * coeff[6];
        prev_out = prev_prev_out;

        coeff_a0 = coeff[0];
        coeff_a1 = coeff[1];
        coeff_b1 = coeff[4];
        coeff_b2 = coeff[5];

        for (j = 0; j < width; j++) {
            curr_src = src[src_index];

            curr_out = curr_src * coeff_a0 +
                prev_src * coeff_a1 +
                prev_out * coeff_b1 +
                prev_prev_out * coeff_b2;

            prev_prev_out = prev_out;
            prev_out = curr_out;
            prev_src = curr_src;

            line[line_index] = prev_out;
            line_index++;
            src_index++;
        }

        src_index--;
        line_index--;
        out_index += height * (width - 1);

        // right to left
        prev_src = src[src_index];
        prev_prev_out = prev_src * coeff[7];
        prev_out = prev_prev_out;
        curr_src = prev_src;

        coeff_a0 = coeff[2];
        coeff_a1 = coeff[3];

        for (j = width - 1; j >= 0; j--) {
            curr_out = curr_src * coeff_a0 +
                prev_src * coeff_a1 +
                prev_out * coeff_b1 +
                prev_prev_out * coeff_b2;

            prev_prev_out = prev_out;
            prev_out = curr_out;

            prev_src = curr_src;
            curr_src = src[src_index];

            out[out_index] = line[line_index] + prev_out;

            src_index--;
            line_index--;
            out_index -= height;
        }
    }
}

type ImageDataType = Uint8Array | Uint16Array | Uint32Array | Float32Array | Float64Array | number[];

export function glur(src: ImageDataType, width: number, height: number, radius: number) {
    // Quick exit on zero radius
    if (!radius) { return; }

    let out = src.slice();
    let tmp_line = new Float32Array(Math.max(width, height));

    let coeff = gaussCoef(radius);

    convolve(src, out, tmp_line, coeff, width, height);
    convolve(out, src, tmp_line, coeff, height, width);
}
