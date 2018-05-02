/**
 * Create an approximate circle of beziers.
 *
 * @see https://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves
 * @see https://codepen.io/keeffEoghan/pen/odZQJg
 */

import { tau } from '../constants';

export function bezierCirclePart(cx, cy, rad, step, steps = 4, startA = 0, out = []) {
    const stepA = tau/steps;

    const a0 = startA+(stepA*(step-1));
    const x0 = Math.cos(a0)*rad;
    const y0 = Math.sin(a0)*rad;

    const a1 = startA+(stepA*step);
    const x1 = Math.cos(a1)*rad;
    const y1 = Math.sin(a1)*rad;

    const cp = 4/3*Math.tan(Math.PI/(2*steps));

    out.splice(0, 0,
        'C',
        cx+x0+(-y0*cp), cy+y0+(x0*cp),
        cx+x1+(y1*cp), cy+y1+(-x1*cp),
        cx+x1, cy+y1);

    return out;
}

export function bezierCircle(cx, cy, rad, steps = 4, startA = 0, closed = true, out = []) {
    // Extra index offset if the path is closed.
    const c = ((closed)? 1 : 0);

    for(let s = 0; s < steps; ++s) {
        out[s+c] = bezierCirclePart(cx, cy, rad, s, steps, startA, out[s+c]);
    }

    if(closed) {
        const end = out[steps];

        (out[0] || (out[0] = [])).splice(0, 0, 'M', end[end.length-2], end[end.length-1]);
        (out[steps+c] || (out[steps+c] = [])).splice(0, 0, 'Z');
    }

    return out;
}
