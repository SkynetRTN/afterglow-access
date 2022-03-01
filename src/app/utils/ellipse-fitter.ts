/*
The MIT License (MIT)
Copyright (c) 2016 Michael MIGLIORE
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* https://github.com/Meakk/ellipse-js/blob/master/ellipse.js */


// 3x3 matrix helpers
function determinant(B: number[][]) {
    return B[0][0] * B[1][1] * B[2][2]
        + B[0][1] * B[1][2] * B[2][0]
        + B[0][2] * B[1][0] * B[2][1]
        - B[0][2] * B[1][1] * B[2][0]
        - B[0][1] * B[1][0] * B[2][2]
        - B[0][0] * B[1][2] * B[2][1];
}

function inverse(B: number[][]) {
    let d = determinant(B);
    return [[(B[1][1] * B[2][2] - B[1][2] * B[2][1]) / d,
    (B[0][2] * B[2][1] - B[0][1] * B[2][2]) / d,
    (B[0][1] * B[1][2] - B[0][2] * B[1][1]) / d],
    [(B[1][2] * B[2][0] - B[1][0] * B[2][2]) / d,
    (B[0][0] * B[2][2] - B[0][2] * B[2][0]) / d,
    (B[0][2] * B[1][0] - B[0][0] * B[1][2]) / d],
    [(B[1][0] * B[2][1] - B[1][1] * B[2][0]) / d,
    (B[0][1] * B[2][0] - B[0][0] * B[2][1]) / d,
    (B[0][0] * B[1][1] - B[0][1] * B[1][0]) / d]];
}

function multiply(A: number[][], B: number[][]) {
    return [[A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0],
    A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1],
    A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0],
    A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1],
    A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2]],
    [A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0],
    A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1],
    A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2]]];
}

function transpose(B: number[][]) {
    return [[B[0][0], B[1][0], B[2][0]],
    [B[0][1], B[1][1], B[2][1]],
    [B[0][2], B[1][2], B[2][2]]];
}

function add(A: number[][], B: number[][]) {
    return [[A[0][0] + B[0][0], A[0][1] + B[0][1], A[0][2] + B[0][2]],
    [A[1][0] + B[1][0], A[1][1] + B[1][1], A[1][2] + B[1][2]],
    [A[2][0] + B[2][0], A[2][1] + B[2][1], A[2][2] + B[2][2]]];
}

function trace(A: number[][]) { return A[0][0] + A[1][1] + A[2][2]; }

function scale(A: number[][], k: number) {
    return [[k * A[0][0], k * A[0][1], k * A[0][2]],
    [k * A[1][0], k * A[1][1], k * A[1][2]],
    [k * A[2][0], k * A[2][1], k * A[2][2]]];
}

function eigenvalues(A: number[][]) {
    let q = trace(A) / 3;
    let K = add(A, [[-q, 0, 0], [0, -q, 0], [0, 0, -q]]);
    let p = Math.sqrt(trace(multiply(K, K)) / 6);
    let d = determinant(scale(K, 1 / p));

    let phi: number;
    if (d <= -2) {
        phi = Math.PI / 3;
    } else if (d >= 2) {
        phi = 0;
    } else {
        phi = Math.acos(d / 2) / 3;
    }

    return [q + 2 * p * Math.cos(phi),
    q + 2 * p * Math.cos(phi + (2 * Math.PI / 3)),
    q + 2 * p * Math.cos(phi + (4 * Math.PI / 3))];
}

function nullspace(G: number[][]) {
    let k1 = -G[2][0] / G[2][2];
    let k2 = -G[2][1] / G[2][2];

    let y = -(G[1][0] + G[1][2] * k1) / (G[1][1] + G[1][2] * k2);
    let z = k1 + k2 * y;
    let n = Math.sqrt(1 + y * y + z * z);

    return [1 / n, y / n, z / n];
}

export class Ellipse {
    constructor(public a: number = 0, public b: number = 0, public c: number = 0, public d: number = 0, public e: number = 0, public f: number = 0, public angle: number = 0) {

    }

