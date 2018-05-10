import { tau } from './constants';

export const sum = (n) => ((n > 1)? n+sum(n-1) : n);

const factorials = [];

export const factorial = (n) =>
    ((factorials[n] === undefined)?
        factorials[n] = ((n > 1)? n*factorial(n-1) : 1)
    :   factorials[n]);

export const combine = (n, r) => factorial(n)/(factorial(r)*factorial(n-r));
export const nCr = combine;

/**
 * Normailse `atan2` results from the range [-PI, PI] to [0, 2*PI]
 * @param {Number} atan2 An angle as given by `Math.atan2`, in the range [-PI, PI].
 * @return {Number} An equivalent angle in the range [0, 2*PI].
 */
export const atan2Circle = (atan2) => ((atan2 < 0)? atan2+tau : atan2);
