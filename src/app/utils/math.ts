export function round(value: number, digits: number) {
  if (!value) return value;
  return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
}

export function erfinv(x) {
  // maximum relative error = .00013
  const a = 0.147
  //if (0 == x) { return 0 }
  const b = 2 / (Math.PI * a) + Math.log(1 - x ** 2) / 2
  const sqrt1 = Math.sqrt(b ** 2 - Math.log(1 - x ** 2) / a)
  const sqrt2 = Math.sqrt(sqrt1 - b)
  return sqrt2 * Math.sign(x)
}



export function erf(x: number) {
  const y = Math.abs(x)

  if (y >= MAX_NUM) {
    return sign(x)
  }
  if (y <= THRESH) {
    return sign(x) * erf1(y)
  }
  if (y <= 4.0) {
    return sign(x) * (1 - erfc2(y))
  }
  return sign(x) * (1 - erfc3(y))
}

const sign = /* #__PURE__ */ Math.sign || function (x) {
  if (x > 0) {
    return 1
  } else if (x < 0) {
    return -1
  } else {
    return 0
  }
}

/**
   * Approximates the error function erf() for x <= 0.46875 using this function:
   *               n
   * erf(x) = x * sum (p_j * x^(2j)) / (q_j * x^(2j))
   *              j=0
   */
function erf1(y: number) {
  const ysq = y * y
  let xnum = P[0][4] * ysq
  let xden = ysq
  let i

  for (i = 0; i < 3; i += 1) {
    xnum = (xnum + P[0][i]) * ysq
    xden = (xden + Q[0][i]) * ysq
  }
  return y * (xnum + P[0][3]) / (xden + Q[0][3])
}

/**
 * Approximates the complement of the error function erfc() for
 * 0.46875 <= x <= 4.0 using this function:
 *                       n
 * erfc(x) = e^(-x^2) * sum (p_j * x^j) / (q_j * x^j)
 *                      j=0
 */
function erfc2(y: number) {
  let xnum = P[1][8] * y
  let xden = y
  let i

  for (i = 0; i < 7; i += 1) {
    xnum = (xnum + P[1][i]) * y
    xden = (xden + Q[1][i]) * y
  }
  const result = (xnum + P[1][7]) / (xden + Q[1][7])
  const ysq = parseInt((y * 16).toString()) / 16
  const del = (y - ysq) * (y + ysq)
  return Math.exp(-ysq * ysq) * Math.exp(-del) * result
}

/**
 * Approximates the complement of the error function erfc() for x > 4.0 using
 * this function:
 *
 * erfc(x) = (e^(-x^2) / x) * [ 1/sqrt(pi) +
 *               n
 *    1/(x^2) * sum (p_j * x^(-2j)) / (q_j * x^(-2j)) ]
 *              j=0
 */
function erfc3(y: number) {
  let ysq = 1 / (y * y)
  let xnum = P[2][5] * ysq
  let xden = ysq
  let i

  for (i = 0; i < 4; i += 1) {
    xnum = (xnum + P[2][i]) * ysq
    xden = (xden + Q[2][i]) * ysq
  }
  let result = ysq * (xnum + P[2][4]) / (xden + Q[2][4])
  result = (SQRPI - result) / y
  ysq = parseInt(((y * 16).toString()).toString()) / 16
  const del = (y - ysq) * (y + ysq)
  return Math.exp(-ysq * ysq) * Math.exp(-del) * result
}

/**
* Upper bound for the first approximation interval, 0 <= x <= THRESH
* @constant
*/
const THRESH = 0.46875

/**
* Constant used by W. J. Cody's Fortran77 implementation to denote sqrt(pi)
* @constant
*/
const SQRPI = 5.6418958354775628695e-1

/**
* Coefficients for each term of the numerator sum (p_j) for each approximation
* interval (see W. J. Cody's paper for more details)
* @constant
*/
const P = [[
  3.16112374387056560e00, 1.13864154151050156e02,
  3.77485237685302021e02, 3.20937758913846947e03,
  1.85777706184603153e-1
], [
  5.64188496988670089e-1, 8.88314979438837594e00,
  6.61191906371416295e01, 2.98635138197400131e02,
  8.81952221241769090e02, 1.71204761263407058e03,
  2.05107837782607147e03, 1.23033935479799725e03,
  2.15311535474403846e-8
], [
  3.05326634961232344e-1, 3.60344899949804439e-1,
  1.25781726111229246e-1, 1.60837851487422766e-2,
  6.58749161529837803e-4, 1.63153871373020978e-2
]]

/**
* Coefficients for each term of the denominator sum (q_j) for each approximation
* interval (see W. J. Cody's paper for more details)
* @constant
*/
const Q = [[
  2.36012909523441209e01, 2.44024637934444173e02,
  1.28261652607737228e03, 2.84423683343917062e03
], [
  1.57449261107098347e01, 1.17693950891312499e02,
  5.37181101862009858e02, 1.62138957456669019e03,
  3.29079923573345963e03, 4.36261909014324716e03,
  3.43936767414372164e03, 1.23033935480374942e03
], [
  2.56852019228982242e00, 1.87295284992346047e00,
  5.27905102951428412e-1, 6.05183413124413191e-2,
  2.33520497626869185e-3
]]

/**
* Maximum/minimum safe numbers to input to erf() (in ES6+, this number is
* Number.[MAX|MIN]_SAFE_INTEGER). erf() for all numbers beyond this limit will
* return 1
*/
const MAX_NUM = Math.pow(2, 53)


export function getMax(arr: number[] | Float32Array) {
  let len = arr.length;
  let max = -Infinity;

  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
}