    setFromPoints(u: { x: number, y: number }[]) {
        //compute sums
        let Sxxxx = u.reduce(function (p, c) { return p + c.x * c.x * c.x * c.x; }, 0);
        let Sxxxy = u.reduce(function (p, c) { return p + c.x * c.x * c.x * c.y; }, 0);
        let Sxxyy = u.reduce(function (p, c) { return p + c.x * c.x * c.y * c.y; }, 0);
        let Sxyyy = u.reduce(function (p, c) { return p + c.x * c.y * c.y * c.y; }, 0);
        let Syyyy = u.reduce(function (p, c) { return p + c.y * c.y * c.y * c.y; }, 0);
        let Sxxx = u.reduce(function (p, c) { return p + c.x * c.x * c.x; }, 0);
        let Sxxy = u.reduce(function (p, c) { return p + c.x * c.x * c.y; }, 0);
        let Sxyy = u.reduce(function (p, c) { return p + c.x * c.y * c.y; }, 0);
        let Syyy = u.reduce(function (p, c) { return p + c.y * c.y * c.y; }, 0);
        let Sxx = u.reduce(function (p, c) { return p + c.x * c.x; }, 0);
        let Sxy = u.reduce(function (p, c) { return p + c.x * c.y; }, 0);
        let Syy = u.reduce(function (p, c) { return p + c.y * c.y; }, 0);
        let Sx = u.reduce(function (p, c) { return p + c.x; }, 0);
        let Sy = u.reduce(function (p, c) { return p + c.y; }, 0);


        //construct matrices
        let S1 = [[Sxxxx, Sxxxy, Sxxyy],
        [Sxxxy, Sxxyy, Sxyyy],
        [Sxxyy, Sxyyy, Syyyy]];
        let S2 = [[Sxxx, Sxxy, Sxx],
        [Sxxy, Sxyy, Sxy],
        [Sxyy, Syyy, Syy]];
        let S3 = [[Sxx, Sxy, Sx],
        [Sxy, Syy, Sy],
        [Sx, Sy, u.length]];
        let S2T = transpose(S2);
        let iS3 = inverse(S3);
        let iC = [[0, 0, .5],
        [0, -1, 0],
        [.5, 0, 0]];

        let U = multiply(iS3, S2T);
        U = scale(U, -1);
        let A = multiply(iC, add(S1, multiply(S2, U)));

        let eigVal = eigenvalues(A);

        //eigenvectors
        let eigVec = eigVal.map(function (l) {
            let ev = nullspace(add(A, [[-l, 0, 0], [0, -l, 0], [0, 0, -l]]));
            return { ev: ev, cond: 4 * ev[2] * ev[0] - ev[1] * ev[1], err: false };
        });

        //condition
        let a1 = eigVec.filter(function (e) {
            return e.cond > 0;
        }).reduce(function (p, c) {
            return p.cond < c.cond ? p : c;
        }, { cond: Infinity, err: true, ev: [] });

        if (!a1.err) {
            let ev = a1.ev;
            let a = ev[0];
            let b = ev[1];
            let c = ev[2];
            let d = U[0][0] * ev[0] + U[0][1] * ev[1] + U[0][2] * ev[2];
            let e = U[1][0] * ev[0] + U[1][1] * ev[1] + U[1][2] * ev[2];
            this.f = U[2][0] * ev[0] + U[2][1] * ev[1] + U[2][2] * ev[2];


            let t = Math.atan(b / (c - a)) / 2;
            let st = Math.sin(t);
            let ct = Math.cos(t);
            this.a = a * ct * ct - b * ct * st + c * st * st;
            this.c = a * st * st + b * ct * st + c * ct * ct;
            this.d = d * ct - e * st;
            this.e = d * st + e * ct;
            this.angle = t;
            this.b = 0;


        } else {
            // console.warn("Pb with eigenvectors, length = " + a1.length);
            console.warn(eigVec);
        }
    }


    get semi() {
        let [a, b, c, d, e, f] = [this.a, this.b, this.c, this.d, this.e, this.f];
        let num = -4 * f * a * c + c * d * d + a * e * e;
        return [Math.sqrt(num / (4 * a * c * c)),
        Math.sqrt(num / (4 * a * a * c))];


        // let [a, b, c, d, f, g] = [this.a, this.b, this.c, this.d, this.e, this.f];
        // let denominator = (b * b - a * c) * Math.sqrt(Math.pow(a - c, 2) + 4 * b * b) - (a + c)
        // let A = Math.sqrt((2 * (a * f * f + c * d * d + g * b * b - 22 * b * d * f - a * c * g)) / denominator)
        // let B = Math.sqrt((2 * (a * f * f + c * d * d + g * b * b - 2 * b * d * f - a * c * g)) / denominator)
        // return { A: A, B: B }
    }


}
