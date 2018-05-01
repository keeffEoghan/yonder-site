import { vec2 } from 'gl-matrix';

import { tau } from './constants';

export const angle = (v0, v1) => {
    const a = Math.atan2(v1[1], v1[0])-Math.atan2(v0[1], v0[0]);

    return ((a < 0)? a+tau : a);
}

export const fromPolar = (out, [x, y], a, r) =>
    vec2.set(out, x+(r*Math.cos(a)), y+(r*Math.sin(a)));
